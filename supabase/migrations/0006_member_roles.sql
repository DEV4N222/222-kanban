-- ============================================================================
-- Member roles: let the workspace owner switch people between admin and
-- member, and stop admins removing the owner.
--
-- Additive and backwards-compatible, so it is safe to run while older app
-- versions are live.
-- ============================================================================

-- Only the owner can change roles, only between 'admin' and 'member', never
-- their own role and never the owner's. Done through a function (rather than
-- an update policy) so nothing else on the row can be changed.
create or replace function public.set_member_role(_workspace_id uuid, _user_id uuid, _role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _role not in ('admin', 'member') then
    raise exception 'Role must be admin or member';
  end if;

  if not exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only the workspace owner can change roles';
  end if;

  if _user_id = auth.uid() then
    raise exception 'You can''t change your own role';
  end if;

  update public.workspace_members
  set role = _role
  where workspace_id = _workspace_id and user_id = _user_id and role <> 'owner';

  if not found then
    raise exception 'That person isn''t a member of this workspace';
  end if;
end;
$$;

grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

-- Previously any admin could remove any member, including the owner. Now
-- people can still leave, and admins can remove anyone except the owner.
drop policy "workspace_members_delete_self_or_admin" on public.workspace_members;
create policy "workspace_members_delete_self_or_admin" on public.workspace_members
  for delete to authenticated using (
    user_id = auth.uid()
    or (public.is_workspace_admin(workspace_id) and role <> 'owner')
  );
