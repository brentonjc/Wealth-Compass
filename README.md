# Wealth Compass™

Understand the money decisions you make — and the future you're building together.

A single-page web app: a ~21-question assessment that maps you onto **8 Compass directions** (what you prioritise) and **5 Navigation preferences** (how you decide), then generates personal reports and a shared partner report.

Plain HTML + ES modules + Chart.js (CDN) + **precompiled Tailwind** (no CDN). Serves
as fully static files — hosts on Netlify with no build required. Optional Firebase for
partner share codes.

---

## Run locally

The app uses ES-module `fetch()`, so it needs to be served over HTTP (not opened as a `file://`):

```bash
cd "Wealth Compass"
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, VS Code Live Server, etc.). A tiny
zero-dependency Node server is also included:

```bash
node server.js   # serves on http://localhost:8123
```

---

## Styling (Tailwind)

Tailwind is **precompiled** to `styles/tailwind.css` (committed), so the site stays a
static, drag-and-drop deploy — no CDN, no runtime build. Design tokens (the brand
colours + fonts) live in `tailwind.config.js`.

**After you add or change any Tailwind classes** in `index.html` or `src/*.js`, rebuild:

```bash
npm install        # one-time
npm run build:css  # regenerates styles/tailwind.css
# or: npm run watch:css   (rebuilds on save while developing)
```

`node_modules/` is dev-only (gitignored) — don't deploy it. `report.html` uses its own
inline CSS and doesn't depend on this bundle.

---

## Project structure

```
index.html                 SPA shell — loads compiled Tailwind, Chart.js, fonts
report.html                Data-driven A4 report (?type=compass|navigation|shared)
styles/
  tailwind.css             ★ Compiled Tailwind bundle (built; committed)
  tailwind-input.css       Tailwind build source (@tailwind directives)
  theme.css                Design system: surfaces, component classes, animations
tailwind.config.js         Tailwind content globs + brand tokens (colours, fonts)
package.json               Dev tooling: npm run build:css / watch:css
src/
  app.js                   Screen router + generic question renderer + result screens
  scoring.js               Answers → 8 Compass + 5 Navigation scores (pure)
  results.js               Scores → narrative content for the result screens/PDFs (pure)
  charts.js                Chart.js Compass Rose radars
  share.js                 On-device encryption + Firebase / file partner handoff
  firebase-config.js       Your Firebase keys (disabled by default)
  data/
    assessment.json        ★ THE source of truth: every question + scoring weights
    copy.json              All copy + per-dimension narratives + conversation cards
content/                   Editable copy/scoring spreadsheets + export/import scripts
netlify.toml               Static deploy config (headers, redirects, dev-file 404s)
wireframe.html, reports-*.html, pdf-mockup.html   Original design mocks — not shipped
```

---

## Editing content (no code needed)

- **Questions, options, scoring** → `src/data/assessment.json`
- **Copy, narratives, conversation cards** → `src/data/copy.json`

Both are plain JSON. Change text freely; keep the keys/ids intact so `app.js` can find them.

### How scoring works

Each answer contributes `weights` toward Compass or Navigation dimensions. Config lives at the top of `assessment.json` (`scoring`):

| Type | How it scores |
|---|---|
| `single` | the chosen option's `weights` |
| `multi` | each chosen option's `weights` |
| `slider` | interpolates between `lowWeights` (0) and `highWeights` (100) |
| `ranking` | rank 1/2/3 → weights × `[3,2,1]` |
| `allocation` | each bucket's dollar share × `allocationScale` |

Raw totals are then min-max scaled into `normalizeRange` (default `[30,95]`) per framework so the radar reads as a balanced rose.

**Decisions baked in (change if you disagree):**
- **Dual-tag options** (e.g. `[Experiences/Connection]`) split weight evenly — `1 + 1` instead of `2`. See any option with two keys in `weights`.
- **`narrativeOnly` options** (Q1, most of Q3, Q15) carry no score; the answer is still stored for report personalisation.
- **Q9** stays a 5-bucket allocation (Security/Growth/Experiences/Connection/Legacy). Coverage of all 8 dimensions is still guaranteed by the anchors Q10, Q17, Q20 — matching your trimmed spec.

---

## Firebase setup (cloud share codes)

With no keys the app uses encrypted-file sharing. To switch on **cloud share codes**
(partner types a 4-char code instead of exchanging a file):

1. **Create a project** — [console.firebase.google.com](https://console.firebase.google.com) → *Add project* (Google Analytics optional).
2. **Add a Web app** — Project Overview → the `</>` (Web) icon → register the app. On "Add Firebase SDK" copy the `firebaseConfig` values.
3. **Paste the keys** into `src/firebase-config.js` (the `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` fields). Cloud sharing **turns on automatically** once `apiKey` + `projectId` are filled — there's no flag to toggle.
4. **Create the database** — Build → Firestore Database → *Create database* → **Production mode** → pick a location.
5. **Publish the rules** — either paste `firestore.rules` into Firestore → *Rules* tab → Publish, or with the Firebase CLI: `firebase deploy --only firestore:rules`.
6. **Rebuild + redeploy** the site (`npm run build:css` isn't needed for this change — just redeploy the updated `firebase-config.js`).

That's it. No Firebase **Auth** is used, so you don't need to configure authorised
domains — the Firestore rules (not the origin) control access, and reads/writes work
from any host.

**How it's secured:** profiles are AES-GCM encrypted with a PBKDF2 key derived from the
shared passphrase **before** upload, so Firestore only ever holds ciphertext. The rules
(`firestore.rules`) allow reading one code you already know and creating a ciphertext
blob, but forbid listing, updating or deleting — so shares can't be enumerated or
clobbered. The passphrase is exchanged partner-to-partner and never stored.

> **Note — the Web config values are not secrets.** They identify the project, not grant
> access; security comes entirely from the rules. It's fine for them to sit in client JS.

### Old share cleanup (optional)

To stop old shares accumulating, enable a Firestore **TTL policy** so they auto-expire:

1. Firestore → **TTL** → *Create policy*
2. Collection: `shares` · Timestamp field: **`expiresAt`**
3. Save. Firestore then deletes each share within ~24–72h of its `expiresAt`.

Each share is written with `createdAt` and `expiresAt` **Firestore Timestamps** (see
`uploadShare` in `src/share.js`); `expiresAt` defaults to **30 days** after creation
(change `SHARE_TTL_DAYS` to adjust). Point the policy at `expiresAt`, not `createdAt` —
a policy on `createdAt` would expire shares almost immediately.

> **Important:** TTL policies only act on **Timestamp** fields — a plain number is
> silently ignored. That's why these are written as `Timestamp`, not `Date.now()`.

Not required for the app to work — without a policy, shares simply persist until you
clear the collection manually.

---

## Reports (View my report)

`reports-mobile.html` is the live, **data-driven** on-screen report — a mobile-first,
tabbed reading view (My Compass / Navigation / Shared). It reads the finished profile
from `localStorage`, rebuilds the narratives with `results.js`, and draws the radars +
journey charts. The in-app buttons ("**View**" on each report card, "**View Our Shared
Compass**" on the shared card) open it at the right tab via `?tab=`:

| URL | Opens |
|---|---|
| `reports-mobile.html?tab=compass` | My Wealth Compass — rose + 8 directions, narrative & next step |
| `reports-mobile.html?tab=navigation` | My Navigation Preferences — journey + insights |
| `reports-mobile.html?tab=shared` | Our Shared Compass — overlaid roses + journeys (needs a partner) |

It handles both guard states: no finished assessment → a "nothing to show yet" prompt
back to the app; no partner → the Shared tab shows an "invite your partner" state.

**MVP decision — view, not download.** For MVP the reports are read on screen (no PDF
export). A downloadable **A4 PDF** version also exists in `report.html`
(`?type=compass|navigation|shared&print=1`, auto-opens Save-as-PDF) — it's fully working
but **not linked from the app** right now. Wire those buttons back to `report.html` (or
add an html2pdf.js one-tap export) whenever you want downloads.

> `reports-wireframe.html` and `pdf-mockup.html` are older design mocks (sample data:
> Sarah & James) and are 404'd on the live site via `netlify.toml`.

---

## Partner sharing (file-based by default)

The shipped MVP shares partner profiles as an **encrypted `.wc` file** — no backend,
nothing leaves the device unencrypted. On the reports screen you set a passphrase and
**Download my Compass to share**; your partner opens it on the **Add your partner's
Compass** screen with the same passphrase. Cloud **share codes** are optional: add real
keys to `src/firebase-config.js` and the UI automatically switches to code-based handoff
(see "Firebase setup" below).

---

## Deploy (Netlify)

Drag-and-drop the folder into Netlify, or connect the repo. `netlify.toml` is set for a
no-build static deploy, adds security headers, keeps `/content/*` and the old design
mocks off the live site, and routes deep links to the app. Firebase (if you add keys)
needs no extra Netlify config — it's Firestore-only, so there are no authorised domains
to set.

---

## What's still open

- **Ranking is tap-to-order**, not drag — simpler and mobile-friendly; drag can be added later.
- The seeded per-dimension narratives in `copy.json` are drafts in your tone — review/edit them via the spreadsheets in `content/` (see `content/README.md`).
```
