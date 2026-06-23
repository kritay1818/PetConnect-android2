const express = require('express');

const {
  register,
  login,
  getCurrentUser
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  validateRegister,
  validateLogin,
  handleValidationErrors
} = require('../validators/authValidators');

const router = express.Router();

router.post('/register', validateRegister, handleValidationErrors, register);
router.post('/login', validateLogin, handleValidationErrors, login);
router.get('/me', protect, getCurrentUser);

module.exports = router;
