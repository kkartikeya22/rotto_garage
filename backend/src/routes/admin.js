const express = require('express');
const router = express.Router();

const { authenticate, requireAdmin } = require('../middleware/auth');
const { getStats, getAllCars, deleteAnyCar } = require('../controllers/adminController');

router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/cars', getAllCars);
router.delete('/cars/:id', deleteAnyCar);

module.exports = router;
