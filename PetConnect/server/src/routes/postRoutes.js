const express = require('express');

const {
  createPost,
  getPosts,
  getMyPosts,
  getFeedPosts,
  searchPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  commentOnPost
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const {
  validateCreatePost,
  validateUpdatePost,
  validateSearchPosts,
  validateComment,
  handleValidationErrors
} = require('../validators/postValidators');

const router = express.Router();

router.use(protect);

router.post('/', validateCreatePost, handleValidationErrors, createPost);
router.get('/', getPosts);
router.get('/my', getMyPosts);
router.get('/feed', getFeedPosts);
router.get('/search', validateSearchPosts, handleValidationErrors, searchPosts);
router.get('/:id', getPostById);
router.put('/:id', validateUpdatePost, handleValidationErrors, updatePost);
router.delete('/:id', deletePost);
router.post('/:id/like', likePost);
router.post('/:id/comment', validateComment, handleValidationErrors, commentOnPost);

module.exports = router;
