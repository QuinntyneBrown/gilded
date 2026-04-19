# T-038: Appointment intent + reminder banner

**Traces to:** L2-012 (L1-007), L2-024 (L1-016)
**Depends on:** T-006, T-023, T-037
**Est. session:** Small (~2 h)

## Objective
Ship `POST /api/appointment-intent` recording `(coupleId, counsellorId, at)`. On the chosen counsellor's profile, expose a Make Appointment `MatButton` that records the intent, reveals booking link / phone / email (via `MatExpansionPanel`), and opens the booking link in a new tab with `rel="noopener noreferrer"`. Any pending appointment intent shows an `AppShell` banner until the couple marks it `Booked` or `Cancelled`.

## Scope
**In:**
- Entity + three endpoints: `POST /api/appointment-intent`, `POST /api/appointment-intent/:id/booked`, `POST /api/appointment-intent/:id/cancelled`.
- Banner in `AppShellComponent` reading `/api/me/appointment-intent/current`.
- POM: extend `CounsellorProfilePage` with `makeAppointment()`; extend `AppShellPage` with `expectAppointmentBanner()`, `markBooked()`, `markCancelled()`.

**Out:**
- Actual calendar booking — we route to the counsellor's external link.

## Radical Simplicity Mandate
- Three endpoints, one entity, one banner. No rich state machine.

## ATDD Workflow
1. **RED.** Playwright specs: make appointment → booking revealed + banner appears; click link opens new tab with correct rel; mark booked → banner disappears.
2. **COMMIT:** `test(T-038): add failing appointment intent tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-038): add appointment intent and banner`

## Verification Check
1. **Simpler?** Banner is a single `<mat-card>` in the shell component. No overlay service.
2. **Complete?** All three statuses verified.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria (from L2-012)
1. Given a couple with a chosen counsellor, when a user clicks Make Appointment, then contact/booking info is displayed and an intent event is recorded.
2. Given the counsellor has a booking link, when clicked, then it opens in a new tab with `rel="noopener noreferrer"`.
3. Given an appointment intent exists, when the couple revisits, then a banner reminds them and prompts Booked/Cancelled.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
