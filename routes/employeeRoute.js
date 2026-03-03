const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authenticateToken = require('../middleware/authenticateToken')

router.get('/get-all-employees', authenticateToken, employeeController.GetAllEmployees);
router.post('/add-employee', authenticateToken, employeeController.AddEmployee);
router.post('/update-employee', authenticateToken, employeeController.UpdateEmployee);
router.get('/get-roles', authenticateToken, employeeController.getRoles);
router.get('/get-reporting-heads', authenticateToken, employeeController.getReportingHeads);
router.get('/get-single-employee-data', authenticateToken, employeeController.getSingleEmployeeData);
router.post('/delete-employee', authenticateToken, employeeController.DeleteEmployee);
router.post('/update-user-password', authenticateToken, employeeController.updateUserPassword);
router.post('/addnewrole', authenticateToken, employeeController.addNewRole);
router.get('/getallroledata', authenticateToken, employeeController.getAllRoleData);

router.post('/updaterole', authenticateToken, employeeController.updateRole);
router.post('/deleterole', authenticateToken, employeeController.deleteRole);
router.post('/rolesupdatepermissions', authenticateToken, employeeController.updatePermissions);
router.get('/getrolespermissions', authenticateToken, employeeController.getRolesPermissions);
router.post('/update-employee-profile-picture', authenticateToken, employeeController.uploadEmployeeProfilePic);


router.get('/get-all-employees-list', authenticateToken, employeeController.GetAllEmployeesList)

router.post('/allocate-projects', authenticateToken, employeeController.allocateProjects);
router.get('/allocated-projects/:employee_id', authenticateToken, employeeController.getAllocatedProjects);



module.exports = router;


