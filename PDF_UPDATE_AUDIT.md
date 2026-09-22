# STUDYSHARE — PDF UPDATE & CACHE INVALIDATION AUDIT

## 1. Atomic File Replacement Architecture
When an authorized owner or admin updates a PDF/resource (`PUT /notes/:id`):
1. **Validation**: Multer middleware validates file extension, MIME type, and size limits prior to controller execution.
2. **File Version Increment**: `fileVersion` on the `Note` document is incremented (`fileVersion += 1`) **only when an actual file replacement occurs**. Metadata edits (title/description changes) do not increment `fileVersion`.
3. **Database Persistence First**: `note.save()` is executed to persist the new `fileUrl` and `fileVersion` to MongoDB.
4. **Failure Recovery**:
   - If `note.save()` throws an error, the newly uploaded orphan file is deleted from disk and the transaction is aborted.
   - If `note.save()` succeeds, the previous file (`oldFileUrl`) is unlinked from storage. If old file cleanup fails, a warning is logged, but the active database record remains valid.

---

## 2. Server-Managed Anti-Caching Strategy
1. **Server Authorization**:
   - `/notes/:id/view` and `/notes/:id/download` serve files strictly based on the database record `note.fileUrl`. The server **never** trusts client-submitted `v` parameters to select local files.
2. **Anti-Caching HTTP Response Headers**:
   - `GET /notes/:id/view` returns headers:
     ```
     Content-Type: application/pdf
     Content-Disposition: inline
     Cache-Control: no-cache, no-store, must-revalidate
     Pragma: no-cache
     Expires: 0
     ```
3. **URL Version Query Parameters**:
   - EJS templates append `?v=<%= note.fileVersion || Date.parse(note.updatedAt) %>` to `/notes/:id/view` and `/notes/:id/download` links.
   - Every file replacement alters the URL version query parameter, invalidating stale browser tab caches immediately.
