-- ============================================================================
-- Card images: uploaded or pasted into a card's detail panel.
--
-- Files live in the private `card-images` storage bucket at
-- `<board_id>/<card_id>/<random>.<ext>`; the first folder is the board, which
-- is what the storage policies check membership against. Each file has a row
-- in `card_attachments` so a card can list its images.
-- ============================================================================

create table public.card_attachments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  path text not null unique,
  name text not null,
  mime_type text not null,
  size integer not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index card_attachments_card_id_idx on public.card_attachments (card_id, created_at);

alter table public.card_attachments enable row level security;

create policy "card_attachments_select_member" on public.card_attachments
  for select to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)));
create policy "card_attachments_insert_member" on public.card_attachments
  for insert to authenticated
  with check (
    public.is_workspace_member(public.board_workspace_id(board_id))
    and public.card_board_id(card_id) = board_id
  );
create policy "card_attachments_delete_member" on public.card_attachments
  for delete to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)));

-- Storage bucket: private, images only, 10 MB per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

create policy "card_images_select_member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'card-images'
    and public.is_workspace_member(public.board_workspace_id(((storage.foldername(name))[1])::uuid))
  );
create policy "card_images_insert_member" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'card-images'
    and public.is_workspace_member(public.board_workspace_id(((storage.foldername(name))[1])::uuid))
  );
create policy "card_images_delete_member" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'card-images'
    and public.is_workspace_member(public.board_workspace_id(((storage.foldername(name))[1])::uuid))
  );
