const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Generate signed VNPAY URL
router.post('/create-vnpay-url', paymentController.createVnpayUrl);

// VNPAY Return URL (browser redirect callback)
router.get('/vnpay-return', paymentController.handleVnpayReturn);

// VNPAY IPN webhook (server-to-server)
router.get('/vnpay-ipn', paymentController.handleVnpayIpn);

// VNPAY Sandbox simulator endpoint
router.post('/sandbox-checkout', paymentController.simulateSandboxPayment);

module.exports = router;
