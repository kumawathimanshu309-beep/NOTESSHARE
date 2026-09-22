# STUDYSHARE — MASTER ANTIGRAVITY IMPLEMENTATION PROMPT

You are the lead full-stack engineer responsible for turning the existing StudyShare UI into a production-style, fully working web application.

## 0. PRIMARY OBJECTIVE

The current project already has a StudyShare landing/home UI. Preserve the existing visual language and improve it only where required for responsiveness, accessibility, consistency, and functionality.

The final application must be:

- User-friendly
- Fully responsive on mobile, tablet, laptop and desktop
- Visually consistent with the existing dark/purple StudyShare UI
- Functional: every button, link, form, card CTA, navbar item and action must work
- Built with server-side EJS templating
- Express/Node.js backend
- MongoDB database
- Mongoose models with strong schema validation
- Authentication and authorization
- Student, Teacher and Admin roles
- CRUD operations
- Proper MongoDB relationships/references
- Secure middleware
- Centralized error handling
- Joi request/form validation
- Flash success/error feedback
- Proper deletion handling using middleware/hooks where appropriate
- Clean OOP/service-oriented backend structure
- Maintainable route/controller/model/view separation

DO NOT treat this as a static UI task. Build the actual application.

IMPORTANT:
Before changing code, inspect the existing repository, package.json, src/public assets, current components/styles and existing UI. Reuse existing assets/styles where possible instead of rebuilding an unrelated design.

The target visual result should closely match the provided StudyShare screenshots:
- dark navy/black background
- purple/violet gradients
- thin borders
- rounded cards
- premium minimal typography
- purple primary CTAs
- spacious sections
- responsive navigation
- dashboard-style preview/cards
- consistent footer

Do not replace the design with a generic Bootstrap/admin template.

---

# 1. PRODUCT REQUIREMENTS

Project name: StudyShare

Purpose:
A student knowledge-sharing platform where users can discover, read, save, download, upload and discuss study resources.

Core content types/features:

1. Study notes
2. PDF notes
3. PPT/PPTX resources
4. Images
5. Video solution/reference links
6. Previous Year Questions (PYQ)
7. Note summarization
8. Ask Doubts
9. References/resources
10. Search
11. Filters
12. User profiles
13. Saved/bookmarked notes
14. Likes
15. Ratings
16. Comments
17. Notifications
18. Teacher sharing area
19. Community section
20. Admin panel

---

# 2. FEATURES FROM THE PROJECT PLAN

Implement these frontend/backend flows:

## Authentication
- Login
- Signup
- Logout
- Session persistence
- Password hashing
- Role-based authorization
- Protected routes
- Redirect users after login/logout
- Preserve intended destination where appropriate
- Friendly authentication errors

Roles:
- student
- teacher
- admin

Guest users:
- Can access home
- Can browse/search public notes
- Can open public note details
- Cannot upload, save, like, rate, comment or use protected user features unless logged in

## Student Dashboard
Dashboard should show:
- Welcome/user information
- Notes uploaded
- Saved notes
- Downloads
- Likes
- Recent activity
- Recommended/popular notes
- Quick actions
- Notifications

## Notes
Users should be able to:
- Browse notes
- Search notes
- Filter notes
- Sort notes
- Open note details
- Read/view supported resources
- Download allowed files
- Save/bookmark
- Like
- Rate
- Comment
- Report inappropriate content if reporting is implemented
- See author information
- See related notes

Teachers should be able to:
- Upload notes
- Upload PDF
- Upload PPT/PPTX
- Add image resources
- Add video/reference links
- Add description
- Select subject
- Select semester
- Select category
- Add tags
- Add PYQ resources
- Edit their own resources
- Delete their own resources

## Search + Filters
Implement real server-side search/filtering.

Filters can include:
- Subject
- Semester
- Category
- Resource type
- Tags
- Rating
- Author/teacher
- Date
- Popularity

Search must work from the navbar/search UI and Explore page.

Use query parameters so URLs are shareable, e.g.:
GET /notes?search=javascript&subject=computer-science&semester=6

## User Profile
Profile should show:
- Name
- Profile image/avatar
- Bio
- Role
- Joined date
- Uploaded notes
- Saved notes
- Ratings/comments/activity where appropriate

Users can edit allowed profile information.

Do not expose sensitive fields such as password hashes.

## Save/Bookmark
- Save note
- Remove saved note
- Saved Notes page
- Prevent duplicate bookmarks

## Likes
- Like/unlike
- Prevent duplicate likes
- Display count
- Correct state for logged-in user

## Ratings + Comments
- Rating system
- Comment system
- Prevent invalid ratings
- Prevent duplicate rating by the same user if the product decision is one rating per user
- Allow user to update their rating if desired
- Validate comment length
- Sanitize/escape rendered user content
- Delete/edit permissions must be enforced server-side

