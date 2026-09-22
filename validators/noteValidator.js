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
  subject: Joi.string().trim().default('General'),
  category: Joi.string().trim().default('Notes'),
  semester: Joi.number().integer().min(1).max(8).default(1),
  tags: Joi.any(), // Array or comma-separated string handled in controller
  resourceType: Joi.string().valid('note', 'pdf', 'ppt', 'pptx', 'image', 'document', 'video', 'link').default('pdf'),
  visibility: Joi.string().valid('public', 'private', 'restricted').default('public'),
  isPublished: Joi.boolean().default(true),
  videoUrl: Joi.string().trim().uri().allow(''),
}).unknown(true); // Allow additional fields like file, but mass-assignment protected in service/controller

exports.validateNote = (req, res, next) => {
  // Convert tags if comma-separated string
  if (typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
  }

  const { error } = noteSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((d) => d.message);
    req.flash('error', errorMessages);
    const redirectUrl = req.params.id ? `/notes/${req.params.id}/edit` : '/notes/new';
    return res.status(400).redirect(redirectUrl);
  }

  next();
};
