# T-049: Structured logging with redaction

**Traces to:** L2-021 AC1, AC2 (L1-014)
**Depends on:** T-001
**Est. session:** Small (~1.5 h)

## Objective
Every request emits one structured log line `{ requestId, userId?, route, method, status, latencyMs }`. Redaction list guarantees note content, passwords, tokens, and full email addresses never appear in logs.

## Scope
**In:**
- Request id middleware (ULID). Propagated in response header `X-Request-Id`.
- Logger wrapper with a redaction allowlist instead of denylist — only whitelisted fields pass through at each call site.
- Test that a seeded note body fails a substring search across log output.

**Out:**
- Distributed tracing (future).

## Radical Simplicity Mandate
- One logger instance. One middleware. Redaction enforced by *not including* sensitive fields in the log call at all — whitelist allows only the request metadata above.

## ATDD Workflow
1. **RED.** Log-capture test asserts the line shape and that note content never appears even when a note request is logged.
2. **COMMIT:** `test(T-049): add failing structured log tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-049): add structured logging with redaction`

## Verification Check
1. **Simpler?** Logger wrapper under ~25 lines.
2. **Complete?** Assert redaction across all covered endpoints.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria (from L2-021 AC1, AC2)
1. Given any request, when handled, then a structured log entry with request id, user id (if present), route, status, and latency is emitted.
2. Given any log entry, when emitted, then note content, passwords, tokens, and full email addresses are never included.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
