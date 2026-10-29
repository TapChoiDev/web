const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Apply auth and admin check to all admin routes
router.use(authenticateToken, requireAdmin);

// Dashboard metrics
router.get('/metrics', adminController.getDashboardMetrics);

// Products CRUD
router.get('/products', adminController.getAdminProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Orders management
router.get('/orders', adminController.getAdminOrders);
router.put('/orders/:id/status', adminController.updateOrderStatus);

// Users management
router.get('/users', adminController.getAdminUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/toggle-lock', adminController.toggleUserLock);

// Reports & CSV export
router.get('/reports', adminController.getReports);
router.get('/reports/csv', adminController.exportCsv);

module.exports = router;
