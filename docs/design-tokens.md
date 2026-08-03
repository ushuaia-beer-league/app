# Design tokens

`src/styles/tokens.css` holds the league's visual identity as CSS custom
properties. Every value in it is a value that
`docs/sources/reference-site.html` actually paints. This file records where
each token came from and what it is for.

The reference carries its whole design in one inline `<style>` block: an
eighteen-variable `:root` at line 9 and 425 literal rules after it. Of the
294 KB the knowledge base attributes to CSS, 274 KB is a single base64
photograph on line 22; the stylesheet itself is about 20 KB. Extracting it was
a naming exercise, not a rewrite.

Each entry below reads: token, value, where in the reference it came from, what
it is for.

## How the fonts get loaded

Line 7 of the reference pulls three families from Google Fonts:

```text
fonts.googleapis.com/css2
  ?family=Bebas+Neue
  &family=Barlow+Condensed:wght@400;600;700;900
  &family=Barlow:wght@400;500
  &display=swap
```

`tokens.css` declares the families and stops there. It contains no `@import`
and the project adds no `<link>`: a later phase self-hosts the three families
as `woff2` under `public/fonts/`, with `@font-face` and `font-display: swap`
in a separate stylesheet, so the site does not depend on a third-party host
and does not leak a visitor's address to one. Until then the condensed
fallbacks carry the layout, which matters because the whole chrome is
uppercase and heavily tracked.

Barlow Condensed 900 is requested by the reference and used by no rule. It is
not a token and should not be self-hosted.

## Brand hues

The seven raw colours everything else derives from. Components should use a
semantic token, not these.

- `--brand-night` `#0a0e14` — `--dark`. The base dark.
- `--brand-ice` `#7ab8d4` — `--ice`. Mid ice blue. Never used through `var()`
  in the reference; it appears as a literal on the admin sidebar dots and in
  the team colour list.
- `--brand-ice-light` `#c8e8f5` — `--ice-light`. The cool highlight, 17 uses.
- `--brand-gold` `#e8a820` — `--gold`. The accent, 26 uses.
- `--brand-blue` `#1a4fa3` — `--blue`. Beer League.
- `--brand-red` `#cc3333` — `--red`. Women's Beer League.
- `--brand-green` `#2a7a3a` — `--green`. All-stars, and positive status.

## Surfaces

- `--color-bg` `#0a0e14` — `body`, `#ligas`, `#galeria`, `footer`. Page
  background and the odd-numbered sections.
- `--color-bg-alt` `#0f152099` — `--dark2`. `#historia`, `#playoffs`,
  `#sponsors` and the admin panel. Translucent (`0x99`, 60 %) so the
  photograph behind the page shows through; that translucency is why the
  sections read as alternating.
- `--color-surface` `rgba(17,27,38,0.92)` — `--panel`. Cards, match rows,
  bracket matches, scorer rows, sponsor cards.
- `--color-surface-sunken` `rgba(13,21,32,0.95)` — `--panel2`. Inputs,
  selects, the admin sidebar and its top bar.
- `--color-scrim` `rgba(10,14,20,0.93)` — `#main-nav`. The fixed bar.
- `--color-overlay` `rgba(5,9,14,0.88)` — `.admin-backdrop`. Modal backdrop.
- `--photo-overlay-opacity` `0.18` — `body::before`. Strength of the fixed
  rink photograph. The image is content, not a token; only its strength is
  here.

## Text

- `--color-text` `#ccdde8` — `--text`. Body copy, table cells, form values.
- `--color-text-strong` `#f0f6fa` — `--white`. A name that must stand out in a
  list; one use in the reference (`.scorer-name`).
- `--color-text-heading` `#ffffff` — the `#fff` literal. Section titles, hero
  line two, champion name, admin panel titles. Pure white, deliberately
  distinct from `--color-text-strong`.
- `--color-text-muted` `#5a7a8f` — `--muted`. Labels, meta, inactive tabs,
  table headers, unresolved fixtures. 29 uses, the most of any token.
