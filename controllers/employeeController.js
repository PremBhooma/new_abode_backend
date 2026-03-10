const jwt = require("jsonwebtoken"); // Import the jsonwebtoken library
// const { PrismaClient } = require("../generated/prisma/client");
const prisma = require("../utils/client");
const bcrypt = require("bcrypt");
const multiparty = require("multiparty");
const fs = require("fs");
const path = require("path");
const logger = require("../helper/logger");

const GetAllEmployees = async (req, res) => {
  const { page = 1, limit = 10, searchQuery } = req.query;


  try {
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);

    let offset = 0;
    if (parsedPage > 1) {
      offset = parsedLimit * (parsedPage - 1);
    }

    const searchcondition = searchQuery
      ? {
        OR: [
          { name: { contains: searchQuery } },
          { phone_number: { contains: searchQuery } },
          { email: { contains: searchQuery } },
        ],
      }
      : {};

    const employees = await prisma.employees.findMany({
      where: searchcondition,
      take: parseInt(limit),
      skip: offset,
      select: {
        id: true,
        name: true,
        email: true,
        phone_code: true,
        phone_number: true,
        role_id: true,
        gender: true,
        employee_status: true,
        reporting_head_id: true,
        created_at: true,
        roledetails: {
          select: {
            name: true,
          },
        },
        reporting_head_details: {
          select: {
            name: true,
          },
        },
      },
    });

    const totalEmployees = await prisma.employees.count({
      where: searchcondition,
    });

    const employedetails = employees.map((employee) => {
      let role_name = null;
      let role_id = null;
      if (employee?.role_id !== null) {
        role_name = employee?.roledetails?.name;
        role_id = employee?.role_id?.toString();
      }

      let reporting_head_id = null;
      if (employee?.reporting_head_id !== null) {
        reporting_head_id = employee?.reporting_head_id?.toString();
      }

      return {
        id: employee?.id,
        name: employee?.name,
        email: employee?.email,
        phone_code: employee?.phone_code,
        phone_number: employee?.phone_number,
        gender: employee?.gender,
        role_name: employee?.roledetails?.name,
        reporting_head_name: employee?.reporting_head_details?.name,
        employee_status: employee?.employee_status,
      };
    });

    return res.status(200).json({
      status: "success",
      message: "Employees fetched successfully",
      totalEmployees: totalEmployees,
      employees: employedetails,
      totalpages: Math.ceil(totalEmployees / limit),
    });
  } catch (error) {
    logger.error(`Get All Employees Error: ${error.message}, File: employeeController-GetAllEmployees`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const AddEmployee = async (req, res) => {
  const { name, email, phone_number, phone_code, gender, role_id, reporting_head, password } = req.body;

  try {
    const isEmailExist = await prisma.employees.findFirst({
      where: {
        email: email,
      },
    });

    if (isEmailExist) {
      return res.status(200).json({
        status: "error",
        message: "Email already exist",
      });
    }
    const isPhoneExist = await prisma.employees.findFirst({
      where: {
        phone_number: phone_number,
        phone_code: phone_code,
      },
    });

    if (isPhoneExist) {
      return res.status(200).json({
        status: "error",
        message: "Phone number already exist",
      });
    }

    // REMOVED: // REMOVED: // REMOVED: const uuid = "CRMEMP" + Math.floor(100000000 + Math.random() * 900000000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.employees.create({
      data: {
        email: email,
        name: name,
        phone_code: phone_code,
        gender: gender,
        phone_number: phone_number,
        reporting_head_id: reporting_head || null,
        role_id: role_id,
        password: hashedPassword,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Employee added successfully",
    });
  } catch (error) {
    logger.error(`Add Employee Error: ${error.message}, File: employeeController-AddEmployee`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const getRoles = async (req, res) => {
  try {
    const roles = await prisma.roles.findMany({
      where: {
        NOT: {
          name: "Super Admin",
        },
        status: "Active",
      },
    });

    let data = [];
    if (roles !== null) {
      roles.map((role) => {
        data.push({
          value: role.id,
          label: role.name,
        });
      });
    }

    return res.status(200).json({
      status: "success",
      roledata: data,
    });
  } catch (error) {
    logger.error(`Get Roles Error: ${error.message}, File: employeeController-getRoles`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const getReportingHeads = async (req, res) => {
  try {
    const reporting_head = await prisma.employees.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    if (reporting_head === null) {
      return res.status(200).json({
        status: "error",
        message: "No reporting heads found",
      });
    }
    const reporting_head_details = reporting_head.map((user) => {
      return {
        value: user.id,
        label: user.name,
      };
    });

    return res.status(200).json({
      status: "success",
      message: "Reporting heads found",
      reporting_heads: reporting_head_details,
    });
  } catch (error) {
    logger.error(`Get Reporting Heads Error: ${error.message}, File: employeeController-getReportingHeads`);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while retrieving reporting heads",
      error: error.message,
    });
  }
};

const getSingleEmployeeData = async (req, res) => {
  const { single_user_id } = req.query;

  try {
    const employee = await prisma.employees.findFirst({
      where: {
        id: single_user_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone_code: true,
        phone_number: true,
        gender: true,
        profile_pic_path: true,
        profile_pic_url: true,
        role_id: true,
        reporting_head_id: true,
        roledetails: {
          select: {
            name: true,
          },
        },
        reporting_head_details: {
          select: {
            name: true,
          },
        },
        employee_status: true,
      },
    });

    if (employee === null) {
      return res.status(200).json({
        status: "error",
        message: "Employee not found",
      });
    }
    let reporting_head_id = null;
    let reporting_head_details = null;
    if (employee.reporting_head_id !== null) {
      reporting_head_id = employee.reporting_head_id.toString();
      reporting_head_details = employee.reporting_head_details.name;
    }
    let role_id = null;
    let role_name = null;
    if (employee.role_id !== null) {
      role_id = employee.role_id;
      role_name = employee.roledetails.name;
    }

    const employeeData = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone_code: employee.phone_code,
      phone: employee.phone_number,
      gender: employee.gender,
      profile_pic_url: employee.profile_pic_url,
      profile_pic_path: employee.profile_pic_path,
      role_id: role_id !== undefined ? role_id : null,
      role_name: role_name || null,
      reporting_head_id: reporting_head_id !== undefined ? reporting_head_id : null,
      reporting_head_name: reporting_head_details || null,
      status: employee.employee_status,
    };

    return res.status(200).json({
      status: "success",
      message: "Employee found",
      employee_data: employeeData,
    });
  } catch (error) {
    logger.error(`Get Single Employee Data Error: ${error.message}, File: employeeController-getSingleEmployeeData`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const UpdateEmployee = async (req, res) => {
  try {
    const { singleuser_id, name, email, phone_code, phone_number, gender, role_id, reporting_head_id, joinedAt, status } = req.body;

    const employeeId = singleuser_id;

    const employee = await prisma.employees.findFirst({
      where: {
        id: employeeId,
      },
    });

    if (!employee) {
      return res.status(200).json({
        status: "error",
        message: "Employee not found",
      });
    }

    // Proceed with update
    const update_employee = await prisma.employees.update({
      where: { id: employeeId },
      data: {
        name,
        email,
        phone_code,
        phone_number: phone_number,
        gender,
        role_id: role_id || null,
        reporting_head_id: reporting_head_id || null,
        joinedAt,
        employee_status: status,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Employee updated successfully",
    });
  } catch (error) {
    logger.error(`Update Employee Error: ${error.message}, File: employeeController-UpdateEmployee`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const DeleteEmployee = async (req, res) => {
  const { singleuser_id } = req.body;
  try {
    await prisma.employees.delete({
      where: {
        id: singleuser_id,
      },
    });
    return res.status(200).json({
      status: "success",
      message: "Employee deleted successfully",
    });
  } catch (error) {
    logger.error(`Delete Employee Error: ${error.message}, File: employeeController-DeleteEmployee`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const updateUserPassword = async (req, res) => {
  const { singleuser_id, singleuser_password } = req.body;

  try {
    const user = await prisma.employees.findUnique({
      where: {
        id: singleuser_id,
      },
    });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const hashedPassword = await bcrypt.hash(singleuser_password, 10);

    const updatedPassword = await prisma.employees.update({
      where: {
        id: singleuser_id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    logger.error(`Update User Password Error: ${error.message}, File: employeeController-updateUserPassword`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const addNewRole = async (req, res) => {
  const { role_name } = req.body;
  try {
    const isRoleExist = await prisma.roles.findFirst({
      where: {
        name: role_name,
      },
    });
    if (isRoleExist) {
      return res.status(200).json({
        status: "error",
        message: "Role already exist",
      });
    }
    await prisma.roles.create({
      data: {
        name: role_name,
      },
    });
    return res.status(200).json({
      status: "success",
      message: "Role added successfully",
    });
  } catch (error) {
    logger.error(`Add New Role Error: ${error.message}, File: employeeController-addNewRole`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const getAllRoleData = async (req, res) => {
  const { page, limit, user_id } = req.query;
  try {
    let offset = 0;
    if (page > 1) {
      offset = (page - 1) * limit;
    }

    const employee = await prisma.employees.findFirst({
      where: {
        id: user_id,
      },
      select: {
        role_id: true,
      },
    });

    const role_id = employee?.role_id;

    const roleName = await prisma.roles.findFirst({
      where: {
        id: role_id,
      },
      select: {
        name: true,
      },
    });

    const roleFilter =
      roleName?.name === "Super Admin"
        ? {}
        : {
          name: {
            not: "Super Admin",
          },
        };

    const roles = await prisma.roles.findMany({
      where: roleFilter,
      skip: offset,
      take: parseInt(limit),
    });

    const totalrolescount = await prisma.roles.count({
      where: roleFilter,
    });

    let data = [];
    if (roles.length === 0) {
      data = [];
    } else {
      roles.forEach((role) => {
        data.push({
          role_id: role.id,
          role_name: role.name,
          status: role.status,
        });
      });
    }

    return res.status(200).json({
      status: "success",
      roledata: data,
      totalrolescount: totalrolescount,
      totalpages: Math.ceil(totalrolescount / limit),
      currentpage: parseInt(page),
    });
  } catch (error) {
    logger.error(`Get All Role Data Error: ${error.message}, File: employeeController-getAllRoleData`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const updateRole = async (req, res) => {
  const { role_name, role_id } = req.body;
  try {
    const isRoleExist = await prisma.roles.findFirst({
      where: {
        name: role_name,
        NOT: {
          id: role_id,
        },
      },
    });
    if (isRoleExist) {
      return res.status(200).json({
        status: "error",
        message: "Role already exist",
      });
    }
    await prisma.roles.update({
      where: {
        id: role_id,
      },
      data: {
        name: role_name,
      },
    });
    return res.status(200).json({
      status: "success",
      message: "Role updated successfully",
    });
  } catch (error) {
    logger.error(`Update Role Error: ${error.message}, File: employeeController-updateRole`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const deleteRole = async (req, res) => {
  const { role_id } = req.body;
  try {
    await prisma.roles.delete({
      where: {
        id: role_id,
      },
    });
    return res.status(200).json({
      status: "success",
      message: "Role deleted successfully",
    });
  } catch (error) {
    logger.error(`Delete Role Error: ${error.message}, File: employeeController-deleteRole`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const updatePermissions = async (req, res) => {
  const { mainPages, employeePage, customersPage, leadsPage, flatsPage, paymentsPage, settingsPage, groupOwnerDefaultPage, ageingPage, assigningSetting, refundPage, rewardRecordsPage, projectAllocation, roleId } = req.body;

  try {
    const combinedData = {
      main_page: mainPages,
      employee_page: employeePage,
      customers_page: customersPage,
      leads_page: leadsPage,
      flats_page: flatsPage,
      payments_page: paymentsPage,
      settings_page: settingsPage,
      group_owner_default_page: groupOwnerDefaultPage,
      ageing_page: ageingPage,
      assigning_settings: assigningSetting,
      refund_page: refundPage,
      reward_records_page: rewardRecordsPage,
      project_allocation: projectAllocation,
    };

    const isroleexists = await prisma.rolepermissions.findFirst({
      where: {
        role_id: roleId,
      },
    });

    if (isroleexists) {
      await prisma.rolepermissions.update({
        where: {
          id: isroleexists.id,
        },
        data: {
          permissions: JSON.stringify(combinedData),
        },
      });
    } else {
      await prisma.rolepermissions.create({
        data: {
          role_id: roleId,
          permissions: JSON.stringify(combinedData),
        },
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Permissions updated successfully",
    });
  } catch (error) {
    logger.error(`Update Permissions Error: ${error.message}, File: employeeController-updatePermissions`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const getRolesPermissions = async (req, res) => {
  const { roleId } = req.query;

  try {
    const rolePermissions = await prisma.rolepermissions.findFirst({
      where: {
        role_id: roleId,
      },
    });

    let permissionsData = {};
    if (rolePermissions) {
      permissionsData = JSON.parse(rolePermissions.permissions);
    }

    return res.status(200).json({
      status: "success",
      permissionsData: permissionsData,
    });
  } catch (error) {
    logger.error(`Get Roles Permissions Error: ${error.message}, File: employeeController-getRolesPermissions`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const uploadEmployeeProfilePic = async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (error, fields, files) => {
    if (error) {
      logger.error(`Update Employee Profile Pic Error: ${error.message}, File: employeeController-uploadEmployeeProfilePic`);
      return res.status(500).json({ status: "error", message: "Internal server error" });
    }

    const employee_id = fields.employee_id ? fields.employee_id[0] : null;
    const profilePicture = files.file ? files.file[0] : null;

    if (!employee_id || !profilePicture) {
      return res.status(400).json({
        status: "error",
        message: "Missing employee ID or file",
      });
    }

    try {
      const employee = await prisma.employees.findFirst({
        where: { id: employee_id },
        select: { id: true, profile_pic_path: true },
      });

      if (!employee) {
        return res.status(404).json({
          status: "error",
          message: "Employee not found",
        });
      }

      const tempFilePath = profilePicture.path || profilePicture.filepath;
      if (!tempFilePath) {
        return res.status(400).json({ status: "error", message: "File path is missing" });
      }

      const uploadDir = path.join(__dirname, "../uploads/employees", `${employee.id}`);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      if (employee.profile_pic_path && fs.existsSync(employee.profile_pic_path)) {
        fs.unlinkSync(employee.profile_pic_path);
      }

      const savedFilePath = path.join(uploadDir, profilePicture.originalFilename);
      fs.copyFileSync(tempFilePath, savedFilePath);
      fs.unlinkSync(tempFilePath);

      const profileUrl = `${process.env.API_URL}/uploads/employees/${employee.id}/${profilePicture.originalFilename}`;

      await prisma.employees.update({
        where: { id: employee_id },
        data: {
          profile_pic_url: profileUrl,
          profile_pic_path: savedFilePath,
        },
      });

      return res.status(200).json({
        status: "success",
        message: "Employee profile picture uploaded successfully",
        filePath: savedFilePath,
        profile_pic_url: profileUrl,
      });
    } catch (error) {
      logger.error(`Update Employee Profile Pic Error: ${error.message}, File: employeeController-uploadEmployeeProfilePic`);
      return res.status(500).json({ status: "error", message: "Internal server error" });
    }
  });
};

const GetAllEmployeesList = async (req, res) => {
  try {
    const employees = await prisma.employees.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone_code: true,
        phone_number: true
      }
    });

    let data = [];
    if (employees !== null) {
      employees.map((role) => {
        data.push({
          value: role.id,
          label: role.name,
        });
      })
    }

    return res.status(200).json({
      status: "success",
      employees: data,
    })
  } catch (error) {
    logger.error(`Get Roles Error: ${error.message}, File: employeeController-getRoles`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}



const allocateProjects = async (req, res) => {
  const { employee_id, project_ids } = req.body;
  try {
    if (!employee_id || !Array.isArray(project_ids)) {
      return res.status(400).json({ status: "error", message: "Invalid request data" });
    }

    // Wrap in a transaction to safely delete and re-insert
    await prisma.$transaction(async (prisma) => {
      // Find the employee to make sure they exist
      const employee = await prisma.employees.findUnique({
        where: { id: employee_id },
      });

      if (!employee) {
        throw new Error("Employee not found");
      }

      // Delete existing permissions for the employee
      await prisma.employeeProjectPermission.deleteMany({
        where: { employee_id: employee_id }
      });

      // Insert new permissions
      if (project_ids && project_ids.length > 0) {
        await prisma.employeeProjectPermission.createMany({
          data: project_ids.map(id => ({
            employee_id: employee_id,
            project_id: id
          }))
        });
      }
    });

    return res.status(200).json({
      status: "success",
      message: "Projects allocated successfully",
    });
  } catch (error) {
    logger.error(`Allocate Projects Error: ${error.message}, File: employeeController-allocateProjects`);
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

const getAllocatedProjects = async (req, res) => {
  const { employee_id } = req.params;
  try {
    const employee = await prisma.employees.findUnique({
      where: { id: employee_id },
      include: {
        project_permissions: {
          select: {
            project_id: true
          }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found"
      });
    }

    const project_ids = employee.project_permissions.map(p => p.project_id);

    return res.status(200).json({
      status: "success",
      project_ids
    });
  } catch (error) {
    logger.error(`Get Allocated Projects Error: ${error.message}, File: employeeController-getAllocatedProjects`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};


module.exports = {
  GetAllEmployees,
  AddEmployee,
  getRoles,
  getReportingHeads,
  getSingleEmployeeData,
  UpdateEmployee,
  DeleteEmployee,
  updateUserPassword,
  addNewRole,
  getAllRoleData,
  updateRole,
  deleteRole,
  updatePermissions,
  getRolesPermissions,
  uploadEmployeeProfilePic,
  GetAllEmployeesList,
  allocateProjects,
  getAllocatedProjects
};
