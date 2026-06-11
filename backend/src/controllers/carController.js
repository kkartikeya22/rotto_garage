const Car = require('../models/Car');
const Booking = require('../models/Booking');

/**
 * POST /api/cars
 * Create a car for the authenticated user
 */
const createCar = async (req, res, next) => {
  try {
    const {
      make,
      model,
      year,
      registrationNumber,
      fuelType,
    } = req.body;

    if (
      !make ||
      !model ||
      !year ||
      !registrationNumber ||
      !fuelType
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All fields are required',
        },
      });
    }

    const existing = await Car.findOne({
      registrationNumber: registrationNumber.toUpperCase(),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CAR_EXISTS',
          message: 'Registration number already exists',
        },
      });
    }

    const car = await Car.create({
      userId: req.user.id,
      make,
      model,
      year,
      registrationNumber:
        registrationNumber.toUpperCase(),
      fuelType,
    });

    res.status(201).json({
      success: true,
      data: car,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cars
 * List cars belonging to authenticated user
 */
const getMyCars = async (req, res, next) => {
  try {
    const cars = await Car.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: cars,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cars/:id
 */
const getCarById = async (req, res, next) => {
  try {
    const car = await Car.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAR_NOT_FOUND',
          message: 'Car not found',
        },
      });
    }

    res.json({
      success: true,
      data: car,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/cars/:id
 */
const updateCar = async (req, res, next) => {
  try {
    const {
      make,
      model,
      year,
      fuelType,
    } = req.body;

    const car = await Car.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAR_NOT_FOUND',
          message: 'Car not found',
        },
      });
    }

    if (make) car.make = make;
    if (model) car.model = model;
    if (year) car.year = year;
    if (fuelType) car.fuelType = fuelType;

    await car.save();

    res.json({
      success: true,
      data: car,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cars/:id
 */
const deleteCar = async (req, res, next) => {
  try {
    const car = await Car.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CAR_NOT_FOUND',
          message: 'Car not found',
        },
      });
    }

    const activeBooking = await Booking.findOne({
      carId: car._id,
      status: {
        $in: [
          'pending',
          'confirmed',
          'in-progress',
        ],
      },
    });

    if (activeBooking) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ACTIVE_BOOKINGS_EXIST',
          message:
            'Cannot delete a car with active bookings',
        },
      });
    }

    await Car.findByIdAndDelete(car._id);

    res.json({
      success: true,
      message: 'Car deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCar,
  getMyCars,
  getCarById,
  updateCar,
  deleteCar,
};