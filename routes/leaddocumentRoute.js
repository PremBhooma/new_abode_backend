const express = require('express');
const router = express.Router();

const leaddocumentController = require('../controllers/leaddocumentController');
const authenticateToken = require('../middleware/authenticateToken')

router.post('/createfolder', authenticateToken, leaddocumentController.createFolder);
router.get('/getdocumentsdata', authenticateToken, leaddocumentController.getDocuments)
router.post('/deletefolder', authenticateToken, leaddocumentController.deleteFolder);
router.post('/uploadfile', authenticateToken, leaddocumentController.uploadFile);
router.post('/deletefile', authenticateToken, leaddocumentController.deleteFile);
router.post('/syncfilesystemwithdb', authenticateToken, leaddocumentController.syncFileSystemWithDB)

module.exports = router;