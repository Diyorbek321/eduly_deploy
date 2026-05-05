# EduSaaS Backend Architecture & API Specification

This document provides a comprehensive blueprint for building the backend of the EduSaaS platform. It outlines the core architecture, database schema, required API endpoints, and business logic rules.

## 1. System Architecture Overview

*   **Pattern**: RESTful API (or GraphQL if preferred)
*   **Authentication**: JWT (JSON Web Tokens) based authentication.
*   **Role-Based Access Control (RBAC)**:
    *   `Admin`: Full access to all endpoints (CRUD on everything).
    *   `Teacher`: Read access to their own groups, students, schedule, and salary. Write access to attendance and student comments.
    *   `Student/Parent` (Optional future scope): Read access to their own profile, schedule, attendance, and payments.
*   **File Storage**: Cloud storage (e.g., AWS S3, Cloudinary) for storing uploaded avatars and documents. The database should only store the URL strings.

---

## 2. Database Schema (Relational)

*Note: This expands upon the ERD provided in `DATABASE_DESIGN.md` with specific data types and constraints suitable for PostgreSQL or MySQL.*

### Core Entities

**1. Users (Authentication & Base Profile)**
*   `id` (UUID, PK)
*   `role` (Enum: ADMIN, TEACHER, STUDENT)
*   `email` (String, Unique)
*   `password_hash` (String)

**2. Teachers & Support Teachers**
*   `id` (UUID, PK)
*   `user_id` (UUID, FK -> Users.id)
*   `type` (Enum: MAIN, SUPPORT)
*   `name` (String)
*   `specialty` (String)
*   `base_salary` (Decimal)
*   `hourly_rate` (Decimal)

**3. Students**
*   `id` (UUID, PK)
*   `user_id` (UUID, FK -> Users.id)
*   `name` (String)
*   `balance` (Decimal)
*   `coins` (Integer) - For Gamification

**4. Courses & Groups**
*   `id` (UUID, PK)
*   `name` (String)
*   `course_id` (UUID, FK -> Courses.id)
*   `teacher_id` (UUID, FK -> Teachers.id)

**5. Attendance & Payments**
*   `id` (UUID, PK)
*   `student_id` (UUID, FK -> Students.id)
*   `status` / `amount`

**6. Gamification (Rewards & Purchases)**
*   `id` (UUID, PK)
*   `name` (String)
*   `cost_coins` (Integer)
*   `stock` (Integer)

**7. Chat (Chats, Members, Messages)**
*   `id` (UUID, PK)
*   `chat_id` (UUID, FK -> Chats.id)
*   `sender_id` (UUID, FK -> Users.id)
*   `text` (Text)

---

## 3. Core API Endpoints Specification

Below is the comprehensive list of RESTful API endpoints required to power the Eduly platform frontend.

### 1. Authentication & Users
*   `POST /api/auth/login` - Authenticate user and get JWT.
*   `POST /api/auth/refresh` - Refresh JWT token.
*   `GET /api/auth/me` - Get current user profile.

### 2. Students
*   `GET /api/students` - List all students (Query: search, status, group_id).
*   `GET /api/students/:id` - Get student details (includes groups, attendance, payments).
*   `POST /api/students` - Create a new student.
*   `PUT /api/students/:id` - Update student details.
*   `DELETE /api/students/:id` - Archive/Soft delete a student.
*   `POST /api/students/:id/avatar` - Upload student avatar (Multipart form-data).

### 3. Teachers
*   `GET /api/teachers` - List all teachers.
*   `GET /api/teachers/:id` - Get teacher details.
*   `POST /api/teachers` - Create a new teacher.
*   `PUT /api/teachers/:id` - Update teacher details.
*   `DELETE /api/teachers/:id` - Archive/Soft delete a teacher.
*   `POST /api/teachers/:id/avatar` - Upload teacher avatar.

### 4. Support Teachers & Bookings
*   `GET /api/support-teachers` - List support teachers.
*   `POST /api/support-teachers` - Add a support teacher.
*   `PUT /api/support-teachers/:id` - Update a support teacher.
*   `DELETE /api/support-teachers/:id` - Remove a support teacher.
*   `GET /api/support-bookings` - List all 30-min bookings.
*   `POST /api/support-bookings` - Create a new booking (Student books a teacher).
*   `PUT /api/support-bookings/:id/status` - Update booking status (Pending, Confirmed, Completed, Canceled).

### 5. Courses
*   `GET /api/courses` - List all courses.
*   `GET /api/courses/:id` - Get course details.
*   `POST /api/courses` - Create a new course.
*   `PUT /api/courses/:id` - Update course details.
*   `DELETE /api/courses/:id` - Delete a course.

