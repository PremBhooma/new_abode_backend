
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController'); // Adjust path to where GetCustomers is defined

const authenticateToken = require('../middleware/authenticateToken')
// Route for fetching all customers
router.get('/get-all-customers', authenticateToken, customerController.GetCustomers);
router.post('/add-customer', authenticateToken, customerController.AddCustomer);
router.post('/add-customer-flat', authenticateToken, customerController.AddCustomerFlat);
router.post('/update-customer-flat', authenticateToken, customerController.UpdateCustomerFlat);
router.post('/update-customer', authenticateToken, customerController.UpdateCustomer);
router.get('/get-single-customer-data', authenticateToken, customerController.getSingleCustomerData);
router.post('/update-customer-profile-picture', authenticateToken, customerController.uploadCustomerProfilePic);
router.post('/delete-customer', authenticateToken, customerController.DeleteCustomer);
router.post('/delete-all-customer', authenticateToken, customerController.DeleteAllCustomer);
router.post('/add-customer-note', authenticateToken, customerController.AddCustomernote);
router.get('/get-customer-notes', authenticateToken, customerController.GetCustomerNotes);
router.get('/search-customers-for-flat', authenticateToken, customerController.searchCustomerForFlats);
router.get('/get-customers-flats', authenticateToken, customerController.GetCustomerFlats);
router.get('/customeractivities', authenticateToken, customerController.CustomerActivities);
router.get('/getcustomerslist', authenticateToken, customerController.GetCustomersList);

router.get('/get-customers-for-excel', customerController.GetCustomersForExcel)
router.post('/upload-parsed-customers', customerController.uploadParsedCustomers)
router.post('/convert-customer-to-lead', authenticateToken, customerController.ConvertCustomerToLead);
module.exports = router;


