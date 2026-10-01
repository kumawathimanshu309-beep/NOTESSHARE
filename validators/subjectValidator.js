const Joi = require('joi');

const subjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Subject name is required.',
    'string.min': 'Subject name must be at least 2 characters long.',
    'string.max': 'Subject name cannot exceed 100 characters.',
  }),
  code: Joi.string().trim().max(20).allow('').messages({
    'string.max': 'Subject code cannot exceed 20 characters.',
  }),
  department: Joi.string().trim().max(100).allow('').default('General').messages({
    'string.max': 'Department name cannot exceed 100 characters.',
  }),
  description: Joi.string().trim().max(500).allow('').messages({
    'string.max': 'Description cannot exceed 500 characters.',
  }),
  isActive: Joi.any(),
}).unknown(true);

const topicSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required().messages({
    'string.empty': 'Topic name is required.',
    'string.min': 'Topic name must be at least 2 characters long.',
    'string.max': 'Topic name cannot exceed 120 characters.',
  }),
  description: Joi.string().trim().max(500).allow('').messages({
    'string.max': 'Description cannot exceed 500 characters.',
  }),
  isActive: Joi.any(),
}).unknown(true);

exports.validateSubjectInput = (req, res, next) => {
  const { error } = subjectSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(' ');
    req.flash('error', errorMessages);
    const redirectUrl = req.headers.referer || '/admin/subjects';
    return res.redirect(303, redirectUrl);
  }
  next();
};

exports.validateTopicInput = (req, res, next) => {
  const { error } = topicSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(' ');
    req.flash('error', errorMessages);
    const redirectUrl = req.headers.referer || `/admin/subjects/${req.params.subjectId}/topics`;
    return res.redirect(303, redirectUrl);
  }
  next();
};
