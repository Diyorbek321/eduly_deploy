# Eduly — Outstanding Work

Status of the original implementation plan, plus open issues. Items checked off
were completed in earlier sessions; items unchecked are still pending.

---

## Completed

- [x] **Slice 1 — Students: Edit / Freeze / Filters / Debt badge**
  Per-row Freeze + Edit, URL-driven filters (status / group / debt), debounced
  search, color-coded payment-status badges, optimistic UI with rollback.
  Backend `group_id` + `debt_status` query params on `/api/students`.

- [x] **Slice 2 — Teacher RBAC + data scoping**
  `require_teacher` role gate on `/api/teacher/*`. Teachers can no longer reach
  `GET /api/students/{id}/payments` (admin-only). Frontend hides payments tab,
  recent-payments block, and login credentials block from non-admins.

- [x] **Slice 4 — Groups: per-group student list with status / debt / attendance**
  New `GET /api/groups/{id}/roster` returns members with attendance rate scoped
  to that group. Manage-students modal shows status pill, payment-status badge,
  debt amount, and attendance % chip per member. Frozen members tinted amber.

- [x] **Slice 5 (partial) — Excel export of all students**
  "PDF yuklab olish" replaced by "Excel yuklab olish". Fetches all pages
  honoring active filters and writes `oquvchilar_<date>.xlsx` via SheetJS.

- [x] **Slice 5 (partial) — "Ish haqi" hidden from teacher**
  Removed from teacher sidebar, dashboard stat cards, and MyProfile (history
  block + latest-salary card). `/salaries` route is admin-only.

---

## Pending

### Teacher login — verify the NetworkError fix

> Symptom: "NetworkError when attempting to fetch resource" right after a
> teacher logs in with credentials created by an admin.
>
> Suspected cause: `src/lib/api.ts` appends `/` to every request, which forces
> a 307 redirect on the FastAPI teacher-dashboard routes (declared without a
> trailing slash). Patch added `/teacher/*` paths to the no-slash allowlist.

- [ ] After deploying the api.ts patch, log in as a teacher in **Firefox** and
      reproduce. DevTools → Network: confirm `GET /api/teacher/stats` returns
      **200 directly** (no 307 in the chain).
- [ ] Repeat in **Chrome** + **Safari**.
- [ ] If still failing, capture the failing request's full response headers and
      check whether the backend is reachable at all
      (`curl -i http://localhost:8000/api/teacher/stats -H "Authorization: Bearer <TOKEN>"`).
- [ ] Verify token-refresh flow on `/teacher/stats` after a token expiry —
      retry path through axios interceptor must not double-append slash.
- [ ] Confirm the admin "create teacher" flow actually creates a `User` row
      with `role=TEACHER` AND a linked `Teacher` row. Currently `_get_teacher`
      returns 404 if the `Teacher` row is missing — that surfaces in the UI as
      "O'qituvchi profili topilmadi", not as a NetworkError, but is the next
      thing to break the flow.

### Slice 3 — SMS automation + frozen-student exclusion (backend only)

- [ ] Daily 20:00 cron: send SMS to every student whose attendance for the day
      has status `absent`. Source absences from the `attendances` table joined
      to the student's `phone` and parent's `parent_phone`.
- [ ] Monthly cron on the 30th/31st: payment-reminder SMS to every ACTIVE
      student with `debt > 0`.
- [ ] **Frozen students** (`status = 'Muzlatilgan'`) excluded from both jobs and
      from any reporting that drives those jobs. Apply the filter at the SQL
      query layer, not in Python post-filter.
- [ ] Persist every send attempt to a new `sms_log` table:
      `(id, student_id, phone, template, body, status, error, created_at)`
      where `status ∈ {sent, failed, pending}`. Index on `(student_id, template, date)`
      to support de-dup ("don't re-SMS the same student/template the same day").
- [ ] Audit-log entry for each send (who/what/when) — wire through the existing
      audit table (see `alembic/versions/d3a9c4e5f6g7_audit_log_soft_delete.py`).
- [ ] Consent flag on `students` (`sms_opt_in BOOLEAN DEFAULT TRUE`); cron must
      respect it.
- [ ] Manual "send now" button in admin SMS page should reuse the same logging
      pipeline.

### Slice 5 (remaining) — Per-student PDF download

- [ ] Add a **"Download PDF"** button on `/students/:id` that emits a single
      PDF per student containing: profile fields, group assignments,
      attendance history (last 30 days), payment / debt status.
- [ ] Branding: header with center logo + name (pulled from `/api/settings`).
- [ ] Graceful failure: catch jsPDF errors → show toast, log to console with a
      request id. No crash on missing avatar / null fields.
- [ ] Decide the file name convention: `student_<id>_<YYYY-MM-DD>.pdf`.

### Slice 6 — `scholar-quest-mobile/` Pomodoro re-render bug + Rank section

> I haven't read this codebase yet. Start with a quick audit before touching it.

- [ ] Read `scholar-quest-mobile/src/` to map state management and routing.
- [ ] **Pomodoro flicker**: bottom nav bar appears for ~1 frame every second
      during focus mode. Likely a global state / context update on each timer
      tick re-rendering the layout. Isolate the timer in its own subtree
      (`useRef` for the interval, `useReducer` per second instead of
      `setState` on parent), or move the `bottomNavVisible` flag out of the
      timer state.
