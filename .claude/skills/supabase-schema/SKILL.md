---
name: supabase-schema
description: Use when adding or changing a Supabase table, column, row level security policy or migration for the UBL. Triggers on "migration", "RLS", "policy", "add a table", "schema change", "permissions", "admin role", "supabase db push".
---

# Supabase schema and permissions

Everything about the database lives in the repository. A change that exists only
in the Supabase dashboard is a change nobody can review and nobody can restore.

## When to use

Adding or altering a table, a column, an index or a policy; changing who may read
or write anything.

## When NOT to use

Reading or writing rows from application code. That is a client call, not a
schema change.

## Rules

- Every change is a numbered file under `supabase/migrations/`, applied with the
  CLI. Never edit the schema by hand in the dashboard.
- Row level security is enabled on every table, granted per table. A new table is
  private until a policy says otherwise. Never write a catch-all policy.
- Public read is granted only to sporting data: seasons, competitions, teams,
  players, rosters, matches, goals and goalkeeper lines.
- `admins` is never publicly readable. It holds personal email addresses. A
  signed-in person may read their own row; administrators may read the table.
- Writes are restricted to emails present in `admins`, checked in the policy.
  The three roles from the functional document are general administrator,
  sporting management, and communications. Sporting management may not touch
  news, gallery or sponsors, and communications may not touch results.
- `ushuaiabl@gmail.com` stays hardcoded as founding owner in the policies, so
  the league cannot be locked out and the first administrator can be added to an
  empty table.
- Hiding a button in the panel is not enforcement. If the panel forbids
  something, a policy must refuse it too.
- Never put a service-role key in the client, in the repository, or in a CI
  variable used by the front end build. Only the project URL and the anon key
  belong there.

## Steps

1. Write the migration:

   ```bash
   supabase migration new <short_snake_case_name>
   ```

2. Put the table, its indexes, `alter table ... enable row level security`, and
   its policies in that one file. A table and its policies never ship apart.
3. Apply locally and check the policy from both sides, signed in and anonymous:

   ```bash
   supabase db reset      # local, rebuilds from every migration
   ```

4. Push once it passes:

   ```bash
   supabase db push
   ```

5. Update `docs/knowledge-base.md` if the change alters a domain rule, and
   `CLAUDE.md` if it alters a permission.

## Schema conventions

- `snake_case` table and column names, plural tables.
- A player is a global entity, not a per-season one. Season membership lives in
  the roster table, with the jersey number, because a number belongs to a roster
  entry and not to a person.
- A match carries its venue (`bahia` or `poli`) because two matches run at once.
- A match carries its resolution: regulation, shootout or draw. Draws are legal.
- Never add a column for a national ID, a birth date, a phone number, an address
  or payment status.
- Deactivate rather than delete. A removed player keeps the events that reference
  them, so use an `active` flag.

## The two counter tables, added August 2026

`page_views` (path, day, views) and `visit_facts` (day, fact, value, visits) are
the analytics. Neither holds an identifier of any kind, and that is the design,
not an accident: the browser decides whether a visitor is new or returning and
sends one word.

Neither table grants INSERT or UPDATE to anybody. The only write path is
`public.record_view(page)` and `public.record_visit(visitor, device, referrer,
entry)`, both `SECURITY DEFINER` with `EXECUTE` granted to `anon` — which the
Supabase advisor flags on purpose and forever; the migrations explain why the
alternatives are worse. Any of the three admin roles may SELECT; a visitor may
not.

If you add a column that could identify somebody to either table, stop: that is
the line the whole design exists to hold.

## The content tables, added 7 August 2026

`site_content` (key, language, title, body) holds panel-edited overrides for the
site's prose, per block and per language; an absent row means the built-in text,
so editing Spanish never blanks English. `contact_channels` (label, href, glyph,
display_order, active) holds the public contact links; its check constraint
refuses any href that is not `https://` or `mailto:` — remember POSIX bounds a
regex repetition at 255, which is why the length lives in `char_length`, not in
the pattern. Both tables: public SELECT, writes for
`private.can_manage_content()` (communications + general).

Storage: `media_insert_sport_teams` / `media_update_sport_teams` let sporting
management write under the `teams/` prefix only, because team crests belong to
the team row, which is sport's.
