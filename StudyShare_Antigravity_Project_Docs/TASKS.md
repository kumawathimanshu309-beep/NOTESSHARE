# StudyShare — Implementation Roadmap

## Phase 0 — Audit
- [x] Inspect current React/Vite UI.
- [x] Inspect package.json.
- [x] Inventory assets.
- [x] Identify reusable CSS/JS.
- [x] Run current project.
- [x] Record existing routes/components.

## Phase 1 — Backend Foundation
- [x] Express app
- [x] EJS
- [x] layouts/partials
- [x] static assets
- [x] MongoDB connection
- [x] environment config
- [x] error classes
- [x] wrapAsync
- [x] 404/error middleware
- [x] Helmet
- [x] Morgan
- [x] cookie-parser
- [x] CORS

## Phase 2 — Authentication
- [x] User model
- [x] signup
- [x] login
- [x] logout
- [x] roles (student, teacher, admin)
- [x] protected routes (/dashboard, /admin)
- [x] authorization middleware (isLoggedIn, isTeacher, isAdmin, isOwner)
- [x] flash messages
- [x] Passport Local Strategy
- [x] bcryptjs password hashing
- [x] Express Session
- [x] connect-mongo session storage
- [x] Joi validation
- [x] Mongoose validation
- [x] Auth views (Login, Signup matching StudyShare design)
- [x] Admin seed mechanism (scripts/seedAdmin.js)

## Phase 3 — Notes & Resources CRUD
- [x] Note model
- [x] `notesshare` collection
- [x] create
- [x] read
- [x] edit
- [x] delete (soft delete)
- [x] ownership & IDOR protection
- [x] Joi validation
- [x] Mongoose validation
- [x] upload validation (Multer file limits & MIME whitelist)

## Phase 4 — Explore & Social Interactions
- [x] Search (title, description, tags, subject)
- [x] Filters (subject, semester, resourceType)
- [x] Sort (newest, oldest, popular, downloads)
- [x] Pagination (safe page/limit parsing)
- [x] Note details view
- [x] Likes (`Like` model, toggle, DB unique compound index `{ user, note }`)
- [x] Bookmarks (`Bookmark` model, toggle, DB unique compound index `{ user, note }`)
- [x] Ratings (`Rating` model, 1-5 star validation, MongoDB `$group` aggregation)
- [x] Comments (`Comment` model, required/trimmed, soft-delete, IDOR guards, admin override)
- [x] User Profile (`GET /profile/:username`, `GET /profile/edit`, `PUT /profile` with mass-assignment protection)
- [x] User Dashboard (`GET /dashboard` showing uploaded notes, bookmarked notes, liked notes, comments)

## Phase 5 — Teacher Workflows & Doubts Q&A System
- [x] Teacher workflow foundation & `isTeacher` server-side gate
- [x] Teacher profile fields (qualification, experience, teachingBio, subjectsHandled, verificationStatus)
- [x] Teacher Dashboard (`GET /teacher/dashboard`)
- [x] Public Teacher Profile (`GET /teachers/:username`)
- [x] Student Doubts model (`models/Doubt.js`) with status lifecycle (`open`, `answered`, `resolved`, `closed`)
- [x] Student Ask Doubt (`GET /doubts/new`, `POST /doubts` deriving student identity)
- [x] Doubts Search, Subject/Status Filters, Safe Pagination, Whitelisted Sorting
- [x] Teacher Answer model (`models/Answer.js`) and Teacher Answer submission (`POST /doubts/:id/answers`)
- [x] Answer Edit & Soft-Delete (`PUT /answers/:id`, `DELETE /answers/:id`)
- [x] Student Solution Acceptance (`POST /answers/:id/accept`) with single-accepted solution invariant
- [x] IDOR guards, mass-assignment protection, and XSS escaping

## Phase 6 — Notifications & Real-Time System
- [ ] Notifications model
- [ ] Notification preferences
- [ ] Event hooks (on answer, on solution accept, on comment)
- [ ] Read / Unread status APIs
- [ ] Notification center UI

## Phase 7 — Admin Panel & Governance
- [ ] admin dashboard
- [ ] users management
- [ ] notes moderation
- [ ] comments moderation
- [ ] reports
- [ ] categories & subjects management

## Phase 8 — Community
- [ ] posts
- [ ] comments/replies
- [ ] tags
- [ ] moderation

## Phase 9 — QA
- [ ] route audit
- [ ] button/link audit
- [ ] auth audit
- [ ] CRUD audit
- [ ] validation audit
- [ ] security audit
- [ ] responsive audit
- [ ] console/server error audit

## Phase 10 — Deployment Preparation
- [ ] production environment variables
- [ ] secure cookies
- [ ] MongoDB production connection
- [ ] upload storage
- [ ] README
- [ ] deployment checklist
