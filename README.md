# BOBO

Bakery-to-cafés daily delivery platform for the **BOBO** café chain.
Web prototype (Next.js). See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

**Live demo:** https://bobo-gamma-five.vercel.app · deploy notes in [DEPLOY.md](./DEPLOY.md).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma ORM + **PostgreSQL** (Neon); deployed on **Vercel**
- JWT auth (httpOnly cookie), accounts provisioned by the admin only
- Money stored as integer pence (GBP)

## Run locally

```bash
npm install        # also runs `prisma generate`
npm run db:push    # create the SQLite schema (prisma/dev.db)
npm run db:seed    # load demo data
npm run dev        # http://localhost:3000
```

Reset the database at any time: `npm run db:reset`.

## Demo accounts

| Role          | Login        | Password         |
| ------------- | ------------ | ---------------- |
| Administrator | `admin`      | `admin123`       |
| Bakery        | `bakery`     | `bakery123`      |
| Café — Soho   | `soho`       | `soho123`        |
| Café — Shoreditch | `shoreditch` | `shoreditch123` |
| Courier       | `courier`    | `courier123`     |

## Status

**Core complete (M0–M5)** — the full lifecycle works end-to-end:

- **Two-tier order confirmations** — *Type 1* weekly-draft negotiation (bakery proposes → café confirms or submits edits → bakery accepts/rejects; 36h-before-week deadline with auto-confirm) and *Type 2* in-week change requests (café requests a delivery change before its product cutoff → bakery accepts/rejects). Bakery *Weekly orders* shows café **tabs** that highlight cafés needing attention; **Requests** inboxes (bakery + café) with dashboard badges.
- **M5 invoicing (weekly batch)** — one action bills a completed week for **all cafés**;
  delivered items priced from the order snapshot; **confirmed incidents are excluded from
  the total but listed as a line**. Gated: the week must have ended and have no unresolved
  incidents; empty / already-invoiced cafés are skipped; then "Send all" for the week.
  (All cafés are weekly — monthly periodicity retired.)
- **M4 incidents** — courier/café report damage/loss (optional photo); bakery confirms/rejects.
- **M3 delivery & courier** — Dispatch → assign courier → pickup → photo delivery → café tickets.
- **M2 weekly orders** — products × 7-day grid, per-cell cutoff lock, confirm/reopen.
- **M1 admin** — catalog, delegation, accounts, cafés & invoice periodicity.
- **M0** — auth & role-based routing.

The catalog (~31 products) is priced. Photos are written under `public/uploads`
(swap `src/lib/storage.ts` for S3 in production).

Remaining (M6 polish): dashboards/notifications, an auto-confirm-at-cutoff scheduler,
a seeded "week in the life" demo, and a Postgres + S3 deployment pass.
