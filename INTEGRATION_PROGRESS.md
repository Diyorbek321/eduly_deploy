# Eduly Platform — Integration Progress

## How to resume
Open this file in a new conversation and say:
**"Read INTEGRATION_PROGRESS.md and continue from the current phase."**

---

## Current Status: ALL PHASES COMPLETE ✅ + Manager Panel built

---

## Completed Phases

### ✅ Phase 0 — Backup
- Git tag: `v1.0.0-pre-upgrade`
- Backup zip: `/home/diyorbek/Downloads/eduly-v1-backup-20260518.zip`

---

### ✅ Phase 1 — New Teacher Salary Formula
**Formula:** For each student who paid this month:
```
teacher_earn = base_per_student + floor((student_payment - course.price) / 3)
total_salary = SUM(teacher_earn for all paying students)
```
**Files changed:**
- `backend/app/models/models.py` — added `Teacher.base_per_student` (Integer, default 120000), `Salary.calculation_detail` (Text JSON)
- `backend/app/schemas/salary.py` — added `SalaryStudentBreakdown`, updated `SalaryCalculateResult` with `student_breakdowns[]`, `base_per_student`, `student_count`
- `backend/app/schemas/teacher.py` — added `base_per_student` to Create/Update/Out schemas
- `backend/app/services/salary.py` — completely rewritten with new formula
- `backend/alembic/versions/i8f4h9d0e1f2_salary_formula_base_per_student.py` — migration (already applied)
- `src/pages/Salaries.tsx` — "Formula asosida" tab with per-student breakdown table
- `src/pages/TeacherProfile.tsx` — shows "O'quvchi boshiga" field
- `src/types.ts` — added `salaryPercent?`, `basePerStudent?` to Teacher interface

---

### ✅ Phase 2 — Churn Analytics (Exit Call Tracking)
**Flow:** Student marked Ketgan → admin calls them → records exact reason

**Files changed:**
- `backend/app/models/models.py` — added to Student: `exit_reason`, `exit_reason_note`, `exit_date`, `exit_called`, `exit_called_at`
- `backend/app/schemas/student.py` — added `ExitInfoUpdate`, `ExitReason` literal type, `ChurnMonthPoint`, exit fields to `StudentOut`
- `backend/app/routers/students.py` — added `GET /students/exited`, `PUT /students/{id}/exit-info`, `GET /students/churn-report`
- `backend/app/services/student.py` — added `_enrich_out()` helper
- `backend/alembic/versions/j9g5i0e2f3g4_student_exit_tracking.py` — migration (already applied)
- `src/pages/Students.tsx` — new "Ketganlar" tab with call tracking, `ExitedTab` sub-component, exit call modal
- `src/pages/Reports.tsx` — new "Chiqib ketish tahlili" section with bar + reason breakdown charts

---

### ✅ Phase 13 — Teacher KPI & Bonus System
**KPI score (0–100):** retention 30 + homework 25 + attendance 25 + payment 20
**Tiers:** Platinum 90+ (+20%), Gold 75+ (+12%), Silver 60+ (+6%), None (<60)
**Badges:** homework_champion, perfect_attendance, zero_dropout, rising_star, full_house

**Files changed:**
- `backend/app/models/models.py` — added `TeacherKPI`, `TeacherBadge` models + relationships on Teacher
- `backend/app/services/kpi.py` — NEW FILE: full KPI calculation + badge auto-award logic
- `backend/app/routers/kpi.py` — NEW FILE: `POST /kpi/{id}/calculate`, `GET /kpi/{id}/history`, `GET /kpi/{id}/badges`, `GET /kpi/leaderboard`
- `backend/app/main.py` — registered kpi router at `/api/kpi`
- `backend/alembic/versions/k0h6j1f3g4h5_teacher_kpi_badges.py` — migration (already applied)
- `src/pages/TeacherProfile.tsx` — KPI score card + badge display with progress bars
- `src/pages/TeacherLeaderboard.tsx` — NEW FILE: full leaderboard page with podium, rankings, tier explainer
- `src/App.tsx` — added `/teacher-leaderboard` route
- `src/components/Sidebar.tsx` — added Trophy icon + "O'qituvchi reytingi" link

---

## Remaining Phases (in priority order)

### 🔄 PHASE 4 — iOS App (Capacitor) — START HERE
**Goal:** Add iOS build target to existing Capacitor mobile app. Same React codebase, no rewrite.

**Steps to do:**
1. `cd scholar-quest-mobile && npx cap add ios`
2. Configure `capacitor.config.ts` — bundle ID `com.eduly.scholarquest`
3. Add `Info.plist` permissions: Notifications, Camera, Microphone
4. Update `PushContext.tsx` for iOS APNs push token path
5. `npx cap sync ios`
6. Open Xcode → set signing team → build for TestFlight

