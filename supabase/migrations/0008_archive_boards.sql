-- ============================================================================
-- Boards: archive first, then delete — owners and admins only.
--
-- 1. Boards get archived_at / archived_by. Only workspace owners and admins
--    can archive or restore a board (enforced by a trigger, since members
--    can otherwise update boards, e.g. to rename them).
-- 2. A board can only be deleted once archived, and only by an owner or
--    admin. (Previously admins could delete a board in one step.)
--
-- Additive and backwards-compatible: existing boards stay unarchived.
-- ============================================================================

alter table public.boards
  add column archived_at timestamptz,
  add column archived_by uuid references public.profiles (id) on delete set null;

create or replace function public.guard_board_archiving()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.archived_at is distinct from old.archived_at
     and not public.is_workspace_admin(old.workspace_id) then
    raise exception 'Only workspace owners and admins can archive or restore boards'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_board_archiving
  before update on public.boards
  for each row execute function public.guard_board_archiving();

drop policy "boards_delete_admin" on public.boards;
create policy "boards_delete_archived_admin" on public.boards
  for delete to authenticated
  using (archived_at is not null and public.is_workspace_admin(workspace_id));
