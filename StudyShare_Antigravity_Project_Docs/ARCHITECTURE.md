# StudyShare — Architecture

## High-Level Flow

Browser
  ↓
Express Router
  ↓
Validation Middleware
  ↓
Authentication / Authorization Middleware
  ↓
Controller
  ↓
Service Layer
  ↓
Mongoose Model
  ↓
MongoDB

Response:
MongoDB → Model → Service → Controller → EJS View

## Suggested Structure

project/
├── app.js
├── server.js
├── package.json
├── .env
├── .env.example
├── README.md
├── PRD.md
├── RULES.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API_ROUTES.md
├── TASKS.md
├── TESTING_CHECKLIST.md
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── validators/
├── utils/
├── seeds/
├── public/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── uploads/
└── views/
    ├── layouts/
    ├── partials/
    ├── auth/
    ├── home/
    ├── notes/
    ├── dashboard/
    ├── profile/
    ├── doubts/
    ├── notifications/
    ├── admin/
    ├── community/
    └── errors/

## Important Classes/Services
- NoteService
- UserService
- AuthService
- NotificationService
- FileUploadService
- AdminService

Use classes only where they provide clear encapsulation or reusable business logic.

## Middleware
- logger
- security
- parser
- session
- passport
- flash
- validation
- authentication
- authorization
- ownership
- notFound
- errorHandler

## Rendering
Use EJS layouts and partials for:
- navbar
- footer
- flash messages
- cards
- forms
- pagination
- note metadata
- dashboard navigation
