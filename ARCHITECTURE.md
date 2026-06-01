# BOBO — Architecture & Build Plan

Daily bakery-to-cafés delivery platform for the **BOBO** café chain.

- **UI language:** English
- **Phase 1:** responsive web prototype
- **Phase 2 (later):** native Android
- **Design principle:** all business logic lives behind a clean HTTP/JSON API so both web and the future Android client consume the same endpoints.

---

## 1. Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js (App Router)**, monolith | Web UI + real REST API in one repo; fast for a prototype |
| API | **Route Handlers `/api/*`, REST/JSON, JWT auth** | Android later calls the same endpoints; JWT works for web cookies and Android bearer tokens |
| Database | **PostgreSQL** + **Prisma** ORM (via `docker compose`) | Native enums, decimals, a production-ready path; one command to run |
| UI | **React + Tailwind + shadcn/ui**, responsive | Courier works from a phone browser (camera via web) |
| File storage | Local disk behind a `Storage` interface → **S3** later | Delivery / incident photos |
| Auth | Login + password, **accounts provisioned by Admin only** (no self-signup), bcrypt | Per spec, the Admin issues all credentials |
| Notifications | In-app + email stub (logged) for the prototype | Delivery tickets, cutoff reminders, invoices |

> Note: earlier we floated SQLite for zero-infra. Switched to Postgres because the schema relies on enums/decimals and this app is meant to grow to a shared Android backend. `docker compose up -d` makes it a single command; flipping to SQLite later is trivial if needed.

---

## 2. Roles & permissions

| Capability | Admin | Bakery | Café | Courier |
|---|:--:|:--:|:--:|:--:|
| Create accounts / credentials | ✅ | — | — | — |
| Edit product catalog | ✅ | ⚙️* | — | — |
| Edit prices | ✅ | ⚙️* | — | — |
| Delegate edit rights to Bakery | ✅ | — | — | — |
| Initiate the weekly order (initiator) | — | ✅ | — | — |
| Edit the order (until per-product cutoff) | — | — | ✅ | — |
| Assign courier to a delivery | — | ✅ | — | — |
| Confirm pickup at the bakery | — | — | — | ✅ |
| Confirm delivery with a photo | — | — | — | ✅ |
| Receive delivery ticket | — | — | ✅ | — |
| Report an incident | — | — | ✅ | ✅ |
| Confirm / reject an incident | — | ✅ | — | — |
| Generate & send invoices | — | ✅ | — | — |

`⚙️*` — only when the Admin has enabled `canBakeryEditProducts` / `canBakeryEditPrices`.

---

## 3. Domain model

### Entities & relationships

- `Cafe` 1—N `OrderWeek`; `OrderWeek` 1—N `OrderLine` (keyed by date + product).
- Confirmed `OrderLine`s for a date → `Delivery` + `DeliveryItem`s.
- `Delivery` 1—N `Incident`.
- A billing period → `Invoice` 1—N `InvoiceLine`.

### Prisma schema (draft)

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role            { ADMIN BAKERY CAFE COURIER }
enum OrderWeekStatus { DRAFT CONFIRMED }
enum DeliveryStatus  { PLANNED PICKED_UP DELIVERED }
enum IncidentType    { DAMAGE LOSS }
enum IncidentReporter{ COURIER CAFE }
enum IncidentStatus  { REPORTED CONFIRMED REJECTED }
enum InvoicePeriod   { WEEKLY MONTHLY }
enum InvoiceStatus   { DRAFT SENT }
enum InvoiceLineType { CHARGE INCIDENT }

model User {
  id           String   @id @default(cuid())
  name         String
  login        String   @unique
  passwordHash String
  role         Role
  cafe         Cafe?    @relation(fields: [cafeId], references: [id])
  cafeId       String?
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  courierDeliveries Delivery[] @relation("Courier")
  reportedIncidents Incident[] @relation("ReportedBy")
  resolvedIncidents Incident[] @relation("ResolvedBy")
}

model Cafe {
  id            String        @id @default(cuid())
  name          String
  address       String?
  contacts      String?
  invoicePeriod InvoicePeriod @default(WEEKLY)
  invoiceAnchor Int           @default(1) // weekly: ISO day 1-7; monthly: day-of-month
  active        Boolean       @default(true)
  users         User[]
  orderWeeks    OrderWeek[]
  deliveries    Delivery[]
  invoices      Invoice[]
}

