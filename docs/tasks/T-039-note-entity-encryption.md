# T-039: Note entity + encryption-at-rest

**Traces to:** L2-013 AC3 (L1-008, L1-010), L2-014 AC4
**Depends on:** T-001
**Est. session:** Small (~2 h)

## Objective
Define the `Note` entity and the at-rest encryption path used by private and spouse-shared notes. `body` is stored as an opaque ciphertext column; the service wraps a KMS envelope-encryption helper around writes and reads. Key is not shared across tenants (per-couple for spouse notes, per-user for private notes).

## Scope
**In:**
- Entity columns: `id`, `authorId`, `coupleId` (nullable), `visibility` (`private` | `spouse` | `public`), `ciphertext`, `iv`, `keyId`, `createdAt`, `updatedAt`, `deletedAt`.
- Key provider interface with one concrete implementation (env-backed KMS or local keystore).
- Key derivation: per-user for private notes; per-couple for spouse notes; plaintext storage for public notes (they're intended to be readable by anyone).
- Envelope model: data key encrypted by KMS master; stored `keyId` references the wrapped data key record.

**Out:**
- UI (T-044).
- Key rotation — add only if future requirement demands.

## Radical Simplicity Mandate
- One `NoteCrypto` module: `encrypt(plaintext, owner)` / `decrypt(note)`. No class per key type.
- AES-256-GCM via Node's built-in `crypto`. No custom scheme.
- One `keys` table. No elaborate KMS wrapper.

## ATDD Workflow
1. **RED.** Unit tests: encrypt/decrypt round-trip per visibility; raw ciphertext in the DB does not contain plaintext substring; two users produce different ciphertext for identical plaintext.
2. **COMMIT:** `test(T-039): add failing note encryption tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-039): add note entity with encryption-at-rest`

## Verification Check
1. **Simpler?** `NoteCrypto` under ~60 lines. Remove any unused branch.
2. **Complete?** Per-user + per-couple scopes both proven via tests.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck green?**

## Acceptance Criteria
1. Given a private note is written, when persisted, then the plaintext never appears in the database columns.
2. Given a spouse-shared note is written, when persisted, then its key is derived per-couple (not shared across couples).
3. Given a public note is written, when persisted, then the body is readable without a key.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
