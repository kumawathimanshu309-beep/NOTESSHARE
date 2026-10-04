const Joi = require('joi');

/**
 * Teacher Application / Recommendation Form Joi Validation Schema
 */
const teacherRequestSchema = Joi.object({
  candidateUserId: Joi.string()
    .trim()
    .hex()
    .length(24)
    .allow('', null)
    .messages({
      'string.hex': 'Invalid candidate user identifier.',
      'string.length': 'Candidate user identifier must be a valid 24-character hexadecimal ID.',
    }),
  qualifications: Joi.string().trim().min(2).max(200).required().messages({
    'string.empty': 'Academic qualifications are required.',
    'string.min': 'Academic qualifications must be at least 2 characters.',
    'string.max': 'Academic qualifications cannot exceed 200 characters.',
    'any.required': 'Academic qualifications are required.',
  }),
  experience: Joi.string().trim().min(2).max(200).required().messages({
    'string.empty': 'Teaching experience is required.',
    'string.min': 'Teaching experience must be at least 2 characters.',
    'string.max': 'Teaching experience cannot exceed 200 characters.',
    'any.required': 'Teaching experience is required.',
  }),
  subjects: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().min(1)).min(1),
      Joi.string().trim().min(1)
    )
    .required()
    .messages({
      'alternatives.types': 'Please select or provide at least one subject.',
      'any.required': 'At least one subject is required.',
    }),
  reason: Joi.string().trim().min(5).max(500).required().messages({
    'string.empty': 'Application reason is required.',
    'string.min': 'Application reason must be at least 5 characters.',
    'string.max': 'Application reason cannot exceed 500 characters.',
    'any.required': 'Application reason is required.',
  }),
  _csrf: Joi.string().allow('', null),
}).unknown(true);

/**
 * Teacher Request Validation Middleware
 */
exports.validateTeacherRequest = (req, res, next) => {
  const { error } = teacherRequestSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((d) => d.message);
    const combinedMessage = errorMessages.join('. ');

    const isAjax = Boolean(
      req.xhr ||
      req.headers?.['x-requested-with'] === 'XMLHttpRequest' ||
      req.headers?.accept?.includes('application/json')
    );

    if (isAjax) {
      return res.status(400).json({
        success: false,
        message: combinedMessage,
        errors: errorMessages,
      });
    }

    if (typeof req.flash === 'function') {
      req.flash('error', combinedMessage);
    }
    const redirectUrl = req.user && req.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard';
    return res.status(400).redirect(303, redirectUrl);
  }

  next();
};

exports.teacherRequestSchema = teacherRequestSchema;
