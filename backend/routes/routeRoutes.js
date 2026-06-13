const express = require('express');
const router = express.Router();
const { getRoutes, addRoute, deleteRoute } = require('../controllers/routeController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getRoutes).post(protect, admin, addRoute);
router.route('/:id').delete(protect, admin, deleteRoute);

module.exports = router;