- `--color-text-bright` `#c8e8f5` — `--ice-light`. Anything that reads as a
  live number: points, scores, goal counts, wordmarks, the active tab.

## Borders and washes

The reference contains **no `box-shadow` at all**. Depth is hairline borders
and an almost invisible ice wash, and hover raises the border instead of
casting a shadow. The token names keep that discipline explicit.

- `--color-border` `rgba(120,180,210,0.12)` — `--border`. The default
  hairline, 26 uses.
- `--color-border-strong` `rgba(200,232,245,0.28)` — collapsed, see below.
  Hover and focus borders.
- `--color-border-subtle` `rgba(120,180,210,0.06)` — `.bm-row`,
  `.data-table td`. Dividers inside a card, weaker than the card's own edge.
- `--color-border-accent` `rgba(232,168,32,0.32)` — collapsed, see below.
  Gold-edged elements: badges, the leading scorer, sponsor hover.
- `--color-wash` `rgba(200,232,245,0.04)` — `.bm-row.winner`, `.anav.active`,
  `.sp-icon`. The standard hover or selected fill.
- `--color-wash-strong` `rgba(200,232,245,0.06)` — `.btn-outline:hover`. One
  step up, for a fill that has to register on a button.
- `--border-width-hairline` `1px` — throughout. Every ordinary border.
- `--border-width-emphasis` `2px` — `.champion-box`, `.it-btn`, `.anav`. The
  champion's frame, the active tab underline, the active sidebar marker.
- `--border-width-accent` `3px` — `.historia-block`. The gold bar down the
  left edge of a history block.

## Accent and status

- `--color-accent` `#e8a820` — `--gold`. Eyebrows, section labels, the leader
  of a table, the active tab underline, the champion frame, the primary admin
  button.
- `--color-accent-hover` `#f0b830` — `.adm-btn-p:hover`. The only lightened
  gold in the file.
- `--color-accent-soft` `rgba(232,168,32,0.15)` — `--gold-dim`. Badge and pill
  backgrounds.
- `--color-positive` `#4caf70` — `.pm-p`, `.toast`. Positive goal difference,
  success message text.
- `--color-positive-fill` 14 % green — `.toast` background.
- `--color-positive-line` 30 % green — `.toast` border.
- `--color-negative` `#e05050` — `.pm-n`, `.login-err`. Negative goal
  difference, error message.

## Competitions

Every competition gets a hue, a legible ink, a translucent fill and a
translucent border, used by the hero pills (`.lp-*`) and the tab switcher
(`.cs-btn.active-*`).

| Token suffix | Hue       | Ink       | Source      |
| ------------ | --------- | --------- | ----------- |
| `beer`       | `#1a4fa3` | `#7aaad8` | `.lp-beer`  |
| `wubl`       | `#cc3333` | `#e07070` | `.lp-wbeer` |
| `milkshake`  | `#e8a820` | `#e8a820` | `.lp-milk`  |
| `stars`      | `#2a7a3a` | `#70c080` | `.lp-stars` |

The `-fill` and `-line` tokens are derived from the hue with `color-mix()`, so
adding a competition means adding four lines of the same shape. The reference
used different alphas for a pill than for an active tab (0.15–0.18 against
0.08–0.10); both collapse to 14 %.

Milkshake has no fixture yet. Its tokens exist because both the reference and
the planned schema leave room for it.

## Typography

Three families, each with a job.

- `--font-display` — Bebas Neue, 50 rules. Numbers and headings: hero title,
  section titles, scores, points, goal counts, ranks, seeds, wordmarks.
- `--font-condensed` — Barlow Condensed, the bulk of the file. All chrome,
  always uppercase and tracked: navigation, buttons, tabs, table headers,
  badges, labels, dates.
- `--font-body` — Barlow, `body` and `input`. Running prose, table cells, form
  fields. The only face not set in capitals.

Weights: `--weight-regular` 400 (prose), `--weight-medium` 500 (loaded for
Barlow, unused by the reference), `--weight-semibold` 600 (`.bm-team`),
`--weight-bold` 700 (20 rules, every uppercase condensed label).