model Product {
  id              String        @id @default(cuid())
  name            String
  category        String        // Kitchen bread | Smoked / meat / prep | Pastry / retail bakery
  unit            String        // item | kg
  price           Decimal       @db.Decimal(10, 2)
  allowsNote      Boolean       @default(false) // order line may carry an optional note (e.g. Pickled Goods)
  changeLeadHours Int           @default(18) // cutoff: hours before the delivery day starts
  active          Boolean       @default(true)
  orderLines      OrderLine[]
  deliveryItems   DeliveryItem[]
  incidents       Incident[]
  invoiceLines    InvoiceLine[]
}

model Settings {
  id                    Int     @id @default(1)
  canBakeryEditProducts Boolean @default(false)
  canBakeryEditPrices   Boolean @default(false)
  currency              String  @default("GBP")
}

model OrderWeek {
  id          String          @id @default(cuid())
  cafe        Cafe            @relation(fields: [cafeId], references: [id])
  cafeId      String
  isoYear     Int
  isoWeek     Int
  status      OrderWeekStatus @default(DRAFT)
  confirmedAt DateTime?
  createdAt   DateTime        @default(now())
  lines       OrderLine[]
  @@unique([cafeId, isoYear, isoWeek])
}

model OrderLine {
  id            String    @id @default(cuid())
  orderWeek     OrderWeek @relation(fields: [orderWeekId], references: [id], onDelete: Cascade)
  orderWeekId   String
  date          DateTime  // specific delivery day
  product       Product   @relation(fields: [productId], references: [id])
  productId     String
  qty           Int
  priceSnapshot Decimal   @db.Decimal(10, 2)
  note          String?   // optional note for products with allowsNote (e.g. Pickled Goods)
  lockedAt      DateTime? // set when the product cutoff passes
  @@unique([orderWeekId, date, productId])
}

model Delivery {
  id                String         @id @default(cuid())
  cafe              Cafe           @relation(fields: [cafeId], references: [id])
  cafeId            String
  date              DateTime
  courier           User?          @relation("Courier", fields: [courierId], references: [id])
  courierId         String?
  status            DeliveryStatus @default(PLANNED)
  pickupConfirmedAt DateTime?
  deliveredAt       DateTime?
  photoUrl          String?        // delivery confirmation photo
  items             DeliveryItem[]
  incidents         Incident[]
  @@unique([cafeId, date])
}

model DeliveryItem {
  id         String   @id @default(cuid())
  delivery   Delivery @relation(fields: [deliveryId], references: [id], onDelete: Cascade)
  deliveryId String
  product    Product  @relation(fields: [productId], references: [id])
  productId  String
  qty        Int
}

model Incident {
  id           String           @id @default(cuid())
  delivery     Delivery         @relation(fields: [deliveryId], references: [id])
  deliveryId   String
  product      Product          @relation(fields: [productId], references: [id])
  productId    String
  qty          Int
  type         IncidentType
  reporterRole IncidentReporter
  reportedBy   User             @relation("ReportedBy", fields: [reportedById], references: [id])
  reportedById String
  photoUrl     String?
  note         String?
  status       IncidentStatus   @default(REPORTED)
  resolvedBy   User?            @relation("ResolvedBy", fields: [resolvedById], references: [id])
  resolvedById String?
  resolvedAt   DateTime?
  createdAt    DateTime         @default(now())
}

model Invoice {
  id          String        @id @default(cuid())
  cafe        Cafe          @relation(fields: [cafeId], references: [id])
  cafeId      String
  period      InvoicePeriod
  periodStart DateTime
  periodEnd   DateTime
  status      InvoiceStatus @default(DRAFT)
  total       Decimal       @db.Decimal(12, 2) @default(0)
  sentAt      DateTime?
  createdAt   DateTime      @default(now())
  lines       InvoiceLine[]
}

