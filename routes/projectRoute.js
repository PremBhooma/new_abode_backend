const express = require('express');
const router = express.Router();

const projectController = require('../controllers/projectController');
const authenticateToken = require('../middleware/authenticateToken')

// Project
// Project
router.get('/get-project', authenticateToken, projectController.getProject);
router.get('/get-all-projects', authenticateToken, projectController.getAllProjects);
router.post('/add-project', authenticateToken, projectController.addProject);
router.post('/update-project', authenticateToken, projectController.updateProject);
router.post('/delete-project', authenticateToken, projectController.deleteProject);
router.get('/get-my-allocated-projects', authenticateToken, projectController.getMyAllocatedProjects);


// Block
router.get('/get-block', authenticateToken, projectController.getBlock);
router.post('/create-block', authenticateToken, projectController.addBlock);
router.post('/update-block', authenticateToken, projectController.updateBlock);
router.post('/delete-block', authenticateToken, projectController.deleteBlock);
router.get('/get-blocks-label', authenticateToken, projectController.getBlocksLabel)
router.get('/get-blocks-names', authenticateToken, projectController.getAllBlocksNames)

module.exports = router;