### Type scale

The reference uses 28 distinct `font-size` values, most between `0.58rem` and
`0.95rem`. They collapse to ten steps plus the two fluid sizes.

| Token        | Value    | Collapses         | Used for            |
| ------------ | -------- | ----------------- | ------------------- |
| `--text-3xs` | 10px     | `.58 .6 .62 .65`  | micro labels        |
| `--text-2xs` | 11px     | `.67 .68 .7 .72`  | eyebrows, meta      |
| `--text-xs`  | 12px     | `.75 .76 .77 .78` | nav, buttons, tabs  |
| `--text-sm`  | 13px     | `.8 .82 .85`      | table cells, inputs |
| `--text-md`  | 15px     | `15px .9 .95`     | body copy           |
| `--text-lg`  | 17px     | `1 1.05`          | points, team name   |
| `--text-xl`  | 21px     | `1.2 1.3`         | wordmark, titles    |
| `--text-2xl` | `1.5rem` | `1.4 1.5`         | scores, champion    |
| `--text-3xl` | 30px     | `1.8`             | top scorer's goals  |
| `--text-4xl` | `2.5rem` | `2.4`             | hero statistics     |

`--text-md` is the reference's 15px `body` size restated in rem so a reader's
own font size still scales the page.

`--text-hero` (`clamp(3rem,11vw,8.5rem)`, from `.hero-title`) and
`--text-section` (`clamp(1.8rem,4vw,3rem)`, from `.sec-title`) are quoted
exactly. They are the reference's only genuinely responsive typography and
need no breakpoint.

### Line height and tracking

- `--leading-hero` `0.92` — `.hero-title`. Stacked display lines that should
  almost touch.
- `--leading-display` `1` — `.hs-num`, `.mscore`, `.sec-title`. Any
  single-line display number.
- `--leading-body` `1.7` — `.hb-text`. Running prose.

Tracking is not decoration here: the uppercase condensed labels are
unreadable without it, and the eyebrow's extreme value is the single most
recognisable detail in the design.

| Token                | Value    | Collapses        | Used for           |
| -------------------- | -------- | ---------------- | ------------------ |
| `--tracking-display` | `0.04em` | `.04 .05 .06`    | Bebas headings     |
| `--tracking-wide`    | `0.1em`  | `.07 .08 .1 .12` | pills, badges      |
| `--tracking-wider`   | `0.15em` | `.14 .15 .18`    | nav, table headers |
| `--tracking-widest`  | `0.22em` | `.2 .22`         | group headings     |
| `--tracking-eyebrow` | `0.35em` | `.35 .38`        | eyebrow, sec label |

## Spacing and layout

The reference has around thirty ad-hoc spacing values between `0.12rem` and
`7rem`. They collapse to an eight-step four-pixel grid, every original landing
within a pixel or two.

| Token       | Value     | Used for                        |
| ----------- | --------- | ------------------------------- |
| `--space-1` | `0.25rem` | badge padding, tight gaps       |
| `--space-2` | `0.5rem`  | row gaps in lists and grids     |
| `--space-3` | `0.75rem` | table cell and card row padding |
| `--space-4` | `1rem`    | card padding, form groups       |
| `--space-5` | `1.5rem`  | navigation gaps, block spacing  |
| `--space-6` | `2rem`    | section gutter, wide screens    |
| `--space-7` | `3rem`    | section padding on a phone      |
| `--space-8` | `5rem`    | section padding, wide screens   |

- `--layout-max-width` `1100px` — `.container`. The content column.
- `--layout-tap-min` `44px` — **not in the reference.** The smallest side of
  anything a thumb has to hit: the navigation disclosure, every link inside the
  phone menu, the hero button, a sponsor link, a contact channel. The reference
  was drawn for a mouse and has no such floor, while the functional document
  rules out "un sistema difícil de utilizar desde el celular", so the floor is a
  token instead of a value repeated in six components.
