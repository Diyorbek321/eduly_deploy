# Eduly - Production Readiness Plan

**Date:** 2026-03-31
**Status:** Development / Pre-Production

---

## 1. Current State Summary

### What Works (Real Backend Integration)
| Module | Status | Notes |
|--------|--------|-------|
| Authentication (Login/Register) | Done | JWT + OAuth2, 3 roles (ADMIN, TEACHER, STUDENT) |
| Admin Dashboard | Done | Stats, revenue chart, recent payments |
| Student CRUD | Done | Create, edit, delete, profile with groups/payments/attendance |
| Teacher CRUD | Done | Create, edit, delete, profile with groups/salaries |
| Group Management | Done | CRUD + student enrollment (multi-group supported) |
| Course Management | Done | Full CRUD |
| Attendance Tracking | Done | Bulk marking per group, per-student history |
| Payment Management | Done | CRUD with filtering |
| Salary Management | Done | CRUD with paid/unpaid tracking |
| Schedule | Done | Auto-generated from group timetable data |
| Reports | Done | Stats, revenue chart, attendance chart, course distribution |

### What Does NOT Work (Mock/Hardcoded Data)
| Module | Problem |
|--------|---------|
| Chat | Hardcoded messages, no backend |
| SMS | Hardcoded templates and history, no SMS provider integration |
| Gamification | Hardcoded rewards and purchase history, no backend |
| Settings | Static UI only, no save functionality |
| Support Teachers | Partially connected, bookings are client-side only |

---

## 2. Critical Security Fixes (Must Do Before Production)

### 2.1 SECRET_KEY is Hardcoded
The backend `config.py` contains `SECRET_KEY = "CHANGE-ME-in-production-use-openssl-rand-hex-32"`. Anyone who reads the source code can forge JWT tokens and impersonate any user including ADMIN.

**Fix:** Generate a random 256-bit key (`openssl rand -hex 32`) and set it as `SECRET_KEY` environment variable. Never commit it to source code.

### 2.2 Switch from SQLite to PostgreSQL
SQLite does not support concurrent writes. If two admins mark attendance at the same time, one will fail or data may corrupt. Education centers will have multiple staff members using the system simultaneously.

**Fix:** Set `DATABASE_URL=postgresql://user:pass@host/eduly` in production environment.

### 2.3 Database Migrations (Alembic)
Currently the backend uses `Base.metadata.create_all()` which only creates tables that don't exist. It cannot modify existing tables (add columns, change types). Any schema change in production would require manual SQL or data loss.

**Fix:** Set up Alembic migration system. Every schema change becomes a versioned migration file that can be applied or rolled back.

### 2.4 CORS Configuration
Currently allows all methods and all headers from `localhost:3000` and `localhost:5173`. In production, this must be restricted to the actual domain.

**Fix:** Set `CORS_ORIGINS` to the production frontend URL only. Restrict methods to `GET, POST, PUT, DELETE`. Restrict headers to what's actually needed.

### 2.5 No Rate Limiting
Login endpoint has no brute-force protection. An attacker can try thousands of passwords per second.

**Fix:** Add rate limiting middleware (e.g., `slowapi` for FastAPI). Recommended: 5 login attempts per minute per IP, 100 API requests per minute per user.

### 2.6 JWT Token Lifetime
Current token expires in 24 hours with no refresh mechanism. If a token is stolen, the attacker has full access for 24 hours.

**Fix:** Reduce access token to 15-30 minutes. Add a refresh token endpoint that issues new access tokens. Store refresh token in httpOnly cookie (not localStorage).

### 2.7 HTTPS
No SSL/TLS configuration exists. All data (including passwords and tokens) would travel in plain text.

