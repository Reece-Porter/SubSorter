# Subscription Ghost 👻

Find and cancel the recurring subscriptions you've forgotten about.

**Private by design:** everything lives in your browser's `localStorage`. No account,
no cloud, no backend database — your financial data never leaves your device.

## Status

- **Part 1 — Manual tracking:** ✅ built
  - Dashboard with total monthly & yearly spend, and active subscriptions sorted by
    next billing date (soonest first).
  - Add / edit subscriptions (name, cost, weekly/monthly/yearly/custom frequency,
    next billing date, category, notes).
  - Per-card days-until-renewal with visual urgency (renewals within 3 days stand out).
  - **Cancel this** — sets a reminder a few days before renewal (configurable) rather
    than pretending to cancel, then a **Confirm cancelled** step once you've actually done it.
  - **Not sure I use this** flag → dedicated **Review** list.
  - **Stats** — spend by category and a "money you've stopped" counter that grows over
    time from cancelled subscriptions.
  - Always-visible **Due soon** panel (renewals within 7 days) as the reliable,
    backend-free reminder, plus optional browser notifications while the app is open.
- **Part 2 — CSV / PDF / image import:** ✅ built
  - One **Import** flow for three sources (CSV, PDF, image), unified into the same
    "review detected subscriptions" screen.
  - Everything is processed **in the browser** — the file is never uploaded.
  - **CSV:** robust parser (quotes, `,`/`;`/tab delimiters, header detection,
    separate debit/credit columns, mixed date formats, sign inference).
  - **PDF:** text extracted client-side via `pdfjs-dist` (worker served locally from
    `/public`); scanned/image-only PDFs are detected and offered an OCR fallback.
  - **Image / scanned PDF:** on-device OCR via `tesseract.js`. The OCR engine and
    English language data are **self-hosted under `/public/tesseract`**, so OCR runs
    fully offline with no third-party CDN — nothing about the statement leaves the device.
  - **Extraction preview** before detection, with garbled-merchant / implausible-amount /
    missing-date rows flagged for the user to check rather than silently included.
  - **Recurring detection** groups repeated merchant+amount charges, infers cadence,
    predicts the next date, guesses a category, and scores confidence — uncertain
    matches start unchecked and must be confirmed.
  - Heavy parsers (`pdfjs-dist`, `tesseract.js`) are **lazy-loaded** — they only enter
    the bundle when that file type is actually imported.
- **Part 3 — Reminders:** ✅ built
  - Always-visible **Due soon** panel on the dashboard (configurable window) — the
    reliable, backend-free reminder.
  - Optional **browser notifications** for renewals and cancel-reminders, fired while
    the app (or its installed window) is open, de-duplicated to at most once per day.
  - A **service worker** (offline app shell + notification-click focus) and a
    **web manifest**, so the app is installable / add-to-home-screen.
  - The UI is explicit that, with no backend, reminders can't be pushed when the app is
    fully closed — the Due soon list is the dependable fallback.

## Tests

```bash
npm run test:import                                   # amount/date parsing, CSV, recurring detection (27)
npx tsx --tsconfig tsconfig.json scripts/test-reminders.mts   # reminder computation (5)
```

## Tech

- Next.js (App Router) + TypeScript
- Tailwind CSS, hand-built components (no component-library dependency)
- CSS/SVG bars for stats (no chart library)
- State + persistence via a small React context over `localStorage`
  (namespaced key `subscription-ghost:v1`, versioned schema)

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Data & privacy

All data is stored under the `subscription-ghost:v1` key in `localStorage`. You can
export a JSON backup or import one from **Settings**, and clear everything at any time.
Because there's no server, reminders can't be pushed while the app is fully closed —
the in-app **Due soon** list is the dependable fallback.
