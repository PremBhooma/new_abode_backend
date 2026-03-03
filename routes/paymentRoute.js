const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/paymentsController');
const authenticateToken = require('../middleware/authenticateToken')

router.post('/addpayment', authenticateToken, paymentController.addPayment);
router.post('/add-bulk-payment', authenticateToken, paymentController.addBulkPayment);
router.post('/updatepayment', authenticateToken, paymentController.updatePayment)
router.get('/getsinglepayment', authenticateToken, paymentController.getSinglePayment);
router.get('/getallpayments', authenticateToken, paymentController.getAllPayments);
router.get('/getallprintpayments', authenticateToken, paymentController.getAllPrintPayments);
router.post('/deletepayment', authenticateToken, paymentController.deletePayment)
router.post('/upload-bulk-payments', authenticateToken, paymentController.uploadPayments)
router.post('/upload-parsed-payments', authenticateToken, paymentController.uploadParsedPayments)
router.get('/get-all-parsed-payments', authenticateToken, paymentController.getAllParsedPayments);
router.post('/delete-parsed-payment-record', authenticateToken, paymentController.deleteParsedPaymentRecord);
router.get('/get-all-payments-by-customer', authenticateToken, paymentController.GetAllPaymentsByCustomer)
router.get('/getallprintpaymentsbycustomer', authenticateToken, paymentController.GetAllPrintPaymentsByCustomer)
router.get('/getcustomerpaymentsforexcel', authenticateToken, paymentController.getCustomerPaymentsforexcel);
router.get('/get-payments-for-excel', authenticateToken, paymentController.getPaymentsForExcel);
router.get('/get-payments-summary-by-flat', authenticateToken, paymentController.getPaymentsSummaryByFlat);

module.exports = router;