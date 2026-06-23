const { body, query, validationResult } = require('express-validator');

const petTypes = ['dog', 'cat', 'bird', 'rabbit', 'other'];

const validateCreatePet = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Pet name is required'),
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Pet type is required')
    .isIn(petTypes)
    .withMessage('Pet type must be dog, cat, bird, rabbit, or other'),
  body('breed')
    .optional()
    .trim(),
  body('age')
    .optional()
    .isNumeric()
    .withMessage('Age must be a number')
    .isFloat({ min: 0 })
    .withMessage('Age cannot be negative'),
  body('city')
    .optional()
    .trim(),
  body('bio')
    .optional()
    .trim(),
  body('imageUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('imageUrl must be a valid URL'),
  body('imageUri')
    .optional({ checkFalsy: true })
    .trim(),
  body('photoUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('photoUrl must be a valid URL')
];

const validateUpdatePet = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Pet name cannot be empty'),
  body('type')
    .optional()
    .trim()
    .isIn(petTypes)
    .withMessage('Pet type must be dog, cat, bird, rabbit, or other'),
  body('breed')
    .optional()
    .trim(),
  body('age')
    .optional()
    .isNumeric()
    .withMessage('Age must be a number')
    .isFloat({ min: 0 })
    .withMessage('Age cannot be negative'),
  body('city')
    .optional()
    .trim(),
  body('bio')
    .optional()
    .trim(),
  body('imageUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('imageUrl must be a valid URL'),
  body('imageUri')
    .optional({ checkFalsy: true })
    .trim(),
  body('photoUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('photoUrl must be a valid URL')
];

const validateSearchPets = [
  query('type')
    .optional()
    .trim()
    .isIn(petTypes)
    .withMessage('Pet type must be dog, cat, bird, rabbit, or other'),
  query('breed')
    .optional()
    .trim(),
  query('city')
    .optional()
    .trim(),
  query('minAge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minAge must be a non-negative number'),
  query('maxAge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxAge must be a non-negative number'),
  query('maxAge').custom((maxAge, { req }) => {
    if (
      req.query.minAge !== undefined &&
      maxAge !== undefined &&
      Number(maxAge) < Number(req.query.minAge)
    ) {
      throw new Error('maxAge must be greater than or equal to minAge');
    }

    return true;
  })
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
  validateCreatePet,
  validateUpdatePet,
  validateSearchPets,
  handleValidationErrors
};
