# Looking at a change before it is live

The league's site is `https://ushuaia-beer-league.github.io/app/`, served by GitHub
Pages, and Pages serves exactly one site per repository. That site is production.
So a change is never looked at by publishing it beside the live league; it is
looked at in one of the three places below.

## Vercel, for a link somebody can open

The repository is connected to a Vercel project on the free Hobby plan, owned by
the league's own account. Every branch gets its own build and its own address, so
a change can be handed to somebody as a link instead of as instructions.

Two things about it are worth knowing before trusting what you see.

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
