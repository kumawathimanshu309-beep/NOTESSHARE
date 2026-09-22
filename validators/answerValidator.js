const Joi = require('joi');

const answerSchema = Joi.object({
  content: Joi.string().trim().min(5).max(3000).required().messages({
    'string.empty': 'Answer content cannot be empty.',
    'string.min': 'Answer content must be at least 5 characters long.',
    'string.max': 'Answer content cannot exceed 3000 characters.',
    'any.required': 'Answer content is required.',
  }),
}).unknown(true);

module.exports = {
  answerSchema,
};
