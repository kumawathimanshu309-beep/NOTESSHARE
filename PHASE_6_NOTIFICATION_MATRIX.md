# PHASE 6 — NOTIFICATION TEST & BEHAVIOR MATRIX

This matrix details all interaction scenarios, user role variations, expected notification outputs, security guards, and test verification statuses.

---

## 1. Action Matrix

| Scenario # | Action Description | Actor Role | Target Owner Role | Expected Notification Created? | Notification Recipient | Type | EventKey | URL | Result |
|------------|--------------------|------------|-------------------|--------------------------------|------------------------|------|----------|-----|--------|
| S1 | User B likes Note of User A | Student | Student | YES | User A | `like` | `like:<noteId>:<userB>` | `/notes/:id` | PASS ✅ |
| S2 | User B unlikes Note of User A | Student | Student | NO (No notification on unlike) | N/A | N/A | N/A | N/A | PASS ✅ |
| S3 | User B re-likes Note of User A | Student | Student | NO (Duplicate blocked by eventKey) | User A | `like` | `like:<noteId>:<userB>` | `/notes/:id` | PASS ✅ |
| S4 | User A likes own Note | Student | Student | NO (Prevented by self-notification rule) | N/A | N/A | N/A | N/A | PASS ✅ |
| S5 | User B rates Note of User A | Student | Student | YES | User A | `rating` | `rating:<noteId>:<userB>` | `/notes/:id` | PASS ✅ |
| S6 | User B comments on Note of User A | Student | Student | YES | User A | `comment` | `comment:<commentId>` | `/notes/:id#comments` | PASS ✅ |
| S7 | Teacher C answers Doubt of Student A | Teacher | Student | YES | Student A | `teacher_answer` | `answer:<answerId>` | `/doubts/:id` | PASS ✅ |
| S8 | Student B answers Doubt of Student A | Student | Student | YES | Student A | `doubt_answer` | `answer:<answerId>` | `/doubts/:id` | PASS ✅ |
| S9 | Student A accepts Answer of Teacher C | Student | Teacher | YES | Teacher C | `answer_accepted` | `accepted:<doubtId>:<answerId>` | `/doubts/:id` | PASS ✅ |
| S10 | User B bookmarks Note of User A | Student | Student | NO (Private user action) | N/A | N/A | N/A | N/A | PASS ✅ |

---

## 2. Security & Authorization Matrix

| Scenario # | Action | Client User | Target Item Owner | Expected Outcome | Security Mechanism | Status |
|------------|--------|-------------|-------------------|------------------|-------------------|--------|
| A1 | `GET /notifications` | Guest | N/A | Redirect 302 to `/auth/login` | `isLoggedIn` middleware | PASS ✅ |
| A2 | `GET /notifications` | User A | User A | 200 OK (User A's notifications only) | `recipient = req.user._id` | PASS ✅ |
| A3 | `PATCH /notifications/:id/read` | User B | User A | 404 Not Found / Access Denied | `findOne({ _id, recipient: req.user._id })` | PASS ✅ |
| A4 | `DELETE /notifications/:id` | User B | User A | 404 Not Found / Access Denied | `findOneAndDelete({ _id, recipient: req.user._id })` | PASS ✅ |
| A5 | `POST /notifications/read-all` | User A | User A | 200 OK (Only User A items marked read) | `updateMany({ recipient: req.user._id })` | PASS ✅ |
| A6 | Client posts body `{ recipient: "userB" }` | User A | N/A | Recipient override ignored | Server-enforced `req.user._id` | PASS ✅ |
| A7 | Client posts body `{ isRead: true }` | User A | N/A | Field override ignored | Server-side validation | PASS ✅ |
| A8 | Notification HTML rendering | User A | N/A | XSS prevented via `<%= %>` | EJS HTML escaping | PASS ✅ |
