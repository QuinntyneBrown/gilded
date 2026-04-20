# T-044: Notes UI with three-visibility tabs + POM

**Traces to:** L2-013, L2-014, L2-015 (L1-008), L2-024 (L1-016), L2-017 (L1-011)
**Depends on:** T-006, T-040, T-041, T-042
**Est. session:** Small (~2.5 h)

## Objective
Ship `/notes`: three `MatTab`s — Private, Spouse, Public. Each tab lists its notes and has a create form beneath. Spouse tab is disabled with an explanatory message when the user is not in a couple. Public tab includes a feed view.

## Scope
**In:**
- `NotesPageComponent` with `<mat-tab-group>`.
- One small card component per note (`MatCard`) with edit + delete affordances.
- Create form (`MatFormField`, `MatInput` textarea, `MatButton`).
- Mobile layout: tabs collapse to `MatTabNav` icons-only at <576 px.
- POM: `NotesPage` with tab switching and note operations.

**Out:**
- Markdown rendering (not required).

## Radical Simplicity Mandate
- One page, three repeats of the same list-plus-form pattern — inline, not extracted to a child. Extract only if template exceeds ~180 lines.
- No state-management library. `signal` + direct HTTP calls.

## Page Object(s)
- `NotesPage` in `e2e/pages/notes.page.ts`:
  - `openTab('private'|'spouse'|'public')`
  - `createNote(body)`
  - `notes(): Promise<string[]>`
  - `editNoteAt(index, newBody)`
  - `deleteNoteAt(index)`
  - `expectSpouseTabDisabled()`

## ATDD Workflow
1. **RED.** Playwright specs: create + list in each tab; spouse tab disabled for solo user; private notes invisible to another user's session; public feed shows display name.
2. **COMMIT:** `test(T-044): add failing notes UI POM specs`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-044): add notes UI with three-visibility tabs`

## Verification Check
1. **Simpler?** Tabs share a create form template — confirm only one exists in the template.
2. **Complete?** All three tabs behave per their L2s; all responsive.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria
- Three tabs, one per visibility.
- Spouse tab disabled with message when `user.coupleId` is null.
- All controls use Material components.

## Done When
- [x] Acceptance tests green.
- [x] Verification check answered.
- [x] Two commits recorded.
