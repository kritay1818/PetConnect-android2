const express = require('express');

const {
  acceptFriendRequest,
  getFriends,
  rejectFriendRequest,
  searchUsers,
  sendFriendRequest
} = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getFriends);
router.get('/users', searchUsers);
router.post('/request/:userId', sendFriendRequest);
router.post('/accept/:userId', acceptFriendRequest);
router.post('/reject/:userId', rejectFriendRequest);

module.exports = router;