### 6. Groups
*   `GET /api/groups` - List all groups (Query: teacher_id, course_id).
*   `GET /api/groups/:id` - Get group details (includes enrolled students).
*   `POST /api/groups` - Create a new group.
*   `PUT /api/groups/:id` - Update group details.
*   `DELETE /api/groups/:id` - Delete a group.
*   `POST /api/groups/:id/enroll` - Enroll a student into the group.
*   `DELETE /api/groups/:id/enroll/:student_id` - Remove a student from the group.

### 7. Schedule & Rooms
*   `GET /api/rooms` - List all rooms.
*   `GET /api/schedule` - Get timetable (Query: room_id, teacher_id, group_id, date_range).
*   `POST /api/schedule` - Create a one-off or recurring class session.
*   `PUT /api/schedule/:id` - Update a class session.
*   `DELETE /api/schedule/:id` - Cancel a class session.

### 8. Attendance
*   `GET /api/attendance` - Get attendance records (Query: group_id, date).
*   `POST /api/attendance/batch` - Submit or update attendance for a group on a specific date.
*   `GET /api/attendance/student/:student_id` - Get attendance history for a specific student.

### 9. Payments (Transactions)
*   `GET /api/payments` - List all payments (Query: student_id, date_range, status).
*   `POST /api/payments` - Record a new payment.
*   `PUT /api/payments/:id` - Update payment status (e.g., Pending -> Success).
*   `DELETE /api/payments/:id` - Void a payment.

### 10. Salary (Payroll)
*   `GET /api/salaries` - List salary records (Query: teacher_id, month, year).
*   `POST /api/salaries/calculate` - Auto-calculate draft salary based on hours worked and rate.
*   `POST /api/salaries` - Confirm and save a salary payment.
*   `PUT /api/salaries/:id` - Update salary record.

### 11. Gamification (Rewards & Coins)
*   `GET /api/rewards` - List all available rewards.
*   `POST /api/rewards` - Create a new reward.
*   `PUT /api/rewards/:id` - Update a reward (cost, stock, image).
*   `DELETE /api/rewards/:id` - Delete a reward.
*   `POST /api/gamification/coins` - Add or deduct coins for a student (Body: student_id, amount, reason).
*   `GET /api/gamification/purchases` - List reward redemption history.
*   `POST /api/gamification/purchases` - Redeem a reward for a student (deducts coins, reduces stock).

### 12. Chat
*   `GET /api/chats` - List all group chats the current user is a part of.
*   `POST /api/chats` - Create a new group chat.
*   `GET /api/chats/:id` - Get chat details and members.
*   `PUT /api/chats/:id` - Update chat info (name).
*   `POST /api/chats/:id/members` - Add a member to the chat.
*   `DELETE /api/chats/:id/members/:user_id` - Remove a member from the chat.
*   `GET /api/chats/:id/messages` - Get message history for a chat (Pagination supported).
*   `POST /api/chats/:id/messages` - Send a new message to the chat (WebSocket event should also be triggered here).

### 13. SMS Notifications
*   `GET /api/sms/history` - List sent SMS messages.
*   `POST /api/sms/send` - Send a new SMS (Individual, Group, or Bulk).
*   `GET /api/sms/templates` - List SMS templates.
*   `POST /api/sms/templates` - Create a new template.
*   `PUT /api/sms/templates/:id` - Update a template.
*   `DELETE /api/sms/templates/:id` - Delete a template.

---

## 4. Critical Business Logic Rules (Backend Implementation)

1.  **Debt Calculation (Dynamic)**: A student's `debt` is calculated dynamically: `(Months Enrolled * Course Price) - Total Transactions Amount`.
2.  **Room Conflict Prevention**: When `POST /api/groups` or `POST /api/schedule` is called, the backend MUST check if the `room_id` is already booked. Return `409 Conflict` if overlapped.
3.  **Teacher Double-Booking Prevention**: Check if the `teacher_id` is already assigned to another group at the requested time.
4.  **Salary Snapshotting**: When a salary is paid (`POST /api/salaries`), copy the teacher's current `hourly_rate` into the `Salaries` table.
5.  **Soft Deletes**: Do not actually `DELETE` records for Students, Teachers, or Transactions. Use a `deleted_at` timestamp.
6.  **Real-time Chat**: The Chat API (`POST /api/chats/:id/messages`) should be coupled with a WebSocket server (e.g., Socket.io) to broadcast the message to all connected clients in that chat room instantly.
