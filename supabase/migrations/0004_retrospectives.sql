-- ============================================================================
-- Retrospectives: one retro per sprint with four columns of notes, plus an
-- AI-written summary ("retro story") saved so the whole team sees the same one.
--
-- Additive only (new tables), so it is safe to run while older app versions
-- are live.
-- ============================================================================

create table public.retro_notes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  sprint_id uuid not null references public.sprints (id) on delete cascade,
  kind text not null check (kind in ('keep', 'stop', 'start', 'celebrate')),
  body text not null check (char_length(body) between 1 and 1000),
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index retro_notes_sprint_idx on public.retro_notes (sprint_id, created_at);

create table public.retro_summaries (
  sprint_id uuid primary key references public.sprints (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  story text not null,
  themes text[] not null default '{}',
  note_count integer not null,
  generated_by uuid references public.profiles (id) on delete set null,
  generated_at timestamptz not null default now()
);

alter table public.retro_notes enable row level security;
alter table public.retro_summaries enable row level security;

-- Anyone on the workspace can read and add notes; only the author can
-- edit or delete their own.
create policy "retro_notes_select_member" on public.retro_notes
  for select to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)));
create policy "retro_notes_insert_member" on public.retro_notes
  for insert to authenticated
  with check (
    public.is_workspace_member(public.board_workspace_id(board_id))
    and author_id = auth.uid()
  );
create policy "retro_notes_update_author" on public.retro_notes
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
create policy "retro_notes_delete_author" on public.retro_notes
  for delete to authenticated
  using (author_id = auth.uid());

create policy "retro_summaries_all_member" on public.retro_summaries
  for all to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)))
  with check (public.is_workspace_member(public.board_workspace_id(board_id)));

-- Live updates while the team fills in the retro together.
alter publication supabase_realtime add table public.retro_notes;
