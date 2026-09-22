# STUDYSHARE — GOVERNANCE SECURITY AUDIT

## 1. Security Matrix & Access Controls
| Persona | Route / Action | Behavior / Result |
| :--- | :--- | :--- |
| **Guest** | `/admin/*` | Redirect 302 to `/auth/login` |
| **Student** | `/admin/*` | HTTP 403 Forbidden |
| **Teacher** | `/admin/*` | HTTP 403 Forbidden |
| **Student** | `POST /teacher-requests` | Self-application created (`pending`) |
| **Teacher** | `POST /teacher-requests` | Candidate recommendation created (`pending`) |
| **Student/Teacher** | `POST /admin/teacher-requests/:id/approve` | HTTP 403 Forbidden |
| **Admin** | `POST /admin/teacher-requests/:id/approve` | Concurrency-safe atomic approval & role change |
| **Teacher** | Demote another teacher | HTTP 403 Forbidden |
| **Admin** | `POST /admin/users/:id/demote` | Demotes teacher to student, preserves assets |

---

## 2. Hardened Security Controls
1. **Duplicate Request Prevention**: Candidate compound index `{ candidateUser: 1, status: 1 }` blocks duplicate pending applications.
2. **Concurrency Safety**: `TeacherRequest.findOneAndUpdate({ _id: requestId, status: 'pending' }, ...)` prevents double-processing and race conditions.
3. **Mass-Assignment Defense**: `fileVersion` and `role` fields are server-managed and stripped from user HTTP request bodies.
4. **Credential Safety**: Passwords stored as `bcrypt` hashes (salt factor 12) via Mongoose pre-save hook and excluded from default queries (`select: false`).
5. **Notification Idempotency**: System notifications use distinct `eventKey`s (`teacher-request-approved:<requestId>`, `teacher-request-rejected:<requestId>`).
