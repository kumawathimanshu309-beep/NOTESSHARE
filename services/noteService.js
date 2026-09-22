const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Note = require('../models/Note');
const blobService = require('./blobService');
const AppError = require('../utils/AppError');

class NoteService {
  /**
   * Helper to write local file buffer in dev mode
   */
  async _saveBufferLocally(originalname, buffer) {
    const uploadDir = path.join(__dirname, '../public/uploads/notes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const ext = path.extname(originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `note-${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.promises.writeFile(filePath, buffer);
    return `/uploads/notes/${filename}`;
  }

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

    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;
    let mimeType = '';

    // Priority 1: Direct Client Blob Upload Metadata
    if (data.fileUrl && String(data.fileUrl).trim()) {
      fileUrl = String(data.fileUrl).trim();
      fileName = data.fileName ? String(data.fileName).trim() : 'uploaded-note';
      fileSize = Number(data.fileSize) || 0;
      mimeType = data.mimeType ? String(data.mimeType).trim() : 'application/pdf';
    } 
    // Priority 2: Server-Side File Buffer (Multer memoryStorage)
    else if (file) {
      fileName = file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype;

      if (blobService.isBlobConfigured()) {
        const blobResult = await blobService.uploadBufferToBlob(file.originalname, file.buffer, file.mimetype);
        fileUrl = blobResult.url;
      } else {
        fileUrl = await this._saveBufferLocally(file.originalname, file.buffer);
      }
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
      resourceType: resourceType || (mimeType ? this.detectResourceType(mimeType) : 'pdf'),
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

    const query = {
      isDeleted: false,
      isPublished: true,
      visibility: 'public',
      approvalStatus: 'approved',
    };

    if (options.search && options.search.trim()) {
      const searchRegex = new RegExp(options.search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { subject: searchRegex },
        { tags: searchRegex },
      ];
    }

    if (options.subject && options.subject.trim() && options.subject !== 'all') {
      query.subject = new RegExp(`^${options.subject.trim()}$`, 'i');
    }

    if (options.semester && !isNaN(options.semester)) {
      query.semester = Number(options.semester);
    }

    if (options.year && !isNaN(options.year)) {
      query.year = Number(options.year);
    }

    if (options.category && options.category.trim() && options.category !== 'all') {
      query.category = new RegExp(`^${options.category.trim()}$`, 'i');
    }

    if (options.resourceType && options.resourceType.trim() && options.resourceType !== 'all') {
      query.resourceType = options.resourceType.trim().toLowerCase();
    }

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

    const isApproved = note.approvalStatus === 'approved';
    const isPublicAndPublished = note.isPublished && note.visibility === 'public' && isApproved;
    const isOwner = currentUser && note.author && (note.author._id ? note.author._id.equals(currentUser._id) : note.author.equals(currentUser._id));
    const isAdmin = currentUser && currentUser.role === 'admin';

    if (!isPublicAndPublished && !isOwner && !isAdmin) {
      throw new AppError('This study resource is pending moderation review, private, or not publicly available.', 403);
    }

    return note;
  }

  async incrementViews(noteId) {
    if (mongoose.Types.ObjectId.isValid(noteId)) {
      await Note.findByIdAndUpdate(noteId, { $inc: { views: 1 } });
    }
  }

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

    if (!isAdmin) {
      delete updateData.approvalStatus;
      delete updateData.status;
      delete updateData.approvedBy;
      delete updateData.approvedAt;
      delete updateData.rejectionReason;
      delete updateData.adminFeedback;
    }

    if (currentUser.role === 'student' && !isAdmin) {
      note.approvalStatus = 'pending';
      note.isPublished = false;
      note.rejectionReason = '';
      note.adminFeedback = '';
    }

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

    // Direct Client Blob Upload Metadata Replacement
    if (updateData.fileUrl && String(updateData.fileUrl).trim() && updateData.fileUrl !== oldFileUrl) {
      note.fileUrl = String(updateData.fileUrl).trim();
      if (updateData.fileName) note.fileName = String(updateData.fileName).trim();
      if (updateData.fileSize) note.fileSize = Number(updateData.fileSize) || note.fileSize;
      if (updateData.mimeType) note.mimeType = String(updateData.mimeType).trim();
      note.fileVersion = (note.fileVersion || 1) + 1;

      if (oldFileUrl) {
        await blobService.deleteFileResource(oldFileUrl);
      }
    }
    // Server-Side File Buffer Replacement
    else if (newFile) {
      let newFileUrl = '';
      if (blobService.isBlobConfigured()) {
        const blobResult = await blobService.uploadBufferToBlob(newFile.originalname, newFile.buffer, newFile.mimetype);
        newFileUrl = blobResult.url;
      } else {
        newFileUrl = await this._saveBufferLocally(newFile.originalname, newFile.buffer);
      }

      note.fileUrl = newFileUrl;
      note.fileName = newFile.originalname;
      note.fileSize = newFile.size;
      note.mimeType = newFile.mimetype;
      note.fileVersion = (note.fileVersion || 1) + 1;

      if (oldFileUrl) {
        await blobService.deleteFileResource(oldFileUrl);
      }
    }

    await note.save();
    return note;
  }

  async softDeleteNote(noteId, currentUser) {
    const note = await this.getNoteById(noteId, currentUser);

    const isOwner = note.author && (note.author._id ? note.author._id.equals(currentUser._id) : note.author.equals(currentUser._id));
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
    if (!mimeType) return 'pdf';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'ppt';
    if (mimeType.includes('image')) return 'image';
    return 'document';
  }
}

module.exports = new NoteService();
