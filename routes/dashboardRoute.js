const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const authenticateToken = require('../middleware/authenticateToken')

router.get('/get-dashboard-data', authenticateToken, dashboardController.GetAllDashboardData)
router.get('/search', authenticateToken, dashboardController.GetSearchGlobal);
router.get('/get-payments-dashboard-data', authenticateToken, dashboardController.GetPaymentsDashboard);
router.get('/get-customers-dashboard-data', authenticateToken, dashboardController.GetCustomersDashboard);
router.get('/get-flats-dashboard-data', authenticateToken, dashboardController.GetFlatsDashboard)

module.exports = router;