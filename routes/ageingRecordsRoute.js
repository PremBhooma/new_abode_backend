const express = require("express");
const router = express.Router();

const ageingRecordsController = require('../controllers/ageingRecordsController');
const authenticateToken = require('../middleware/authenticateToken');

// Get all ageing records with pagination and search
router.get('/get-ageing-records', authenticateToken, ageingRecordsController.GetAgeingRecords);

// Get ageing records for dashboard
router.get('/get-dashboard-ageing-records', authenticateToken, ageingRecordsController.GetDashboardAgeingRecords);

// Get Partial Cancelled Ageing Records
router.get('/get-partial-cancelled-ageing-records', authenticateToken, ageingRecordsController.GetPartialCancelledAgeingRecords);

// Get single ageing record by ID
router.get('/get-single-ageing-record', authenticateToken, ageingRecordsController.GetSingleAgeingRecord);

// Update loan status (for toggling loan status and updating loan details)
router.post('/update-loan-status', authenticateToken, ageingRecordsController.UpdateLoanStatus);

// Update ageing record (for full record updates)
// router.post('/update-ageing-record', authenticateToken, ageingRecordsController.UpdateAgeingRecord);

// Delete single ageing record
router.post('/delete-ageing-record', authenticateToken, ageingRecordsController.DeleteAgeingRecord);

// Delete multiple ageing records
// router.post('/delete-multiple-ageing-records', authenticateToken, ageingRecordsController.DeleteMultipleAgeingRecords);

// Export Ageing Records to Excel
router.get('/get-ageing-records-excel', authenticateToken, ageingRecordsController.GetAgeingRecordsForExcel);

// Get Cancellation Details (Check for payments)
router.get('/get-cancellation-details', authenticateToken, ageingRecordsController.GetCancellationDetails);

// Process Ageing Cancellation
router.post('/process-ageing-cancellation', authenticateToken, ageingRecordsController.ProcessAgeingCancellation);

// Get Refund Records
router.get('/get-refund-records', authenticateToken, ageingRecordsController.GetRefundRecords);

// Get Refund Records Excel
router.get('/get-refund-records-excel', authenticateToken, ageingRecordsController.GetRefundRecordsForExcel);

module.exports = router;