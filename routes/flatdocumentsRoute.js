const express = require('express');
const router = express.Router();

const flatdocumentController = require('../controllers/flatdocumentController');
const authenticateToken = require('../middleware/authenticateToken')


router.post('/createfolder', authenticateToken, flatdocumentController.createFolder);
router.get('/getdocumentsdata', authenticateToken, flatdocumentController.getDocuments)
router.post('/deletefolder', authenticateToken, flatdocumentController.deleteFolder);
router.post('/uploadfile', authenticateToken, flatdocumentController.uploadFile);
router.post('/deletefile', authenticateToken, flatdocumentController.deleteFile);

router.post('/flatssyncfilesystemwithdb', authenticateToken, flatdocumentController.flatsSyncFileSystemWithDB)


module.exports = router;