-- 222 Solutions Kanban — initial schema, RLS policies, and bootstrap trigger

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- Tables
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_id_idx on public.workspace_members (user_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index invites_workspace_id_idx on public.invites (workspace_id);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);
create index boards_workspace_id_idx on public.boards (workspace_id);

create table public.columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null,
  position double precision not null default 0,
  is_done boolean not null default false,
  wip_limit integer,
  created_at timestamptz not null default now()
);
create index columns_board_id_idx on public.columns (board_id);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null,
  color text not null default '#64748b'
);
create index labels_board_id_idx on public.labels (board_id);

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  goal text,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed')),
  created_at timestamptz not null default now(),
  constraint sprints_dates_check check (end_date >= start_date)
);
create index sprints_board_id_idx on public.sprints (board_id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  column_id uuid not null references public.columns (id) on delete cascade,
  sprint_id uuid references public.sprints (id) on delete set null,
  title text not null,
  description text,
  position double precision not null default 0,
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);
create index cards_board_id_idx on public.cards (board_id);
create index cards_column_id_idx on public.cards (column_id);
create index cards_sprint_id_idx on public.cards (sprint_id);

create table public.card_labels (
  card_id uuid not null references public.cards (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (card_id, label_id)
);

create table public.card_events (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  event_type text not null check (
    event_type in ('created', 'moved', 'archived', 'unarchived', 'sprint_added', 'sprint_removed')
  ),
  from_column_id uuid references public.columns (id) on delete set null,
  to_column_id uuid references public.columns (id) on delete set null,
  sprint_id uuid references public.sprints (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
-- This append-only log is the source of truth for CFD and burndown: both
-- charts are computed by replaying it rather than trusting current state.
create index card_events_card_id_created_at_idx on public.card_events (card_id, created_at);
create index card_events_board_id_created_at_idx on public.card_events (board_id, created_at);

-- ============================================================================
-- Helper functions (security definer, so they can be used inside RLS
-- policies without those policies recursively re-triggering RLS on the
-- tables the helpers read from)
-- ============================================================================

create or replace function public.is_workspace_member(_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.board_workspace_id(_board_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select workspace_id from public.boards where id = _board_id;
$$;

create or replace function public.card_board_id(_card_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select board_id from public.cards where id = _card_id;
$$;

-- ============================================================================
-- New-user bootstrap: create a profile row whenever a Supabase auth user
-- is created.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Invite acceptance: runs as a security definer so a plain member can
-- accept an invite (which requires inserting into workspace_members) without
-- needing a broad client-facing insert policy on that table.
-- ============================================================================

create or replace function public.accept_invite(_token uuid)
returns uuid -- returns the workspace_id joined
language plpgsql
security definer
set search_path = public
as $$
declare
  _invite public.invites%rowtype;
  _user_email text;
begin
  select email into _user_email from auth.users where id = auth.uid();

  select * into _invite
  from public.invites
  where token = _token
    and accepted_at is null
    and expires_at > now();

  if _invite.id is null then
    raise exception 'Invite not found or expired';
  end if;

  if lower(_invite.email) <> lower(_user_email) then
    raise exception 'This invite was issued to a different email address';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (_invite.workspace_id, auth.uid(), _invite.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.invites set accepted_at = now() where id = _invite.id;

  return _invite.workspace_id;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invites enable row level security;
alter table public.boards enable row level security;
alter table public.columns enable row level security;
alter table public.labels enable row level security;
alter table public.sprints enable row level security;
alter table public.cards enable row level security;
alter table public.card_labels enable row level security;
alter table public.card_events enable row level security;

-- profiles: names/avatars are visible to any authenticated user (needed to
-- render assignees across boards); only the owner can edit their own row.
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- workspaces
create policy "workspaces_select_member" on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
-- Also allow the owner to select by ownership alone (not just membership):
-- immediately after INSERT, Postgres evaluates the SELECT policy against the
-- new row for the RETURNING clause, before the follow-up workspace_members
-- insert has happened, so relying on is_workspace_member() alone would make
-- "insert ... select" (i.e. .select() in supabase-js) fail RLS on creation.
create policy "workspaces_select_owner" on public.workspaces
  for select to authenticated using (owner_id = auth.uid());
create policy "workspaces_insert_self" on public.workspaces
  for insert to authenticated with check (owner_id = auth.uid());
create policy "workspaces_update_owner" on public.workspaces
  for update to authenticated using (owner_id = auth.uid());

-- workspace_members
create policy "workspace_members_select_member" on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "workspace_members_insert_bootstrap" on public.workspace_members
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );
create policy "workspace_members_delete_self_or_admin" on public.workspace_members
  for delete to authenticated using (
    user_id = auth.uid() or public.is_workspace_admin(workspace_id)
  );

-- invites
create policy "invites_select_member" on public.invites
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "invites_insert_admin" on public.invites
  for insert to authenticated with check (public.is_workspace_admin(workspace_id));
create policy "invites_delete_admin" on public.invites
  for delete to authenticated using (public.is_workspace_admin(workspace_id));

-- boards
create policy "boards_select_member" on public.boards
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "boards_insert_member" on public.boards
  for insert to authenticated with check (public.is_workspace_member(workspace_id));
create policy "boards_update_member" on public.boards
  for update to authenticated using (public.is_workspace_member(workspace_id));
create policy "boards_delete_admin" on public.boards
  for delete to authenticated using (public.is_workspace_admin(workspace_id));

-- columns
create policy "columns_all_member" on public.columns
  for all to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)))
  with check (public.is_workspace_member(public.board_workspace_id(board_id)));

-- labels
create policy "labels_all_member" on public.labels
  for all to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)))
  with check (public.is_workspace_member(public.board_workspace_id(board_id)));

-- sprints
create policy "sprints_all_member" on public.sprints
  for all to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)))
  with check (public.is_workspace_member(public.board_workspace_id(board_id)));

-- cards
create policy "cards_all_member" on public.cards
  for all to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)))
  with check (public.is_workspace_member(public.board_workspace_id(board_id)));

-- card_labels
create policy "card_labels_all_member" on public.card_labels
  for all to authenticated
  using (public.is_workspace_member(public.board_workspace_id(public.card_board_id(card_id))))
  with check (public.is_workspace_member(public.board_workspace_id(public.card_board_id(card_id))));

-- card_events (append-only from the client's perspective: no update/delete policy)
create policy "card_events_select_member" on public.card_events
  for select to authenticated using (public.is_workspace_member(public.board_workspace_id(board_id)));
create policy "card_events_insert_member" on public.card_events
  for insert to authenticated with check (public.is_workspace_member(public.board_workspace_id(board_id)));

-- ============================================================================
-- Realtime
-- ============================================================================
alter publication supabase_realtime add table public.cards;
alter publication supabase_realtime add table public.columns;
alter publication supabase_realtime add table public.card_events;
