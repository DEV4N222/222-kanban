-- ============================================================================
-- RAID log: Risks, Assumptions, Issues and Decisions, one log per board.
--
-- Additive only (a new table), so it is safe to run while older app versions
-- are live.
-- ============================================================================

create table public.raid_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  type text not null check (type in ('risk', 'assumption', 'issue', 'decision')),
  -- Per-board, per-type sequence shown as R-1, A-1, I-1, D-1.
  number integer not null,
  title text not null,
  description text,
  owner_id uuid references public.profiles (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  impact text check (impact in ('low', 'medium', 'high')),
  -- Only meaningful for risks.
  likelihood text check (likelihood in ('low', 'medium', 'high')),
  -- Mitigation (risk), validation (assumption), resolution (issue) or rationale (decision).
  action text,
  due_date date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (board_id, type, number)
);
create index raid_items_board_id_idx on public.raid_items (board_id, type, number);

alter table public.raid_items enable row level security;

create policy "raid_items_all_member" on public.raid_items
  for all to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)))
  with check (public.is_workspace_member(public.board_workspace_id(board_id)));
