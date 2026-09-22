# StudyShare — Phase 3 Security Contract & Resource Access Policy

This document defines the binding security specification, permission matrix, resource access contract, and architectural flow for Phase 3 (Notes CRUD, Uploads & Interactions). All implementation work in Phase 3 must strictly adhere to these policies.

---

## 1. Resource Access Policy

### A. Public / Guest Access (No Login Required)
Unauthenticated users MUST be granted public read and download access for published materials:
- **Browse Published Notes**: `GET /notes`
- **Search & Filter Published Notes**: `GET /notes?search=...&subject=...&semester=...`
- **View Published Note Details**: `GET /notes/:id`
- **View Public PDFs / Files**: Inline PDF reader & document preview
- **Download Public PDFs & Attachments**: `GET /notes/:id/download`

> [!IMPORTANT]
> Login MUST NOT be required to read, search, or download publicly published study notes and PDF resources.

---

### B. Authenticated Access (Login Required)
The following state-changing and user-specific actions strictly REQUIRE authentication (`isLoggedIn`):
- **Create Note**: `GET /notes/new`, `POST /notes`
- **Upload File Resources**: PDF, PPT/PPTX, Images via Multer
- **Edit Note**: `GET /notes/:id/edit`, `PUT /notes/:id`
- **Delete Note**: `DELETE /notes/:id`
- **Bookmark / Save Note**: `POST /notes/:id/bookmark`, `DELETE /notes/:id/bookmark`
- **Like / Unlike Note**: `POST /notes/:id/like`, `DELETE /notes/:id/like`
- **Rate Note**: `POST /notes/:id/ratings`, `PUT /notes/:id/ratings`
- **Add / Delete Comment**: `POST /notes/:id/comments`, `DELETE /comments/:id`
- **Create / Reply to Doubts**: `GET /doubts/new`, `POST /doubts`, `POST /doubts/:id/replies`

---

### C. Resource Ownership Policy (IDOR Prevention)
Being logged in IS NOT ENOUGH to edit or delete any note.
- **Resource Owner**: `note.author.equals(req.user._id)` → Edit/Delete ALLOWED.
- **Non-Owner Authenticated User**: Modifying another user's note → DENIED with HTTP 403 Forbidden.
- **URL Tampering**: Changing `:id` in `PUT /notes/:id` or `DELETE /notes/:id` must be intercepted and blocked by server-side `isOwner(Note)` middleware.

---

### D. Private & Unpublished Resources
- **Public & Published Note**: Guest View ✅ | Guest Download ✅
- **Unpublished / Draft / Private Note**: Guest View ❌ | Guest Download ❌ | Non-owner View ❌
- Server-side routes MUST inspect `note.isPublished` before serving content.

---

### E. Direct File Download Security
Direct file downloads MUST NOT bypass Express authorization rules:
- Downloads served through `GET /notes/:id/download` check database visibility & ownership rules before piping file streams to response.
- Static file storage (`/public/uploads/`) uses scrambled/hashed filenames to prevent direct file enumeration.

---

### F. Role-Based Governance
- **Student Role**: Standard authenticated actions (Upload own notes, edit own notes, comment, rate, bookmark, ask doubts).
- **Teacher Role**: Access to Teacher Dashboard, verified resource sharing, teacher badges (`isTeacher` middleware).
- **Admin Role**: Platform-wide moderation, editing/deleting inappropriate content, category/subject management (`isAdmin` middleware). Zero-trust server-side enforcement.

---

## 2. Phase 3 Architecture Flow

### Public Read Request Flow
```
REQUEST
  ↓
Route Handler (GET /notes/:id)
  ↓
Validate ObjectId format
  ↓
Fetch Note from MongoDB
  ↓
Check isPublished === true
  ├── YES → Render Note View / Pipe File Download
  └── NO  → Verify Ownership/Admin → If Not Owner: Return HTTP 403 / Redirect
```

### Authenticated Write Request Flow
```
REQUEST (POST / PUT / DELETE)
  ↓
isLoggedIn Middleware (Verify session & req.user)
  ↓
Joi Request Validation (Sanitize input, strip unauthorized fields)
  ↓
isOwner Middleware (Verify resource.author === req.user._id OR req.user.role === 'admin')
  ↓
Controller Layer
  ↓
Service Layer (FileUploadService / NoteService)
  ↓
Mongoose Model Validation (Collection: "notesshare")
  ↓
MongoDB Persistence / Storage
  ↓
Redirect with Flash Success Message
```

---

## 3. Test Matrix to Carry into Phase 3

| User Role | Action | Target Resource | Expected Outcome |
|-----------|--------|-----------------|------------------|
| Guest | Browse & Search | Published Note | **ALLOW (HTTP 200)** |
| Guest | View & Download | Public PDF | **ALLOW (HTTP 200)** |
| Guest | Create / Upload | Any Note | **DENY (HTTP 302 -> /auth/login)** |
| Guest | Edit / Delete | Any Note | **DENY (HTTP 302 -> /auth/login)** |
| Guest | Bookmark / Like / Comment | Any Note | **DENY (HTTP 302 -> /auth/login)** |
| Logged-in Student | Create / Upload | Own Note | **ALLOW (HTTP 302 -> /notes/:id)** |
| Logged-in Student | Edit / Delete | Own Note | **ALLOW (HTTP 200 / 302)** |
| Logged-in Student | Edit / Delete | Other User's Note | **DENY (HTTP 403 Forbidden)** |
| Logged-in Teacher | Upload / Manage | Teacher Note | **ALLOW (HTTP 200 / 302)** |
| Logged-in Student | Access Admin Panel | `/admin` | **DENY (HTTP 403 -> /dashboard)** |
| Admin | Manage / Moderate | Any Note | **ALLOW (HTTP 200 / 302)** |
| Guest | View / Download | Unpublished Private Note | **DENY (HTTP 403 / 404)** |
