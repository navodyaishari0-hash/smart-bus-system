const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getConductors } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/conductors', getConductors);

module.exports = router;
