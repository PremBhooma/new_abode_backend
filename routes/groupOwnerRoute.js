const express = require('express');
const router = express.Router();

const groupOwnerController = require('../controllers/groupOwnerController');
const authenticateToken = require('../middleware/authenticateToken')

router.get('/get-group-owner', authenticateToken, groupOwnerController.getGroupOwner);
router.post('/add-group-owner', authenticateToken, groupOwnerController.addGroupOwner);
router.get('/get-list-group-owners', authenticateToken, groupOwnerController.getListGroupOwners);
router.post('/update-group-owner', authenticateToken, groupOwnerController.updateGroupOwner);
router.post('/delete-group-owner', authenticateToken, groupOwnerController.deleteGroupOwner);
router.get('/get-group-owners-names', authenticateToken, groupOwnerController.getAllGroupOwnersNames);


module.exports = router;