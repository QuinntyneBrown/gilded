# T-018: Spouse management UI + POM

**Traces to:** L2-004 (L1-001), L2-024 (L1-016), L2-017 (L1-011)
**Depends on:** T-006, T-016, T-017
**Est. session:** Small (~2 h)

## Objective
Ship `/settings/spouse`: see current spouse (if linked), invite by email, accept pending invite, unlink. Material-only UI. POM exposes each action.

## Scope
**In:**
- `SpouseSettingsPageComponent`.
- Invite form (`MatFormField`, `MatInput`, `MatButton`).
- Pending-invite acceptance surface (if the current user has a pending invite to them, show an `MatCard` with Accept button).
- Linked state card: spouse display name, Unlink button (uses `MatDialog` confirmation).
- `SpouseSettingsPage` POM.

**Out:**
- Changing display name (not in requirements).

## Radical Simplicity Mandate
- One component. One page. No child components unless markup would otherwise exceed ~120 lines.
- Reuse the `ConfirmDialogComponent` if you already built one; if not, build the tiniest `MatDialog` for the unlink confirmation here.

## Page Object(s)
- `SpouseSettingsPage` in `e2e/pages/spouse-settings.page.ts`:
  - `invite(email)`
  - `acceptPending()`
  - `unlink()` (handles the dialog confirmation)
  - `expectLinkedTo(name)`
  - `expectUnlinked()`

## ATDD Workflow
1. **RED.** Playwright specs: invite from one seeded user to another, accept as the other, assert both linked; unlink dialog path confirms and detaches.
2. **COMMIT:** `test(T-018): add failing spouse settings POM specs`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-018): add spouse settings page`

## Verification Check
1. **Simpler?** Any `*ngIf` branch duplicating logic already asserted by data?
2. **Complete?** All three paths (invite, accept, unlink) visible end-to-end.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria
- UI covers L2-004 ACs 1-4 end-to-end.
- All components are Material; confirmation uses `MatDialog`.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
