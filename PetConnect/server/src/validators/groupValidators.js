const { body, query, validationResult } = require('express-validator');

const groupCategories = ['dogs', 'cats', 'adoption', 'training', 'health', 'general'];

const validateCreateGroup = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Group name is required'),
  body('description')
    .optional()
    .trim(),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Group category is required')
    .isIn(groupCategories)
    .withMessage('Group category must be dogs, cats, adoption, training, health, or general'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean')
    .toBoolean()
];

const validateUpdateGroup = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Group name cannot be empty'),
  body('description')
    .optional()
    .trim(),
  body('category')
    .optional()
    .trim()
    .isIn(groupCategories)
    .withMessage('Group category must be dogs, cats, adoption, training, health, or general'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean')
    .toBoolean()
];

const validateSearchGroups = [
  query('name')
    .optional()
    .trim(),
  query('category')
    .optional()
    .trim()
    .isIn(groupCategories)
    .withMessage('Group category must be dogs, cats, adoption, training, health, or general'),
  query('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be true or false')
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
  validateCreateGroup,
  validateUpdateGroup,
  validateSearchGroups,
  handleValidationErrors
};
