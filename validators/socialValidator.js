const Joi = require('joi');

const ratingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a valid number.',
    'number.integer': 'Rating must be an integer.',
    'number.min': 'Rating must be at least 1 star.',
    'number.max': 'Rating cannot exceed 5 stars.',
    'any.required': 'Rating is required.',
  }),
  review: Joi.string().trim().max(500).allow('').messages({
    'string.max': 'Review comment cannot exceed 500 characters.',
  }),
});

const commentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(1000).required().messages({
    'string.empty': 'Comment cannot be empty or whitespace only.',
    'string.min': 'Comment must be at least 1 character long.',
    'string.max': 'Comment cannot exceed 1000 characters.',
    'any.required': 'Comment content is required.',
  }),
});

const profileUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Name cannot be empty.',
    'string.min': 'Name must be at least 2 characters.',
    'string.max': 'Name cannot exceed 50 characters.',
  }),
  username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.empty': 'Username cannot be empty.',
      'string.min': 'Username must be at least 3 characters.',
      'string.max': 'Username cannot exceed 30 characters.',
      'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens.',
    }),
  bio: Joi.string().trim().max(250).allow('').messages({
    'string.max': 'Bio cannot exceed 250 characters.',
  }),
  avatar: Joi.string().trim().max(500).allow('').messages({
    'string.max': 'Avatar URL cannot exceed 500 characters.',
  }),
}).unknown(true); // Allow unknown fields so we can safely strip them in controller/service

module.exports = {
  ratingSchema,
  commentSchema,
  profileUpdateSchema,
};
