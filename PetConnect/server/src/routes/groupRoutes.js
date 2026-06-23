const express = require('express');

const {
  createGroup,
  getGroups,
  getMyGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  approveMember,
  rejectMember,
  removeMember,
  searchGroups
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');
const {
  validateCreateGroup,
  validateUpdateGroup,
  validateSearchGroups,
  handleValidationErrors
} = require('../validators/groupValidators');

const router = express.Router();

router.use(protect);

router.post('/', validateCreateGroup, handleValidationErrors, createGroup);
router.get('/', getGroups);
router.get('/my', getMyGroups);
router.get('/search', validateSearchGroups, handleValidationErrors, searchGroups);
router.get('/:id', getGroupById);
router.put('/:id', validateUpdateGroup, handleValidationErrors, updateGroup);
router.delete('/:id', deleteGroup);
router.post('/:id/join', joinGroup);
router.post('/:id/approve/:userId', approveMember);
router.post('/:id/reject/:userId', rejectMember);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
