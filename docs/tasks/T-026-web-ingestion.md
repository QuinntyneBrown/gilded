# T-026: Web research ingestion job

**Traces to:** L2-007 (L1-003)
**Depends on:** T-019, T-020, T-025
**Est. session:** Small (~3 h)

## Objective
Ship a scheduled job (`npm run ingest:counsellors` and a CRON hook) that pulls additional counsellor records from the configured web research source, normalizes them, deduplicates against existing rows, and persists with `source='web_research'`. Missing-required-field rows are logged and skipped; no third-party secrets appear in logs.

## Scope
**In:**
- Ingestion entrypoint + concrete provider client (e.g., Psychology Today scraper or authorized search API).
- Dedup key: `(normalizedName + normalizedAddress) | phone | email`.
- Job runs to completion on a bounded batch (e.g., 200 records); next run picks up where it left off.
- Structured log lines: `{ source, processed, inserted, merged, skipped, durationMs }`.

**Out:**
- UI visibility into ingestion runs (not required).
- Retries on transient failures beyond one immediate retry.

## Radical Simplicity Mandate
- Reuse the parser and upsert logic from T-025 if shape permits. Otherwise write a second small function rather than a generic "ingestion framework".
- Single config: source URL + API key read from env. No DSL for ingestion sources.

## ATDD Workflow
1. **RED.** Integration test against a local HTTP fixture server: 10 records, 2 duplicates of existing seeded rows, 1 missing-name → expected outcomes: 7 inserted, 2 merged, 1 skipped; no secret appears in any log entry.
2. **COMMIT:** `test(T-026): add failing ingestion pipeline tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-026): add web research ingestion job`

## Verification Check
1. **Simpler?** Is the batch loop a single `for...of`? Collapse any unused abstraction.
2. **Complete?** Dedup covers all three key variants.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed; fixture server lives under `tests/`.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-007)
1. Given the ingestion job runs, when a new counsellor is discovered, then the record is persisted with `source=web_research`, `verified=false`, and a `sourceUrl`.
2. Given an ingested counsellor matches an existing record by (name + address) or (phone) or (email), when processed, then the record is merged rather than duplicated.
3. Given a record missing required fields (name, location), when processed, then it is rejected and logged.
4. Given the ingestion job, when it runs, then it must not expose third-party API keys in logs or error messages.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
