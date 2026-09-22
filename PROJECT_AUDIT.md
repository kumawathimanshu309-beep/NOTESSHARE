# StudyShare — Phase 0 Project Audit Report

## 1. Current Tech Stack
- **Frontend Framework**: React 19 (`react`, `react-dom` v19.2.8)
- **Build Tool**: Vite v8.2.2
- **Styling**: Tailwind CSS v4.3.3 (`@tailwindcss/vite` & `tailwindcss` 4.3.3) + Custom Design System in `src/App.css`
- **Linter**: Oxlint v1.79.0
- **Target Backend Architecture**: Node.js + Express.js + EJS + MongoDB/Mongoose + Passport Local + Joi + Multer + Helmet

## 2. Existing Dependencies
- `react`: ^19.2.8
- `react-dom`: ^19.2.8
- `@tailwindcss/vite`: ^4.3.3
- `@types/react`: ^19.2.18
- `@types/react-dom`: ^19.2.4
- `@vitejs/plugin-react`: ^6.1.0
- `oxlint`: ^1.79.0
- `tailwindcss`: ^4.3.3
- `vite`: ^8.2.2

## 3. Existing Pages / Components
- **Pages**:
  - `src/Pages/Home.jsx`: Main landing page composing header, hero, stats, features, explore, CTA, and footer.
- **Components**:
  - `src/Components/Navbar.jsx`: Fixed top navigation with logo, links (`Home`, `Explore`, `Features`, `About`), auth actions (`Log in`, `Get Started`), and mobile toggle.
  - `src/Components/Hero.jsx`: Main hero section with headline, CTA buttons (`Explore Notes`, `Share Your Notes`), student trust badges, and an interactive dashboard mockup preview.
  - `src/Components/Stats.jsx`: Statistics counter row (10K+ Notes, 5K+ Students, 50+ Subjects, 25K+ Downloads).
  - `src/Components/Features.jsx`: 3-column features grid (Find Notes Faster, Share Your Knowledge, Quality Resources).
  - `src/Components/Explore.jsx`: Explore section with popular subject cards grid (Computer Science, Mathematics, Science, Engineering).
  - `src/Components/Join.jsx`: Call to action banner for joining and uploading notes.
  - `src/Components/Footer.jsx`: Platform, Company, and Social navigation links.

## 4. Existing Assets
- `public/logo.png`: StudyShare main brand logo.
- `public/favicon.svg`: Browser tab icon.
- `public/icons.svg`: SVG icons container.
- `src/assets/hero.png`: Hero section fallback graphic.
- `src/assets/react.svg`, `src/assets/vite.svg`: React/Vite boilerplate assets.

## 5. Existing CSS Structure
- `src/App.css` (1,395 lines):
  - **Design System Tokens**:
    - `--bg`: `#080B18` (Deep navy/black)
    - `--bg-2`: `#0D1124`
    - `--card`: `#11162A`
    - `--card-2`: `#151B32`
    - `--purple`: `#7C3AED`
    - `--purple-dark`: `#6D28D9`
    - `--violet`: `#A855F7`
    - `--lavender`: `#C084FC`
    - `--white`: `#F8FAFC`
    - `--text`: `#E2E8F0`
    - `--muted`: `#94A3B8`
    - `--border`: `rgba(255,255,255,0.08)`
    - `--gradient`: `linear-gradient(135deg, #7C3AED, #A855F7)`
  - **Typography**: Google Fonts `Inter` (sans-serif) & `Sora` (headings).
  - **Layout & Components**: Navbar, glowing gradients, hero typography, glassmorphism dashboard mockup, stat counters, feature cards, subject cards, CTA banner, footer, responsive breakpoint styling (max-width 900px & max-width 650px).

## 6. Existing JavaScript
- React JSX component composition using standard functional components.
- Static inline array data for popular notes preview and platform features.
- No external HTTP requests, state stores, or client-side routing.

## 7. Existing Functionality
- Static UI display of the StudyShare home page.
- Responsive layout adjustments on mobile/desktop viewports.
- Smooth scroll anchor links.

## 8. What Can Be Reused
- All CSS design tokens, styles, gradients, and custom utility classes from `src/App.css`.
- Brand asset images (`logo.png`, `favicon.svg`).
- HTML structural layouts and design elements across all section components.
- Responsive design CSS rules.

## 9. What Must Be Migrated
- React JSX components converted to Express EJS layout (`views/layouts/main.ejs`) and EJS partials (`navbar.ejs`, `footer.ejs`, `flash.ejs`, `note-card.ejs`).
- Static CSS moved to `public/css/style.css`.
- Static images moved to `public/images/`.

## 10. What Must Be Rebuilt
- Express.js backend server infrastructure (`app.js`, `server.js`).
- Mongoose schemas with explicit collection name `notesshare` for Note model.
- Passport Local authentication and role-based authorization middleware.
- Full server-side EJS views for Login, Signup, Student Dashboard, Teacher Dashboard, Admin Panel, Note Details, Upload/Edit Note, Search & Filters, Doubts, User Profile, and Error pages.
- Real CRUD routes for Notes, Comments, Ratings, Bookmarks, Notifications, and Doubts.
- File upload handling with Multer.
- Request validation with Joi and database validation with Mongoose.
- Centralized error handling and flash message feedback.

