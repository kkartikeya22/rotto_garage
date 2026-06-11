const User = require('../models/User');
const Car = require('../models/Car');
const Booking = require('../models/Booking');

/**
 * GET /api/admin/stats
 * Returns platform-wide counts for the admin dashboard.
 */
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCars,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      inProgressBookings,
      completedBookings,
      cancelledBookings,
    ] = await Promise.all([
      User.countDocuments(),
      Car.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'in-progress' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'cancelled' }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalCars,
        totalBookings,
        bookingsByStatus: {
          pending: pendingBookings,
          confirmed: confirmedBookings,
          inProgress: inProgressBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/cars
 * Returns all cars across all users, with owner info populated.
 */
const getAllCars = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [cars, total] = await Promise.all([
      Car.find({})
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Car.countDocuments(),
    ]);

    res.json({
      success: true,
      data: cars,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/cars/:id
 * Admin can delete any car (bypasses ownership check).
 */
const deleteAnyCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        error: { code: 'CAR_NOT_FOUND', message: 'Car not found' },
      });
    }

    const activeBooking = await Booking.findOne({
      carId: car._id,
      status: { $in: ['pending', 'confirmed', 'in-progress'] },
    });

    if (activeBooking) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ACTIVE_BOOKINGS_EXIST',
          message: 'Cannot delete a car with active bookings',
        },
      });
    }

    await Car.findByIdAndDelete(car._id);

    res.json({ success: true, message: 'Car deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getAllCars, deleteAnyCar };