- [ ] **Rank section**: diagnose calculation / data / UI bug. Confirm the
      backend rank endpoint exists and returns the expected metric (XP / points
      / completion %). Handle ties + pagination + "current user position" highlight.
- [ ] Cache invalidation: when the underlying score changes, the rank cache
      must invalidate; never serve stale rank from a stale cache key.

### Slice 7 — Admin ↔ Student shop real-time sync

> Reward CRUD in admin must reflect in the student app's shop without a manual
> refresh. Decide transport before coding.

- [ ] Decision: **SSE** (`text/event-stream` via FastAPI `StreamingResponse`)
      vs WebSocket vs short-polling. SSE is the lightest fit given the current
      stack and fits one-way admin → student push.
- [ ] Backend: `GET /api/rewards/stream` SSE endpoint. Emit
      `{"type": "reward.created" | "reward.updated" | "reward.deleted", "id": ...}`
      on every CUD path in `routers/rewards.py`. Use an in-process `asyncio.Queue`
      fan-out (no Redis dep needed for single-instance deployment).
- [ ] Frontend (`scholar-quest-mobile/`): subscribe via `EventSource`, on
      message invalidate the rewards list query (or patch the cache directly).
- [ ] Fallback: if the SSE connection drops more than N times in M seconds,
      fall back to 30s polling. Show a "connection lost" indicator.
- [ ] **Server-side validation of every purchase.** Price, stock, eligibility,
      and the student's point balance must all be checked server-side before
      the purchase succeeds. Client cannot dictate price.
- [ ] Inventory decrement under transaction; concurrency test: two students
      racing to buy the last item must result in exactly one success.

### Slice 8 — SaaS Security Hardening

> Largest slice. Touches backend + frontend + config. Recommend doing this
> after slices 3–7 so the new surface area is hardened before adding more.

#### Authentication & sessions
- [ ] Enforce password policy on all create / change-password paths
      (min length, mixed case, digit, no common-passwords list).
- [ ] Confirm `bcrypt`/`argon2` is used for `User.hashed_password` (already
      uses `app.core.security.hash_password` — verify the algorithm).
- [ ] Token revocation: maintain a `revoked_jti` table, write to it on logout
      and on password change. Refresh-token rotation on every refresh.
- [ ] Account lockout / exponential backoff after N failed login attempts.
      `slowapi` is already mounted; tune `_LOGIN_RATE_LIMIT` and add a
      per-account counter on top of the per-IP rate limit.
- [ ] If/when moving to cookie auth, set `HttpOnly`, `Secure`, `SameSite=Lax`.
      Currently uses Bearer in `sessionStorage` — XSS-vulnerable; document the
      tradeoff or migrate.

#### RBAC & data isolation (already partly done in slice 2)
- [ ] Add a regression test: as teacher A, attempt every endpoint with IDs
      belonging to teacher B. Expect 403 / 404 on every one.
- [ ] Cross-tenant test: tenant X cannot see / write tenant Y's rows on any
      endpoint. The `TenantContext.scope()` helper exists — make sure every
      query passes through it.

#### Input validation & injection
- [ ] All user input validated via Pydantic schemas (mostly done) and Zod on
      the frontend. Audit any remaining `.dict()` / raw form parsing.
- [ ] Confirm SQLAlchemy is parameterized everywhere (no raw f-string SQL).
- [ ] PDF / Excel template inputs sanitized to prevent formula injection
      (`=`, `+`, `-`, `@` prefixes in CSV/XLSX cells).

#### API protection
- [ ] Per-route rate limits: login (already), `/sms/*`, password reset,
      `/auth/refresh`. Use `slowapi` decorators, not just default.
- [ ] CSRF: not needed today (Bearer token in header). If cookie auth is
      adopted, add `csrf_token` middleware.
- [ ] Generic error messages on 500 path. The
      `unhandled_exception_handler` already exists — verify it never leaks
      stack traces / DB schema in non-DEBUG mode.

#### Audit logging
- [ ] Every freeze / unfreeze writes to `audit_log` with actor, target,
      old/new status. Same for role changes, debt overrides, SMS sends,
      reward CUD.
- [ ] Mask phone / email / IDs in app log output (replace middle digits with
      `*`). Never log passwords or raw tokens.

#### Files & PDFs
- [ ] Avatar upload (currently base64 in `student.avatar` field): cap size,
      validate magic bytes, reject SVG.
- [ ] PDF / Excel responses: correct `Content-Type` and `Content-Disposition:
      attachment`. Set `Cache-Control: private, no-store`.

#### Secrets & config
- [ ] Audit `.env` and CI for any hardcoded secrets.
- [ ] Verify the bundled JS (`dist/`) doesn't contain backend secrets — grep
      the build output for `SECRET`, `KEY`, `TOKEN`.
- [ ] `GEMINI_API_KEY` is exposed in `vite.config.ts` via
      `process.env.GEMINI_API_KEY` — that ends up in the client bundle.
      Either move all Gemini calls server-side and proxy, or accept the
      tradeoff and document it.

---

## Tracking note

Each slice should land as its own commit (or PR) so individual fixes can be
reverted without disturbing unrelated work. Slices 3, 5-PDF, and 8 each
warrant their own PR; slice 6 + slice 7 share the mobile codebase and can be
bundled.
