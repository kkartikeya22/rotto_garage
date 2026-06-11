const express = require('express');
const router = express.Router();

const { authenticate, requireAdmin } = require('../middleware/auth');

const {
  createBooking,
  getMyBookings,
  updateBookingStatus,
  getAllBookings,
} = require('../controllers/bookingController');

// All booking routes require authentication
router.use(authenticate);

// User routes
router.post('/', createBooking);
router.get('/my', getMyBookings);

// Admin routes
router.put('/:id/status', requireAdmin, updateBookingStatus);
router.get('/', requireAdmin, getAllBookings);

module.exports = router;