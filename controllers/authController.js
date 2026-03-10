const prisma = require("../utils/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require("../helper/logger");

const AdminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(200).json({
      status: "error",
      message: "Please provide email",
    });
  }
  if (!password) {
    return res.status(200).json({
      status: "error",
      message: "Please provide password",
    });
  }

  try {
    const employee = await prisma.employees.findFirst({
      where: { email },
    });

    if (!employee) {
      return res.status(200).json({
        status: "error",
        message: "Employee not found",
      });
    }

    const validPassword = await bcrypt.compare(password, employee.password);
    if (!validPassword) {
      return res.status(200).json({
        status: "error",
        message: "Sorry, Invalid password",
      });
    }

    let employee_id = employee.id;
    const role_name = await prisma.roles.findFirst({
      where: {
        id: employee.role_id,
      },
      select: {
        name: true,
      },
    });

    let role_id;
    let permissions = {};
    if (employee.role_id !== null) {
      role_id = employee.role_id;
      const permissionsdata = await prisma.rolepermissions.findFirst({
        where: {
          role_id: role_id,
        },
        select: {
          permissions: true,
        },
      });
      if (permissionsdata) {
        permissions = JSON.parse(permissionsdata?.permissions);
      } else {
        permissions = {};
      }
    } else {
      role_id = null;
    }

    const access_token = jwt.sign({ id: employee.id }, process.env.JWT_TOKEN_SECRET, { expiresIn: "7d" });

    const employeeData = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone_code: employee.phone_code,
      phone_number: employee.phone_number,
      gender: employee.gender,
      access_token: access_token,
      role_name: role_name.name,
      profile_pic_url: employee.profile_pic_url,
    };

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      access_token,
      employeeData,
      permissions: permissions,
    });
  } catch (error) {
    logger.error(`AdminLogin error for ${email} Error: ${error.message}, File: authController-AdminLogin`);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

module.exports = {
  AdminLogin,
};
