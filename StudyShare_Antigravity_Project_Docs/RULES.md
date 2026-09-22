# StudyShare — Engineering Rules

## Architecture
- Use Node.js + Express + MongoDB + Mongoose + EJS.
- Keep routes, controllers, services, models, middleware and validators separated.
- Controllers should remain thin.
- Business logic belongs in services where complexity warrants it.
- Use reusable utilities and middleware.

## Frontend
- Preserve the existing StudyShare UI.
- Do not replace the design with a generic template.
- Use EJS layouts/partials.
- Keep CSS modular and maintainable.
- Avoid inline CSS unless genuinely necessary.
- Avoid inline JavaScript for application logic.

## Database
- Notes collection name must be `notesshare`.
- Use ObjectId references for relationships.
- Add indexes for common search fields.
- Use Mongoose validation.
- Prevent duplicate relationship records such as bookmarks/ratings where applicable.

## Validation
- Joi validates incoming request data.
- Mongoose validates persisted data.
- Never trust browser/client validation.
- Normalize and trim user input where appropriate.
- Enforce file type and size limits.

## Authentication
- Passport Local.
- Hash passwords.
- Use sessions.
- Store sessions in MongoDB in production.
- Never expose password hashes.
- Enforce authorization server-side.

## Security
- Helmet
- CORS configured deliberately
- cookie-parser
- secure session cookies in production
- environment variables for secrets
- protect ownership/admin routes
- validate IDs
- protect file uploads

## Errors
- Use AppError/ExpressError.
- Use wrapAsync for async route handlers.
- Central error middleware.
- 404 handling.
- User-friendly EJS error page.
- Do not leak stack traces/secrets in production.

## Deletion
- Think through dependent documents before deleting.
- Use Mongoose middleware/hooks when appropriate.
- Prefer soft deletion for important content when it provides value.
- Do not leave accidental orphan references.

## Git
- Never commit `.env`.
- Never commit secrets.
- Make small logical commits.
- Do not rewrite history or delete branches without explicit instruction.

## UX
- Every implemented button/link must work.
- No fake navigation.
- No accidental horizontal overflow.
- Mobile and desktop must both be checked.
- Provide empty/loading/error/success states.

## Development
- Inspect before modifying.
- Make one logical change at a time.
- Run/test after major changes.
- Fix errors before moving on.
- Do not claim a feature is done without verification.