## 11. Problems Found
- Current project is strictly a client-side React SPA mockup with no server or database logic.
- CSS `@import` ordering warning in `App.css` (Google Fonts `@import` positioned after `@import "tailwindcss";`).
- Nav links and buttons are static `#` anchors.

## 12. Recommended Migration Strategy
1. **Initialize Backend Structure**: Install Express, EJS, Mongoose, Passport, Joi, Multer, Helmet, Morgan, Cookie Parser, Session, Connect-Mongo, Flash, Method-Override.
2. **Setup Static Assets**: Copy `src/App.css` to `public/css/style.css` (fixing `@import` order) and assets to `public/images/`.
3. **Build EJS Engine & Layouts**: Create `views/layouts/main.ejs`, `views/partials/navbar.ejs`, `footer.ejs`, `flash.ejs`.
4. **Recreate Landing Page**: Render landing page at `GET /` matching the exact current React UI design.
5. **Database Models Setup**: Create Mongoose models (`User`, `Note`, `Comment`, `Rating`, `Bookmark`, `Notification`, `Subject`, `Category`, `Doubt`, `Reply`, `Report`). Enforce Note collection as `notesshare`.
6. **Authentication & Authorization**: Passport Local authentication, session storage, bcrypt password hashing, `isLoggedIn`, `isTeacher`, `isAdmin`, `isOwner` middleware.
7. **Notes CRUD & Uploads**: Express routes, controllers, services, Joi validation, Multer file upload handling for PDF, PPT, Images.
8. **Search & Filters**: Express server search route querying MongoDB with parameters (`search`, `subject`, `semester`, `category`, `sort`).
9. **User Dashboards & Features**: Student Dashboard, Teacher Upload, Doubts Q&A, Profiles, Bookmarks, Likes, Ratings, Comments, Notifications.
10. **Admin Panel & Security**: Server-protected `/admin` routes for content and user management.
11. **Verification & Audit**: Conduct full route, link, mobile responsive, and security testing.

## 13. Proposed Final Folder Structure
```
noteshare-web/
├── app.js
├── server.js
├── package.json
├── .env
├── .env.example
├── PROJECT_AUDIT.md
├── README.md
├── config/
│   ├── db.js
│   ├── passport.js
│   └── security.js
├── controllers/
│   ├── authController.js
│   ├── noteController.js
│   ├── dashboardController.js
│   ├── userController.js
│   ├── doubtController.js
│   └── adminController.js
├── middleware/
│   ├── auth.js
│   ├── validate.js
│   ├── upload.js
│   ├── errorHandler.js
│   └── asyncWrapper.js
├── models/
│   ├── User.js
│   ├── Note.js (collection: "notesshare")
│   ├── Comment.js
│   ├── Rating.js
│   ├── Bookmark.js
│   ├── Notification.js
│   ├── Subject.js
│   ├── Category.js
│   ├── Doubt.js
│   ├── Reply.js
│   └── Report.js
├── routes/
│   ├── index.js
│   ├── auth.js
│   ├── notes.js
│   ├── dashboard.js
│   ├── profile.js
│   ├── doubts.js
│   ├── notifications.js
│   └── admin.js
├── services/
│   ├── noteService.js
│   ├── userService.js
│   ├── authService.js
│   ├── fileUploadService.js
│   ├── notificationService.js
│   └── adminService.js
├── utils/
│   ├── AppError.js
│   └── constants.js
├── validators/
│   ├── authValidator.js
│   ├── noteValidator.js
│   ├── commentValidator.js
│   └── doubtValidator.js
├── seeds/
│   └── seed.js
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   ├── images/
│   │   └── logo.png
│   └── uploads/
└── views/
    ├── layouts/
    │   └── main.ejs
    ├── partials/
    │   ├── navbar.ejs
    │   ├── footer.ejs
    │   ├── flash.ejs
    │   └── note-card.ejs
    ├── auth/
    │   ├── login.ejs
    │   └── signup.ejs
    ├── home/
    │   ├── index.ejs
    │   ├── about.ejs
    │   └── features.ejs
    ├── notes/
    │   ├── index.ejs
    │   ├── show.ejs
    │   ├── new.ejs
    │   └── edit.ejs
    ├── dashboard/
    │   ├── index.ejs
    │   ├── notes.ejs
    │   ├── saved.ejs
    │   └── notifications.ejs
    ├── profile/
    │   ├── show.ejs
    │   └── edit.ejs
    ├── doubts/
    │   ├── index.ejs
    │   ├── new.ejs
    │   └── show.ejs
    ├── admin/
    │   ├── index.ejs
    │   ├── users.ejs
    │   ├── notes.ejs
    │   ├── comments.ejs
    │   └── reports.ejs
    └── errors/
        ├── 404.ejs
        └── error.ejs
```