## Notifications
Create notification infrastructure for events such as:
- Comment on user's note
- Like on user's note
- Rating on user's note
- Reply to doubt
- Admin/moderation events

Unread/read state must be stored.

## Community
Create a community section later in the roadmap, but design models/routes so it can be added without rewriting the application.

Potential features:
- Posts
- Questions
- Answers
- Replies
- Likes
- Tags
- Reports

---

# 3. ADMIN PANEL

Admin panel must be protected with server-side authorization.

Admin capabilities:
- Dashboard
- Manage users
- Manage notes
- Manage comments
- Manage ratings
- Manage reports
- Manage subjects/categories
- Manage uploaded resources
- Delete/restore content where the data model supports soft deletion
- View platform statistics

Never rely only on hiding admin buttons in EJS. Every admin route must enforce authorization on the server.

Admin routes can be grouped under:
- /admin
- /admin/users
- /admin/notes
- /admin/comments
- /admin/reports
- /admin/categories
- /admin/resources

---

# 4. DATABASE

MongoDB database/collection requirement:

Database connection must use MongoDB.

The main notes collection must be named exactly:
`notesshare`

Use Mongoose.

Recommended database models:
- User
- Note
- Comment
- Rating
- Bookmark
- Notification
- Subject
- Category
- Doubt
- Reply/Answer
- Report
- Resource where useful

Do not create unnecessary duplicated collections.

Use references for relationships where appropriate.

Example relationships:

User
  ├── notes[]
  ├── bookmarks[]
  ├── comments[]
  ├── ratings[]
  └── notifications[]

Note
  ├── author -> User
  ├── subject -> Subject
  ├── category -> Category
  ├── comments -> Comment
  ├── ratings -> Rating
  ├── likes -> User
  ├── bookmarks -> User
  └── resources/files

Use ObjectId references and populate where useful.

Avoid circular population and unnecessarily large documents.

For counts and frequently queried values, use a deliberate strategy rather than blindly populating everything.

Create indexes for common search fields.

The Note model's MongoDB collection must be explicitly configured as:
`notesshare`

---

# 5. SCHEMA VALIDATION

Mongoose validation is required for database integrity.

Use appropriate:
- required
- trim
- minlength
- maxlength
- enum
- match
- min/max
- unique where genuinely required
- timestamps

Do not use `unique: true` as a replacement for proper application-level duplicate handling.

Also use Joi for request/form validation.

Validation layers:
1. Client-side UX validation where useful
2. Joi request validation
3. Mongoose schema validation
4. Authorization validation

Never trust client-side validation alone.

---

# 6. FILE UPLOADS

For note/resource uploads:

Use Multer where file upload is required.

Support appropriate file types such as:
- PDF
- PPT/PPTX
- DOC/DOCX if enabled
- Images
- Video/reference links

Validate:
- MIME type
- extension
- file size
- required metadata

Do not trust file extension alone.

Do not commit user-uploaded files or secrets to Git.

For production, design the upload layer so it can use cloud storage such as Cloudinary/S3 later. Local storage can be used for development if appropriate.

---

# 7. SECURITY MIDDLEWARE

Use only middleware that is actually useful and configure it correctly.

Expected stack includes:

- helmet
- cookie-parser
- morgan
- cors
- express-session
- connect-mongo for production session persistence
- passport
- passport-local
- method-override
- express.urlencoded
- express.json
- Joi validation middleware
- authentication middleware
- authorization middleware

Security requirements:
- Passwords must be hashed
- Never store plaintext passwords
- Never expose password hash to EJS
- Use secure session configuration
- Use httpOnly cookies
- Use sameSite appropriately
- Use secure cookies in production
- Keep secrets in environment variables
- Configure CORS deliberately, not `*` blindly when credentials are used
- Use Helmet
- Prevent unauthorized object access
- Validate IDs before database queries where useful
- Sanitize/escape user-generated content
- Rate-limit sensitive endpoints if appropriate

---

# 8. PASSPORT AUTHENTICATION

Use Passport with a local strategy unless an existing project decision requires another strategy.

Implement:
- serializeUser
- deserializeUser
- passport.authenticate
- login
- logout

Create middleware:
- isLoggedIn
- isTeacher
- isAdmin
- isOwner where required

Authorization must always be checked server-side.

---

# 9. ERROR HANDLING

Create a centralized application error class, for example:

AppError / ExpressError

Implement:
- asyncHandler / wrapAsync
- notFound middleware
- centralized error middleware
- development-friendly errors
- production-safe errors
- EJS error page
- 404 page
- validation error handling
- Mongo/Mongoose error handling where appropriate

Use `wrapAsync` around database-driven async route handlers.

Use try/catch where it improves recovery/context and is specifically useful for operations that can fail.

