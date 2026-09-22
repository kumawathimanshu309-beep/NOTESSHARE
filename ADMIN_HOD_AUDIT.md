# STUDYSHARE — ADMIN / HOD GOVERNANCE AUDIT

## 1. Governance Authority & Boundary
The HOD / Admin Panel (`/admin`) serves as the central governance authority for StudyShare.
- Protected strictly by `isLoggedIn` and `isAdmin` middleware.
- Unauthenticated access redirects (302) to `/auth/login`. Unauthorized student or teacher requests receive HTTP 403 Forbidden.

---

## 2. Key Administrative Modules
1. **Overview & Analytics**:
   - Real-time statistics across users, roles, notes, doubts, answers, comments, home cards, and pending teacher requests.
2. **User & Role Management**:
   - User account listing, search, filtering, role updates, and teacher demotions (`POST /admin/users/:id/demote`).
   - Last-admin protection: Ensures sole administrator account cannot be demoted or deleted.
3. **Teacher Governance Requests (`/admin/teacher-requests`)**:
   - Concurrency-safe approval (`POST /admin/teacher-requests/:id/approve`) and rejection (`POST /admin/teacher-requests/:id/reject`).
   - Atomic conditional updates prevent double-processing and race conditions.
4. **Resource Moderation**:
   - Toggle publish status, soft delete, and restore study notes.
5. **Audit Trail (`/admin/audit-logs`)**:
   - Tracks all administrative and governance actions with actor, action, targetType, targetId, details, and timestamps.
