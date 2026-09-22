# STUDYSHARE — GOVERNANCE WORKFLOW ARCHITECTURE

## 1. Overview & Authority Hierarchy
StudyShare enforces a strict 3-tier application governance model:

$$\text{HOD / Admin} \longrightarrow \text{Teacher} \longrightarrow \text{Student}$$

- **HOD / Admin**: Sole application authority for role promotions, user demotions, governance reviews, and resource moderation.
- **Teacher**: Verified educator role capable of managing authored resources, answering student doubts, and submitting student recommendations. Teachers **cannot** directly promote users, demote teachers, or access HOD/Admin routes.
- **Student**: Standard learner role with access to public study materials, bookmarking, asking doubts, and applying for Teacher promotion.

---

## 2. Teacher Request & Recommendation Workflow

```
[ Student Application / Teacher Recommendation ]
                     │
                     ▼
            TeacherRequest (pending)
                     │
                     ▼
           Admin / HOD Review
            ┌────────┴────────┐
            ▼                 ▼
        Approve            Reject
            │                 │
    User role: teacher   Status: rejected
    AuditLog recorded    AuditLog recorded
    Notification sent    Notification sent
```

1. **Submission**:
   - **Student Application**: Candidate applies via `POST /teacher-requests` (`candidateUserId = req.user._id`).
   - **Teacher Recommendation**: Teacher recommends a student candidate via `POST /teacher-requests` (`candidateUserId = targetId`).
2. **Duplicate Protection**:
   - `TeacherRequest` maintains a compound index `{ candidateUser: 1, status: 1 }`.
   - Submissions check for existing records with `status: 'pending'`. Duplicate submissions are cleanly rejected.
3. **Admin Review & Atomic Role Promotion**:
   - Reviews occur at `/admin/teacher-requests`.
   - Decisions execute concurrency-safely using atomic `findOneAndUpdate({ _id: requestId, status: 'pending' }, ...)`.
   - On approval: Candidate role updates to `teacher`, `verificationStatus = 'verified'`, `AuditLog` records `TEACHER_APPROVED`, and an idempotent notification (`eventKey: teacher-request-approved:<requestId>`) is delivered.
   - On rejection: Request status updates to `rejected`, `rejectionReason` stored, `AuditLog` records `TEACHER_REJECTED`, and notification delivered.

---

## 3. Teacher Demotion & Historical Data Integrity
- Admin demotions (`POST /admin/users/:id/demote`) update `user.role = 'student'` and `verificationStatus = 'pending'`.
- **Data Integrity Safety**: All authored study notes, uploaded files, answers, doubts, comments, and audit log history remain completely intact. Historical assets continue to display original author attribution. Only future route authorizations revert to student capabilities.
- **Last-Admin Guard**: Admin accounts cannot be demoted or deleted via teacher governance.
