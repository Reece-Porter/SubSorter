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
- **Part 2 — CSV / PDF / image import:** ⏳ planned
- **Part 3 — Reminders:** partially in place (Due soon list + notification permission)

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
