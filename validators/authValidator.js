const Joi = require('joi');

const signupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.empty': 'Name cannot be empty.',
    'string.min': 'Name must be at least 2 characters long.',
    'string.max': 'Name cannot exceed 50 characters.',
  }),
  username: Joi.string()
    .trim()
    .lowercase()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.empty': 'Username cannot be empty.',
      'string.min': 'Username must be at least 3 characters.',
      'string.max': 'Username cannot exceed 30 characters.',
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores.',
    }),
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.empty': 'Email address cannot be empty.',
    'string.email': 'Please enter a valid email address.',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.empty': 'Password cannot be empty.',
    'string.min': 'Password must be at least 8 characters long.',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match.',
    'string.empty': 'Please confirm your password.',
  }),
}).unknown(true); // Allow extra body fields so postSignup can sanitize them

const loginSchema = Joi.object({
  identifier: Joi.string().trim().required().messages({
    'string.empty': 'Email or Username is required.',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required.',
  }),
}).unknown(true);

exports.validateSignup = (req, res, next) => {
  const { error } = signupSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    req.flash('error', errorMessages.join(' '));
    return res.status(400).render('auth/signup', {
      title: 'Sign Up — StudyShare',
      path: '/auth/signup',
      formData: {
        name: req.body.name || '',
        username: req.body.username || '',
        email: req.body.email || '',
      },
    });
  }
  next();
};

exports.validateLogin = (req, res, next) => {
  if (req.body && !req.body.identifier && (req.body.email || req.body.username)) {
    req.body.identifier = String(req.body.email || req.body.username).trim();
  }

  const { error } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    req.flash('error', errorMessages.join(' '));
    return res.status(400).render('auth/login', {
      title: 'Log In — StudyShare',
      path: '/auth/login',
      formData: {
        identifier: req.body.identifier || req.body.email || req.body.username || '',
      },
      isGoogleConfigured: Boolean((process.env.GOOGLE_CLIENT_ID || '').trim() && (process.env.GOOGLE_CLIENT_SECRET || '').trim()),
    });
  }
  next();
};
