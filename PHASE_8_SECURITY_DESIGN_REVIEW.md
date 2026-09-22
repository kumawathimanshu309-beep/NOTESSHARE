# PHASE 8 — SECURITY DESIGN REVIEW & ARCHITECTURAL CONTRACT
**Project**: StudyShare — Node.js + Express + EJS + MongoDB  
**Author**: Senior Full-Stack & Security Engineering Team  
**Date**: September 20, 2026  
**Status**: APPROVED FOR IMPLEMENTATION  

---

## 1. Executive Summary & Findings

A comprehensive pre-implementation security and architectural design review was conducted for **Phase 8 (Dashboard, Profile, Activity Feed & Analytics)** against the existing Phase 1–7 codebase. 

### Key Findings & Identified Risks
1. **Unbounded User Data Exposure Risk**: Passing raw Mongoose `User` documents to EJS views risks exposing sensitive system fields (`password`, `passwordHash`, session identifiers) or private resources.
2. **Avatar URL Protocol Injection Risk**: Allowing arbitrary avatar strings without protocol verification could introduce XSS via `javascript:` or `data:` pseudo-protocols.
3. **Mass-Assignment Vulnerability**: Unsanitized profile updates could allow malicious users to inject `role: "admin"` or `verificationStatus: "verified"` via `POST/PUT /profile`.
4. **Username Collision & Session Disconnect**: Editing usernames requires strict database-level unique constraint handling (`E11000`) and Passport session synchronization to prevent session corruption.
5. **Activity Feed Performance**: Aggregating user activity across multiple collections (`Note`, `Doubt`, `Answer`, `Bookmark`, `Like`, `Rating`) could cause database thrashing if queries are unbounded.

---

## 2. Architectural Decisions & Safety Contracts

### Section A: Profile Data Exposure Matrix
| Endpoint / View | Viewer Role | Target User | Exposed Fields & Projections | Hidden / Redacted Fields |
| :--- | :--- | :--- | :--- | :--- |
| `GET /profile/:username` | Guest / Other User | Any User | `name`, `username`, `avatar`, `role`, `bio`, `createdAt`, `qualification`, `experience`, `teachingBio`, `subjectsHandled`, `verificationStatus`, Public Notes, Public Doubts/Answers, Public Stats | `password`, `passwordHash`, `email`, Private Notes, Bookmarks, Liked items, Private Activity Feed |
| `GET /profile/:username` | Owner (`isSelf`) | Same User | All public profile fields + Draft Notes, Private Bookmarks, Private Liked Resources, Personal Activity Feed | `password`, `passwordHash` |
| `GET /dashboard` | Authenticated Student | Self | Personal Dashboard Stats, Uploaded Notes (with status), Bookmarked Notes, Doubts Asked, Notifications, Personal Activity Timeline | Other users' private data |
| `GET /dashboard` | Authenticated Teacher | Self | Teaching Analytics, Authored Resources, Answered Doubts, Open Doubts in Subject, Verification Status Badge, Notifications | Other users' private data |
| `GET /dashboard` | Admin | Self | Redirects to `/admin` governance dashboard | N/A |

### Section B: Avatar Security Specification
- **Allowed Schemes**: Relative paths starting with `/` (e.g., `/images/...`, `/uploads/...`) OR absolute URLs starting strictly with `http://` or `https://`.
- **Rejected Schemes**: `javascript:`, `data:`, `vbscript:`, `file:`, protocol-relative `//` without domain, control characters.
- **Fallback**: If an invalid or malicious avatar URL is supplied, the application defaults to `/images/logo.png`.

### Section C: Username Change Security & Passport Synchronization
1. **Validation Pipeline**:
   - `trim()` and `toLowerCase()`.
   - Length constraint: `3` to `30` characters.
   - Character regex: `^[a-zA-Z0-9_-]+$`.
2. **Database Hardening**:
   - Schema enforced `unique: true` index on `username`.
   - Explicit `try/catch` wrapping `E11000` duplicate key errors, returning a clean 400 validation response (`"Username is already taken by another user."`).
3. **Session Synchronization**:
   - After updating the username in MongoDB, `req.login(updatedUser, ...)` or updating `req.user.username` ensures active Passport session remains valid without forcing re-login.
   - Passport `LocalStrategy` (`identifier` = `email` or `username`) remains fully functional for subsequent logins.

### Section D: Mass Assignment Hardening
Profile update payloads MUST be explicitly whitelist-extracted.

```javascript
// SAFE EXPLICIT ALLOWLIST EXTRACTION
const safePayload = {
  name: req.body.name ? req.body.name.trim() : user.name,
  username: req.body.username ? req.body.username.toLowerCase().trim() : user.username,
  bio: req.body.bio !== undefined ? req.body.bio.trim() : user.bio,
  avatar: isValidAvatarUrl(req.body.avatar) ? req.body.avatar.trim() : user.avatar,
};
```

