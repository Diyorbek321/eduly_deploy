# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Eduly** is an Education Center Management System — a React SPA for managing students, teachers, groups, courses, attendance, payments, and salaries. The UI is in Uzbek. It connects to a FastAPI Python backend.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # Type-check with tsc --noEmit
npm run preview      # Preview production build
```

**Required env variable**: Set `GEMINI_API_KEY` in `.env.local` before running.

**Backend**: Runs separately on `http://localhost:8000`. See `BACKEND_DOCS.md` for setup. Default credentials: `admin@edusaas.com` / `Admin1234!`. API docs at `http://localhost:8000/docs`.

## Architecture

### Tech Stack
- **React 19** + **React Router 7** (client-side routing)
- **TailwindCSS 4** via Vite plugin
- **React Hook Form** + **Zod** for validated forms
- **Axios** for HTTP — all `/api` requests proxy to backend at `localhost:8000`
- **Google Gemini** (`@google/genai`) for the AI chat assistant
- **Recharts** for dashboards, **jsPDF** for PDF exports
- **Lucide React** for icons

### Authentication & Authorization
- `src/contexts/AuthContext.tsx` — provides `useAuth()` hook throughout the app
- JWT stored in `localStorage`; auto-login mock for development
- Three roles: `ADMIN`, `TEACHER`, `STUDENT`
- `src/components/ProtectedRoute.tsx` — wraps routes; redirects to `/login` if unauthenticated or redirects to `/dashboard` if role is insufficient

### Routing (`src/App.tsx`)
All routes except `/login` are wrapped in `ProtectedRoute`. Role restrictions are applied per-route. The root layout (`src/components/Layout.tsx`) renders Sidebar + `<Outlet />` + AI Chat Widget.

### Pages (`src/pages/`)
18 pages covering: Dashboard, Students, StudentProfile, Teachers, TeacherProfile, SupportTeachers, Groups, Courses, Schedule, Attendance, Payments, Salaries, Chat, SMS, Gamification, Reports, Settings, Login.

### Components (`src/components/`)
- `Layout.tsx` — shell with sidebar and chat widget
- `Sidebar.tsx` — role-filtered nav, brand color `#ec5b13`
- `AIChatWidget.tsx` — Gemini-powered assistant (ADMIN only); uses function tools to query student/group/teacher/course data; renders markdown responses
- `ProtectedRoute.tsx` — auth/role guard
- `StatCard`, `Modal`, `Table`, etc. — reusable UI primitives

### Data Types (`src/types.ts`)
Core interfaces: `Student`, `Teacher`, `Group`, `Course`, `Transaction`. Status values are Uzbek strings (e.g., `"Faol"`, `"Muzlatilgan"`). Payment methods: `Click`, `Cash`, `Payme`, `Card`.

### Utilities (`src/lib/`)
- `utils.ts` — general helpers
- `exportUtils.ts` — CSV and PDF export logic using jsPDF

### Path Alias
`@` maps to the project root (configured in both `vite.config.ts` and `tsconfig.json`).

## Backend Notes
- FastAPI + SQLAlchemy + SQLite (migratable to PostgreSQL)
- Backend source lives in `/backend` (not in this directory)
- JWT auth, Pydantic validation
- Full API spec at `http://localhost:8000/docs` when running
