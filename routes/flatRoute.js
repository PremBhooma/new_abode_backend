const express = require("express");
const router = express.Router();

const flatController = require('../controllers/flatController')
const authenticateToken = require('../middleware/authenticateToken')

router.post('/flats/add-flat', authenticateToken, flatController.AddFlat);
router.get('/get-all-flats', authenticateToken, flatController.GetAllFlats);
router.get('/get-flat/:id', authenticateToken, flatController.GetFlatById);
router.post('/update-flat', authenticateToken, flatController.UpdateFlat);
router.post('/delete-flat', authenticateToken, flatController.DeleteFlat);
router.post('/add-flat-note', authenticateToken, flatController.AddFlatnote);
router.get('/get-flat-notes', authenticateToken, flatController.GetFlatNotes);

router.post('/upload-flat-picture', authenticateToken, flatController.uploadFlatPicture);
router.get('/flat/activities', authenticateToken, flatController.FlatActivities);
router.get('/search-flats', authenticateToken, flatController.searchFlatsForCustomer);
router.get('/search-sold-flats', authenticateToken, flatController.SearchSoldFlatsForCustomer);
router.get('/get-payments-of-flats', authenticateToken, flatController.GetPaymentsByFlatId);
router.get('/get-print-payments-of-flats', authenticateToken, flatController.GetPrintPaymentsByFlatId);
router.get('/get-flat-lists', authenticateToken, flatController.getFlatLists);


router.get('/search-sold-flats-for-customer', authenticateToken, flatController.SearchSoldFlatsForCustomeruuid);
// router.get('/get-all-flats-for-download', flatController.GetAllFlatsForDownload);
router.get("/get-flat-payments-for-excel", authenticateToken, flatController.GetFlatPaymentsForExcel);

router.get("/get-flats-for-excel", authenticateToken, flatController.GetFlatsForExcel)

router.get('/getcustomerflats', authenticateToken, flatController.getCustomerFlats)
router.post('/upload-parsed-flats', flatController.uploadParsedFlats);
router.get('/updateactivities', authenticateToken, flatController.FlatUpdateActivities);

router.get('/get-flat-stages', authenticateToken, flatController.GetFlatStages);
router.get('/download-sale-deed', authenticateToken, flatController.downloadSalesDeed);
router.post('/uploadtemplate', authenticateToken, flatController.uploadSaledeedTemplate);
router.post('/uploadagreementtemplate', authenticateToken, flatController.uploadAgreementTemplate)
router.get('/downloadagreementtemplate', authenticateToken, flatController.downloadAgreementTemplate)


router.get('/get-templates', authenticateToken, flatController.GetTemplates);
router.get('/get-project-charges', authenticateToken, flatController.getProjectCharges);


router.get(
  "/get-flat-payment-details",
  authenticateToken,
  flatController.getFlatPaymentDetails
);

module.exports = router;