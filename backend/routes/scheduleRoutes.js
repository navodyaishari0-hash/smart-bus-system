const express = require('express');
const router = express.Router();
const { getSchedules, getScheduleById, addSchedule, toggleSeatStatus } = require('../controllers/scheduleController');
const { protect, admin, conductor } = require('../middleware/authMiddleware');

router.route('/').get(getSchedules).post(protect, admin, addSchedule);
router.route('/:id').get(getScheduleById);
router.route('/:id/seats/:seatId/toggle').patch(protect, conductor, toggleSeatStatus);

module.exports = router;