model InvoiceLine {
  id            String          @id @default(cuid())
  invoice       Invoice         @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  invoiceId     String
  type          InvoiceLineType
  product       Product         @relation(fields: [productId], references: [id])
  productId     String
  qty           Int
  unitPrice     Decimal         @db.Decimal(10, 2)
  amount        Decimal         @db.Decimal(12, 2)
  countsToTotal Boolean         @default(true) // false for INCIDENT lines (excluded from total)
}
```

---

### Catalog taxonomy (live BOBO product list)

Products are grouped into three categories; each is priced per **item** or per **kg**:
- **Kitchen bread** — Sourdough, Focaccia, Burger Bun (per item)
- **Smoked / meat / prep** — Smoked Lamb / Brisket / Chicken, Halal Bacon / Sausage, Pickled Goods (per kg). *Pickled Goods* sets `allowsNote = true`.
- **Pastry / retail bakery** — croissants, buns, cookies, cakes, retail focaccia & sourdough (per item)

Any product may set `allowsNote = true` to allow an optional note on its order line. Prototype seeds the real ~31-item list **unpriced** (admin sets prices in the catalog screen).

---

## 4. Workflows & business rules

### Weekly order
```
Bakery creates OrderWeek (DRAFT, per-day quantities)
  → Café edits qty per (day, product)
  → each line locks when its product cutoff for that day passes
  → OrderWeek CONFIRMED
```
- **Per-product change cutoff:** `Product.changeLeadHours` before the start of the delivery day. After that the line is locked; edits are rejected.
- **Confirmation:** the Café confirms the week explicitly; if not confirmed by the cutoff, the Bakery's proposal **auto-confirms** with the latest state.
- **Quantities are per delivery day** — set independently for each day of the week (not one figure for the whole week).
- **Implemented (M2):** cutoff = `changeLeadHours` before the delivery day's UTC midnight (this remains the Type 2 cutoff below).
- **Implemented (two confirmation types):**
  - **Type 1 — weekly draft.** Bakery proposes a *future* week (`OrderWeek.status` PROPOSED). The café either **Confirms** (accept as-is → CONFIRMED) or **Submits** edits (→ CHANGES_REQUESTED), which the bakery **Accepts** (→ CONFIRMED) or **Rejects** (revert each line to `OrderLine.proposedQty` → PROPOSED). Café deadline = `Settings.weeklyConfirmLeadHours` (default 36h) before the week starts; past it the bakery proposal **auto-confirms** (lazy, on access). Not available for the current/past week.
  - **Type 2 — in-week change.** On a CONFIRMED week the café raises an `OrderChangeRequest` for one delivery line **before that product's cutoff**; the bakery Accepts (applies to the order line + any PLANNED delivery) or Rejects.
  - Bakery *Weekly orders* uses café **tabs** that highlight when a café needs attention; **Requests** screens (bakery + café) list everything awaiting action, surfaced as dashboard badges.

### Delivery
```
PLANNED
  → Courier confirms pickup of all parcels at the bakery (PICKED_UP)
  → per café: upload photo → DELIVERED
  → Café receives a delivery ticket + notification
```
The `Delivery` record in `DELIVERED` state **is** the café-facing "delivery ticket".

- **Implemented (M3):** deliveries are derived from **CONFIRMED** order weeks — the bakery's *Dispatch* screen assigns a courier per café/date, which snapshots the order lines into `DeliveryItem`s (re-synced while `PLANNED`). Pickup is one action per courier per date (all their `PLANNED` → `PICKED_UP`). Delivery photos are stored on local disk via `src/lib/storage.ts` (`public/uploads`; S3 in production).

### Incident
```
REPORTED (by Courier or Café; bound to Delivery + Product + qty; optional photo)
  → Bakery: CONFIRMED | REJECTED
