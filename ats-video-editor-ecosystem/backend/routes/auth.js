const express = require('express');
const { register, login, googleLogin, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.get('/me', protect, getMe);

module.exports = router;
