const express = require('express');

const {
  sendMessage,
  getConversation,
  getMyConversations
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const {
  validateSendMessage,
  validateConversationParams,
  handleValidationErrors
} = require('../validators/messageValidators');

const router = express.Router();

router.use(protect);

router.post('/', validateSendMessage, handleValidationErrors, sendMessage);
router.get('/conversations', getMyConversations);
router.get(
  '/conversation/:userId',
  validateConversationParams,
  handleValidationErrors,
  getConversation
);

module.exports = router;