**Fix:** Deploy behind a reverse proxy (Nginx/Caddy) with SSL certificate (Let's Encrypt). Force HTTPS redirect.

---

## 3. Infrastructure for Production Deployment

### 3.1 Recommended Stack
```
Frontend:  Static files served by Nginx (or Vercel/Netlify)
Backend:   FastAPI + Uvicorn behind Nginx reverse proxy
Database:  PostgreSQL 15+
Server:    Ubuntu 22.04 VPS (2 CPU, 4GB RAM minimum)
```

### 3.2 Environment Variables Needed
```
# Backend
SECRET_KEY=<random-256-bit-hex>
DATABASE_URL=postgresql://user:password@localhost:5432/eduly
CORS_ORIGINS=https://yourdomain.uz
DEBUG=false
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend
VITE_API_URL=https://yourdomain.uz/api
GEMINI_API_KEY=<your-key>  (if AI chat is used)
```

### 3.3 Database Backup Strategy
- Automated daily PostgreSQL backups (pg_dump)
- Store backups in separate location (S3 or another server)
- Test restore procedure monthly
- Keep 30 days of daily backups

### 3.4 Monitoring
- Application error tracking (Sentry)
- Server monitoring (uptime, CPU, memory, disk)
- Database connection pool monitoring
- API response time tracking

---

## 4. Teacher Dashboard - Backend Implementation Plan

Currently, when a teacher logs in, they see the same admin dashboard (which may show empty data because the dashboard endpoints require ADMIN role). A dedicated teacher dashboard is absolutely possible and requires these backend additions:

### 4.1 New Backend Endpoints Needed

**Teacher Dashboard Stats**
```
GET /api/teacher/dashboard/stats
```
Returns: number of assigned groups, total students across groups, today's schedule, upcoming lessons count.

**Teacher's Own Groups**
```
GET /api/teacher/my-groups
```
Returns: list of groups assigned to the logged-in teacher (filtered by `teacher_id` from JWT token). No need for the teacher to pass their own ID.

**Teacher's Own Students**
```
GET /api/teacher/my-students
```
Returns: all students enrolled in the teacher's groups. Useful for the teacher to see their full student roster.

**Teacher's Today Schedule**
```
GET /api/teacher/today-schedule
```
Returns: today's lessons based on group schedule and current day of week.

**Teacher's Attendance (Own Groups Only)**
```
GET /api/teacher/attendances?group_id=X&date=Y
POST /api/teacher/attendances/bulk
```
Teacher should only be able to view and mark attendance for their own groups. The current attendance endpoints allow any teacher to mark attendance for any group - this needs a permission filter.

**Teacher's Own Salary**
```
GET /api/teacher/my-salaries
```
Returns: the logged-in teacher's salary history. Currently `/salaries` requires ADMIN role, so teachers cannot view their own salary.

**Teacher's Own Profile**
```
GET /api/teacher/profile
PUT /api/teacher/profile
```
Returns/updates: the teacher's own profile information (phone, bio, etc.) without needing ADMIN access.

### 4.2 Frontend Changes Needed

- New `TeacherDashboard.tsx` page with:
  - Today's schedule cards (which groups, what time, which room)
  - Quick attendance marking button for each group
  - Student count per group
  - Own salary summary (this month, total earned)
  - Upcoming lessons this week
- Route logic in `App.tsx`: if `user.role === 'TEACHER'`, render `TeacherDashboard` at `/` instead of admin `Dashboard`
- Teacher sidebar should only show: Dashboard, My Groups, Attendance, My Salary, Schedule, Settings

### 4.3 Permission Model
All `/api/teacher/*` endpoints extract `user_id` from the JWT token and find the corresponding teacher record. The teacher can ONLY access data related to their own groups. No ID parameter needed in the URL - the backend knows who is asking.

---

## 5. Student Dashboard - Backend Implementation Plan

Same situation as teachers. Students currently see an admin-oriented dashboard. They need:

### 5.1 New Backend Endpoints
```
GET /api/student/profile          - Own profile
GET /api/student/my-groups        - Enrolled groups
GET /api/student/my-schedule      - Today/week schedule
GET /api/student/my-attendances   - Own attendance history
GET /api/student/my-payments      - Own payment history + debt
```

### 5.2 Frontend Changes
- New `StudentDashboard.tsx` with: schedule, attendance %, debt amount, group list
- Student sidebar: Dashboard, My Groups, Schedule, Payments, Settings

---

## 6. Features That Need Backend Before Production

### 6.1 SMS Notifications (High Priority)
Education centers heavily rely on SMS for:
- Payment reminders to parents
- Attendance notifications (student absent today)
- Schedule changes
- New group announcements

**Backend needed:**
- SMS provider integration (Eskiz.uz or similar Uzbekistan SMS gateway)
- `POST /api/sms/send` - Send SMS to student/parent
- `POST /api/sms/bulk` - Bulk SMS to group/all students
- `GET /api/sms/history` - SMS send history
- `GET /api/sms/templates` - Saved message templates
- `POST /api/sms/templates` - Create/edit templates
- Automated SMS triggers (configurable):
  - Student absent -> SMS to parent
  - Payment overdue -> SMS reminder
  - Schedule change -> SMS to affected students

### 6.2 Settings (Medium Priority)
**Backend needed:**
- `GET /api/settings` - Center settings (name, address, phone, logo, working hours)
- `PUT /api/settings` - Update center settings
- `PUT /api/auth/change-password` - Already exists, connect to UI
- `PUT /api/auth/profile` - Update own profile (name, avatar)

### 6.3 Chat/Messaging (Low Priority for MVP)
This can be deferred. Most education centers use Telegram groups for communication. If needed later:
- WebSocket-based real-time messaging
- Group chats per study group
- Teacher-parent direct messaging
- Message history stored in database

### 6.4 Gamification (Low Priority for MVP)
Can be deferred. If needed:
- Points system based on attendance and homework
- Reward shop with redeemable items
- Leaderboard per group
- Backend: points tracking, reward CRUD, purchase/redemption history

---

## 7. Data Integrity Issues to Fix

### 7.1 Cascade Deletes
When a student is deleted, what happens to their:
- Attendance records?
- Payment records?
- Group enrollments?

Currently this depends on SQLAlchemy cascade settings. Must verify that deleting a student/teacher/group properly handles all related data (either cascade delete or prevent deletion if related data exists).

### 7.2 Duplicate Enrollment Prevention
The backend should reject adding a student to a group they're already in. Check if `StudentGroup` has a unique constraint on `(student_id, group_id)`.

### 7.3 Payment Validation
- Payment amount should be positive
- Payment date cannot be in the future
- Student must exist
- Duplicate payment detection (same student, same amount, same date within 1 minute)

### 7.4 Attendance Validation
- Cannot mark attendance for future dates
- Cannot mark attendance twice for same student + group + date
- Group must be active

---

## 8. Production Launch Checklist

### Phase 1: Security (Week 1)
- [ ] Generate and set production SECRET_KEY
- [ ] Set up PostgreSQL database
- [ ] Configure Alembic migrations
- [ ] Restrict CORS to production domain
- [ ] Add rate limiting
- [ ] Set up HTTPS with SSL certificate
- [ ] Remove default admin credentials
- [ ] Implement refresh token rotation

### Phase 2: Teacher & Student Dashboards (Week 2-3)
- [ ] Build teacher dashboard backend endpoints (`/api/teacher/*`)
- [ ] Build student dashboard backend endpoints (`/api/student/*`)
- [ ] Create TeacherDashboard.tsx frontend page
- [ ] Create StudentDashboard.tsx frontend page
- [ ] Update routing to show role-appropriate dashboard
- [ ] Update sidebar navigation per role

### Phase 3: SMS Integration (Week 3-4)
- [ ] Choose and integrate Uzbekistan SMS provider (Eskiz.uz)
- [ ] Build SMS backend endpoints
- [ ] Build SMS template management
- [ ] Connect SMS page to real backend
- [ ] Set up automated SMS triggers (absence, payment reminder)

### Phase 4: Settings & Polish (Week 4)
- [ ] Build settings backend endpoints
- [ ] Connect settings page to backend
- [ ] Fix cascade delete behavior
- [ ] Add input validation for all forms
- [ ] Add proper error messages in Uzbek language
- [ ] Test all CRUD flows end-to-end

### Phase 5: Testing & Deployment (Week 5)
- [ ] Write backend API tests (pytest)
- [ ] Test with real data (import from spreadsheets if center has existing data)
- [ ] Set up production server (VPS + Nginx + PostgreSQL)
- [ ] Deploy and verify
- [ ] Create admin account for center manager
- [ ] Train staff on the system
- [ ] Set up database backup schedule
- [ ] Set up error monitoring (Sentry)

---

## 9. What Can Be Skipped for MVP

These features are nice-to-have but NOT required for an education center to start using the system:

1. **Chat/Messaging** - Centers use Telegram for this
2. **Gamification** - Can be added later based on demand
3. **AI Chat Widget** - Requires Gemini API key and adds complexity
4. **Support Teachers (Booking)** - Can use the regular teacher list instead
5. **PDF Export** - Already partially working, can be polished later

---

## 10. Data Migration Plan

If the education center currently uses spreadsheets (Excel/Google Sheets):

1. **Export current data** from spreadsheets as CSV
2. **Write import scripts** for:
   - Students (name, phone, parent info)
   - Teachers (name, phone, specialty)
   - Courses (name, price, duration)
   - Groups (name, course, teacher, schedule)
   - Enrollments (which student in which group)
3. **Validate imported data** - check for duplicates, missing fields
4. **Create user accounts** - Generate login credentials for teachers and students
5. **Do NOT import old payment history** unless specifically needed - start fresh with payments

---

## 11. Cost Estimate (Uzbekistan Market)

| Item | Monthly Cost (UZS) | Notes |
|------|-------------------|-------|
| VPS Server (2CPU/4GB) | 150,000 - 300,000 | Beget, UzHost, or similar |
| Domain (.uz) | ~100,000/year | One-time |
| SSL Certificate | Free | Let's Encrypt |
| SMS Service | 50-150 per SMS | Eskiz.uz pricing, ~500,000/month for active center |
| PostgreSQL | Free | Self-hosted on same VPS |
| **Total** | **~500,000 - 800,000/month** | Excluding SMS costs |

---

*This document should be reviewed and updated as implementation progresses.*
