-- ============================================================================
-- Archive first, then delete.
--
-- 1. Cards can only be deleted once archived, and only by a workspace owner
--    or admin. Everyone can still view, create, edit and archive cards.
-- 2. A column can't be deleted while it still holds cards (archived ones
--    included), because that used to delete every card in it silently.
--    Deleting a whole board still works.
--
-- Backwards-compatible with the live app: the app never deletes cards that
-- aren't archived.
-- ============================================================================

drop policy "cards_all_member" on public.cards;

create policy "cards_select_member" on public.cards
  for select to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "cards_insert_member" on public.cards
  for insert to authenticated
  with check (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "cards_update_member" on public.cards
  for update to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)))
  with check (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "cards_delete_archived_admin" on public.cards
  for delete to authenticated
  using (archived and public.is_workspace_admin(public.board_workspace_id(board_id)));

create or replace function public.prevent_deleting_column_with_cards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- When a whole board is deleted its row is already gone by the time its
  -- columns are removed; let that cascade through.
  if not exists (select 1 from public.boards where id = old.board_id) then
    return old;
  end if;

  if exists (select 1 from public.cards where column_id = old.id) then
    raise exception 'This column still has cards. Move them to another column, or archive and permanently delete them, before deleting the column.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger prevent_deleting_column_with_cards
  before delete on public.columns
  for each row execute function public.prevent_deleting_column_with_cards();
