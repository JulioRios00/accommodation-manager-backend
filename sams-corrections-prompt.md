# SAMS — Corrections & Fixes Implementation Prompt

## Context

This is a round of QA/client feedback on the Accommodation Manager System (SAMS — React/Vite frontend, NestJS/PostgreSQL backend). Items are grouped by module below. Each has current vs. expected behavior, and likely investigation points. Items marked **⚠️ Decision needed** or **⚠️ Open question** require a product decision or clarification — implement the recommended option where one is given, but confirm rather than guess silently, and don't let them block unrelated items.

---

## General

### G1. "View + Edit" role cannot enter data manually
- **Current:** Users with the "View + Edit" role cannot create or edit any records manually (bookings, residents, properties, etc.) — write actions are blocked entirely.
- **Expected:** "View + Edit" should have full manual CRUD access consistent with its name — create and edit bookings, residents, properties, and other core entities.
- **Investigate:** role/permission guards (RBAC) on the relevant endpoints/UI — this role is likely scoped too narrowly (treated as read-only, or missing write scopes).
- **Acceptance criteria:** A "View + Edit" user can create/edit a resident, a booking, and a property end-to-end without permission errors. Roles that are genuinely read-only (e.g. "View") remain blocked.

### G2. Activity log
- **Current:** No audit trail exists.
- **Expected:** Log who changed what — user, action (create/update/delete), entity type + ID, timestamp, ideally a before/after diff of changed fields.
- **Suggested scope:** at minimum, bookings, residents, properties, beds, rent payments — the entities touched by the other items in this doc.
- **Acceptance criteria:** Every create/update/delete on tracked entities produces a log entry with actor, action, entity, and timestamp; the log is viewable/filterable (by user, entity, date range) in the admin UI.

---

## Properties

### P1. Mass import leaves bookings as "Unassigned Beds"
- **Current:** Bulk-imported bookings aren't allocated to a bedroom within the property; they end up with status "Unassigned Beds".
- **Expected:** Mass import should assign each booking to the correct bed/bedroom per the import data, same as manual booking creation.
- **Investigate:** compare the import pipeline's bed-assignment logic against the manual booking flow — likely the import path skips a bed-allocation step, or the bed reference isn't resolved/matched correctly from the import file.
- **Acceptance criteria:** Bookings created via mass import are assigned to a specific bed/bedroom when valid bed data is present in the import; only genuinely unmatched/invalid rows fall back to "Unassigned Beds".

### P2. "Resident Due Day" not editable, missing on create
- **Current:** On Edit Property, "Resident Due Day" can't be changed for existing properties. On Create Property, the field isn't available at all.
- **Expected:** "Resident Due Day" is settable on property creation and editable afterward, like other property fields.
- **Acceptance criteria:** Field appears on the create-property form and saves correctly; on an existing property it's editable and the update persists.

### P3. No way to set a property to "Inactive"
- **Current:** Property status can't be changed to "Inactive".
- **Expected:** Add the ability to set/change a property's status to "Inactive" (and back to "Active").
- **Note:** confirm what "Inactive" should mean functionally — e.g. hidden from active dashboards and new-booking flows, but still visible in historical reports. Flag as an assumption if not defined elsewhere.
- **Acceptance criteria:** Property status can be toggled to Inactive/Active from the property edit screen; inactive properties are excluded from wherever "active properties" are listed for new bookings.

---

## Bookings

### B1. ⚠️ Decision needed — Rent & Deposit: Bed vs. Booking
- **Current:** Rent and Deposit are defined on the Bed. Booking has its own Rent/Deposit fields too, but changing them on a Booking doesn't override anything — confirmed by test: Bed created with Rent/Deposit €850 → new Booking created for that Bed → Booking's Rent/Deposit changed to €900 → the Bed's value on the Property still shows €850, and the Booking's value isn't reflected downstream.
- **Two options proposed:**
  - **Option A — override model:** Keep Rent/Deposit on both Bed and Booking. The Booking's value overrides the Bed's default for that specific booking wherever Rent/Deposit is used (invoicing, reports, dashboards); the Bed's value remains the property's default for future bookings. Matches the discount example given: Bed default €850, this booking's Rent set to €800 → this booking is charged €800.
  - **Option B — single source of truth:** Remove Rent/Deposit from Booking entirely; set only on the Bed. Any booking-specific adjustment is made by editing the Bed directly (or via a separate "adjustment" concept if per-booking history needs to be preserved).