- `--grid-card-min` `155px` — `.sponsors-grid`
  (`repeat(auto-fill,minmax(155px,1fr))`). The narrowest column an auto-filled
  card grid may collapse to. Shared by the sponsors wall and the contact
  channels.
- `--layout-section-y` `3rem` → `5rem` — `padding:5rem 2rem` on five
  sections. Section vertical rhythm.
- `--layout-section-x` `1rem` → `2rem` — same rule. Section gutter.
- `--layout-nav-height` `56px` — `#main-nav`. The hero's top padding has to
  clear it.
- `--layout-hero-min-height` `100svh` — `#hero` uses `100vh`. A deliberate
  change: on a phone `100vh` exceeds the visible viewport and the hero jumps
  as the address bar retracts.
- `--breakpoint-sm` `42.5em` — `@media(max-width:680px)`, the reference's only
  breakpoint, in em so it follows the reader's font size. Documentation only:
  a custom property cannot appear in a media query condition, so `tokens.css`
  writes the value literally.

### Mobile first

The reference is desktop first: one `max-width: 680px` block that hides the
navigation links, collapses the history grid, halves the gallery columns and
stacks match rows. `tokens.css` inverts that. The phone values are the
defaults and a single `min-width: 42.5em` block widens the section rhythm and
the card gutter, which is the only thing in the token layer that genuinely
changes with viewport. Everything else is either fixed and small or already
fluid through `clamp()`.

## Radii

- `--radius-none` `0` — everything not listed below. Cards, buttons, tables,
  brackets, inputs and badges are all square. The token exists so the choice
  reads as deliberate.
- `--radius-pill` `2px` — `.lp`. The competition pills, the only softened
  rectangle in the design.
- `--radius-full` `50%` — `.tdot`, `.adot`, `.sp-icon`, `.rink-ring`. Team
  colour dots, sponsor icons, the decorative rink rings.

## Effects

- `--glow-gold` `0 0 30px rgba(232,168,32,0.18)` — collapses `.hero-logo` and
  `.historia-logo`. The gold halo behind the crest, applied through
  `filter: drop-shadow()`.
- `--blur-chrome` `blur(16px)` — `#main-nav`. Backdrop blur under the fixed
  navigation.

There is no shadow scale because the reference has no shadows.

## Motion

- `--duration-fast` `0.15s` — `.anav`. Sidebar navigation.
- `--duration-base` `0.2s` — 13 rules. Every hover and focus transition.
- `--duration-slow` `0.55s` — `.fade-in`. The scroll reveal.
- `--ease-default` `ease` — `.fade-in`. The only easing named in the file.
- `--lift-hover` `-2px` — collapses `-2px` and `-3px`. The `translateY` on
  hover, which is how this design signals elevation.

## Identity treatments

- `--gradient-hero` — `.hero-bg`, quoted exactly. Three stacked layers: a blue
  radial glow low and centre, a faint ice radial high and left, and a vertical
  dark to `#0d1825` to dark base. `#0d1825` appears only here, so it is
  inlined rather than tokenised.
- `--card-bg`, `--card-border`, `--card-padding-y`, `--card-padding-x` —
  `.card`, `.match-row`, `.bm`, `.sp-card`, `.scorer-row`. The one card
  treatment the whole site uses: translucent panel, hairline border, no
  radius, no shadow.
- `--rule-accent-width`, `--rule-accent-height` — `.gold-bar`. The 38 × 3 gold
  rule under a section title.
- `--crest-sm` `40px`, `--crest-md` `130px`, `--crest-lg` `260px` — the crest at
  the three sizes the reference paints it: `.nav-logo img` at 36px and
  `.footer-logo img` at 40px, collapsed into `sm`; `.hero-logo` at 130px;
  `.historia-logo` at `max-width: 260px`. `--crest-sm` also sizes the round
  sponsor icon, which the reference draws at 48px.
- `--hero-ring-outer` `680px`, `--hero-ring-inner` `360px` — the two concentric
  `.rink-ring` circles behind the hero. Their diameters are inline styles on the
  markup rather than rules in the stylesheet, which is why the first extraction
  missed them.

