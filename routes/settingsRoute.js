const express = require('express');
const router = express.Router();

const settingsController = require('../controllers/settingsController');
const authenticateToken = require('../middleware/authenticateToken')

// Company & Country & States & Cities & Column Store
router.get('/get-company-info', authenticateToken, settingsController.getCompanyInfo);
router.post('/update-company-info', authenticateToken, settingsController.updateCompanyInfo);
router.get('/get-states', authenticateToken, settingsController.getStates);
router.get('/get-cities', authenticateToken, settingsController.getCities);
router.post('/column-store', authenticateToken, settingsController.columnStore);
router.get('/get-column-store', authenticateToken, settingsController.getColumnStore);

// Backup
router.get('/get-backup-records', authenticateToken, settingsController.getBackupRecords);
router.post('/restore-backup', authenticateToken, settingsController.restoreDataBackup);
router.post('/update-backup-schedule', authenticateToken, settingsController.updateBackupSchedule);
router.get('/get-backup-schedule', authenticateToken, settingsController.getBackupSchedule);

// Amenities
router.post('/add-amenities', authenticateToken, settingsController.addAmenities);
router.post('/update-amenities', authenticateToken, settingsController.updateAmenities);
router.get('/get-all-amenities', authenticateToken, settingsController.getAllAmenities);
router.get('/get-list-amenities', authenticateToken, settingsController.getListAmenities);
router.post('/delete-amenity', authenticateToken, settingsController.deleteAmenities);

// Global Upload
router.post('/global-upload', authenticateToken, settingsController.uploadParsedGlobal);

router.post('/add-lead-stage', authenticateToken, settingsController.AddLeadStage);
router.get('/get-lead-stages', authenticateToken, settingsController.GetLeadStages);
router.post('/update-lead-stage/:id', authenticateToken, settingsController.UpdateLeadStage);
router.post('/delete-lead-stage/:id', authenticateToken, settingsController.DeleteLeadStage);





module.exports = router;