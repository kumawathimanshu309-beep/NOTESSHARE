# STUDYSHARE — PHASE 5.5 COMPLETE APPLICATION ROUTE AUDIT

**Date:** September 20, 2026  
**Auditor:** Antigravity AI  

---

## Complete Route Mapping Table

| HTTP Method | Route URL | Access Control | Middleware Chain | Controller Action | View Template | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | Public | None | `homeController.getHomePage` | `home/index` | **200 OK** |
| **GET** | `/features` | Public | None | `homeController.getFeaturesPage` | `home/features` | **200 OK** |
| **GET** | `/about` | Public | None | `homeController.getAboutPage` | `home/about` | **200 OK** |
| **GET** | `/auth/login` | Guest Only | None | `authController.getLogin` | `auth/login` | **200 OK** |
| **POST** | `/auth/login` | Guest Only | `passport.authenticate('local')` | `authController.postLogin` | Redir `/dashboard` | **302 Found** |
| **GET** | `/auth/signup` | Guest Only | None | `authController.getSignup` | `auth/signup` | **200 OK** |
| **POST** | `/auth/signup` | Guest Only | `validateSignup` | `authController.postSignup` | Redir `/dashboard` | **302 Found** |
| **POST** | `/auth/logout` | Authenticated | `isLoggedIn` | `authController.postLogout` | Redir `/` | **302 Found** |
| **GET** | `/auth/forgot-password` | Public | None | `authController.getForgotPassword` | `auth/forgot-password` | **200 OK** |
| **POST** | `/auth/forgot-password` | Public | None | `authController.postForgotPassword` | Redir `/auth/login` | **302 Found** |
| **GET** | `/auth/google` | Public | `passport.authenticate('google')` | `authController.googleAuth` | OAuth Redirect | **302 Found** |
| **GET** | `/auth/google/callback` | Public | `passport.authenticate('google')` | `authController.googleCallback` | Redir `/dashboard` | **302 Found** |
| **GET** | `/dashboard` | Authenticated | `isLoggedIn` | `dashboardController.getDashboard` | `dashboard/index` | **200 OK** |
| **GET** | `/admin` | Admin Only | `isLoggedIn`, `isAdmin` | `dashboardController.getAdminDashboard` | `admin/index` | **200 OK** |
| **GET** | `/teacher/dashboard` | Teacher / Admin | `isLoggedIn`, `isTeacher` | `teacherController.getTeacherDashboard` | `teacher/dashboard` | **200 OK** |
| **GET** | `/teachers/:username` | Public | None | `teacherController.getTeacherProfile` | `teachers/show` | **200 OK** |
| **GET** | `/notes` | Public | None | `noteController.getNotes` | `notes/index` | **200 OK** |
| **GET** | `/notes/new` | Authenticated | `isLoggedIn` | `noteController.getNewNoteForm` | `notes/new` | **200 OK** |
| **POST** | `/notes` | Authenticated | `isLoggedIn`, `uploadSingle` | `noteController.createNote` | Redir `/notes/:id` | **302 Found** |
| **GET** | `/notes/:id` | Public / Author | None | `noteController.getNoteById` | `notes/show` | **200 OK** |
| **GET** | `/notes/:id/edit` | Author / Admin | `isLoggedIn`, `isOwner` | `noteController.getEditNoteForm` | `notes/edit` | **200 OK** |
| **PUT** | `/notes/:id` | Author / Admin | `isLoggedIn`, `isOwner`, `uploadSingle` | `noteController.updateNote` | Redir `/notes/:id` | **302 Found** |
| **DELETE** | `/notes/:id` | Author / Admin | `isLoggedIn`, `isOwner` | `noteController.deleteNote` | Redir `/dashboard` | **302 Found** |
| **GET** | `/notes/:id/download` | Public / Author | None | `noteController.downloadNoteFile` | File Attachment Stream | **200 OK** |
| **POST** | `/notes/:id/like` | Authenticated | `isLoggedIn` | `socialController.toggleLike` | Redir Back | **302 Found** |
| **POST** | `/notes/:id/bookmark` | Authenticated | `isLoggedIn` | `socialController.toggleBookmark` | Redir Back | **302 Found** |
| **POST** | `/notes/:id/rate` | Authenticated | `isLoggedIn` | `socialController.upsertRating` | Redir Back | **302 Found** |
| **POST** | `/notes/:id/comments` | Authenticated | `isLoggedIn` | `socialController.addComment` | Redir `/notes/:id#comments` | **302 Found** |
| **GET** | `/doubts` | Public | None | `doubtController.getDoubts` | `doubts/index` | **200 OK** |
| **GET** | `/doubts/new` | Authenticated | `isLoggedIn` | `doubtController.getNewDoubtForm` | `doubts/new` | **200 OK** |
| **POST** | `/doubts` | Authenticated | `isLoggedIn` | `doubtController.createDoubt` | Redir `/doubts/:id` | **302 Found** |
| **GET** | `/doubts/:id` | Public | None | `doubtController.getDoubtById` | `doubts/show` | **200 OK** |
| **POST** | `/doubts/:id/answers` | Authenticated | `isLoggedIn` | `doubtController.addAnswer` | Redir `/doubts/:id#answers` | **302 Found** |
| **POST** | `/answers/:id/accept` | Doubt Owner | `isLoggedIn` | `doubtController.acceptAnswer` | Redir Back | **302 Found** |
| **GET** | `/profile/:username` | Public | None | `socialController.getUserProfile` | `profile/index` | **200 OK** |
| **GET** | `/profile/edit` | Authenticated | `isLoggedIn` | `socialController.getEditProfileForm` | `profile/edit` | **200 OK** |
| **PUT** | `/profile/edit` | Authenticated | `isLoggedIn` | `socialController.updateUserProfile` | Redir `/profile/:username` | **302 Found** |
