# StudyShare — Phase 4 Social Features & Profile Security Contract

## Executive Overview
Phase 4 implements complete social interaction capabilities (Likes, Bookmarks, Ratings, Comments), User Profiles, and the User Dashboard. This document establishes the strict security boundaries, identity derivation rules, mass-assignment guards, and authorization matrix governing Phase 4.

---

## 1. Zero-Trust Identity Rule
- **Server-Side Authentication**: All state-changing endpoints (`like`, `bookmark`, `rate`, `comment`, `edit comment`, `delete comment`, `profile update`) **MUST** derive identity exclusively from `req.user._id` (Passport authenticated session).
- **Request Parameter Protection**: `req.body.userId`, `req.body.author`, `req.body.role`, `req.body.isAdmin`, `req.body.ownerId`, query string user overrides, and client-supplied cookies are **STRICTLY IGNORED**.

---

## 2. Social Authorization Matrix

| Action | Guest | Authenticated User | Resource Owner | System Admin | Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Like / Unlike Note** | ❌ Deny (401/302) | ✅ Allow | ✅ Allow | ✅ Allow | `isLoggedIn` + `socialService.toggleLike` |
| **Bookmark Note** | ❌ Deny (401/302) | ✅ Allow | ✅ Allow | ✅ Allow | `isLoggedIn` + `socialService.toggleBookmark` |
| **Rate Note (1-5★)** | ❌ Deny (401/302) | ✅ Allow | ✅ Allow | ✅ Allow | `isLoggedIn` + Joi ratingSchema |
| **Post Comment** | ❌ Deny (401/302) | ✅ Allow | ✅ Allow | ✅ Allow | `isLoggedIn` + Joi commentSchema |
| **Edit Own Comment** | ❌ Deny (401/302) | ❌ Deny non-owner | ✅ Allow | ✅ Allow | Server-side `comment.user.equals(req.user._id)` |
| **Delete Own Comment** | ❌ Deny (401/302) | ❌ Deny non-owner | ✅ Allow | ✅ Allow | Server-side `comment.user.equals(req.user._id)` |
| **Delete Other's Comment** | ❌ Deny (401/302) | ❌ Deny | ❌ Deny | ✅ Allow (Admin Governance) | Admin Moderation Override (`req.user.role === 'admin'`) |
| **View User Profile** | ✅ Allow (Public info) | ✅ Allow | ✅ Allow | ✅ Allow | `GET /profile/:username` |
| **Edit User Profile** | ❌ Deny | ❌ Deny non-owner | ✅ Allow | ✅ Allow | `PUT /profile` + whitelist destructuring |
| **Role Modification** | ❌ Deny | ❌ Deny | ❌ Deny | Server Seed Only | Mass-assignment whitelist strips `role`/`isAdmin` |

---

## 3. Database Constraints & Duplicate Prevention
- **Like Model**: `{ user: 1, note: 1 }` with `unique: true`.
- **Bookmark Model**: `{ user: 1, note: 1 }` with `unique: true`.
- **Rating Model**: `{ user: 1, note: 1 }` with `unique: true`. `upsert` mechanism ensures 1 rating per user per note.
- **Concurrency Protection**: Mongodb unique compound indexes guarantee duplicate like/bookmark key errors (code 11000) are handled gracefully without producing multi-record race states.

---

## 4. Phase 3 Inheritance Rules
- **Private Notes (`visibility: 'private'`)**: Interactions by non-owners/non-admins return HTTP 403 Forbidden.
- **Unpublished Notes (`isPublished: false`)**: Interactions by non-owners/non-admins return HTTP 403 Forbidden.
- **Soft-Deleted Notes (`isDeleted: true`)**: Interactions return HTTP 404 Not Found.

---

## 5. XSS & Input Sanitization
- All comments, bio fields, and reviews are HTML-escaped during EJS rendering using standard `<%= %>` tags.
- HTML tags (`<script>`, `<iframe>`, `<img>`) are rendered safely as textual content.
