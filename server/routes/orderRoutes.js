const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { optionalAuth } = require('../middlewares/auth');
const { validateOrder } = require('../middlewares/validate');

// Order creation supports logged in user or guest with guestLookupToken
router.post('/', optionalAuth, validateOrder, orderController.createOrder);

// Order tracking / listing
router.get('/', optionalAuth, orderController.getUserOrders);
router.get('/:id', optionalAuth, orderController.getOrderById);

// Order cancellation
router.post('/:id/cancel', optionalAuth, orderController.cancelOrder);

module.exports = router;
