const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');

const {
  createCar,
  getMyCars,
  getCarById,
  updateCar,
  deleteCar,
} = require('../controllers/carController');

// All car routes require authentication
router.use(authenticate);

// Create car / List my cars
router
  .route('/')
  .post(createCar)
  .get(getMyCars);

// Get, update, delete a specific car
router
  .route('/:id')
  .get(getCarById)
  .put(updateCar)
  .delete(deleteCar);

module.exports = router;