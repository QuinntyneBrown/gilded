# T-027: Manual counsellor submission + dedupe

**Traces to:** L2-008 AC1, AC2 (L1-004)
**Depends on:** T-019
**Est. session:** Small (~2 h)

## Objective
Ship `POST /api/counsellors` for authenticated users. Creates a record with `source='user_submitted'`, `verified=false`, `submittedBy=<userId>`, placed on the moderation queue (T-028). Rejects duplicates using the same dedup keys as T-026.

## Scope
**In:**
- Submission endpoint (auth required).
- Field validation: name, denomination, at least one contact method, address or postal code.
- Dedup 409 response includes the existing record id so the UI can link to it (T-029).

**Out:**
- UI (T-029).
- Approval flow (T-028).

## Radical Simplicity Mandate
- Reuse the dedup function from T-026.
- No domain events required; inserting a row with a `moderationState='pending'` column is the queue.

## ATDD Workflow
1. **RED.** API Playwright specs: valid submission → 201 + moderation pending; duplicate → 409 with existing id; missing denomination → 400; missing contact method → 400.
2. **COMMIT:** `test(T-027): add failing manual submission tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-027): add manual counsellor submission`

## Verification Check
1. **Simpler?** Any field validated twice?
2. **Complete?** All three AC paths covered.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-008 AC1, AC2)
1. Given a logged-in user on the submission form, when they submit required fields, then a record is created with `source=user_submitted`, `verified=false`, `submittedBy=<userId>`.
2. Given a submission matches an existing counsellor, when submitted, then the system surfaces the existing record and blocks duplicate creation.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
