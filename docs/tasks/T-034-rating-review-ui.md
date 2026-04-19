# T-034: Rating / review / comment UI + POM

**Traces to:** L2-009, L2-010 (L1-005), L2-024 (L1-016), L2-017 (L1-011)
**Depends on:** T-006, T-023, T-030, T-031, T-032
**Est. session:** Small (~3 h)

## Objective
Extend the counsellor profile page to host rating, review list with create form, and comment threads. Rating uses a 5-star `MatIcon` picker. Review form uses `MatFormField` + `MatInput` (textarea). Each review card has a `MatExpansionPanel` for its comments. Delete uses `MatMenu` with confirmation via `MatDialog`.

## Scope
**In:**
- Inline rating picker component using `MatIcon` buttons (not a third-party star library).
- Review form with char count (`MatHint`).
- Review list with pagination (`MatPaginator`) at 10.
- Comment form inside expansion panel.
- Delete affordances for author on own content; moderator controls behind role guard.
- POM extensions on `CounsellorProfilePage`:
  - `rate(stars: 1..5)`
  - `writeReview(body)`
  - `reviewCount(): Promise<number>`
  - `addCommentOnReviewAt(index, body)`
  - `deleteOwnReviewAt(index)`

**Out:**
- Report-abuse button (not in L2).

## Radical Simplicity Mandate
- No third-party star library. Five `<button mat-icon-button>` elements wired to a signal.
- One component per screen-level concern; inline the comment form inside the review card.

## ATDD Workflow
1. **RED.** Playwright specs: rate 4 → aggregate updates shown; write 500-char review → appears at top; comment 3 replies; author delete replaces body text; mobile viewport 360 px all tap targets >= 44 px.
2. **COMMIT:** `test(T-034): add failing rating/review/comment UI POM specs`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-034): add rating, review, and comment UI`

## Verification Check
1. **Simpler?** Review list and comment list can share a simple `ContentList` template if identical — otherwise keep two.
2. **Complete?** All L2-009 + L2-010 ACs visible end-to-end.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria
- All interactive elements are Angular Material.
- Soft-deleted reviews render "[removed by author]" / "[removed by moderator]".
- Responsive at all five breakpoints.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
