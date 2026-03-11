const express = require('express');
const router = express.Router();

const generalController = require('../controllers/generalController');
const authenticateToken = require('../middleware/authenticateToken')

router.get('/getcountries', authenticateToken, generalController.getCountries);
router.get('/getcountriesnames', authenticateToken, generalController.getCountriesNames);
router.get('/get-data-backup', generalController.getDataBackup);
router.post('/restore-backup', generalController.restoreDataBackup);
router.get('/getblockslist', authenticateToken, generalController.getBlockslist);
router.get('/getallemployees', generalController.getAllEmployees)

// Banks
router.post('/add-bank', generalController.addBank);
router.post('/update-bank', generalController.updateBank);
router.get('/get-all-banks-list', generalController.getAllBanks);
router.post('/delete-bank', generalController.deleteBank);

router.get('/get-current-users-permissions', authenticateToken, generalController.getCurrentUserPermissions);

// Coupongifts
router.post('/add-coupon-gift', generalController.addCouponGift);
router.post('/update-coupon-gift', generalController.updateCouponGift);
router.get('/get-all-coupon-gifts-list', generalController.getAllCouponGifts);
router.post('/delete-coupon-gift', generalController.deleteCouponGift);

router.get('/search-sold-flats-with-advance', authenticateToken, generalController.searchSoldFlatsWithAdvance);
router.get('/get-logged-in-employee', authenticateToken, generalController.getLoggedInEmployee);
router.post('/send-redemption-otp', authenticateToken, generalController.sendRedemptionOTP);
router.post('/resend-redemption-otp', authenticateToken, generalController.resendRedemptionOTP);
router.post('/verify-redemption-otp', authenticateToken, generalController.verifyRedemptionOTP);
router.get('/get-reward-status', authenticateToken, generalController.getRewardStatus);
router.post('/update-reward-step', authenticateToken, generalController.updateRewardStep);
router.get('/get-reward-records', authenticateToken, generalController.getRewardRecords);
router.get('/get-reward-records-excel', authenticateToken, generalController.getRewardRecordsExcel);
router.post('/update-reward-received-status', authenticateToken, generalController.updateRewardReceivedStatus);

module.exports = router;