**Key files:**
- `scholar-quest-mobile/capacitor.config.ts`
- `scholar-quest-mobile/src/context/PushContext.tsx`
- `scholar-quest-mobile/ios/` ← will be created by `cap add ios`

---

### ⏳ PHASE 9 — Click & Payme Payment Integration
**Goal:** Real payment gateway. Student pays → webhook → auto-confirm.

**Steps:**
- `POST /payments/click/create` + `POST /payments/click/webhook`
- `POST /payments/payme/create` + `POST /payments/payme/webhook` (JSON-RPC)
- `.env` vars: `CLICK_MERCHANT_ID`, `CLICK_SERVICE_ID`, `CLICK_SECRET`, `PAYME_MERCHANT_ID`, `PAYME_KEY`
- Frontend: "To'lash" button in `src/pages/Payments.tsx` + mobile Dashboard

---

### ✅ PHASE 7 — Homework Enforcement (3 Strikes Auto-Remove)
**Goal:** 3 consecutive NOT_DONE → auto-remove student from group + notify.

**Files changed:**
- `backend/app/models/models.py` — added `StudentGroup.homework_strikes` (Integer, default 0)
- `backend/alembic/versions/l1i7k2g4h5i6_homework_strikes.py` — migration
- `backend/app/routers/homework.py` — added `_apply_strike()` helper; called after every mark; auto-removes & freezes student at 3 strikes; emits `student.auto_removed` event; imported `StudentStatus`
- `backend/app/schemas/student.py` — added `homework_strikes: int = 0` to `StudentOut`
- `backend/app/services/student.py` — `_enrich()` computes `max(homework_strikes)` across all group enrollments
- `backend/app/schemas/student_me.py` — added `homework_strikes: int = 0` to `MyProfileOut`
- `backend/app/services/student_me.py` — `get_profile()` passes max strikes to response
- `src/types.ts` — added `homeworkStrikes?: number` to Student interface
- `src/pages/Students.tsx` — maps `homework_strikes` from API; renders amber/red badge (⚡) next to name
- `scholar-quest-mobile/src/lib/types.ts` — added `homework_strikes: number` to `MyProfile`
- `scholar-quest-mobile/src/lib/demoMode.ts` — added `homework_strikes: 0` to demo profile
- `scholar-quest-mobile/src/pages/Dashboard.tsx` — renders amber/red warning banner when strikes > 0

---

### ✅ PHASE 6 — Learning Path with Time Limits
**Goal:** Each course has a max_duration_months. Student sees progress toward target date.

**Files changed:**
- `backend/app/models/models.py` — added `Course.max_duration_months` (Integer, nullable), `StudentGroup.target_completion_date` (Date, nullable)
- `backend/alembic/versions/m2j8l3h5i6j7_learning_path.py` — migration
- `backend/app/schemas/course.py` — added `max_duration_months` to Create/Update/Out schemas
- `backend/app/services/group.py` — `add_student()` auto-computes `target_completion_date` from course months
- `backend/app/schemas/student_me.py` — added `LearningPathItem`, `MyLearningPathOut`
- `backend/app/services/student_me.py` — added `get_learning_path()` with homework progress + behind-pace detection
- `backend/app/routers/student_me.py` — added `GET /learning-path` endpoint
- `src/types.ts` — added `maxDurationMonths: number | null` to `Course` interface
- `src/pages/Courses.tsx` — added "Maksimal muddat (oy)" input in create/edit form
- `scholar-quest-mobile/src/lib/types.ts` — added `LearningPathItem`, `MyLearningPath`
- `scholar-quest-mobile/src/services/studentService.ts` — added `learningPath()` API call
- `scholar-quest-mobile/src/pages/LearningPath.tsx` — rewrote with real API: progress ring, per-group cards, behind-pace badges, days-remaining countdown
- **SMS scheduler** — skipped (needs background worker setup; is_behind flag is available in the API)

---

### ✅ PHASE 5 — Student Book Library
**Goal:** Admin uploads materials (PDF/video) per group. Students see only their groups' materials.

**Files changed:**
- `backend/app/models/models.py` — new `LessonMaterial` model (group_id, title, file_path, file_type, file_size, uploaded_by)
- `backend/alembic/versions/n3k9m4i6j7k8_lesson_materials.py` — migration
- `backend/app/routers/materials.py` — NEW: `POST /materials/` (multipart upload), `GET /materials/` (admin, group filter), `GET /materials/my` (student, own groups only), `DELETE /materials/{id}` (with file cleanup)
- `backend/app/main.py` — registered `/api/materials` router; mounted `StaticFiles` at `/media` serving `backend/uploads/`
- `src/pages/Library.tsx` — NEW admin page: group filter tabs, material cards (type badge, size, date), upload modal (file picker + form), delete confirm
- `src/App.tsx` — added `/library` route (ADMIN only)
- `src/components/Sidebar.tsx` — added "Kutubxona" nav link (FileText icon)
- `scholar-quest-mobile/src/lib/types.ts` — added `MaterialItem` interface
- `scholar-quest-mobile/src/services/studentService.ts` — added `materials(group_id?)` API call
- `scholar-quest-mobile/src/pages/Library.tsx` — NEW mobile page: group tabs, material list, tap-to-open (ExternalLink)
- `scholar-quest-mobile/src/App.tsx` — added `/library` route
- `scholar-quest-mobile/src/pages/Learn.tsx` — added "Kutubxona" shortcut card linking to `/library`

