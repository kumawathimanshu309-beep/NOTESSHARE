# STUDYSHARE — MY NOTES MANAGEMENT AUDIT

## 1. Scope & Ownership Security
The "My Notes" section in the user dashboard (`/dashboard#my-notes`) strictly queries resources authored by the authenticated user (`author: req.user._id, isDeleted: false`).
- **No IDOR**: Query parameters (`req.query.userId`, `req.body.userId`) are completely ignored.
- **Resource Scope**:
  - Owner Dashboard: Displays published and draft notes, public and private notes authored by `req.user._id`.
  - Public Profile Visitors: Excludes drafts and private resources (`isPublished: true, visibility: 'public'`).

---

## 2. Resource Management Controls
Each resource entry in My Notes includes:
- Badges for Subject, Semester, Visibility (Public/Private), and Status (Published/Draft).
- Statistics: Views, Downloads, Created Date, Updated Date.
- Actions:
  - **View PDF**: Opens `/notes/:id/view?v=fileVersion` in a new tab.
  - **Edit**: Opens `/notes/:id/edit`.
  - **Delete**: Executes `POST /notes/:id?_method=DELETE` with confirmation modal and server-side authorization check (`isOwner || isAdmin`).
