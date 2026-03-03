const express = require('express');
const router = express.Router();

const leadsController = require('../controllers/leadsController');
const authenticateToken = require('../middleware/authenticateToken')

router.post('/add-lead', authenticateToken, leadsController.AddLead);
router.get('/get-all-leads', authenticateToken, leadsController.GetAllLeads);
router.post('/edit-lead', authenticateToken, leadsController.EditLead);
router.post('/delete-lead', authenticateToken, leadsController.DeleteLead);
router.get('/get-single-lead', authenticateToken, leadsController.GetSingleLead);
router.get('/get-lead-activies', authenticateToken, leadsController.GetLeadActivities);
router.post('/update-lead-profile-picture', authenticateToken, leadsController.UploadLeadProfilePic);

router.post('/add-lead-note', authenticateToken, leadsController.AddleadNote);
router.get('/get-lead-notes', authenticateToken, leadsController.GetLeadNotes);
router.post('/assignleadtoemployee', authenticateToken, leadsController.assignLeadToEmployee)
router.post('/assignmultipleleadstoemployee', authenticateToken, leadsController.assignMultipleLeadsToEmployee)
router.post('/transferleadtoemployee', leadsController.transferLeadToEmployee)
router.get('/get-lead-stages-order-wise', authenticateToken, leadsController.GetLeadStagesByOrderWise)
router.post('/edit-lead-stage', authenticateToken, leadsController.EditLeadStage)

router.post('/upload-parsed-leads', leadsController.UploadParsedLeads)
router.get('/getallsubordinates', leadsController.getAllSubordinates)
router.post('/convert-lead-to-customer', leadsController.ConvertLeadToCustomer)

module.exports = router;