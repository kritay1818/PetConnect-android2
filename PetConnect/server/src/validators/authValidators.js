const { body, validationResult } = require('express-validator');

const validateRegister = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['user', 'groupAdmin'])
    .withMessage('Role must be user or groupAdmin')
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  res.status(400);
  return next(new Error(errors.array().map((error) => error.msg).join(', ')));
};

module.exports = {
  validateRegister,
  validateLogin,
  handleValidationErrors
};