## What was collapsed

Near-identical values that were merged, with the originals so a difference can
be recovered if it turns out to be intentional.

- **Ice wash**, `rgba(200,232,245,α)`: α of `.02` (`.data-table tr:hover`),
  `.03` (`.anav:hover`), `.04` (`.bm-row.winner`, `.anav.active`, `.sp-icon`,
  hero radial) and `.05` (`.mbadge.played`) all become `--color-wash` at
  `.04`. `.06` (`.btn-outline:hover`) survives as `--color-wash-strong`.
- **Ice border**, `rgba(200,232,245,α)`: α of `.2` (`.bm:hover`), `.22`
  (`.cs-btn:hover`), `.28` (`.g-slot:hover`, `.adm-close-btn:hover`), `.3`
  (`.btn-outline`) and `.32` (`input:focus`) all become
  `--color-border-strong` at `.28`.
- **Gold border**, `rgba(232,168,32,α)`: α of `.28` (`.mbadge.next`,
  `.adm-badge`), `.3` (`.sp-card:hover`), `.32` (`.lp-milk`), `.4`
  (`.scorer-row.first`) and `.5` (`.nav-admin-btn:hover`) all become
  `--color-border-accent` at `.32`.
- **Subtle divider**, `rgba(120,180,210,α)`: `.05` (`.data-table td`) and
  `.06` (`.bm-row`) become `--color-border-subtle` at `.06`.
- **Gold glow**: `drop-shadow(0 0 30px …,.15)` on the hero crest and
  `drop-shadow(0 0 40px …,.2)` on the history crest become one `--glow-gold`
  at `30px` and `.18`.
- **Hover lift**: `translateY(-2px)` on buttons and `-3px` on sponsor cards
  become `--lift-hover` at `-2px`.
- **Competition tints**: pill fills at `.15`–`.18` and active-tab fills at
  `.08`–`.10` become one 14 % `color-mix`; pill borders at `.32`–`.40` become
  one 38 % `color-mix`.
- **Type scale and spacing**: 28 font sizes to 10 steps and roughly 30 spacing
  values to 8, as tabulated above.
- **Tracking**: 13 values to 5.

## Deliberately not tokens

- **Team colours.** The reference offers eight in the admin's colour picker:
  `#cc3333` Rojo, `#1a4fa3` Azul, `#2a7a3a` Verde, `#e8a820` Dorado, `#555`
  Negro, `#ccc` Blanco, `#8833cc` Violeta, `#cc6600` Naranja. A team's colour
  is a column on `teams`, so it arrives as data and is applied inline to the
  dot. `#8833cc` and `#cc6600` sit in the reference's `:root` as `--purple`
  and `--orange` purely to serve that list, and no rule uses them.
- **`--dark3: #141d28`.** Declared in the reference's `:root` and used by
  nothing. Dropped.
- **`#888`.** The fallback the reference's `teamColor()` returns when a team is
  not found. That is a data gap, and this project shows gaps rather than
  painting over them, so it does not become a token.
- **The five embedded images.** The crest and the rink photograph are content.
  Only `--photo-overlay-opacity` describes how the photograph is used.

## Notes for the port

- The crests are JPEGs with a light background, forced to white with
  `filter: brightness(0) invert(1)`. A transparent SVG or PNG would remove the
  hack; until one exists the filter has to stay or the logo shows a white box.
- `body::before` fixes the rink photograph with `position: fixed` and
  `z-index: -1`, which is why every section carries `position: relative` and
  `z-index: 1`. A ported section that forgets those two declarations
  disappears behind the photograph.
- `--color-bg-alt` being translucent is load-bearing, not incidental: it is
  what lets the photograph read through the alternating sections. Replacing it
  with an opaque near-equivalent flattens the page.
- The bracket has `min-width: 860px` and scrolls horizontally on a phone. That
  is a layout decision to revisit in the playoff component, not a token.
