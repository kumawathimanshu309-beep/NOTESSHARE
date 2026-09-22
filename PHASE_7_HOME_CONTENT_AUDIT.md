# PHASE 7 — HOME PAGE CONTENT MANAGEMENT AUDIT

## Overview
This document specifies the classification of Home Page elements, the dynamic database model (`HomeCard`), public filtering rules, URL security guards, and admin CRUD lifecycle controls.

---

## 1. Home Page Element Classification

| Element / Section | Classification | Management Strategy |
|-------------------|----------------|---------------------|
| Hero Header & Headline | Static UI | Hardcoded brand messaging in `views/partials/hero.ejs` |
| Platform Live Stats Counter | Database-Driven | Aggregated live counts from `Note` model in `homeController.js` |
| Feature Cards Section | Admin-Controlled Dynamic | Dynamic DB documents (`HomeCard` model) managed from `/admin/home-content` |
| Subject Categories Grid | Database-Driven | Aggregated live note counts per subject in `homeController.js` |
| Popular Notes Preview | Database-Driven | Query top 3 downloaded/viewed notes in `homeController.js` |
| Join CTA Section | Static UI | Hardcoded signup prompt in `views/partials/join.ejs` |

---

## 2. Dynamic HomeCard Model Specification
- **Model File**: [models/HomeCard.js](file:///c:/Users/DELL/OneDrive/Desktop/NOTESSHARE/noteshare-web/models/HomeCard.js)
- **Fields**:
  - `title`: String (required)
  - `description`: String (required)
  - `icon`: String (default: `'★'`)
  - `ctaText`: String (default: `'Explore Resource'`)
  - `url`: String (required, validated server-side)
  - `order`: Number (default: `0`)
  - `isPublished`: Boolean (default: `true`)
  - `isEnabled`: Boolean (default: `true`)
  - `isDeleted`: Boolean (default: `false`)
  - `createdBy`, `updatedBy`: `ObjectId` (ref: `'User'`)

---

## 3. Public Display & Filtering Rules
Public visitors reaching `GET /` receive cards filtered by:
```javascript
HomeCard.find({ isPublished: true, isEnabled: true, isDeleted: false })
  .sort({ order: 1, createdAt: -1 })
```
- **Unpublished Cards**: Hidden from public visitors (`isPublished: false`).
- **Disabled Cards**: Hidden from public visitors (`isEnabled: false`).
- **Deleted Cards**: Hidden from public visitors (`isDeleted: true`).
- **Fallback**: If zero active DB cards exist, default feature cards are safely rendered.

---

## 4. URL Validation & Security Guards
Target URLs submitted by administrators are validated server-side in `adminController.js`:
- **Allowed**: Internal relative routes starting with `/` (e.g. `/notes`, `/doubts`, `/notes?resourceType=pyq`, `/features`, `/about`).
- **Blocked**: Protocol-relative URLs starting with `//`, `javascript:` schemes, `data:` URIs, or `vbscript:` payloads.
- **Enforcement**: Throws a `400 Bad Request` if URL validation fails.