- **Recommendation:** Option A — it matches the discount example directly and preserves what a specific resident was actually charged even if the Bed's default rent changes later, which Option B would lose.
- **Acceptance criteria (Option A):** Wherever Rent/Deposit is used for a specific booking (booking detail, invoicing, receivables), the Booking's value is used if set, falling back to the Bed's value otherwise; the Bed's own listing keeps showing the Bed's default, unaffected by individual bookings.

### B2. Multiple active bookings for the same resident
- **Current:** A resident can have two active Bookings simultaneously.
- **Expected:** Block creation of a new active Booking for a resident who already has one active Booking (validation error on save).
- **Note:** confirm how moving a resident between beds/properties should work — e.g. must the current booking be closed first, or is there a "transfer" flow that should be exempt from this check.
- **Acceptance criteria:** Creating a second active Booking for a resident with an existing active Booking is rejected with a clear validation message; closing/ending a booking first allows a new one to be created normally.

---

## Rent Payments

### R1. Add "Partially Paid" status
- **Current:** No "Partially Paid" status exists.
- **Expected:** Add "Partially Paid", applied when a recorded payment is less than the amount due — confirm this fits the same derivation logic as existing statuses (e.g. how "Paid"/"Overdue" are currently determined) rather than being a manual-only status.
- **Acceptance criteria:** Recording a partial payment sets status to "Partially Paid"; full payment still results in "Paid"; the new status shows wherever other payment statuses appear.

### R2. Add "Properties" and "Rent Due Day" columns
- **Current:** The Rent Payments listing doesn't show Property or Rent Due Day, making receivables reconciliation harder (deciding whether to email, call, or issue notice).
- **Expected:** Add "Properties" and "Rent Due Day" as columns, ideally sortable/filterable.
- **Depends on:** P2 — Rent Due Day should read from the property's Resident Due Day field once that's fixed.
- **Acceptance criteria:** Both columns appear on the Rent Payments screen, populated correctly per row, and can be sorted/filtered.

### R3. ⚠️ Open question — invoice/charge generation cadence
- **Question raised:** for receivables, does the system automatically generate a new debt/invoice/charge every month for each existing Booking?
- **Action:** confirm and document current behavior with whoever owns the billing logic. Only change behavior if the answer reveals a real gap (e.g. it should be automatic and isn't).

---

## Reports

### RP1. "Property ID" search not working
- **Current:** The Property ID search field in Reports doesn't return results.
- **Expected:** Searching by Property ID returns that property's report data.
- **Investigate:** whether the search hits the wrong field/index, a type mismatch (string vs. ID), or a broken query param between frontend and backend.
- **Acceptance criteria:** A valid Property ID returns the correct filtered results; an invalid/non-existent ID returns a clear empty state rather than an error.

### RP2. ⚠️ Open question — Reports criteria
- **Question raised:** what criteria/logic determines the data shown in Reports?
- **Action:** document the current calculation/filter logic per report (data sources, date ranges, inclusion/exclusion rules) so it can be confirmed correct before any changes are made based on it.

---

## Suggested order of work
1. **G1** (permissions) and **B2** (duplicate active bookings) — data-integrity/access issues, low ambiguity.
2. **P2, P3, R2** — straightforward field/status additions.
3. **P1** (mass import bed assignment) and **RP1** (search bug) — bug fixes needing root-cause investigation.
4. **B1** — once Option A vs. B is confirmed.
5. **R1** — once status-derivation logic is confirmed.
6. **G2** (activity log) — larger, cross-cutting; can proceed in parallel with the rest.
7. **R3, RP2** — clarify/document first; only implement changes if the answer reveals a real gap.
