# T-033: Shared moderation ruleset service

**Traces to:** L2-010 AC3 (L1-005), L2-015 AC2 (L1-008)
**Depends on:** —
**Est. session:** Small (~1.5 h)

## Objective
Ship a single `ModerationRuleset.evaluate(text): 'allow' | 'flag' | 'reject'`. Consumed by reviews (T-031), comments (T-032), and public notes (T-042). A failing rule returns a stable reason string. Default ruleset: profanity list + max-links heuristic + all-caps heuristic.

## Scope
**In:**
- Pure function, zero I/O, deterministic.
- Unit tests for each rule.
- Reason strings are stable constants exported from the module.

**Out:**
- ML models, external moderation APIs — future work.

## Radical Simplicity Mandate
- One file, one exported function, one constants block. No class hierarchy of rules. No plug-in loader.
- Profanity list is a small array of regexes — read from a const, not a DB.

## ATDD Workflow
1. **RED.** Unit tests: clean text → allow; profanity → reject; 4+ links → reject; all-caps > 20 chars → flag.
2. **COMMIT:** `test(T-033): add failing moderation ruleset tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-033): add moderation ruleset`

## Verification Check
1. **Simpler?** Can every rule be a one-liner inside a switch/if? Remove intermediate abstractions.
2. **Complete?** Reviews, comments, public notes all call this and reject accordingly.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria
1. Given a text containing a disallowed term, when evaluated, then the result is `'reject'` with a stable reason.
2. Given clean text, when evaluated, then the result is `'allow'`.
3. Given text with >= 4 links, when evaluated, then the result is `'reject'`.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