Do not put giant try/catch blocks around every route just for decoration.

Expected flow:

Route
→ validation
→ authorization
→ controller/service
→ model/database
→ next(error)
→ centralized error middleware
→ EJS error page

No duplicated error-handling logic across every route.

---

# 10. FLASH MESSAGES

Implement success/failure feedback using flash messages.

Examples:
- "Note uploaded successfully."
- "Note deleted successfully."
- "You must be logged in."
- "Invalid email or password."
- "Bookmark removed."
- "Comment added."
- "You do not have permission to perform this action."

Display messages consistently in the existing UI style.

---

# 11. CRUD

Implement real CRUD for notes.

Create:
POST /notes

Read:
GET /notes
GET /notes/:id

Update:
GET /notes/:id/edit
PUT /notes/:id

Delete:
DELETE /notes/:id

Also implement CRUD or appropriate lifecycle operations for:
- comments
- categories
- subjects
- user-owned resources
- admin-managed resources

Use method-override for PUT/DELETE HTML form submissions if required by the architecture.

---

# 12. DELETION HANDLING

Deletion must be designed carefully.

Use pre/post Mongoose middleware where it provides real value.

Examples:
- When deleting a note, handle dependent comments/ratings/bookmarks/notifications appropriately.
- When deleting a user, handle owned resources and references according to the chosen data-retention policy.
- Prevent orphaned references.
- Do not blindly cascade-delete data without understanding the relationship.

Prefer soft delete for important content if useful:
- isDeleted
- deletedAt
- deletedBy

If hard deletion is used, document the cascade behavior.

Use Mongoose middleware/hooks for model-level cleanup where appropriate, but keep business rules understandable.

---

# 13. OOP / CODE ARCHITECTURE

Use OOP concepts where they improve maintainability, not merely to satisfy a checklist.

Suggested structure:

controllers/
services/
models/
routes/
middleware/
validators/
utils/
config/
views/
public/

Potential classes:
- NoteService
- UserService
- NotificationService
- FileUploadService
- AdminService

Keep controllers thin.

Example:
Route → Controller → Service → Model

Do not put the entire application's logic inside route files.

Use reusable middleware/functions.

---

# 14. EJS TEMPLATING

The final frontend rendering system must use EJS.

Use:
- layouts
- partials
- reusable navbar
- reusable footer
- flash-message partial
- form partials where practical
- cards/components as EJS partials

Suggested:
views/
  layouts/
  partials/
  auth/
  notes/
  dashboard/
  profile/
  admin/
  community/
  errors/

Preserve the current StudyShare visual UI.

Do not introduce React components for the server-rendered pages unless there is a clearly documented reason.

---

# 15. ROUTING

Create separate routes by domain.

Suggested:

GET /
GET /about
GET /features

GET /notes
GET /notes/new
POST /notes
GET /notes/:id
GET /notes/:id/edit
PUT /notes/:id
DELETE /notes/:id

GET /search

GET /auth/login
POST /auth/login
GET /auth/signup
POST /auth/signup
POST /auth/logout

GET /dashboard

GET /profile/:username
GET /profile/edit
PUT /profile

GET /saved
POST /notes/:id/bookmark
DELETE /notes/:id/bookmark

POST /notes/:id/like
DELETE /notes/:id/like

POST /notes/:id/ratings
PUT /notes/:id/ratings

POST /notes/:id/comments
PUT /comments/:id
DELETE /comments/:id

GET /notifications
PUT /notifications/:id/read

GET /doubts
GET /doubts/new
POST /doubts
GET /doubts/:id
POST /doubts/:id/replies

GET /admin
GET /admin/users
GET /admin/notes
GET /admin/comments
GET /admin/reports

Adjust routes after inspecting the existing project.

---

# 16. UI/UX RULES

The UI is already designed. Preserve it.

Do not:
- replace it with a generic UI kit
- randomly change colors
- change the typography without reason
- remove existing sections
- break desktop layout while fixing mobile
- introduce horizontal overflow
- create inconsistent buttons

Do:
- maintain dark/purple theme
- use consistent spacing
- preserve card shapes/borders
- maintain existing gradients
- maintain existing CTA hierarchy
- make all forms accessible
- add loading/disabled states where needed
- provide empty states
- provide error states
- provide success states
- ensure keyboard accessibility
- ensure readable contrast
- ensure touch-friendly controls

Mobile:
- responsive navbar/hamburger
- cards stack properly
- forms become single-column
- tables become responsive
- dashboard sidebar becomes drawer/collapsible navigation
- no accidental horizontal page overflow
- buttons remain usable with touch
- images/files remain within container

---

# 17. PAGES TO BUILD

Build these pages using EJS while maintaining the current design:

