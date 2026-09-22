# StudyShare — Route Plan

## Public
GET /
GET /about
GET /features
GET /notes
GET /notes/:id
GET /search

## Auth
GET /auth/login
POST /auth/login
GET /auth/signup
POST /auth/signup
POST /auth/logout

## Dashboard
GET /dashboard

## Teacher Portal
GET /teacher/dashboard
GET /teachers/:username

## Notes
GET /notes/new
POST /notes
GET /notes/:id/edit
PUT /notes/:id
DELETE /notes/:id

## Social Interactions
POST /notes/:id/bookmark
POST /notes/:id/unbookmark
POST /notes/:id/like
POST /notes/:id/unlike
POST /notes/:id/rate
DELETE /notes/:id/rate
POST /notes/:id/comments

## Comments
GET /comments/:id/edit
PUT /comments/:id
DELETE /comments/:id

## Profile
GET /profile/:username
GET /profile/edit
PUT /profile

## Doubts & Q&A
GET /doubts
GET /doubts/new
POST /doubts
GET /doubts/:id
GET /doubts/:id/edit
PUT /doubts/:id
DELETE /doubts/:id
POST /doubts/:id/answers

## Answers
GET /answers/:id/edit
PUT /answers/:id
DELETE /answers/:id
POST /answers/:id/accept

## Notifications (Phase 6)
GET /notifications
PUT /notifications/:id/read
PUT /notifications/read-all

## Admin
GET /admin
GET /admin/users
GET /admin/notes
GET /admin/comments
GET /admin/reports
GET /admin/categories
GET /admin/subjects
