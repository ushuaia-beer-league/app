-- Four things about a visit, and still nothing about the visitor.
--
-- `page_views` already answers "what is being opened". This answers the questions
-- the league actually asked: who comes back, from a phone or a computer, arriving
-- from where, and landing on which page.
--
-- The interesting part is what is NOT here. Recognising a returning visitor
-- normally means giving each browser an identifier and storing it, which turns an
-- analytics table into a table of people; from that moment "we store nothing about
-- anybody" stops being true and nobody notices, because the identifier is a random
-- string and looks harmless. So the recognising happens in the visitor's own
-- browser: it keeps two dates in its own storage, compares them to today, and
-- sends one word, `new` or `returning`. The identifier is never created, so it
-- cannot be stored, leaked or subpoenaed, and this table holds four counters and a
-- date exactly like the other one.
--
-- Same for the rest. The referrer is classified in the browser and only its class
-- travels, so no URL anybody came from is ever written down. The device is one bit
-- from the user-agent hint, not the user-agent string. There is no country and no
-- city: geolocation needs a service that reads the address of every visitor, which
-- costs money at the volumes that matter and privacy at every volume, and the
-- league chose to keep this free.
--
-- What the numbers mean, precisely, because the wrong reading is the tempting one:
-- `visitor=new` counts browsers that had never been here before, so it is close to
-- "people who found the site". `visitor=returning` counts, once per day, a browser
-- that had been here on an earlier day: one person coming back on five days adds
-- five, so it is "how often the league's people come back", not "how many of them
-- do". The panel says so in those words.
--
-- Indicative, never audited, for the same reasons as `page_views`: the function is
-- callable by anybody, a browser that blocks it is never counted, and a person
-- with two devices is two browsers. It answers whether the site is being used and
-- by whom in the loosest sense, and it is not evidence.
--
-- The advisor warning `anon_security_definer_function_executable` applies here too
-- and is deliberate for the same reason: `security definer` plus a locked-down
-- function is the only way a visitor can add to a counter without being handed the
-- ability to write rows.

create table public.visit_facts (
  day date not null default (now() at time zone 'America/Argentina/Ushuaia')::date,
  -- What is being counted: 'visitor', 'device', 'referrer' or 'entry'.
  fact text not null,
  -- Its value. An enum for the first three, a path for 'entry'. The exact list
  -- lives in public.record_visit, which is the only thing that writes here; this
  -- constraint is the outer fence, not the rule.
  value text not null,
  visits bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, fact, value),
  constraint visit_facts_fact_known
    check (fact in ('visitor', 'device', 'referrer', 'entry')),
  constraint visit_facts_value_shape
    check (value ~ '^[a-z0-9/-]{1,60}$'),
  constraint visit_facts_positive check (visits >= 0)
);

comment on table public.visit_facts is
  'Daily counters for four properties of a visit. Holds no identifier of any kind: the browser decides whether it is new or returning and sends only that word. Written only by public.record_visit.';

alter table public.visit_facts enable row level security;

-- Same rule as page_views: any of the three administrator roles may read it, a
-- visitor may not, and the refusal is the database's rather than the panel's.
create policy visit_facts_read_admin on public.visit_facts
  for select to authenticated
  using ((select public.my_admin_role()) is not null);

-- One round trip per page load, and every argument optional: a browser that
-- cannot answer one of the questions sends null for it and the rest is still
-- counted. An unknown value is dropped in silence, because a visitor has nothing
-- to do with the answer and must never see an error from a counter.
--
-- One statement, so the list of what is allowed exists exactly once. The four
-- rows carry four different `fact` values, so they cannot conflict with each
-- other and the upsert is safe as a set.
create or replace function public.record_visit(
  visitor text default null,
  device text default null,
  referrer text default null,
  entry text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.visit_facts (day, fact, value, visits)
  select
    (now() at time zone 'America/Argentina/Ushuaia')::date,
    given.fact,
    given.value,
    1
  from (values
    ('visitor', visitor),
    ('device', device),
    ('referrer', referrer),
    ('entry', entry)
  ) as given(fact, value)
  where given.value is not null
    and case given.fact
          when 'visitor' then given.value in ('new', 'returning')
          when 'device' then given.value in ('phone', 'computer')
          when 'referrer' then
            given.value in ('direct', 'search', 'social', 'other')
          when 'entry' then given.value ~ '^[a-z0-9/-]{1,60}$'
        end
  on conflict (day, fact, value) do update
    set visits = public.visit_facts.visits + 1,
        updated_at = now();
$$;

comment on function public.record_visit(text, text, text, text) is
  'Adds one to today''s counter for each property the browser could answer. The only way anything is written to visit_facts, and it can do nothing else.';

revoke all on function public.record_visit(text, text, text, text) from public;
grant execute on function public.record_visit(text, text, text, text)
  to anon, authenticated;
