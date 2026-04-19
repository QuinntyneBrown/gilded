# T-054: End-to-end golden journey Playwright specs

**Traces to:** L1-001, L1-002, L1-005, L1-006, L1-007, L1-008 (the cross-cutting user value)
**Depends on:** every UI task (T-013-T-044)
**Est. session:** Small (~2 h)

## Objective
Ship the "golden path" journey specs that chain POMs to prove the full value loop for a Mississauga couple. Each spec is written at the flow level (using `e2e/flows/` helpers) and exercises real UI + real API, no mocks.

## Scope
**In:**
- `e2e/flows/signUpAndVerify.ts`
- `e2e/flows/linkSpouse.ts`
- `e2e/flows/findAndChooseCounsellor.ts`
- `e2e/flows/writeNotesAcrossVisibilities.ts`
- Specs:
  1. *Couple finds and books* — sign up both spouses, link them, one spouse searches L5A 4E6, shortlists three, compares, marks chosen, opens booking link. Asserts the other spouse receives the notification.
  2. *Three-tier notes under realistic auth* — spouse A writes a private note invisible to B; a spouse-shared note both see; a public note visible to solo user D; unlink causes spouse note to disappear for B.
  3. *Review and rate* — sign in, rate counsellor 4, write a 500-char review, comment on own review. Aggregate reflects the rating. Delete the review; rendered placeholder is correct.
- Each spec runs on all three browsers at viewport 1280 (desktop) plus 360 (mobile).

**Out:**
- Perf assertions (T-053 owns those).

## Radical Simplicity Mandate
- Flows are thin composers. Zero business logic. Just POM method calls in order.
- No shared state between specs; each spec creates its own seeded users via an API fixture.

## ATDD Workflow
1. **RED.** Write the three specs; they fail until all feature tasks are shipped.
2. **COMMIT:** `test(T-054): add failing golden journey specs`
3. **GREEN.** Assemble the flows. Only new code here is the `flows/` composition — everything else is already in POMs.
4. **COMMIT:** `feat(T-054): add golden journey e2e flows`

## Verification Check
1. **Simpler?** Each flow file < 20 lines; each spec reads like prose.
2. **Complete?** All three goldens pass on Chromium, WebKit, Firefox at both viewports.
3. **No temporary code?** No `.only`, no `.skip`, no hard-coded waits (`waitForTimeout`) — use Playwright's auto-waiting or an explicit `waitFor(...)` condition.
4. **No stubs/mocks in prod?** Confirmed; API fixtures seed real DB rows.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria
1. Given the couple journey spec, when run, then all steps pass end-to-end with no mocks.
2. Given the three-tier notes journey spec, when run, then visibility boundaries are honoured.
3. Given the review journey spec, when run, then rating + review + comment + delete are all visible in the UI and reflected in the API.

## Done When
- [ ] All three journey specs green on Chromium, WebKit, Firefox at 360 and 1280 viewports.
- [ ] Verification check answered.
- [ ] Two commits recorded.
