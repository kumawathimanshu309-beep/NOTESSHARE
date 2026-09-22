# STUDYSHARE — TEACHER PORTAL AUDIT

## 1. Portal Isolation & Security Scope
The Teacher Portal is hosted at `/teacher` (`/teacher/dashboard`).
- Access is strictly guarded server-side by `isLoggedIn` and `isTeacher` middleware.
- Admin governance controls (`/admin/*`) are completely omitted from the Teacher Portal UI and blocked at the route handler level (HTTP 403 Forbidden for teachers).

---

## 2. Dedicated Features & Workflows
1. **Teacher Dashboard Overview**:
   - Statistics: Notes Shared, Total Views Received, Downloads Received, Answers Given, Accepted Answers, Average Rating.
2. **Teaching Resources Management**:
   - Lists all authored resources with direct View PDF (`?v=fileVersion`), Edit, and Delete actions.
3. **Student Doubts Resolution**:
   - Displays open student doubts filtered by teacher's handled subjects or general open status.
4. **Candidate Recommendation**:
   - Allows teachers to recommend qualified student candidates for Teacher role promotion. Recommendations create a `TeacherRequest` in `pending` status for HOD/Admin review.
5. **Idempotent Teacher Account Seeding**:
   - Seed script: `scripts/seedTeacher.js`.
   - Environment variables: `TEACHER_NAME`, `TEACHER_USERNAME`, `TEACHER_EMAIL`, `TEACHER_PASSWORD`.
   - Seed account created with bcrypt password hashing and validated non-colliding credentials.
