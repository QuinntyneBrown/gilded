# T-024: Photo upload + placeholder fallback

**Traces to:** L2-006 (L1-002), L2-019 AC4 (L1-013)
**Depends on:** T-019
**Est. session:** Small (~2 h)

## Objective
Let admins/moderators attach a photo to a counsellor and serve it. When no photo exists, render a deterministic Material-styled placeholder avatar using the counsellor's initials over a theme-derived background color. Upload validates MIME/size/dimensions and stores outside the web root.

## Scope
**In:**
- `POST /api/counsellors/:id/photo` (multipart).
- Validation: `image/jpeg|image/png|image/webp`; `<= 5 MB`; dimensions 200-4000 px per side.
- Storage: local filesystem directory outside webroot, file id = hash; served through `GET /api/counsellors/:id/photo`.
- Placeholder: `<app-counsellor-avatar>` standalone component using `MatIcon` + initials; no external avatar library. Background color sourced from the theme (e.g., hash-to-palette).
- Profile (T-023) and search (T-022) render the avatar when `photoUrl` is null.

**Out:**
- User-uploaded photos for self (not required).
- Image CDN (defer until scale demands it).

## Radical Simplicity Mandate
- One upload path. One placeholder component. No general-purpose "file upload" service.
- Placeholder color: `palette[hash(name) % palette.length]`. 4 lines.

## ATDD Workflow
1. **RED.** API tests: valid JPEG → 200 + file persisted; 6 MB file → 413; wrong MIME → 415; 100 px image → 400. Component test for placeholder: renders initials on theme-derived bg. Playwright spec: profile for counsellor without photo renders the avatar element.
2. **COMMIT:** `test(T-024): add failing photo upload + avatar tests`
3. **GREEN.** Implement.
4. **COMMIT:** `feat(T-024): add counsellor photo upload and placeholder avatar`

## Verification Check
1. **Simpler?** Is the avatar component under ~30 lines? If not, inline the color lookup.
2. **Complete?** Validation cases all return distinct status codes.
3. **No temporary code?** Confirmed.
4. **No stubs/mocks in prod?** Confirmed.
5. **All tests pass?**
6. **Lint + typecheck + Material-exclusivity green?**

## Acceptance Criteria (from L2-019 AC4, L2-006)
- Uploads validate MIME, size (<= 5 MB), and dimensions; non-conforming files are rejected.
- Files are stored outside the web root.
- Counsellors with no photo render the placeholder avatar.

## Done When
- [ ] Acceptance tests green.
- [ ] Verification check answered.
- [ ] Two commits recorded.