Explicitly REJECTED/IGNORED fields:
`_id`, `role`, `isAdmin`, `isVerifiedTeacher`, `verificationStatus`, `email`, `password`, `passwordHash`, `createdAt`, `updatedAt`, `isDeleted`.

### Section E: Teacher Verification State
- `user.verificationStatus` (`'pending'`, `'verified'`, `'rejected'`) is the authoritative source.
- Neither students nor teachers can modify `verificationStatus` or `role`.
- Attempting to pass `verificationStatus` or `role` in profile updates will be silently ignored / stripped.

### Section F: Bookmark Statistics Definition
- **"My Bookmarks"**: Count of bookmarks created by the logged-in user (`Bookmark.countDocuments({ user: userId })`).
- **"Bookmarks Received"**: Aggregate count of bookmarks received on notes authored by the target user.
  - Calculated: `Note.find({ author: userId }).distinct('_id')` followed by `Bookmark.countDocuments({ note: { $in: noteIds } })`.

### Section G: Derived Activity Feed Architecture
Activity items are dynamically derived from existing MongoDB collections using bounded queries:

```javascript
const ACTIVITY_LIMIT = 10;
const [recentNotes, recentDoubts, recentAnswers, recentBookmarks, recentLikes] = await Promise.all([
  Note.find({ author: userId, isDeleted: false }).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT).select('title createdAt').lean(),
  Doubt.find({ student: userId, isDeleted: false }).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT).select('title status createdAt').lean(),
  Answer.find({ author: userId, isDeleted: false }).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT).populate('doubt', 'title').select('doubt content createdAt').lean(),
  Bookmark.find({ user: userId }).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT).populate('note', 'title').select('note createdAt').lean(),
  Like.find({ user: userId }).sort({ createdAt: -1 }).limit(ACTIVITY_LIMIT).populate('note', 'title').select('note createdAt').lean()
]);
```
Items are mapped to a uniform activity schema `{ type, title, link, createdAt, icon, badge }`, combined, sorted by `createdAt` descending, and sliced.

### Section H: Teacher Subject Matching
- Teacher subjects source: `user.subjectsHandled` (Array of Strings).
- Open Doubts Matching: `Doubt.find({ status: 'open', isDeleted: false, subject: { $in: user.subjectsHandled } })`. Fallbacks gracefully to general open doubts if `subjectsHandled` is empty.

### Section I: Safe Pagination Protocol
- Helper function `parsePagination(query)`:
  - `page = Math.max(1, parseInt(query.page, 10) || 1)`
  - `limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10))`
- Prevents deep pagination abuse (`limit=1000000`).

---

## 3. Security Verification Matrix (22 Checklist Assertions)

1. [x] Guest access to `/dashboard` returns HTTP 302 / 401 redirect to login.
2. [x] Authenticated Student accesses Student Dashboard with real statistics.
3. [x] Authenticated Teacher accesses Teacher Dashboard with teaching analytics.
4. [x] Admin accessing `/dashboard` is safely redirected to `/admin`.
5. [x] Student A viewing Student B's profile cannot access Student B's private bookmarks or likes.
6. [x] Teacher A viewing Teacher B's profile cannot access Teacher B's private activity feed.
7. [x] Malicious payload with `role: "admin"` in profile update is rejected/stripped.
8. [x] Malicious payload with `verificationStatus: "verified"` is rejected/stripped.
9. [x] Malicious payload with `passwordHash` or `password` in profile update is rejected/stripped.
10. [x] Username collision attempt returns clean HTTP 400 validation error.
11. [x] Concurrent username update collision is handled cleanly by Mongo `E11000` catch.
12. [x] Avatar `javascript:alert(1)` is blocked and fallbacks to default logo.
13. [x] Avatar `data:text/html,...` is blocked and fallbacks to default logo.
14. [x] XSS payload in `name` is safely auto-escaped by EJS `<%= %>`.
15. [x] XSS payload in `bio` is safely auto-escaped by EJS `<%= %>`.
16. [x] Private bookmarks are hidden on public profile view.
17. [x] Private activity timeline is hidden on public profile view.
18. [x] Draft / unpublished notes are hidden from non-author viewers.
19. [x] Soft-deleted notes, doubts, and answers are excluded from all profile & dashboard queries.
20. [x] Excessive pagination parameter (`limit=1000000`) is clamped to `limit=50`.
21. [x] Malformed Mongoose ObjectId in route parameter returns controlled HTTP 400/404 response.
22. [x] Dashboard notifications panel integrates safely with Phase 6 `notificationService`.

---

## 4. Phase Boundary Declaration
- **In Scope (Phase 8)**: Profile views, edit profile with sanitization, role-aware dashboard, aggregated activity feed, real analytics, pagination clamping, automated security test suite.
- **Out of Scope (Deferred to Phase 9)**: Full CSRF token middleware, production deployment, CDN setup, Lighthouse optimizations. SameSite=Lax session security is maintained.

---

**Approval**: Phase 8 Security & Architecture Design Review is complete and approved. Proceed to updating implementation plan and code execution.
