# StudyShare — Database Design

## MongoDB
Database name may be configured through `MONGODB_URI`.

## Required Notes Collection
Mongoose Note model must explicitly use:
`collection: "notesshare"`

## User
Fields:
- name
- username
- email
- password hash
- role: student | teacher | admin
- avatar
- bio
- createdAt
- updatedAt

## Note
Fields:
- title
- description
- content
- author -> User
- subject -> Subject
- category -> Category
- semester
- tags
- resourceType
- fileUrl/path
- thumbnail
- videoUrl
- views
- downloads
- likes -> User references or deliberate counter strategy
- isPublished
- isDeleted
- deletedAt
- createdAt
- updatedAt

## Comment
- note -> Note
- author -> User
- body
- parent -> Comment (optional)
- createdAt
- updatedAt
- isDeleted

## Rating
- note -> Note
- user -> User
- value 1..5
- createdAt
- updatedAt
Unique logical pair:
(note, user)

## Bookmark
- note -> Note
- user -> User
- createdAt
Unique logical pair:
(note, user)

## Notification
- recipient -> User
- actor -> User
- type
- message
- note -> Note (optional)
- comment -> Comment (optional)
- isRead
- createdAt

## Subject
- name
- slug
- description
- isActive

## Category
- name
- slug
- description
- isActive

## Doubt
- author -> User
- title
- body
- tags
- note -> Note (optional)
- status
- createdAt
- updatedAt

## Reply/Answer
- doubt -> Doubt
- author -> User
- body
- accepted
- createdAt
- updatedAt

## Report
- reporter -> User
- targetType
- targetId
- reason
- description
- status
- reviewedBy
- reviewedAt
- createdAt

## Indexing
Consider indexes on:
- Note title
- Note tags
- Note subject
- Note category
- Note semester
- Note resourceType
- Note createdAt
- User email
- User username
- slugs

Use compound/text indexes only where justified by actual queries.
