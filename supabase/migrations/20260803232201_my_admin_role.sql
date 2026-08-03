-- What the panel needs to know the moment somebody signs in: their own role.
--
-- Reading `admins` is not enough. The founding owner deliberately has no row
-- there, so that an empty table still admits the first administrator and the
-- league can never lock itself out; `private.admin_role()` answers for that
-- address from a constant. This is the one thing about itself the client cannot
-- work out on its own.
--
-- Deliberately SECURITY INVOKER. The privileged read happens inside
-- `private.admin_role()`, which is already security definer and already granted
-- to `authenticated`; wrapping it in a definer function too would put another
-- definer on the REST surface for no gain, and the linter is right to flag those.
--
-- It answers for the caller and for nobody else: there is no argument, so a
-- signed-in visitor can learn their own role and nothing about anyone else's.
create or replace function public.my_admin_role()
returns text
language sql
stable
set search_path = ''
as $$
  select private.admin_role();
$$;

comment on function public.my_admin_role() is
  'The role of the caller: general_administrator, sporting_management, communications, or null. Used by the panel to decide what to show; row level security, not this function, decides what may be written.';

revoke all on function public.my_admin_role() from public;
grant execute on function public.my_admin_role() to authenticated;
