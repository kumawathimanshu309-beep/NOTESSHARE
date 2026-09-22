# StudyShare

StudyShare is a full-stack student knowledge-sharing platform.

## Stack
- Node.js
- Express
- EJS
- MongoDB
- Mongoose
- Passport
- Joi
- Helmet
- Morgan
- Cookie Parser
- Express Session
- Connect Mongo
- Multer

## Main Features
- Authentication
- Student/Teacher/Admin roles
- Notes CRUD
- PDF/PPT/resource sharing
- Search/filter
- Bookmarks
- Likes
- Ratings
- Comments
- Notifications
- Doubts
- Admin panel
- Responsive UI

## Setup

```bash
npm install
```

Create `.env` from `.env.example`.

Then:

```bash
npm run dev
```

or:

```bash
npm start
```

## Important
Never commit `.env`.

The notes collection must be named:

`notesshare`

## Development Principle

The existing StudyShare UI is the visual source of truth. Backend implementation must not unnecessarily change the design.