Public:
1. Home
2. Explore Notes
3. Note Details
4. Search Results
5. Features
6. About
7. Login
8. Signup
9. Error 404
10. Error 500/general error

Authenticated:
11. Student Dashboard
12. My Notes
13. Upload Note
14. Edit Note
15. Saved Notes
16. Notifications
17. Profile
18. Edit Profile
19. Ask Doubt
20. Doubt Details

Teacher:
21. Teacher Dashboard
22. Teacher Upload
23. Teacher Notes
24. Teacher Analytics if feasible

Admin:
25. Admin Dashboard
26. Admin Users
27. Admin Notes
28. Admin Comments
29. Admin Reports
30. Admin Categories/Subjects

Later/community:
31. Community
32. Community Post
33. Create Post
34. Post Details

Do not create fake pages that only display placeholder text. Every created page must have a route and a clear purpose.

---

# 18. CURRENT UI MIGRATION

First inspect the existing React/Vite UI.

Create a migration plan:
1. Identify reusable CSS, assets, icons and content.
2. Identify each existing section.
3. Recreate the layout using EJS.
4. Preserve visual measurements as closely as practical.
5. Move reusable navigation/footer/card structures into EJS partials.
6. Move client-side interactions into public JS modules.
7. Remove only obsolete React/Vite code after confirming equivalent functionality exists.
8. Keep the project runnable after each migration step.

Do not destroy the working UI before its equivalent EJS implementation exists.

---

# 19. DEVELOPMENT LOOP

Work iteratively.

After each major implementation:
1. Run the application.
2. Check terminal/server errors.
3. Check browser console.
4. Test the relevant route.
5. Test mobile viewport.
6. Test desktop viewport.
7. Fix the issue.
8. Re-test.
9. Only then move to the next feature.

If something is broken, continue the fix/test loop until the feature works.

Do not stop at "implemented in code". Verify behavior.

---

# 20. BUTTON/LINK AUDIT

Every clickable UI element must have a destination/action.

Audit:
- Navbar links
- Login
- Signup
- Logout
- Explore Notes
- Share Your Notes
- Upload Note
- Learn More
- Subject cards
- Search
- Filter
- Save
- Like
- Rate
- Comment
- Download
- Edit
- Delete
- Profile
- Notifications
- Dashboard sidebar
- Admin actions
- Footer links

No dead links.

If a feature is not implemented yet, do not create a misleading clickable control. Either implement it or clearly mark it as planned during development.

---

# 21. TESTING

Implement and test:

Functional:
- Signup
- Login
- Logout
- Wrong password
- Duplicate email
- Protected route
- Unauthorized role
- Admin route
- Create note
- Read note
- Edit own note
- Prevent editing another user's note
- Delete own note
- Prevent unauthorized deletion
- Search
- Filter
- Bookmark
- Like/unlike
- Rating
- Comment
- Notification
- File validation
- 404
- 500/error flow

Responsive:
- 320px
- 375px
- 390px
- 414px
- 768px
- 1024px
- 1280px+
- desktop wide screens

Security:
- auth bypass attempts
- ID tampering
- unauthorized update/delete
- invalid ObjectId
- invalid form data
- malicious file type
- oversized upload
- missing session
- admin access by normal user

---

# 22. ENVIRONMENT VARIABLES

Create `.env.example`.

Expected variables may include:

NODE_ENV=
PORT=
MONGODB_URI=
SESSION_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_KEY=
CLOUDINARY_SECRET=

Only include variables actually required by the implementation.

Never commit `.env`.

---

# 23. DOCUMENTATION

Update README with:
- project overview
- features
- tech stack
- folder structure
- setup
- environment variables
- database setup
- how to run
- how to seed sample data
- roles
- testing
- deployment notes

Create:
- PRD.md
- RULES.md
- ARCHITECTURE.md
- DATABASE.md
- API_ROUTES.md
- TASKS.md
- TESTING_CHECKLIST.md

Use these documents as the project's source of truth.

---

# 24. DEFINITION OF DONE

The project is not complete until:

- EJS rendering works
- Express server works
- MongoDB connection works
- `notesshare` collection is used for notes
- Auth works
- Passport works
- Roles work
- Admin protection works
- CRUD works
- Search/filter works
- Upload validation works
- Joi validation works
- Mongoose validation works
- Flash messages work
- Error middleware works
- wrapAsync works
- 404/error pages work
- Relationships/populate work correctly
- Deletion handling works
- Existing UI visual identity is preserved
- Mobile responsive layout works
- Desktop layout works
- Every implemented button/link works
- No major console errors
- No broken routes
- No unauthorized CRUD actions
- README is updated
- `.env.example` exists
- tests/manual test checklist passes

Do not claim completion if any of these are unverified.

Start by inspecting the repository and existing UI. Then create a phased implementation plan and execute it phase-by-phase.