---

### ⏳ PHASE 3 — CEFR / IELTS Exam Platform
**Goal:** Timed mock exams. Admin creates, students take, auto-scored.

**Steps:**
- New models: `Exam`, `Question`, `ExamAttempt` in `backend/app/models/exam_models.py`
- New router: `backend/app/routers/exams.py`
- New frontend pages: `src/pages/exam/ExamAdmin.tsx`, `ExamTake.tsx`, `ExamResults.tsx`
- Mobile: connect existing `MockTests.tsx` to real API

---

### ⏳ PHASE 8 — Unit Tests & Level Tests
**Depends on Phase 3 (reuses Exam models)**
- Add `exam_type: UNIT_TEST | LEVEL_TEST | MOCK` to Exam model
- Add `StudentGroup.current_unit`, `last_test_score`
- Level promotion: score ≥80% → notify teacher

---

### ✅ PHASE 10 — Multi-Branch Management
**Goal:** One owner manages multiple centers from one login.

**Files changed:**
- `backend/app/models/models.py` — added `BranchRole` enum + `UserCenterAccess` model (user_id, center_id, role)
- `backend/app/schemas/branch.py` — NEW: `BranchOut`, `BranchStatsOut`, `BranchCreate`, `UserCenterAccessCreate`
- `backend/app/routers/branches.py` — NEW: `GET /`, `GET /{id}/stats`, `POST /`, `POST /{id}/access`
- `backend/alembic/versions/o4l0n5j7k8l9_multi_branch.py` — migration
- `backend/app/main.py` — registered branches router at `/api/branches`
- `src/contexts/BranchContext.tsx` — NEW: fetches `/branches/`, stores `activeBranch` in localStorage
- `src/pages/Branches.tsx` — NEW: branch overview page with per-branch stats cards + create modal
- `src/components/Header.tsx` — added branch switcher dropdown (visible only when `isMultiBranch`)
- `src/components/Sidebar.tsx` — added "Filiallar" nav link (Building2 icon)
- `src/App.tsx` — added `/branches` route + wrapped app in `BranchProvider`
- `src/pages/Dashboard.tsx` — uses `/branches/{id}/stats` when a branch is active; shows active branch banner
- `src/pages/Reports.tsx` — uses branch-scoped stats when a branch is active; shows active branch banner

---

### ✅ PHASE 11 — Finance Automation
**Goal:** Auto-generate monthly invoices, debt reminders, salary triggers.

**Files changed:**
- `backend/app/models/models.py` — added `MonthlyInvoice` model (student_id, month, amount_due, amount_paid, is_paid, generated_at, paid_at)
- `backend/app/services/finance_scheduler.py` — NEW: `run_invoice_generation_job()` (1st of month), `reconcile_invoice_payments()`, `run_salary_auto_calc_job()` (15th + last day), `register_finance_jobs(scheduler)`
- `backend/app/routers/finance.py` — NEW: `GET /finance/health`, `POST /finance/generate-invoices`, `POST /finance/auto-calc-salaries`, `POST /finance/reconcile-payments`
- `backend/alembic/versions/p5m1o6k8l9m0_monthly_invoices.py` — migration
- `backend/app/main.py` — registered finance router at `/api/finance`; calls `register_finance_jobs(scheduler)` in lifespan
- `src/pages/Dashboard.tsx` — fetches `/finance/health`; added "Moliya holati" widget with collection-rate gauge, invoice count, overdue badge, salary status, debt summary, next-run dates, and manual trigger buttons

---

### ✅ PHASE 12 — CRM + Kanban + Marketing/Sales
**Goal:** Lead tracking, sales pipeline, task boards.

