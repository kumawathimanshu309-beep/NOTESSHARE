const Joi = require('joi');

const doubtSchema = Joi.object({
  title: Joi.string().trim().min(5).max(150).required().messages({
    'string.empty': 'Title cannot be empty.',
    'string.min': 'Title must be at least 5 characters.',
    'string.max': 'Title cannot exceed 150 characters.',
    'any.required': 'Title is required.',
  }),
  description: Joi.string().trim().min(10).max(2000).required().messages({
    'string.empty': 'Description cannot be empty.',
    'string.min': 'Description must be at least 10 characters long.',
    'string.max': 'Description cannot exceed 2000 characters.',
    'any.required': 'Description is required.',
  }),
  subject: Joi.string().trim().max(50).default('General').allow(''),
  category: Joi.string().trim().max(50).default('General').allow(''),
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim()), Joi.string().trim().allow(''))
    .default([]),
}).unknown(true);

module.exports = {
  doubtSchema,
};
