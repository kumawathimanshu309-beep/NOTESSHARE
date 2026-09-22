# PHASE 6 — NOTIFICATION CONTRACT & SPECIFICATION

## Overview
This document specifies the exact notification semantics, recipient selection rules, eventKey idempotency strategies, self-notification rules, and server-side target URL generation policies for StudyShare Phase 6.

---

## 1. Notification Event Types & Recipient Mapping Table

| Event | Action Description | Actor | Recipient | Type | EventKey Strategy | Target URL |
|-------|--------------------|-------|-----------|------|-------------------|------------|
| Note Liked | User B likes Note authored by User A | User B | Note Author (User A) | `like` | `like:<noteId>:<actorId>` | `/notes/:id` |
| Note Rated | User B rates Note authored by User A | User B | Note Author (User A) | `rating` | `rating:<noteId>:<actorId>` | `/notes/:id` |
| Note Commented | User B comments on Note authored by User A | User B | Note Author (User A) | `comment` | `comment:<commentId>` | `/notes/:id#comments` |
| Teacher Answered Doubt | Teacher C answers Doubt submitted by Student A | Teacher C | Doubt Student (Student A) | `teacher_answer` | `answer:<answerId>` | `/doubts/:id` |
| Student Answered Doubt | Student B answers Doubt submitted by Student A | Student B | Doubt Student (Student A) | `doubt_answer` | `answer:<answerId>` | `/doubts/:id` |
| Answer Accepted | Student A accepts Answer authored by Teacher C | Student A | Answer Author (Teacher C) | `answer_accepted` | `accepted:<doubtId>:<answerId>` | `/doubts/:id` |
| Note Bookmarked | User B bookmarks Note authored by User A | N/A | NONE (Personal Bookmark Only) | N/A | N/A | N/A |

---

## 2. Fundamental Notification Rules

### Rule 1: Server-Side Self-Notification Guard
- If `recipient.toString() === actor.toString()`, the notification creation pipeline **MUST** return `null` without throwing or creating any record.
- **Example**: User A liking their own note or commenting on their own note does NOT create a notification.

### Rule 2: Idempotency & Duplicate Prevention (`eventKey`)
- Notifications use a unique sparse index on `eventKey`.
- Toggling actions (e.g. Liking, Unliking, Re-liking) will re-use or ignore existing duplicate keys rather than spawning multiple notifications.
- Double-clicking or retrying HTTP requests cannot result in duplicate notification records in MongoDB.

### Rule 3: Server-Generated Relative URLs
- Client inputs are **NEVER** allowed to set or override the `url` property.
- URLs must be strictly internal relative paths (e.g., `/notes/6aaf...#comments`, `/doubts/6aaf...`).
- External URLs, `javascript:` protocols, or data URIs are strictly rejected to prevent open redirect and XSS vulnerabilities.

### Rule 4: Atomic Operation Ordering
- Notifications are only dispatched **AFTER** the underlying operation (database write of Like, Comment, Answer, or Rating) has succeeded.
- If an operation fails, rolls back, or is forbidden, zero notifications are created.

### Rule 5: User Bookmarking Privacy
- Bookmarking a note is a private user bookmarking/collection action and does not generate an author notification to prevent unnecessary notification noise.
