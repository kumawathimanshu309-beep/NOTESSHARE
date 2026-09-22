# StudyShare — Phase 2 Authentication & Authorization Report

## 1. User Model
- **File**: `models/User.js`
- **Fields**: `name`, `username`, `email`, `password` (hashed), `role` (`student`, `teacher`, `admin`), `avatar`, `bio`, `createdAt`, `updatedAt`.
- **Validation**: Mongoose schema validation enforces required fields, string length boundaries, lowercase email format, and lowercase alphanumeric username.
- **Security**: Password field configured with `select: false` by default. Schema `toJSON` transform strips `password` from output.

## 2. Authentication Implementation
- Built complete Signup, Login, and Logout flows using Passport Local Strategy.
- **Signup Flow**: Validates form via Joi → checks for duplicate email or username → forces `role: 'student'` → saves hashed user to MongoDB → automatically logs user in → redirects to `/dashboard`.
- **Login Flow**: Accepts email or username in identifier field → compares supplied password against bcrypt salt/hash → deserializes user → redirects to requested return URL or `/dashboard`.
- **Logout Flow**: Destroys session, clears cookie, and redirects to `/`.

## 3. Passport Configuration
- **File**: `config/passport.js`
- Custom `LocalStrategy` configured with `{ usernameField: 'identifier', passwordField: 'password' }`.
- Searches MongoDB by lowercase email OR username (`$or: [{ email }, { username }]`).
- Implements `serializeUser` (saves `user.id`) and `deserializeUser` (fetches `User.findById(id)`).

## 4. Session Configuration
- **Package**: `express-session`
- Configured with `secret: process.env.SESSION_SECRET`, `resave: false`, `saveUninitialized: false`.
- Cookies set with `httpOnly: true`, `sameSite: 'lax'`, `maxAge: 7 days`, and `secure: process.env.NODE_ENV === 'production'`.

## 5. MongoDB Session Store
- **Package**: `connect-mongo`
- Persistent session storage in MongoDB via `MongoStore.create({ mongoUrl: process.env.MONGODB_URI, touchAfter: 24 * 3600 })`.

## 6. Password Hashing
- **Package**: `bcryptjs`
- Pre-save Mongoose hook (`userSchema.pre('save')`) automatically hashes passwords using `bcrypt.genSalt(12)` whenever password is modified.
- Instance method `user.comparePassword(candidatePassword)` performs timing-safe password comparison.

## 7. Joi Validation
- **File**: `validators/authValidator.js`
- `validateSignup`: Validates `name` (2-50 chars), `username` (3-30 chars), `email`, `password` (min 6), and `confirmPassword` matching.
- `validateLogin`: Validates presence of `identifier` and `password`.
- Preserves safe form fields on error while zeroing out password fields.

## 8. Authorization Middleware
- **File**: `middleware/auth.js`
- `isLoggedIn`: Guard requiring active session before accessing protected routes (`/dashboard`, `/admin`).
- `isStudent`: Validates authenticated user.
- `isTeacher`: Guards teacher routes (`role === 'teacher' || role === 'admin'`).
- `isAdmin`: Guards administrator routes (`role === 'admin'`).
- `isOwner`: Reusable resource ownership closure foundation (`resource.author.equals(req.user._id) || req.user.role === 'admin'`).

## 9. Role Handling
- **Roles**: `student`, `teacher`, `admin`.
- Normal public signup forces `role = 'student'`. Requests containing `role=admin` or `role=teacher` are ignored during signup.

## 10. Admin Seed Mechanism
- **File**: `scripts/seedAdmin.js`
- Safe administration seeding script reading `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` from `.env`.
- Executed via `node scripts/seedAdmin.js`. Successfully seeded initial admin account (`admin@studyshare.com`).

## 11. Auth Views
- **Files**: `views/auth/login.ejs` & `views/auth/signup.ejs`
- Rendered in dark navy background (`#080B18`), purple/violet gradients (`#7C3AED`, `#A855F7`), Sora & Inter fonts, thin borders, rounded cards, and responsive layouts matching the StudyShare design system. Includes password show/hide toggle.

## 12. Navbar Changes
- **File**: `views/partials/navbar.ejs`
- Dynamically adapts based on `isAuthenticated` and `currentUser.role`:
  - **Guest**: Home, Explore, Features, About, Login, Get Started.
  - **Authenticated Student**: Home, Explore, Features, About, Dashboard, Logout button.
  - **Admin**: Includes direct link to **Admin Panel**.

## 13. Routes
- `GET /auth/login` & `POST /auth/login`
- `GET /auth/signup` & `POST /auth/signup`
- `POST /auth/logout`
- `GET /dashboard` (Protected by `isLoggedIn`)
- `GET /admin` (Protected by `isLoggedIn` + `isAdmin`)

## 14. Dependencies Added
- `passport`
- `passport-local`
- `bcryptjs`
- `express-session`
- `connect-mongo`
- `connect-flash`
- `joi`

## 15. Security Measures
- Passwords are never stored in plaintext.
- Password hashes are excluded from JSON responses and views.
- HTTP-only session cookies with MongoStore persistence.
- Server-side authorization checks prevent URL tampering to `/admin`.
- `.env` contains local development secrets and is strictly ignored by `.gitignore`.

## 16. Tests Performed
- `scratch/testAuth.js`: Unit & Integration tests for User Schema, password hashing, bcrypt comparison, duplicate email checks, and admin user creation.
- `scratch/testHttpAuth.js`: Integration tests for HTTP route guards, unauthenticated redirects, and EJS authentication rendering.
- Manual seed script execution (`node scripts/seedAdmin.js`).

## 17. Test Results
- **100% PASSED**:
  - `User.save()` hashes passwords with salt factor 12.
  - `user.comparePassword()` correctly validates correct/incorrect passwords.
  - Duplicate email/username registration is blocked with user-friendly flash feedback.
  - Guest users attempting to access `/dashboard` or `/admin` receive HTTP 302 redirect to `/auth/login`.
  - Non-admin users attempting to access `/admin` receive HTTP 302 redirect with flash message `'Access denied. Administrator privileges required.'`.

## 18. Known Limitations
- CSRF protection: Form state validation relies on HTTP-only SameSite cookies; explicit CSRF token verification (e.g. `csurf` / custom double-submit tokens) can be added in a future security-hardening phase.

## 19. Files Created / Modified
- **Created**:
  - `models/User.js`
  - `config/passport.js`
  - `validators/authValidator.js`
  - `middleware/auth.js`
  - `controllers/authController.js`
  - `controllers/dashboardController.js`
  - `routes/auth.js`
  - `routes/dashboard.js`
  - `routes/admin.js`
  - `views/auth/login.ejs`
  - `views/auth/signup.ejs`
  - `views/dashboard/index.ejs`
  - `views/admin/index.ejs`
  - `scripts/seedAdmin.js`
  - `PHASE_2_REPORT.md`
- **Modified**:
  - `app.js`
  - `views/partials/navbar.ejs`
  - `.env.example`
  - `.env`
  - `StudyShare_Antigravity_Project_Docs/TASKS.md`
  - `package.json` & `package-lock.json`