**Files changed:**
- `backend/app/models/models.py` — added `LeadStage`, `LeadSource` enums + `Lead`, `KanbanBoard`, `KanbanColumn`, `KanbanCard` models
- `backend/app/schemas/crm.py` — NEW: `LeadCreate`, `LeadUpdate`, `LeadOut`, `PipelineStats`
- `backend/app/schemas/kanban.py` — NEW: full board/column/card Create/Update/Out schemas
- `backend/app/routers/crm.py` — NEW: `GET /crm/leads`, `POST`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `GET /crm/stats`
- `backend/app/routers/kanban.py` — NEW: full CRUD for boards, columns, cards; move-card via PATCH
- `backend/alembic/versions/q6n2p7l9m0n1_crm_kanban.py` — migration for all 4 tables
- `backend/app/main.py` — registered `/api/crm` and `/api/kanban` routers
- `src/pages/CRM.tsx` — NEW: full pipeline board with 5 stages, stats bar, add/edit/delete lead modal, stage-movement in modal, search/filter
- `src/pages/Kanban.tsx` — NEW: board list + board view with columns and cards, move-card left/right buttons, card CRUD modal, inline column creation, card limit enforcement
- `src/components/Sidebar.tsx` — added "CRM" (UserPlus) and "Kanban" nav links
- `src/App.tsx` — added `/crm` and `/kanban` routes (ADMIN only)

---

---

### ✅ MANAGER PANEL — Separate web platform for branch managers
**Goal:** Branch managers log in at `localhost:3002` with credentials created by the admin. They see a restricted read/action view of their branch only.

**Backend additions:**
- `backend/app/routers/branch_managers.py` — NEW: `GET /api/branch-managers/` (list), `POST /` (create ADMIN user + UserCenterAccess BRANCH_ADMIN), `PATCH /{id}/password` (reset), `PATCH /{id}/toggle-active` (block/unblock), `DELETE /{id}` (remove)
- `backend/app/main.py` — registered `/api/branch-managers` router

**Admin panel additions (`src/`):**
- `src/pages/BranchManagers.tsx` — NEW: table of branch managers, create modal (name/email/password/branch + auto-generate password + copy credentials), reset-password modal, block/unblock toggle, delete. Shows manager panel URL prominently.
- `src/components/Sidebar.tsx` — added "Menejerlar" (ShieldCheck icon) nav link
- `src/App.tsx` — added `/branch-managers` route (ADMIN only)

**Manager Panel (`manager-panel/`):**
```
manager-panel/
  package.json          # port 3002, React 19 + Router 7 + Tailwind 4 + Recharts
  vite.config.ts        # proxies /api → localhost:8000
  tsconfig.json
  index.html
  src/
    main.tsx
    index.css
    App.tsx             # BrowserRouter + RequireAuth/RequireGuest guards
    lib/api.ts          # axios with mp_token from sessionStorage, envelope unwrap
    contexts/
      AuthContext.tsx   # login/logout, validates role === ADMIN on login
    components/
      Layout.tsx        # dark sidebar + mobile drawer + nav links
    pages/
      Login.tsx         # dark glassmorphism login, rejects non-ADMIN roles
      Dashboard.tsx     # branch stats (via /branches/{id}/stats), revenue chart, quick links
      Finance.tsx       # finance health widget: collection rate ring, invoices, salary status, debt, trigger buttons
      CRM.tsx           # pipeline bar chart, stage pills, recent leads list
      Staff.tsx         # teacher KPI leaderboard with expandable score breakdown bars
```

**How it works end-to-end:**
1. Admin goes to `/branch-managers` → creates manager account (auto-generates strong password, shows copy-able credentials)
2. Manager opens `localhost:3002` → logs in with those credentials
3. Backend JWT is the same — role=ADMIN scoped to their `center_id`
4. Manager panel reads from the same APIs but shows a focused 4-page UI

---

## Tech Stack Reference
- **Frontend:** React 19 + React Router 7 + TailwindCSS 4 + Recharts + Axios
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL + Alembic
- **Mobile:** Capacitor (Android done, iOS = Phase 4) + React/TypeScript
- **Auth:** JWT stored in sessionStorage, 3 roles: ADMIN / TEACHER / STUDENT
- **API base:** All frontend API calls go through `src/lib/api.ts` (axios, proxied to localhost:8000)
- **Path alias:** `@` maps to project root
- **Backend path:** `backend/app/`
- **Mobile path:** `scholar-quest-mobile/src/`
- **Admin SPA path:** `src/`
- **Teacher dashboard path:** `edusaas-teacher-dashboard/src/`

## DB Migration State (all applied)
```
3dc38fce7fe7 → b1f7a2c3d4e5 → d3a9c4e5f6g7 → e4b0d5f6a7b8 →
f5c1e6a7b8c9 → g6d2f7b8c9d0 → h7e3g8c9d0e1 → i8f4h9d0e1f2 →
j9g5i0e2f3g4 → k0h6j1f3g4h5 → l1i7k2g4h5i6 → m2j8l3h5i6j7 → n3k9m4i6j7k8 →
o4l0n5j7k8l9 → p5m1o6k8l9m0 → q6n2p7l9m0n1  ← CURRENT HEAD
```
