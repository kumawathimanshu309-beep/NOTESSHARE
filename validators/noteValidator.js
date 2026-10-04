const Joi = require('joi');

const noteSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120).required().messages({
    'string.empty': 'Note title is required.',
    'string.min': 'Title must be at least 3 characters long.',
    'string.max': 'Title cannot exceed 120 characters.',
  }),
  description: Joi.string().trim().max(1000).allow('').messages({
    'string.max': 'Description cannot exceed 1000 characters.',
  }),
  content: Joi.string().trim().allow(''),
  field: Joi.string().trim().default('Engineering'),
  branch: Joi.string().trim().allow('').default(''),
  subject: Joi.string().trim().default('General'),
  subjectId: Joi.string().trim().allow('', null),
  topic: Joi.string().trim().allow('').default(''),
  topicId: Joi.string().trim().allow('', null),
  category: Joi.string().trim().default('Notes'),
  semester: Joi.number().integer().min(1).max(8).default(1),
  tags: Joi.any(), // Array or comma-separated string handled in controller
  resourceType: Joi.string().valid('note', 'pdf', 'ppt', 'pptx', 'image', 'document', 'video', 'link', 'pyq', 'important_questions').default('pdf'),
  visibility: Joi.string().valid('public', 'private', 'restricted').default('public'),
  isPublished: Joi.boolean().default(true),
  videoUrl: Joi.string().trim().uri().allow(''),
}).unknown(true); // Allow additional fields like file, but mass-assignment protected in service/controller

exports.validateNote = (req, res, next) => {
  // Convert tags if comma-separated string
  if (req.body && typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
  }

  const isAjax = Boolean(
    req.xhr ||
    req.headers?.['x-requested-with'] === 'XMLHttpRequest' ||
    req.headers?.accept?.includes('application/json')
  );

  // Explicit branch & subject check on new note creation
  if (req.method === 'POST') {
    if (!req.body?.branch || !req.body.branch.trim()) {
      const msg = 'Please select a valid academic branch.';
      if (isAjax) {
        return res.status(400).json({ success: false, message: msg });
      }
      if (typeof req.flash === 'function') req.flash('error', msg);
      return res.status(400).redirect(303, '/notes/new');
    }

    if (
      !req.body?.subject ||
      !req.body.subject.trim() ||
      req.body.subject.toLowerCase() === 'select subject' ||
      req.body.subject.toLowerCase() === 'select branch first'
    ) {
      const msg = 'Please select a valid subject.';
      if (isAjax) {
        return res.status(400).json({ success: false, message: msg });
      }
      if (typeof req.flash === 'function') req.flash('error', msg);
      return res.status(400).redirect(303, '/notes/new');
    }
  }

  const { error } = noteSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((d) => d.message);
    const combinedMsg = errorMessages.join('. ');

    if (isAjax) {
      return res.status(400).json({ success: false, message: combinedMsg, errors: errorMessages });
    }

    if (typeof req.flash === 'function') req.flash('error', errorMessages);
    const redirectUrl = req.params?.id ? `/notes/${req.params.id}/edit` : '/notes/new';
    return res.status(400).redirect(303, redirectUrl);
  }

  next();
};
