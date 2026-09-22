# Phase 8 Implementation Plan — Dashboard, Profile, Activity & Analytics

Phase 8 completes user profile management, role-aware dashboard (Student vs Teacher), derived activity feed, real-time analytics aggregation, and security hardening for profile updates.

## Architecture & Security Enhancements

### 1. Safe Profile Projections & Data Exposure Control
- **Guest / Other User View (`GET /profile/:username`)**:
  - Safe projection object containing only public attributes (`name`, `username`, `avatar`, `role`, `bio`, `createdAt`, `qualification`, `experience`, `teachingBio`, `subjectsHandled`, `verificationStatus`).
  - Strict exclusion of `password`, `passwordHash`, `email`, private notes, private bookmarks, private likes, and private activity timeline.
- **Owner View (`isSelf = true`)**:
  - Displays all public contributions plus private saved bookmarks, private liked items, draft notes, and personal activity timeline.

### 2. Avatar URL Sanitization & Protocol Validation
- Helper function `isValidAvatarUrl(url)`:
  - Permits relative paths starting with `/` (e.g., `/images/...`, `/uploads/...`) or absolute HTTP/HTTPS URLs (`http://`, `https://`).
  - Rejects `javascript:`, `data:`, `vbscript:`, `file:`, protocol-relative `//`.
  - Fallback to `/images/logo.png`.

### 3. Username Modification Security & Session Synchronization
- Input normalization: `trim()`, `toLowerCase()`, length `3-30`, regex `^[a-zA-Z0-9_-]+$`.
- Database index: Unique index catch for Mongo `E11000` duplicate key errors.
- Session sync: Update `req.user.username` and invoke `req.login(updatedUser, ...)` so active Passport sessions remain authenticated.

### 4. Profile Mass-Assignment Defense
- Update route extracts ONLY allowlisted fields (`name`, `username`, `bio`, `avatar`, `qualification`, `experience`, `teachingBio`, `subjectsHandled`).
- Rejects / strips `_id`, `role`, `isAdmin`, `isVerifiedTeacher`, `verificationStatus`, `email`, `password`, `passwordHash`, `createdAt`, `updatedAt`, `isDeleted`.

### 5. Role-Aware Dashboard & Real Analytics
- **Student Dashboard (`GET /dashboard`)**:
  - Real stats: My Uploaded Notes, My Bookmarks, My Doubts, Answers Received, Total Likes Received.
  - Paginated sections: My Notes, My Bookmarks, My Liked Resources, My Doubts.
  - Latest 5 Unread/Recent Notifications via `notificationService`.
  - Derived Activity Feed (aggregated timeline).
- **Teacher Dashboard (`GET /dashboard`)**:
  - Real stats: Total Authored Notes, Total Views/Downloads, Total Likes Received, Average Rating, Doubts Answered, Accepted Answers.
  - Verification badge status (`verificationStatus`).
  - Paginated sections: My Authored Notes, My Answers / Answered Doubts, Open Doubts in Subject (`subjectsHandled`).
  - Latest 5 Notifications & Derived Activity Feed.
- **Admin Routing**:
  - If `user.role === 'admin'` or `user.isAdmin`, `/dashboard` redirects to `/admin`.

### 6. Derived Activity Feed Architecture
- Aggregates bounded recent window (`limit: 10`) across `Note`, `Doubt`, `Answer`, `Bookmark`, `Like`.
- Merges in memory, sorts by `createdAt` descending, and maps to uniform schema `{ type, title, link, createdAt, icon, badge }`.

### 7. Pagination Clamping Helper
- `parsePagination(req.query)`:
  - `page`: `Math.max(1, parseInt(req.query.page, 10) || 1)`
  - `limit`: `Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10))`

---

## File Changes Overview

### Services & Controllers
- `controllers/profileController.js`: Projections, pagination, avatar validation, username collision handling, session sync.
- `controllers/dashboardController.js`: Student vs Teacher dashboard routing, Admin redirect, analytics integration.
- `services/socialService.js`: Dynamic query aggregations for stats, bookmarks received, activity timeline, pagination support.
- `validators/socialValidator.js`: Updated profile update Joi / schema validation for avatar, username regex.

### Views & UI Components
- `views/profile/index.ejs`: Public vs Private profile view tabs, role badges, real analytics grid.
- `views/profile/edit.ejs`: Profile update form with avatar selector & sanitization.
- `views/dashboard/index.ejs`: Student dashboard with notifications panel, resource tabs, doubts tracker, activity feed.
- `views/teacher/dashboard.ejs`: Teacher dashboard with teaching resources, answers tracker, verification status, subject doubt matcher.

### Security Test Suite
- `scratch/testPhase8Dashboard.js`: Automated integration test script executing all 22 checklist assertions.

---

## Verification Plan
1. Run `node scratch/testPhase8Dashboard.js`.
2. Run full regression suite: `scratch/testPhase7Admin.js`, `scratch/testPhase6Notifications.js`, `scratch/testPhase5_5FullAudit.js`, `scratch/testNoteViewSecurity.js`, `scratch/verifyResponsiveOverflow.js`.
3. Generate documentation: `PHASE_8_REPORT.md`, `PHASE_8_SECURITY_AUDIT.md`, `PHASE_8_PERFORMANCE_AUDIT.md`, `PHASE_8_FINAL_AUDIT.md`.
