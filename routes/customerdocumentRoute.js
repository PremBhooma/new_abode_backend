const express = require('express');
const router = express.Router();

const customerdocumentController = require('../controllers/customerdocumentController');
const authenticateToken = require('../middleware/authenticateToken')

router.post('/createfolder', authenticateToken, customerdocumentController.createFolder);
router.get('/getdocumentsdata', authenticateToken, customerdocumentController.getDocuments)
router.post('/deletefolder', authenticateToken, customerdocumentController.deleteFolder);
router.post('/uploadfile', authenticateToken, customerdocumentController.uploadFile);
router.post('/deletefile', authenticateToken, customerdocumentController.deleteFile);
router.post('/syncfilesystemwithdb', authenticateToken, customerdocumentController.syncFileSystemWithDB)

module.exports = router;