```

- **Implemented (M4):** courier or café reports damage/loss on a delivery item (qty capped at the delivered qty, optional photo via `src/lib/storage.ts`); bakery confirms/rejects on the *Incidents* screen. Confirmed incidents are consumed by invoicing in M5.

### Invoice — periodicity per café (WEEKLY / MONTHLY)
- `CHARGE` lines: delivered `qty × priceSnapshot` (`countsToTotal = true`).
- A **confirmed** incident: the affected quantity is **excluded from the total** but written as a separate `INCIDENT` line (`countsToTotal = false`) — visible on the invoice, not billed.
- `total = Σ CHARGE − (confirmed incidents)`.
- Currency: **GBP**, single currency, **no VAT** in the prototype.
- **Implemented (M5):** charges come from **DELIVERED** deliveries priced via the order's `priceSnapshotP`; each confirmed incident reduces the charged qty for its product and is emitted as a separate `INCIDENT` line with `countsToTotal=false`; `send` flips status to `SENT`.
- **Updated (weekly batch):** invoicing is a **weekly batch for all cafés** — per-café WEEKLY/MONTHLY periodicity is retired (everyone weekly). One action bills a completed ISO week, gated so the **week must have ended** and there are **no unresolved (REPORTED) incidents** in it (otherwise the whole batch is blocked); **empty** cafés and **already-invoiced** cafés are skipped; then "Send all (this week)" marks that week's drafts SENT. (`/api/invoices/generate-batch`, `/api/invoices/send-all`.)

---

## 5. API surface (sketch)

```
POST   /api/auth/login                 → { token }
GET    /api/me

# Admin
GET/POST/PATCH/DELETE  /api/admin/users
GET/PATCH              /api/admin/settings          # delegation flags, currency
GET/POST/PATCH/DELETE  /api/cafes
GET/POST/PATCH/DELETE  /api/products                # Bakery too, if delegated

# Orders
GET    /api/order-weeks?cafeId&year&week
POST   /api/order-weeks                              # Bakery creates draft
PATCH  /api/order-lines/:id                          # Café edits qty (enforces lock)
POST   /api/order-weeks/:id/confirm

# Deliveries
GET    /api/deliveries                               # filtered by role
POST   /api/deliveries/:id/assign                    # Bakery assigns courier
POST   /api/deliveries/:id/pickup                    # Courier
POST   /api/deliveries/:id/deliver                   # Courier, multipart (photo)

# Incidents
GET    /api/incidents
POST   /api/incidents                                # Courier / Café
POST   /api/incidents/:id/resolve                    # Bakery: confirm | reject

# Invoices
POST   /api/invoices/generate                        # Bakery
POST   /api/invoices/:id/send
GET    /api/invoices                                 # Café sees its own
```

---

## 6. Screens by role (web)

- **Admin:** accounts (credential CRUD), catalog + prices, delegation toggles, cafés + invoice periodicity.
- **Bakery:** weekly order builder per café, view café edits, catalog/prices (if delegated), courier assignment, incident review, invoice generation & send.
- **Café:** own order (edit until cutoff + confirm), delivery tickets, "report incident", invoices.
- **Courier:** today's route, "picked up at bakery", per café — photo + "delivered", "report incident".

---

## 7. Build milestones

- **M0** — scaffold: Next.js, Prisma schema, JWT auth, role-based routing, demo seed, this doc.
- **M1** — Admin: accounts, catalog, prices, delegation, periodicity.
- **M2** — Weekly order: bakery proposal → café edits with per-product cutoff lock → confirmation.
- **M3** — Delivery / courier: routes, pickup, photo delivery, café tickets + notifications.
- **M4** — Incidents: reporting (courier / café) → bakery confirm / reject.
- **M5** — Invoices: weekly / monthly, confirmed incidents excluded as a line, send.
- **M6** — Polish: dashboards, notifications, "a week in the life of BOBO" demo scenario.

---

## 8. Decisions log

| # | Decision | Status |
|---|---|---|
| — | UI language English; web prototype → native Android later | ✅ confirmed |
| — | Order quantities set per delivery day | ✅ confirmed |
| — | Currency **GBP**, single currency, no VAT | ✅ confirmed |
| 1 | Change cutoff = `changeLeadHours` before the delivery day | 🟡 working assumption |
| 2 | Café confirms the week; auto-confirm bakery proposal at cutoff | 🟡 working assumption |
| 3 | Single bakery (modeled to allow several later) | 🟡 working assumption |
| 4 | Bakery (not Admin) assigns couriers | 🟡 working assumption |

🟡 = applied as the working design; can be changed on request.

---

## 9. Deferred / future

- Native Android client (reuses the REST API + JWT auth).
- S3-backed photo storage; real email/push notifications.
- Multi-bakery support; audit log; price history.
