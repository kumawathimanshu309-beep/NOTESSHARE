const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Note = require('../models/Note');
const AppError = require('../utils/AppError');

class NoteService {
  /**
   * Create a new Note record with role-aware moderation default
   */
  async createNote(authorId, data, file, userRole = 'student') {
    const { title, description, content, subject, category, semester, tags, resourceType, visibility, isPublished, videoUrl } = data;

    // Process tags into array
    let parsedTags = [];
    if (Array.isArray(tags)) {
      parsedTags = tags.map((t) => String(t).trim().toLowerCase()).filter((t) => t.length > 0);
    } else if (typeof tags === 'string') {
      parsedTags = tags.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0);
    }

    // Process uploaded file
    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;
    let mimeType = '';

    if (file) {
      fileUrl = `/uploads/notes/${file.filename}`;
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;
    }

    // Moderation rules: Student uploads default to 'pending' and 'isPublished = false'
    const isStudent = userRole === 'student';
    const approvalStatus = isStudent ? 'pending' : 'approved';
    const finalIsPublished = isStudent ? false : (typeof isPublished !== 'undefined' ? isPublished === 'true' || isPublished === true : true);

    const note = new Note({
      title: title.trim(),
      description: description ? description.trim() : '',
      content: content ? content.trim() : '',
      author: authorId,
      subject: subject || 'General',
      category: category || 'Notes',
      semester: Number(semester) || 1,
      tags: parsedTags,
      resourceType: resourceType || (file ? this.detectResourceType(file.mimetype) : 'pdf'),
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      videoUrl: videoUrl ? videoUrl.trim() : '',
      visibility: visibility || 'public',
      isPublished: finalIsPublished,
      approvalStatus,
    });

