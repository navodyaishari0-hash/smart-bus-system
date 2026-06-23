const express = require('express');
const router = express.Router();
const { getBuses, addBus, deleteBus, updateBusStatus, updateBus } = require('../controllers/busController');
const { protect, admin, conductor } = require('../middleware/authMiddleware');

router.route('/').get(getBuses).post(protect, admin, addBus);
router.route('/:id').delete(protect, admin, deleteBus).patch(protect, admin, updateBus);
router.route('/:id/status').patch(protect, conductor, updateBusStatus); // allows both admins and conductors

module.exports = router;
