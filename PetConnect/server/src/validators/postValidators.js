const { body, query, validationResult } = require('express-validator');

const validateCreatePost = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Post content is required'),
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
    .withMessage('photoUrl must be a valid URL'),
  body('videoUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('videoUrl must be a valid URL'),
  body('videoUri')
    .optional({ checkFalsy: true })
    .trim(),
  body('stickerData')
    .optional(),
  body('group')
    .optional()
    .isMongoId()
    .withMessage('group must be a valid ObjectId'),
  body('pet')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('pet must be a valid ObjectId')
];

const validateUpdatePost = [
  body('content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Post content cannot be empty'),
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
    .withMessage('photoUrl must be a valid URL'),
  body('videoUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('videoUrl must be a valid URL'),
  body('videoUri')
    .optional({ checkFalsy: true })
    .trim(),
  body('stickerData')
    .optional(),
  body('group')
    .optional()
    .isMongoId()
    .withMessage('group must be a valid ObjectId'),
  body('pet')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('pet must be a valid ObjectId')
];

const validateSearchPosts = [
  query('keyword')
    .optional()
    .trim(),
  query('group')
    .optional()
    .isMongoId()
    .withMessage('group must be a valid ObjectId'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid date'),
  query('endDate').custom((endDate, { req }) => {
    if (
      req.query.startDate &&
      endDate &&
      new Date(endDate) < new Date(req.query.startDate)
    ) {
      throw new Error('endDate must be greater than or equal to startDate');
    }

    return true;
  })
];

const validateComment = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Comment text is required')
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
  validateCreatePost,
  validateUpdatePost,
  validateSearchPosts,
  validateComment,
  handleValidationErrors
};
