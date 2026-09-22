# PHASE 7 — ADMIN GOVERNANCE & ACTION MATRIX

This matrix details all admin routes, permission controls, parameters, expected outcomes, security guards, and verification statuses.

---

## 1. Route & Governance Action Matrix

| Route | HTTP Method | Action Description | Allowed Roles | Guards & Validations | Audit Log Action | Verification |
|-------|-------------|--------------------|---------------|----------------------|------------------|--------------|
| `/admin` | GET | Render Admin Dashboard with real stats | Admin | `isLoggedIn`, `isAdmin` | N/A | PASS ✅ |
| `/admin/users` | GET | List users with search & role filters | Admin | `isLoggedIn`, `isAdmin`, select `-password` | N/A | PASS ✅ |
| `/admin/users/:id/role` | PATCH | Update user role (`student`/`teacher`/`admin`) | Admin | **Last-Admin Protection**, Whitelisted roles | `ROLE_CHANGED` | PASS ✅ |
| `/admin/notes` | GET | List notes for moderation | Admin | `isLoggedIn`, `isAdmin` | N/A | PASS ✅ |
| `/admin/notes/:id/toggle-publish` | PATCH | Toggle note publish status | Admin | `isLoggedIn`, `isAdmin` | `NOTE_PUBLISHED` / `NOTE_UNPUBLISHED` | PASS ✅ |
| `/admin/notes/:id` | DELETE | Soft-delete note (`isDeleted: true`) | Admin | `isLoggedIn`, `isAdmin` | `NOTE_DELETED` | PASS ✅ |
| `/admin/doubts` | GET | List student doubts for moderation | Admin | `isLoggedIn`, `isAdmin` | N/A | PASS ✅ |
| `/admin/doubts/:id` | DELETE | Soft-delete doubt (`isDeleted: true`) | Admin | `isLoggedIn`, `isAdmin` | `DOUBT_DELETED` | PASS ✅ |
| `/admin/home-content` | GET | List Home Cards for management | Admin | `isLoggedIn`, `isAdmin` | N/A | PASS ✅ |
| `/admin/home-content` | POST | Create new Home Card | Admin | Relative URL validation, Mass-assignment protection | `HOME_CARD_CREATED` | PASS ✅ |
| `/admin/home-content/:id/toggle-publish` | PATCH | Toggle Home Card publish status | Admin | `isLoggedIn`, `isAdmin` | `HOME_CARD_PUBLISHED` / `UNPUBLISHED` | PASS ✅ |
| `/admin/home-content/:id/toggle-enable` | PATCH | Toggle Home Card enabled status | Admin | `isLoggedIn`, `isAdmin` | `HOME_CARD_ENABLED` / `DISABLED` | PASS ✅ |
| `/admin/home-content/:id` | DELETE | Soft-delete Home Card | Admin | `isLoggedIn`, `isAdmin` | `HOME_CARD_DELETED` | PASS ✅ |
| `/admin/home-content/:id/restore` | PATCH | Restore soft-deleted Home Card | Admin | `isLoggedIn`, `isAdmin` | `HOME_CARD_RESTORED` | PASS ✅ |
| `/admin/audit-logs` | GET | Render system audit logs | Admin | `isLoggedIn`, `isAdmin`, Read-only | N/A | PASS ✅ |

---

## 2. Last-Admin Protection Matrix

| Case # | Scenario Description | Initial Admins | Target Admin ID | Operation Attempted | Result | Status |
|--------|----------------------|----------------|-----------------|---------------------|--------|--------|
| L1 | Sole admin attempts demotion | 1 | `adminA` | Demote to `student` | DENIED (400 Bad Request) | PASS ✅ |
| L2 | Multi-admin demoting secondary admin | 2 | `adminB` | Demote to `teacher` | ALLOWED (`adminA` remains) | PASS ✅ |
| L3 | Secondary admin demoting themselves | 2 | `adminB` | Demote to `student` | ALLOWED (`adminA` remains) | PASS ✅ |
| L4 | Crafted API request targeting sole admin | 1 | `adminA` | Change role to `student` | DENIED (400 Bad Request) | PASS ✅ |