## 14. Required Dependencies
- `express`
- `ejs`
- `express-ejs-layouts`
- `mongoose`
- `passport`
- `passport-local`
- `bcryptjs`
- `express-session`
- `connect-mongo`
- `joi`
- `multer`
- `helmet`
- `morgan`
- `cookie-parser`
- `cors`
- `method-override`
- `connect-flash`
- `dotenv`

## 15. Required Database Models
1. **User**: `name`, `username`, `email`, `password` (hashed), `role` (`student`, `teacher`, `admin`), `avatar`, `bio`, `createdAt`, `updatedAt`.
2. **Note** (collection: `notesshare`): `title`, `description`, `content`, `author` (User ref), `subject` (Subject ref), `category` (Category ref), `semester`, `tags`, `resourceType` (`pdf`, `ppt`, `image`, `video`, `pyq`), `fileUrl`, `thumbnail`, `videoUrl`, `views`, `downloads`, `likes` (User refs array), `isPublished`, `isDeleted`, `deletedAt`, timestamps.
3. **Comment**: `note` (Note ref), `author` (User ref), `body`, `parent` (Comment ref), `isDeleted`, timestamps.
4. **Rating**: `note` (Note ref), `user` (User ref), `value` (1-5), timestamps. Compound index on `(note, user)`.
5. **Bookmark**: `note` (Note ref), `user` (User ref), timestamps. Compound index on `(note, user)`.
6. **Notification**: `recipient` (User ref), `actor` (User ref), `type`, `message`, `note` (Note ref), `comment` (Comment ref), `isRead`, timestamps.
7. **Subject**: `name`, `slug`, `description`, `isActive`.
8. **Category**: `name`, `slug`, `description`, `isActive`.
9. **Doubt**: `author` (User ref), `title`, `body`, `tags`, `note` (Note ref), `status` (`open`, `resolved`), timestamps.
10. **Reply**: `doubt` (Doubt ref), `author` (User ref), `body`, `accepted`, timestamps.
11. **Report**: `reporter` (User ref), `targetType` (`note`, `comment`, `user`), `targetId`, `reason`, `description`, `status` (`pending`, `reviewed`, `dismissed`), `reviewedBy`, timestamps.

## 16. Required Routes
- **Public**: `GET /`, `GET /about`, `GET /features`, `GET /search`
- **Auth**: `GET /auth/login`, `POST /auth/login`, `GET /auth/signup`, `POST /auth/signup`, `POST /auth/logout`
- **Notes**: `GET /notes`, `GET /notes/new`, `POST /notes`, `GET /notes/:id`, `GET /notes/:id/edit`, `PUT /notes/:id`, `DELETE /notes/:id`
- **Interactions**: `POST /notes/:id/bookmark`, `DELETE /notes/:id/bookmark`, `POST /notes/:id/like`, `DELETE /notes/:id/like`, `POST /notes/:id/ratings`, `PUT /notes/:id/ratings`, `POST /notes/:id/comments`, `DELETE /comments/:id`
- **Dashboard**: `GET /dashboard`, `GET /dashboard/notes`, `GET /dashboard/saved`, `GET /dashboard/notifications`
- **Profile**: `GET /profile/:username`, `GET /profile/edit`, `PUT /profile`
- **Doubts**: `GET /doubts`, `GET /doubts/new`, `POST /doubts`, `GET /doubts/:id`, `POST /doubts/:id/replies`
- **Notifications**: `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all`
- **Admin**: `GET /admin`, `GET /admin/users`, `GET /admin/notes`, `GET /admin/comments`, `GET /admin/reports`, `GET /admin/categories`, `GET /admin/subjects`

## 17. Security Middleware Plan
- `helmet`: Express HTTP security headers with appropriate Content Security Policy (CSP).
- `express-session` + `connect-mongo`: Secure session persistence with `httpOnly`, `sameSite: 'lax'`, and production `secure` flags.
- `cors`: Restricted origin configuration when handling requests.
- Server-side authorization middleware (`isLoggedIn`, `isTeacher`, `isAdmin`, `isOwner`).
- Input sanitization & Joi validation on all incoming form body & query parameters.

## 18. Authentication Plan
- Passport Local strategy for authenticating username/email and password.
- Password hashing with bcrypt.
- Session persistence and serialization.
- Server-side role enforcement (`student`, `teacher`, `admin`).

## 19. Validation Plan
- **Joi Request Validation**: Validate form schemas before invoking controller actions.
- **Mongoose Database Validation**: Enforce schema constraints, required fields, and enum bounds.
- **Multer Upload Validation**: Strict file MIME-type whitelisting (PDF, PPT, PPTX, images) and size caps.

## 20. Testing Plan
- Automated build & syntax check.
- Manual verification of every interactive control and route against `TESTING_CHECKLIST.md`.
- Mobile (320px, 375px, 390px, 414px) and Desktop (768px, 1024px, 1280px+) viewport verification.
- Security boundary verification (access control, unauthorized CRUD attempts, invalid ObjectId handling).
