const express = require('express');
const router = express.Router();
const {
    getBookingTrends,
    getSeatPreference,
    generateDemo
} = require('../controllers/analyticsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/booking-trends', protect, admin, getBookingTrends);
router.get('/seat-preferences', protect, admin, getSeatPreference);
router.post('/generate-demo', protect, admin, generateDemo);

module.exports = router;
