const { body, param, validationResult } = require('express-validator');

const validateSendMessage = [
  body('receiver')
    .notEmpty()
    .withMessage('Receiver is required')
    .isMongoId()
    .withMessage('receiver must be a valid ObjectId'),
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Message text is required')
];

const validateConversationParams = [
  param('userId')
    .isMongoId()
    .withMessage('userId must be a valid ObjectId')
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
  validateSendMessage,
  validateConversationParams,
  handleValidationErrors
};
