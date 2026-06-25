const express = require('express');
const router = express.Router();
const { getMySchedules } = require('../controllers/conductorController');
const { protect, conductor } = require('../middleware/authMiddleware');

router.get('/schedules', protect, conductor, getMySchedules);

module.exports = router;
