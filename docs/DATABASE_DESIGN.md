# EduSaaS Database Design

This document outlines the database architecture for the EduSaaS platform, including entities, fields, and relationships.

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    TEACHER ||--o{ GROUP : teaches
    TEACHER ||--o{ SALARY : receives
    COURSE ||--o{ GROUP : contains
    GROUP ||--o{ STUDENT_GROUP : enrolls
    STUDENT ||--o{ STUDENT_GROUP : belongs_to
    STUDENT ||--o{ TRANSACTION : makes
    STUDENT ||--o{ ATTENDANCE : records
    GROUP ||--o{ ATTENDANCE : tracks

    TEACHER {
        string id PK
        string name
        string phone
        string specialty
        int groupsCount
        string status "Faol | Nofaol"
        int hours "Total monthly hours"
        int studentsCount
        float rating
        float salary "Base salary"
        float hourlyRate "Rate for automated payroll"
        float bonus "Standard monthly bonus"
    }

    COURSE {
        string id PK
        string name
        string duration
        string price
        int lessonsCount
        int groupsCount
        string status "Faol | Nofaol"
        string description
    }

    GROUP {
        string id PK
        string name
        string courseId FK
        string teacherId FK
        string level "Beginner | Intermediate | etc"
        string schedule "Dush-Chor-Jum | etc"
        string time "14:00 - 15:30"
        string room
        int capacity
        int studentsCount
        string status "Faol | Qabul ochiq | Yopilgan"
    }

    STUDENT {
        string id PK
        string name
        string phone
        string birthDate
        string gender "Erkak | Ayol"
        string address
        string parentName
        string parentPhone
        string status "Faol | Muzlatilgan | Ketgan"
        float debt
        float paid
        float attendance_percentage
    }

    STUDENT_GROUP {
        string studentId FK
        string groupId FK
        datetime joinedAt
    }

    ATTENDANCE {
        string id PK
        string studentId FK
        string groupId FK
        date date
        string status "present | absent | excused"
    }

    SALARY {
        string id PK
        string teacherId FK
        float amount "Calculated: hours * rate"
        float bonus "Performance bonus"
        float total "Sum of amount + bonus"
        string status "To'landi | Kutilmoqda"
        date date
        string type "Asosiy maosh | Avans"
        string method "Karta | Naqd | Payme"
        int hours "Hours worked this period"
        float rate "Hourly rate at time of payment"
    }

    TRANSACTION {
        string id PK
        string studentId FK
        float amount
        string type "Click | Cash | Payme | Card"
        date date
        string status "Muvaffaqiyatli | Kutilmoqda | Rad etildi"
    }
```

## Core Logic

### 1. Automated Payroll
The system calculates `SALARY.amount` by multiplying `TEACHER.hours` by `TEACHER.hourlyRate`. The `SALARY.bonus` is initialized from `TEACHER.bonus` but can be adjusted manually by admins.

### 2. Group-Based Attendance
Attendance is recorded per student per group. This allows the platform to filter the attendance list so that only students enrolled in the selected group are displayed during marking.

### 3. Financial Tracking
- **Income**: Tracked via `TRANSACTION` linked to `STUDENT`.
- **Expense**: Tracked via `SALARY` linked to `TEACHER`.
- **Balance**: Calculated as `Income - Expense`.
