# PHASE 6 — SECURITY AUDIT REPORT

## Executive Summary
Phase 6 introduces database-backed persistent notifications, a Notification Center, and navbar unread counters to StudyShare. This security audit evaluates authentication, authorization, IDOR protection, mass assignment prevention, XSS escaping, URL target validation, concurrency idempotency, and CSRF protection.

---

## 1. Security Domains Audited

### 1. Authentication & Session Control
- **Requirement**: All notification endpoints (`/notifications`, `/notifications/:id/read`, `/notifications/read-all`, `/notifications/:id`) must require active authentication.
- **Audit Result**: PASS ✅
- **Implementation**: Protected by `isLoggedIn` middleware. Unauthenticated requests are rejected with a `302 Redirect` to `/auth/login`.

### 2. Authorization & IDOR (Insecure Direct Object Reference)
- **Requirement**: User A must never be able to read, mark as read, or delete notifications belonging to User B.
- **Audit Result**: PASS ✅
- **Implementation**:
  - `getUserNotifications`: Hardcoded filter `{ recipient: req.user._id }`.
  - `markAsRead`: Hardcoded query `{ _id: notificationId, recipient: req.user._id }`.
  - `deleteNotification`: Hardcoded query `{ _id: notificationId, recipient: req.user._id }`.
  - `markAllAsRead`: Hardcoded query `{ recipient: req.user._id, isRead: false }`.
  - Attempting to access or mutate another user's notification returns a `404 Not Found / Access Denied` response.

### 3. Mass Assignment & Payload Tampering Protection
- **Requirement**: Client requests must not be able to forge or override `recipient`, `actor`, `isRead`, `readAt`, `eventKey`, or `url`.
- **Audit Result**: PASS ✅
- **Implementation**:
  - `recipient` is calculated strictly server-side from resource ownership (`note.author`, `doubt.student`, `answer.author`).
  - `actor` is derived from `req.user._id`.
  - `isRead` and `readAt` are updated strictly via server-side service logic.

### 4. Self-Notification Prevention
- **Requirement**: Actions performed by a user on their own resources must not generate self-notifications.
- **Audit Result**: PASS ✅
- **Implementation**: Checked in `notificationService.createNotification`:
  ```javascript
  if (actor && recipient.toString() === actor.toString()) return null;
  ```

### 5. XSS (Cross-Site Scripting) Mitigation
- **Requirement**: User-generated content embedded in notification titles and messages (such as note titles or user names) must not execute scripts.
- **Audit Result**: PASS ✅
- **Implementation**:
  - In `views/notifications/index.ejs`, all title, message, and name fields are rendered using EJS HTML-escaped tags (`<%= %>`). Unsafe `<%- %>` raw rendering is avoided.

### 6. Target URL & Open Redirect Security
- **Requirement**: Notification URLs must be strictly internal relative paths.
- **Audit Result**: PASS ✅
- **Implementation**:
  - URLs are generated server-side (e.g., `/notes/:id`, `/notes/:id#comments`, `/doubts/:id`).
  - `notificationService` validates that URLs begin with `/` and reject `//` protocols or `javascript:` schemes.

### 7. Concurrency & Idempotency (`eventKey`)
- **Requirement**: Duplicate HTTP requests or rapid toggles must not spawn duplicate notification records.
- **Audit Result**: PASS ✅
- **Implementation**:
  - MongoDB compound index `{ eventKey: 1 }` with `unique: true, sparse: true`.
  - Duplicate key errors (`code 11000`) are caught gracefully without failing the request or creating duplicates.

### 8. CSRF (Cross-Site Request Forgery) Status Evaluation
- **Honest Architectural Disclosure**:
  - CSRF protection was deferred in previous project phases (Phase 1-5).
  - State-changing notification routes (`POST /notifications/read-all`, `PATCH /notifications/:id/read`, `DELETE /notifications/:id`) currently rely on session cookies configured with `sameSite: 'lax'` and `httpOnly: true`.
  - **Status**: CSRF gap is acknowledged and remains scheduled for formal resolution in **Phase 9**. No false claims of full CSRF token middleware are made.

---

## 2. Security Test Matrix Summary
- IDOR Tests: PASSED ✅
- Mass Assignment Tests: PASSED ✅
- Self-Notification Tests: PASSED ✅
- XSS Escaping Tests: PASSED ✅
- URL Validation Tests: PASSED ✅
- Concurrency Duplicate Tests: PASSED ✅