    await note.save();
    return note;
  }

  /**
   * Query public published notes with search, filter, sort & pagination
   */
  async getPublicNotes(options = {}) {
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(options.limit, 10) || 12));
    const skip = (page - 1) * limit;

    // Base query: Published, Public, Not Soft-Deleted, Approved
    const query = {
      isDeleted: false,
      isPublished: true,
      visibility: 'public',
      approvalStatus: 'approved',
    };

    // Keyword Search (Title, Description, Subject, Tags)
    if (options.search && options.search.trim()) {
      const searchRegex = new RegExp(options.search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { subject: searchRegex },
        { tags: searchRegex },
      ];
    }

    // Filter by Subject
    if (options.subject && options.subject.trim() && options.subject !== 'all') {
      query.subject = new RegExp(`^${options.subject.trim()}$`, 'i');
    }

    // Filter by Semester
    if (options.semester && !isNaN(options.semester)) {
      query.semester = Number(options.semester);
    }

    // Filter by Year (PYQ)
    if (options.year && !isNaN(options.year)) {
      query.year = Number(options.year);
    }

    // Filter by Category
    if (options.category && options.category.trim() && options.category !== 'all') {
      query.category = new RegExp(`^${options.category.trim()}$`, 'i');
    }

    // Filter by Resource Type
    if (options.resourceType && options.resourceType.trim() && options.resourceType !== 'all') {
      query.resourceType = options.resourceType.trim().toLowerCase();
    }

    // Safe Whitelisted Sorting
    let sort = { createdAt: -1 };
    if (options.sort === 'oldest') {
      sort = { createdAt: 1 };
    } else if (options.sort === 'popular') {
      sort = { views: -1, createdAt: -1 };
    } else if (options.sort === 'downloads') {
      sort = { downloads: -1, createdAt: -1 };
    }

    const [notes, totalNotes] = await Promise.all([
      Note.find(query)
        .populate('author', 'name username avatar role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Note.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalNotes / limit) || 1;

    return {
      notes,
      totalNotes,
      page,
      totalPages,
      limit,
    };
  }

  /**
   * Fetch Note by ID with strict visibility & moderation authorization checks
   */
  async getNoteById(noteId, currentUser = null) {
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      throw new AppError('Invalid note identifier.', 400);
    }

    const note = await Note.findById(noteId).populate('author', 'name username avatar role bio').exec();

    if (!note || note.isDeleted) {
      throw new AppError('The requested study note was not found or has been removed.', 404);
    }

    // Visibility & Moderation Guard
    const isApproved = note.approvalStatus === 'approved';
    const isPublicAndPublished = note.isPublished && note.visibility === 'public' && isApproved;
    const isOwner = currentUser && note.author && (note.author._id ? note.author._id.equals(currentUser._id) : note.author.equals(currentUser._id));
    const isAdmin = currentUser && currentUser.role === 'admin';

    if (!isPublicAndPublished && !isOwner && !isAdmin) {
      throw new AppError('This study resource is pending moderation review, private, or not publicly available.', 403);
    }

    return note;
  }

  /**
   * Increment view counter safely
   */
  async incrementViews(noteId) {
    if (mongoose.Types.ObjectId.isValid(noteId)) {
      await Note.findByIdAndUpdate(noteId, { $inc: { views: 1 } });
    }
  }

  /**
   * Increment download counter safely
   */
  async incrementDownloads(noteId) {
    if (mongoose.Types.ObjectId.isValid(noteId)) {
      await Note.findByIdAndUpdate(noteId, { $inc: { downloads: 1 } });
    }
  }

  /**
   * Update existing note with ownership & mass-assignment safeguards
   */
  async updateNote(noteId, currentUser, updateData, newFile = null) {
    const note = await this.getNoteById(noteId, currentUser);

    const isOwner = note.author && (note.author._id ? note.author._id.equals(currentUser._id) : note.author.equals(currentUser._id));
    const isAdmin = currentUser.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('You do not have permission to edit this note.', 403);
    }

    // Mass assignment protection: Strip moderation control fields from non-admin payloads
    if (!isAdmin) {
      delete updateData.approvalStatus;
      delete updateData.status;
      delete updateData.approvedBy;
      delete updateData.approvedAt;
      delete updateData.rejectionReason;
      delete updateData.adminFeedback;
    }

    // Mandatory Re-moderation Rule:
    // If a student edits an approved or rejected note (or replaces its file),
    // approvalStatus MUST reset to 'pending' and isPublished MUST become false.
    if (currentUser.role === 'student' && !isAdmin) {
      note.approvalStatus = 'pending';
      note.isPublished = false;
      note.rejectionReason = '';
      note.adminFeedback = '';
    }

    // Server-managed security: Never allow client to manipulate fileVersion directly
    // Explicitly update only allowed fields
    if (typeof updateData.title !== 'undefined') note.title = updateData.title.trim();
    if (typeof updateData.description !== 'undefined') note.description = updateData.description.trim();
    if (typeof updateData.content !== 'undefined') note.content = updateData.content.trim();
    if (typeof updateData.subject !== 'undefined') note.subject = updateData.subject;
    if (typeof updateData.category !== 'undefined') note.category = updateData.category;
    if (typeof updateData.semester !== 'undefined') note.semester = Number(updateData.semester);
    if (typeof updateData.resourceType !== 'undefined') note.resourceType = updateData.resourceType;
    if (typeof updateData.visibility !== 'undefined') note.visibility = updateData.visibility;
    if (isAdmin && typeof updateData.isPublished !== 'undefined') {
      note.isPublished = updateData.isPublished === 'true' || updateData.isPublished === true;
    }
    if (typeof updateData.videoUrl !== 'undefined') note.videoUrl = updateData.videoUrl.trim();

    if (updateData.tags) {
      if (Array.isArray(updateData.tags)) {
        note.tags = updateData.tags.map((t) => String(t).trim().toLowerCase()).filter((t) => t.length > 0);
      } else if (typeof updateData.tags === 'string') {
        note.tags = updateData.tags.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0);
      }
    }

    const oldFileUrl = note.fileUrl;
    let fileWasReplaced = false;

    // Process new file upload if attached
    if (newFile) {
      note.fileUrl = `/uploads/notes/${newFile.filename}`;
      note.fileName = newFile.originalname;
      note.fileSize = newFile.size;
      note.mimeType = newFile.mimetype;
      // Increment fileVersion ONLY when the actual resource file changes
      note.fileVersion = (note.fileVersion || 1) + 1;
      fileWasReplaced = true;
    }

    try {
      await note.save();
    } catch (saveErr) {
      // Failure safety: If DB save fails, clean up newly uploaded orphan file
      if (newFile) {
        const newFilePath = path.join(__dirname, '../public', note.fileUrl);
        if (fs.existsSync(newFilePath)) {
          try {
            fs.unlinkSync(newFilePath);
          } catch (e) {
            console.warn('Could not clean up new orphan file after DB error:', e.message);
          }
        }
      }
      throw saveErr;
    }

    // Atomic post-save cleanup: Remove old file safely only after DB update succeeds
    if (fileWasReplaced && oldFileUrl) {
      const oldPath = path.join(__dirname, '../public', oldFileUrl);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.warn('Could not remove old note file after successful DB update:', e.message);
        }
      }
    }

    return note;
  }

  /**
   * Soft Delete Note
   */
  async softDeleteNote(noteId, currentUser) {
    const note = await this.getNoteById(noteId, currentUser);

    const isOwner = note.author && note.author._id.equals(currentUser._id);
    const isAdmin = currentUser.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError('You do not have permission to delete this note.', 403);
    }

    note.isDeleted = true;
    note.deletedAt = new Date();
    note.deletedBy = currentUser._id;

    await note.save();
    return note;
  }

  detectResourceType(mimeType) {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'ppt';
    if (mimeType.includes('image')) return 'image';
    return 'document';
  }
}

module.exports = new NoteService();
