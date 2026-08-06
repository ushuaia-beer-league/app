# Looking at a change before it is live

The league's site is `https://ushuaia-beer-league.github.io/app/`, served by GitHub
Pages, and Pages serves exactly one site per repository. That site is production.
So a change is never looked at by publishing it beside the live league; it is
looked at in one of the three places below.

## Vercel, for a link somebody can open

The repository is connected to a Vercel project on the free Hobby plan, owned by
the league's own account.

**The test site is always at the same address:**

    https://ushuaia-beer-league.vercel.app

That address is assigned to the `test` branch, so it shows whatever was last
pushed there and never changes. It exists because the alternative did not work in
practice: every push also produces its own single-deployment URL, which means a
different link each time, and a link somebody has to be handed again after every
change is a link nobody opens. Those per-deployment URLs still exist and are still
useful, for looking at two versions side by side.

So showing something is: merge or push it to `test`, wait about fifteen seconds,
and send that one address. `main` is untouched by any of it, and production stays
on GitHub Pages.

Three things about it are worth knowing before trusting what you see.

**Vercel's own "production" is not production.** It builds whatever is on `main`
and serves it at the project's root address, while the league's site is on GitHub
Pages under `/app/`. The two show the same thing and only one of them is the site
anybody uses. Worse, until `vercel.json` reaches `main` that build is broken
rather than merely redundant: the page is compiled expecting to live under
`/app/` and served at the root, so it asks for assets that are not there and
renders nothing. Branch previews are correct because the file travels with the
branch.

**It reads the production database.** There is one Supabase project and both the
live site and the preview talk to it. Looking is harmless, and saving is not: a
sponsor added from a preview panel is added for real. When the day comes that
somebody needs to rehearse loading a season, that is the day to create a second
Supabase project, and not before.

**Signing in works only on an address the OAuth client knows.** Google refuses an
origin nobody registered, so the panel can only be opened on a preview address
that has been added to the client and to Supabase's redirect list. That is done
once per long-lived branch, which is the reason to keep a single `test` branch
rather than expecting every ephemeral preview to be able to sign in. The public
site needs none of this and works on every preview.

## The branch on your own machine

The fastest of the three, and the one that needs nothing from anybody:

    git checkout <branch>
    npm run dev

Then open `http://localhost:5173`. The panel works here too, because that origin
is already registered with the OAuth client, and it was registered for exactly
this.

To look at what a build actually produces rather than what the dev server serves:

    npm run build
    npm run preview:local

which serves the built site on the same port, so sign-in keeps working.

## The artefact CI leaves behind

Every pull request builds the site and attaches it to the run for fourteen days.
It is the slowest way to look at something and the only one that proves what CI
built rather than what your machine builds, which is the reason it exists.
