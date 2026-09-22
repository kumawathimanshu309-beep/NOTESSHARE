# StudyShare — Student Knowledge Sharing Platform

StudyShare is a full-stack student knowledge-sharing platform where users can discover, read, save, download, upload, and discuss high-quality study resources.

## Current Phase Status: Phase 1 — Backend Foundation Completed

- ✅ Express.js server & EJS view engine layout setup
- ✅ Design system & assets migrated from React to EJS/CSS
- ✅ Public routes: `/` (Home), `/about`, `/features`
- ✅ Centralized error handling (`AppError`, `wrapAsync`, 404 & 500 error pages)
- ✅ Security middleware (Helmet, CORS, Morgan logging, Cookie Parser, Method Override)
- ✅ Graceful MongoDB/Mongoose connection foundation

---

## Tech Stack
- **Backend**: Node.js, Express.js
- **Templating**: EJS, `express-ejs-layouts`
- **Database**: MongoDB, Mongoose (Collection: `notesshare`)
- **Security & Utilities**: Helmet, CORS, Morgan, Cookie Parser, Method Override, Dotenv

---

## Installation & Setup

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Configure environment variables:
   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/studyshare
   SESSION_SECRET=your_session_secret
   ```

3. **Google OAuth 2.0 Configuration**:
   To enable Google Sign-In:
   1. Open Google Cloud Console (https://console.cloud.google.com/).
   2. Create or select a project and configure the OAuth consent screen.
   3. Create Credentials -> OAuth Client ID (Application type: Web application).
   4. Set Authorized JavaScript origins to `http://localhost:3000`.
   5. Set Authorized redirect URIs to `http://localhost:3000/auth/google/callback`.
   6. Add the credentials to `.env`:
      ```env
      GOOGLE_CLIENT_ID=your_google_client_id
      GOOGLE_CLIENT_SECRET=your_google_client_secret
      GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
      ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Run Production Server**:
   ```bash
   npm start
   ```

---

## Folder Structure
```
noteshare-web/
├── app.js
├── server.js
├── package.json
├── .env.example
├── config/
│   └── db.js
├── controllers/
│   └── homeController.js
├── middleware/
│   ├── asyncWrapper.js
│   └── errorHandler.js
├── public/
│   ├── css/style.css
│   ├── js/main.js
│   ├── images/
│   └── uploads/
├── routes/
│   └── index.js
├── utils/
│   └── AppError.js
└── views/
    ├── layouts/main.ejs
    ├── partials/ (navbar, footer, flash, hero, stats, features, explore, join)
    ├── home/ (index, about, features)
    └── errors/ (404, error)
```

---

## License
Built for students, by students.
