-- ============================================================================
-- Invite-only sign-up.
--
-- A new account can only be created for an address on the allow-list
-- (info@222.solutions to start with) or one with a pending, unexpired
-- workspace invite. This is enforced on auth.users itself, so it holds for
-- every sign-up path (the app's form, magic links, direct API calls).
-- Existing accounts are unaffected.
--
-- To allow another address permanently, run:
--   insert into public.signup_allowlist (email) values ('someone@example.com');
-- ============================================================================

create table public.signup_allowlist (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

-- No policies: only the security-definer functions below (and the Supabase
-- dashboard) can read or change the allow-list.
alter table public.signup_allowlist enable row level security;

insert into public.signup_allowlist (email) values ('info@222.solutions');

create or replace function public.can_sign_up(_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.signup_allowlist where email = lower(trim(_email))
  ) or exists (
    select 1 from public.invites
    where lower(email) = lower(trim(_email))
      and accepted_at is null
      and expires_at > now()
  );
$$;

-- The sign-up form checks first so it can show a friendly message.
grant execute on function public.can_sign_up(text) to anon, authenticated;

create or replace function public.enforce_invite_only_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or not public.can_sign_up(new.email) then
    raise exception 'Sign-up is by invitation only'
      using errcode = 'P0001', hint = 'Ask info@222.solutions for access.';
  end if;
  return new;
end;
$$;

create trigger enforce_invite_only_signup
  before insert on auth.users
  for each row execute function public.enforce_invite_only_signup();
