# T-019: Counsellor entity + read API

**Traces to:** L2-006 (L1-002, L1-003)
**Depends on:** T-001
**Est. session:** Small (~2 h)

## Objective
Define the `Counsellor` entity and expose `GET /api/counsellors/:id`. The profile payload includes name, denomination, credentials, specialties, address, phone, email, website, bookingLink, source (`web_research` | `user_submitted`), verified flag, submittedBy (nullable), sourceUrl (nullable), photoUrl (nullable), aggregate rating (nullable), review count.

## Scope
**In:**
- Persistence layer (chosen DB).
- Single read endpoint. Empty ratings mean no aggregate (`rating` is null in the response, not `0`).
- Indices: unique on (normalizedName, normalizedAddress), unique on phone, unique on email.

**Out:**
- List / search (T-021).
- Write endpoints (T-027).
- Photo handling (T-024).

## Radical Simplicity Mandate
- One entity class, one repo. No inheritance hierarchy. No "Counsellor projection" class in addition to the domain class until a second shape is actually needed (T-021 may introduce `CounsellorSearchItem` then — not now).
- Do not model specialties or credentials as linked tables when a string array column works. Upgrade only if a later requirement needs filtering by them.

## ATDD Workflow
1. **RED.** API Playwright spec: seed one counsellor row; `GET /api/counsellors/:id` returns all listed fields; unknown id → 404; counsellor with zero reviews → `rating: null, reviewCount: 0`.
2. **COMMIT:** `test(T-019): add failing counsellor read API tests`
3. **GREEN.** Implement entity + endpoint.
4. **COMMIT:** `feat(T-019): add counsellor entity and read API`

## Verification Check
1. **Simpler?** Any mapper pulling fields across layers for no reason?
2. **Complete?** All L2-006 AC1-3 covered by the payload.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-006)
1. Given a counsellor record, when viewed, then the profile displays: name, denomination/faith tradition, credentials, specialties, address, phone, email, website, booking link, and source.
2. Given a counsellor profile, when displayed, then aggregate rating (1-5 stars, one decimal), review count, and distance from the viewer's saved postal code (if set) are shown.
3. Given a counsellor with no reviews, when displayed, then the rating area shows "No reviews yet" rather than 0 stars.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
