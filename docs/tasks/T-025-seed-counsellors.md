# T-025: Seed counsellors from `christian_counsellors_L5A_4E6.md`

**Traces to:** L2-006 (L1-002, L1-003), L2-024 (L1-016)
**Depends on:** T-019, T-024, T-020
**Est. session:** Small (~3 h)

## Objective
Ship a one-shot, idempotent seed command `npm run seed:counsellors` that parses the 100 individual counsellors plus the 8 bonus centre references from `christian_counsellors_L5A_4E6.md` at the project root, geocodes each, and inserts/upserts them as `Counsellor` rows with `source='web_research'`, `verified=false`, `sourceUrl` set to the Psychology Today profile URL. Every seeded profile ends up with either (a) a downloaded photo persisted via T-024's upload path, or (b) the placeholder avatar guaranteed (i.e., `photoUrl` is null so the profile page's avatar falls back automatically).

## Scope
**In:**
- Parser for the pipe-table rows. Tolerant of the "Established Christian Counselling Centres" section (second table, different shape).
- For each row:
  - Normalize name.
  - Extract credentials (column 3) into `credentials` string array by splitting on `,`.
  - Extract phone (column 4).
  - Extract profile URL (column 5) as `sourceUrl`.
  - Derive approximate address / city from the profile slug (e.g., `-mississauga-on/` → `Mississauga, ON`).
  - Postal code left null unless a later lookup finds one; use the slug-derived city for geocoding (`T-020`).
  - Denomination set to `"Christian (Non-denominational)"` by default (source is a Christian-therapists directory).
  - Specialties set to `["Faith-integrated therapy"]` by default.
  - `photoUrl`: attempt to download the profile image from the PT URL via a small scraper; on any failure set `photoUrl=null` so the placeholder avatar renders (T-023, T-024).
- Idempotency: rerunning the command results in zero new rows (upsert by `sourceUrl`).
- Bonus centres table inserted as counsellors with `sourceUrl` = website, `credentials = []`, `denomination = "Christian Counselling Centre"`, same default specialty.

**Out:**
- Ongoing ingestion scheduling — that is T-026.
- Anything beyond the data on that MD file.

## Radical Simplicity Mandate
- One script file, one parser function, one upsert loop. No pipeline framework.
- Use the existing HTTP client; do not bring in a scraping library if a single `fetch` + simple HTML regex for the profile image succeeds — and gracefully accept failure (the placeholder is the fallback).
- If photo download fails for any record, log at `info` level and continue. A seeded record without a photo is still correct because the placeholder is guaranteed.

## ATDD Workflow
1. **RED.** Integration test: run the seed against an empty DB pointing at a fixture copy of `christian_counsellors_L5A_4E6.md` (placed under `tests/fixtures/`). Assert exactly 108 counsellor rows (100 individual + 8 centres), each with `sourceUrl` set, `source='web_research'`, `verified=false`. Second assertion: run a second time — row count unchanged. Third: every seeded counsellor rendered via the profile page in Playwright displays either a photo or the placeholder avatar with no broken image.
2. **COMMIT:** `test(T-025): add failing counsellor seeding tests`
3. **GREEN.** Implement parser + seed command + photo-fetch-with-fallback.
4. **COMMIT:** `feat(T-025): seed counsellors from L5A 4E6 directory`

## Verification Check
1. **Simpler?** Is the parser a single function reading the file once? No streaming needed for this size.
2. **Complete?** 108 rows, idempotent rerun, every profile displays name/credentials/phone/source/photo-or-placeholder end-to-end.
3. **No temporary code?** No placeholder dummy counsellors, no hard-coded sample row slipped in, no `console.log` calls, no skipped rows.
4. **No stubs/mocks in prod?** The production path uses the real HTTP client; the test swaps the client at the interface boundary only.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria
1. Given a developer runs `npm run seed:counsellors` against an empty DB, when it completes, then 108 counsellor rows exist (100 individual + 8 bonus centres), all with `source='web_research'`, `verified=false`, `sourceUrl` set.
2. Given the seed has already run, when the developer runs it again, then no duplicate rows are created.
3. Given a seeded counsellor has no photo, when the profile page is rendered, then the placeholder avatar (T-024) is shown with initials over a theme-derived color.
4. Given a seeded counsellor has a photo, when the profile page is rendered, then the photo is displayed via `<img>` inside a Material `mat-card` header image slot with correct alt text.
5. Given the seed runs against the real PT URLs and any network error occurs on photo fetch, when the error is caught, then the row is still inserted with `photoUrl=null` and the seed process continues (no aborted run).

## Done When
- [x] Acceptance tests green (parser, idempotency, Playwright render check).
- [x] Verification check answered.
- [x] Two commits recorded.
- [x] Running `npm run seed:counsellors` against the real MD file from the project root seeds 108 rows.
- [x] Every profile renders a photo or the placeholder avatar.
