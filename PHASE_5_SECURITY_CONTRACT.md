# StudyShare — Phase 5 Teacher Workflows & Doubts Q&A Security Contract

## Executive Overview
Phase 5 implements Teacher Workflows (Teacher Portal, Teacher Dashboard, Public Teacher Profiles) and the Student Doubts / Q&A System (Doubt creation, Teacher Answers, Accepted Solution Lifecycle). This document specifies the strict zero-trust security contracts, identity derivation rules, mass-assignment guards, and authorization matrix governing Phase 5.

---

## 1. Zero-Trust Identity & Role Enforcement
- **Identity Derivation**: All state-changing endpoints (`POST /doubts`, `POST /doubts/:id/answers`, `POST /answers/:id/accept`, `PUT /doubts/:id`, `PUT /answers/:id`, `DELETE /answers/:id`) **MUST** derive identity strictly from `req.user._id`.
- **Teacher Authorization**: Teacher routes (`/teacher/dashboard`, `POST /doubts/:id/answers`) are strictly protected by `isTeacher` server-side middleware (`req.user.role === 'teacher' || req.user.role === 'admin'`).
- **Role Escalation Protection**: `req.body.role`, `req.body.isTeacher`, `req.body.verificationStatus`, `req.body.student`, `req.body.author`, `req.body.isAccepted` are stripped by validators and services to prevent self-promotion or identity impersonation.

---

## 2. Phase 5 Authorization Matrix

| Action | Guest | Student | Doubt Owner | Teacher | Answer Author | System Admin | Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **View Doubts Listing** | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Allow | `GET /doubts` |
| **Ask Doubt** | ❌ Deny | ✅ Allow | ✅ Allow | ❌ Deny | ❌ Deny | ✅ Governance | `isLoggedIn` + derive `student = req.user._id` |
| **Edit Doubt** | ❌ Deny | ❌ Deny non-owner | ✅ Allow | ❌ Deny non-owner | ❌ Deny non-owner | ✅ Governance | Server-side `doubt.student.equals(req.user._id)` |
| **Delete Doubt** | ❌ Deny | ❌ Deny non-owner | ✅ Allow | ❌ Deny non-owner | ❌ Deny non-owner | ✅ Governance | Soft delete (`isDeleted: true`) |
| **Submit Answer** | ❌ Deny | ❌ Deny (403) | ❌ Deny | ✅ Allow | ✅ Allow | ✅ Governance | `isTeacher` middleware (`req.user.role === 'teacher'`) |
| **Edit Answer** | ❌ Deny | ❌ Deny | ❌ Deny | ❌ Deny non-author | ✅ Allow | ✅ Governance | Server-side `answer.author.equals(req.user._id)` |
| **Delete Answer** | ❌ Deny | ❌ Deny | ❌ Deny | ❌ Deny non-author | ✅ Allow | ✅ Governance | Soft delete (`isDeleted: true`) |
| **Accept Solution** | ❌ Deny | ❌ Deny non-owner | ✅ Allow | ❌ Deny non-owner | ❌ Deny non-owner | ✅ Governance | Server-side `doubt.student.equals(req.user._id)` |
| **Teacher Dashboard** | ❌ Deny | ❌ Deny (403) | ❌ Deny (403) | ✅ Allow | ✅ Allow | ✅ Governance | `GET /teacher/dashboard` + `isTeacher` |

---

## 3. Single-Accepted Solution Invariant
- A student doubt can have at most **ONE** accepted answer (`isAccepted === true`).
- When a student accepts an answer via `POST /answers/:id/accept`, the system resets any previously accepted answer for that doubt (`Answer.updateMany({ doubt: doubt._id }, { isAccepted: false })`), sets `answer.isAccepted = true`, updates `doubt.acceptedAnswer = answer._id`, and sets `doubt.status = 'resolved'`.

---

## 4. XSS & Input Sanitization
- All user-generated text (`title`, `description`, `answer content`, `teachingBio`, `qualification`) is HTML-escaped during EJS rendering using standard `<%= %>` tags. HTML elements are safely rendered as text.
