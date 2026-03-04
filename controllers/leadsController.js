const prisma = require("../utils/client");
const logger = require("../helper/logger");
const multiparty = require("multiparty");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const ExcelJS = require("exceljs");
const getAllocatedProjectIds = require("../utils/getAllocatedProjectIds");

exports.AddLead = async (req, res) => {
  const {
    prefixes,
    full_name,
    email,
    email_2,
    phone_code,
    phone_number,
    employee_id,
    sourse_of_lead,
    gender,
    landline_country_code,
    landline_city_code,
    landline_number,
    date_of_birth,
    father_name,
    spouse_prefixes,
    spouse_name,
    marital_status,
    number_of_children,
    wedding_aniversary,
    spouse_dob,
    pan_card_no,
    aadhar_card_no,
    country_of_citizenship,
    country_of_residence,
    mother_tongue,
    name_of_poa,
    holder_poa,
    no_of_years_correspondence_address,
    no_of_years_city,
    have_you_owned_abode,
    if_owned_project_name,
    correspondence_address,
    correspondence_city,
    correspondence_state,
    correspondence_country,
    correspondence_pincode,
    permanent_address,
    permanent_city,
    permanent_state,
    permanent_country,
    permanent_pincode,
    employeeId,
    current_designation,
    name_of_current_organization,
    address_of_current_organization,
    no_of_years_work_experience,
    current_annual_income,
    lead_status,
    min_budget,
    max_budget,
    bedroom,
    purpose,
    funding,
    lead_age,
    lead_stage_id,
    project_id,
  } = req.body;

  console.log("req body -add", req.body);
  try {
    // Normalize empty email to null
    const normalizedEmail = email && email.trim() !== "" ? email : null;
    const normalizedEmail2 = email_2 && email_2.trim() !== "" ? email_2 : null;

    if (normalizedEmail) {
      const existingEmail = await prisma.leads.findFirst({
        where: { email: normalizedEmail },
      });

      if (existingEmail) {
        return res.status(200).json({
          status: "error",
          message: "Email already exists",
        });
      }
    }

    const existingPhone = await prisma.leads.findFirst({
      where: {
        phone_code,
        phone_number,
      },
    });
    if (existingPhone) {
      return res.status(200).json({
        status: "error",
        message: "Phone number already exists",
      });
    }

    const uuid = "ABODE" + Math.floor(100000 + Math.random() * 900000);

    let stageIdToConnect = null;
    if (lead_stage_id) {
      stageIdToConnect = lead_stage_id;
    } else {
      const stage = await prisma.leadstages.findUnique({ where: { order: 1 } });
      if (!stage) {
        return res.status(200).json({
          status: "error",
          message: "Lead stage not found",
        });
      }
      stageIdToConnect = stage.id;
    }

    const lead = await prisma.leads.create({
      data: {
        // ... (existing fields)
        uuid,
        prefixes,
        full_name,
        email: normalizedEmail,
        email_2: normalizedEmail2,
        phone_code,
        phone_number,
        // assigned_to_employee_id: BigInt(employee_id) || null,
        assigned_to: employee_id
          ? { connect: { id: BigInt(employee_id) } }
          : undefined,
        source_of_lead: sourse_of_lead || null,
        gender,
        landline_country_code,
        landline_city_code,
        landline_number,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        father_name,
        spouse_prefixes: spouse_prefixes ? spouse_prefixes : null,
        spouse_name,
        marital_status: marital_status ? marital_status : null,
        number_of_children,
        wedding_aniversary: wedding_aniversary
          ? new Date(wedding_aniversary)
          : null,
        spouse_dob: spouse_dob ? new Date(spouse_dob) : null,
        pan_card_no,
        aadhar_card_no,
        country_of_citizenship_details: country_of_citizenship
          ? { connect: { id: BigInt(country_of_citizenship) } }
          : undefined,
        country_of_residence_details: country_of_residence
          ? { connect: { id: BigInt(country_of_residence) } }
          : undefined,
        mother_tongue,
        name_of_poa,
        holder_poa: holder_poa ? holder_poa : null,
        no_of_years_correspondence_address,
        no_of_years_city,
        have_you_owned_abode: have_you_owned_abode === "true" ? true : false,
        if_owned_project_name,
        stage_details: stageIdToConnect
          ? { connect: { id: BigInt(stageIdToConnect) } }
          : undefined,
        status: "Active",
        created_at: new Date(),
        added_by_employee: employeeId
          ? { connect: { id: BigInt(employeeId) } }
          : undefined,
        lead_assigned_date: employee_id ? new Date() : null,
        lead_status: lead_status || null,
        min_budget: min_budget ? parseFloat(min_budget) : null,
        max_budget: max_budget ? parseFloat(max_budget) : null,
        bedroom: bedroom || null,
        purpose: purpose || null,
        funding: funding || null,
        lead_age: lead_age ? parseInt(lead_age) : null,
        project_details: project_id
          ? { connect: { id: BigInt(project_id) } }
          : undefined,
      },
    });

    await prisma.leadsprofession.create({
      data: {
        lead_id: BigInt(lead?.id),
        current_designation: current_designation || null,
        name_of_current_organization: name_of_current_organization || null,
        address_of_current_organization:
          address_of_current_organization || null,
        no_of_years_work_experience:
          parseFloat(no_of_years_work_experience) || null,
        current_annual_income: parseFloat(current_annual_income) || null,
        created_at: new Date(),
      },
    });

    await prisma.leadsactivities.create({
      data: {
        lead_id: BigInt(lead?.id),
        employee_id: BigInt(employeeId),
        ca_message: "Lead created",
      },
    });

    if (correspondence_state && correspondence_country) {
      await prisma.leadsaddress.create({
        data: {
          lead_id: BigInt(lead?.id),
          address_type: "Correspondence",
          country: BigInt(correspondence_country),
          state: Number(correspondence_state),
          city: Number(correspondence_city),
          address: correspondence_address,
          pincode: correspondence_pincode,
          created_at: new Date(),
        },
      });
    }

    if (permanent_state && permanent_country) {
      await prisma.leadsaddress.create({
        data: {
          lead_id: BigInt(lead?.id),
          address_type: "Permanent",
          country: BigInt(permanent_country),
          state: Number(permanent_state),
          city: Number(permanent_city),
          address: permanent_address,
          pincode: permanent_pincode,
          created_at: new Date(),
        },
      });
    }

    return res.status(201).json({
      status: "success",
      message: "Lead added successfully",
    });
  } catch (error) {
    logger.error(
      `Add lead Error: ${error.message}, File: leadsController-AddLead`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const getAllSubordinateIds = async (employeeId) => {
  const allSubordinateIds = new Set();

  const getSubordinatesRecursive = async (headId) => {
    const subordinates = await prisma.employees.findMany({
      where: { reporting_head_id: headId },
      select: { id: true },
    });

    for (const subordinate of subordinates) {
      allSubordinateIds.add(subordinate.id.toString());
      await getSubordinatesRecursive(subordinate.id);
    }
  };

  await getSubordinatesRecursive(BigInt(employeeId));
  return Array.from(allSubordinateIds).map((id) => BigInt(id));
};

exports.GetAllLeads = async (req, res) => {
  const {
    page,
    limit = 10,
    searchQuery,
    startDate,
    endDate,
    leadStage,
    leadType,
    employee_id,
    subordinateId,
    projectId,
  } = req.query;

  const parsedLimit = parseInt(limit, 10);

  try {
    if (!employee_id) {
      return res.status(200).json({
        status: "error",
        message: "Employee id is required",
      });
    }

    const employee = await prisma.employees.findUnique({
      where: { id: BigInt(employee_id) },
      include: {
        roledetails: true,
      },
    });

    if (!employee) {
      return res.status(200).json({
        status: "error",
        message: "Employee not found",
      });
    }

    let offset = 0;
    if (page > 1) {
      offset = (page - 1) * parsedLimit;
    }

    const searchCondition = {
      ...(searchQuery && {
        OR: [
          { full_name: { startsWith: searchQuery } },
          { email: { startsWith: searchQuery } },
          { phone_number: { contains: searchQuery } }
        ],
      }),
    };

    // Get allocated project IDs for the current user
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);
    if (allocatedProjectIds !== null) {
      searchCondition.project_id = { in: allocatedProjectIds };
    }

    // Filter by specific project if provided
    if (projectId && projectId !== 'undefined' && projectId !== '') {
      searchCondition.project_id = BigInt(projectId);
    }

    if (leadStage) {
      searchCondition.stage_details = {
        id: BigInt(leadStage),
      };
    }

    if (leadType) {
      if (leadType === "assigned") {
        searchCondition.assigned_to_employee_id = {
          not: null,
        };
      } else if (leadType === "unassigned") {
        searchCondition.assigned_to_employee_id = null;
      }
    }

    // Check for "view_lead" permission
    const rolePermissions = await prisma.rolepermissions.findFirst({
      where: { role_id: employee.role_id },
    });

    let hasViewAllLeads = false;
    if (rolePermissions?.permissions) {
      const permissionsData = JSON.parse(rolePermissions.permissions);
      if (permissionsData?.leads_page?.includes("view_lead")) {
        hasViewAllLeads = true;
      }
    }

    if (subordinateId) {
      searchCondition.OR = [
        // 1️⃣ Leads assigned to employee
        {
          assigned_to_employee_id: BigInt(subordinateId),
        },
        // 2️⃣ Leads unassigned but added by subordinate employee
        {
          AND: [
            { assigned_to_employee_id: null },
            { added_by_employee_id: BigInt(subordinateId) },
          ],
        },
      ];
    } else if (employee?.roledetails?.name !== "Super Admin" && !hasViewAllLeads) {
      // Get all subordinate IDs for the current employee
      const allSubordinateIds = await getAllSubordinateIds(employee_id);
      allSubordinateIds.push(BigInt(employee_id)); // Include the employee themselves

      searchCondition.OR = [
        // Leads assigned to the employee or subordinates
        {
          assigned_to_employee_id: {
            in: allSubordinateIds,
          },
        },
        // Leads unassigned but added by this employee
        {
          AND: [
            { assigned_to_employee_id: null },
            { added_by_employee_id: BigInt(employee_id) },
          ],
        },
        {
          added_by_employee_id: {
            in: allSubordinateIds.filter((id) => id !== BigInt(employee_id)), // only subordinates, not self
          },
        },
      ];
    }

    if (startDate && endDate) {
      searchCondition.created_at = {
        gte: new Date(startDate),
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    } else if (startDate) {
      searchCondition.created_at = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      searchCondition.created_at = {
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const leadsList = await prisma.leads.findMany({
      where: searchCondition,
      take: parsedLimit,
      skip: offset,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        uuid: true,
        prefixes: true,
        full_name: true,
        email: true,
        email_2: true,
        phone_code: true,
        phone_number: true,
        gender: true,
        landline_country_code: true,
        landline_city_code: true,
        landline_number: true,
        date_of_birth: true,
        father_name: true,
        spouse_name: true,
        marital_status: true,
        number_of_children: true,
        wedding_aniversary: true,
        spouse_dob: true,
        pan_card_no: true,
        aadhar_card_no: true,
        country_of_citizenship: true,
        country_of_residence: true,
        mother_tongue: true,
        name_of_poa: true,
        holder_poa: true,
        no_of_years_correspondence_address: true,
        no_of_years_city: true,
        have_you_owned_abode: true,
        if_owned_project_name: true,
        status: true,
        lead_stage_id: true,
        profile_pic_url: true,
        profile_pic_path: true,
        country_of_citizenship_details: {
          select: {
            name: true,
          },
        },
        country_of_residence_details: {
          select: {
            name: true,
          },
        },
        assigned_to: {
          select: {
            name: true,
            id: true,
          },
        },
        stage_details: {
          select: {
            name: true,
            order: true,
          },
        },
        project_details: {
          select: {
            id: true,
            project_name: true,
          },
        },
      },
    });

    const totalLeadsCount = await prisma.leads.count({
      where: searchCondition,
    });

    const pageLeadsCount = leadsList.length;

    const leadsDetails = leadsList.map((ele) => ({
      id: ele?.id.toString(),
      lead_uid: ele?.uuid,
      prefixes: ele?.prefixes,
      full_name: ele?.full_name,
      email: ele?.email,
      phone_code: ele?.phone_code,
      phone_number: ele?.phone_number,
      gender: ele?.gender,
      father_name: ele?.father_name,
      status: ele?.status,
      created_at: ele?.created_at,
      pan_card_no: ele?.pan_card_no,
      aadhar_card_no: ele?.aadhar_card_no,
      marital_status: ele?.marital_status,
      country_of_citizenship: ele?.country_of_citizenship_details?.name ?? null,
      country_of_residence: ele?.country_of_residence_details?.name ?? null,
      mother_tongue: ele?.mother_tongue,
      lead_assigned_employee: ele?.assigned_to?.name ?? null,
      lead_stage_name: ele?.stage_details?.name ?? null,
      project_name: ele?.project_details?.project_name ?? null,
    }));

    return res.status(200).json({
      status: "success",
      leads: leadsDetails || [],
      totalLeads: totalLeadsCount,
      totalPages: Math.ceil(totalLeadsCount / parsedLimit),
      pageLeadsCount,
    });
  } catch (error) {
    logger.error(
      `Get leads Error: ${error.message}, File: leadsController-GetAllLeads`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// get all subordinates including indirect reports
exports.getAllSubordinates = async (req, res) => {
  const { employee_id, project_id } = req.query;
  try {
    if (!employee_id) {
      return res.status(200).json({
        status: "error",
        message: "Employee id is required",
      });
    }

    const employee = await prisma.employees.findUnique({
      where: { id: BigInt(employee_id) },
      include: {
        roledetails: true,
      },
    });

    if (!employee) {
      return res.status(200).json({
        status: "error",
        message: "Employee not found",
      });
    }

    // Check for "view_lead" permission
    const rolePermissions = await prisma.rolepermissions.findFirst({
      where: { role_id: employee.role_id },
    });

    let hasViewAllLeads = false;
    if (rolePermissions?.permissions) {
      const permissionsData = JSON.parse(rolePermissions.permissions);
      if (permissionsData?.leads_page?.includes("view_lead")) {
        hasViewAllLeads = true;
      }
    }

    let allEmployees = [];

    if (employee?.roledetails?.name === "Super Admin" || hasViewAllLeads) {
      // Fetch ALL employees excluding Super Admin and Admin
      allEmployees = await prisma.employees.findMany({
        where: {
          roledetails: {
            name: {
              notIn: ["Super Admin", "Admin"],
            },
          },
        },
        select: {
          id: true,
          name: true,
        },
      });
    } else {
      // Recursive function to get all subordinates
      const getAllSubordinatesRecursive = async (headId) => {
        const directSubordinates = await prisma.employees.findMany({
          where: {
            reporting_head_id: headId,
            roledetails: {
              name: {
                notIn: ["Super Admin", "Admin"],
              },
            },
          },
          select: {
            id: true,
            name: true,
          },
        });

        let subordinatesList = [...directSubordinates];

        for (const subordinate of directSubordinates) {
          const nestedSubordinates = await getAllSubordinatesRecursive(
            subordinate.id,
          );
          subordinatesList = subordinatesList.concat(nestedSubordinates);
        }

        return subordinatesList;
      };

      const subordinates = await getAllSubordinatesRecursive(
        BigInt(employee_id),
      );

      allEmployees = subordinates;
    }

    // Remove duplicates based on ID (just in case)
    let uniqueEmployees = allEmployees.filter(
      (sub, index, self) =>
        index === self.findIndex((s) => s.id.toString() === sub.id.toString()),
    );

    // If project_id is provided, filter employees to only those allocated to this project
    if (project_id && project_id !== 'undefined' && project_id !== '') {
      const projectPermissions = await prisma.employeeProjectPermission.findMany({
        where: {
          project_id: BigInt(project_id),
        },
        select: {
          employee_id: true,
        },
      });

      const allocatedEmployeeIds = new Set(
        projectPermissions.map((p) => p.employee_id.toString())
      );

      uniqueEmployees = uniqueEmployees.filter(
        (emp) => allocatedEmployeeIds.has(emp.id.toString())
      );
    }

    const employeeList = uniqueEmployees.map((sub) => ({
      value: sub.id.toString(),
      label: sub.name,
    }));

    return res.status(200).json({
      status: "success",
      subordinates: employeeList,
    });
  } catch (error) {
    logger.error(
      `Get Subordinates Error: ${error.message}, File: leadsController-getAllSubordinates`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.EditLead = async (req, res) => {
  const {
    leadUuid,
    prefixes,
    full_name,
    email,
    email_2,
    phone_code,
    phone_number,
    employee_id,
    sourse_of_lead,
    gender,
    landline_country_code,
    landline_city_code,
    landline_number,
    date_of_birth,
    father_name,
    spouse_prefixes,
    spouse_name,
    marital_status,
    number_of_children,
    wedding_aniversary,
    spouse_dob,
    pan_card_no,
    aadhar_card_no,
    country_of_citizenship,
    country_of_residence,
    mother_tongue,
    name_of_poa,
    holder_poa,
    no_of_years_correspondence_address,
    no_of_years_city,
    have_you_owned_abode,
    if_owned_project_name,
    correspondence_address,
    correspondence_city,
    correspondence_state,
    correspondence_country,
    correspondence_pincode,
    permanent_address,
    permanent_city,
    permanent_state,
    permanent_country,
    permanent_pincode,
    employeeId,
    current_designation,
    name_of_current_organization,
    address_of_current_organization,
    no_of_years_work_experience,
    current_annual_income,
    lead_status,
    min_budget,
    max_budget,
    bedroom,
    purpose,
    funding,
    lead_age,
    lead_stage_id,
    project_id,
  } = req.body;

  try {
    if (!leadUuid) {
      return res.status(200).json({
        status: "error",
        message: "Lead uuid is required",
      });
    }

    const leadExist = await prisma.leads.findUnique({
      where: {
        uuid: leadUuid,
      },
    });

    if (!leadExist) {
      return res.status(200).json({
        status: "error",
        message: "Lead not found",
      });
    }

    // Normalize empty email to null
    const normalizedEmail = email && email.trim() !== "" ? email : null;
    const normalizedEmail2 = email_2 && email_2.trim() !== "" ? email_2 : null;

    if (normalizedEmail && normalizedEmail !== leadExist?.email) {
      const isEmailExist = await prisma.leads.findFirst({
        where: {
          email: normalizedEmail,
          uuid: { not: leadUuid },
        },
      });
      if (isEmailExist) {
        return res.status(200).json({
          status: "error",
          message: "Email already exists",
        });
      }
    }

    if (
      (phone_code && phone_code !== leadExist?.phone_code) ||
      (phone_number && phone_number !== leadExist?.phone_number)
    ) {
      const isPhoneExist = await prisma.leads.findFirst({
        where: {
          phone_code,
          phone_number,
          uuid: { not: leadUuid },
        },
      });

      if (isPhoneExist) {
        return res.status(200).json({
          status: "error",
          message: "Phone number already exists",
        });
      }
    }

    const updatedLead = await prisma.leads.update({
      where: { uuid: leadUuid },
      data: {
        prefixes: prefixes ? prefixes : leadExist?.prefixes,
        full_name: full_name ? full_name : leadExist?.full_name,
        email: normalizedEmail !== null ? normalizedEmail : leadExist?.email,
        email_2: normalizedEmail2 !== null ? normalizedEmail2 : leadExist?.email_2,
        phone_code: phone_code ? phone_code : leadExist?.phone_code,
        phone_number: phone_number ? phone_number : leadExist?.phone_number,
        assigned_to_employee_id: employee_id
          ? BigInt(employee_id)
          : leadExist?.assigned_to_employee_id,
        source_of_lead: sourse_of_lead
          ? sourse_of_lead
          : leadExist?.source_of_lead,
        gender: gender ? gender : leadExist?.gender,
        landline_country_code: landline_country_code
          ? landline_country_code
          : leadExist?.landline_country_code,
        landline_city_code: landline_city_code
          ? landline_city_code
          : leadExist?.landline_city_code,
        landline_number: landline_number
          ? landline_number
          : leadExist?.landline_number,
        date_of_birth: date_of_birth
          ? new Date(date_of_birth)
          : leadExist?.date_of_birth,
        father_name: father_name ? father_name : leadExist?.father_name,
        spouse_prefixes: spouse_prefixes
          ? spouse_prefixes
          : leadExist?.spouse_prefixes,
        spouse_name: spouse_name ? spouse_name : leadExist?.spouse_name,
        marital_status:
          marital_status === ""
            ? null
            : (marital_status ?? leadExist?.marital_status),
        number_of_children: number_of_children
          ? number_of_children
          : leadExist?.number_of_children,
        wedding_aniversary: wedding_aniversary
          ? new Date(wedding_aniversary)
          : leadExist?.wedding_aniversary,
        spouse_dob: spouse_dob ? new Date(spouse_dob) : leadExist?.spouse_dob,
        pan_card_no: pan_card_no ? pan_card_no : leadExist?.pan_card_no,
        aadhar_card_no: aadhar_card_no
          ? aadhar_card_no
          : leadExist?.aadhar_card_no,
        ...(country_of_citizenship || leadExist?.country_of_citizenship
          ? {
            country_of_citizenship: BigInt(
              country_of_citizenship || leadExist?.country_of_citizenship,
            ),
          }
          : {}),
        ...(country_of_residence || leadExist?.country_of_residence
          ? {
            country_of_residence: BigInt(
              country_of_residence || leadExist?.country_of_residence,
            ),
          }
          : {}),
        mother_tongue: mother_tongue ? mother_tongue : leadExist?.mother_tongue,
        name_of_poa: name_of_poa ? name_of_poa : leadExist?.name_of_poa,
        holder_poa:
          holder_poa === "" ? null : (holder_poa ?? leadExist?.holder_poa),
        no_of_years_correspondence_address: no_of_years_correspondence_address
          ? no_of_years_correspondence_address
          : leadExist?.no_of_years_correspondence_address,
        no_of_years_city: no_of_years_city
          ? no_of_years_city
          : leadExist?.no_of_years_city,
        have_you_owned_abode:
          have_you_owned_abode !== undefined
            ? have_you_owned_abode === "true"
            : leadExist?.have_you_owned_abode,
        if_owned_project_name:
          have_you_owned_abode === "false"
            ? if_owned_project_name
            : leadExist?.if_owned_project_name,
        lead_status:
          lead_status !== undefined
            ? lead_status || null
            : leadExist?.lead_status,
        min_budget:
          min_budget !== undefined
            ? min_budget
              ? parseFloat(min_budget)
              : null
            : leadExist?.min_budget,
        max_budget:
          max_budget !== undefined
            ? max_budget
              ? parseFloat(max_budget)
              : null
            : leadExist?.max_budget,
        bedroom: bedroom !== undefined ? bedroom || null : leadExist?.bedroom,
        purpose: purpose !== undefined ? purpose || null : leadExist?.purpose,
        funding: funding !== undefined ? funding || null : leadExist?.funding,
        lead_age:
          lead_age !== undefined
            ? lead_age
              ? parseInt(lead_age)
              : null
            : leadExist?.lead_age,
        lead_stage_id: lead_stage_id
          ? BigInt(lead_stage_id)
          : leadExist?.lead_stage_id,
        project_id: project_id ? BigInt(project_id) : leadExist?.project_id,
        updated_at: new Date(),
      },
    });

    await prisma.leadsactivities.create({
      data: {
        lead_id: BigInt(leadExist.id),
        employee_id: BigInt(employeeId),
        ca_message: "Lead details updated",
        employee_short_name: "U",
        color_code: "blue",
      },
    });

    const correspondenceAddress = await prisma.leadsaddress.findFirst({
      where: {
        lead_id: BigInt(leadExist?.id),
        address_type: "Correspondence",
      },
    });

    const permanentAddress = await prisma.leadsaddress.findFirst({
      where: {
        lead_id: BigInt(leadExist?.id),
        address_type: "Permanent",
      },
    });

    const professionalDetails = await prisma.leadsprofession.findFirst({
      where: {
        lead_id: BigInt(leadExist?.id),
      },
    });

    if (correspondenceAddress) {
      await prisma.leadsaddress.update({
        where: { id: correspondenceAddress.id },
        data: {
          country: correspondence_country
            ? BigInt(correspondence_country)
            : correspondenceAddress.country,
          state: correspondence_state
            ? Number(correspondence_state)
            : correspondenceAddress.state,
          city: correspondence_city
            ? Number(correspondence_city)
            : correspondenceAddress.city,
          address: correspondence_address || correspondenceAddress.address,
          pincode: correspondence_pincode || correspondenceAddress.pincode,
          updated_at: new Date(),
        },
      });
    } else if (correspondence_state && correspondence_country) {
      await prisma.leadsaddress.create({
        data: {
          lead_id: BigInt(leadExist?.id),
          address_type: "Correspondence",
          country: BigInt(correspondence_country),
          state: Number(correspondence_state),
          city: Number(correspondence_city),
          address: correspondence_address,
          pincode: correspondence_pincode,
          created_at: new Date(),
        },
      });
    }

    if (permanentAddress) {
      await prisma.leadsaddress.update({
        where: { id: permanentAddress.id },
        data: {
          country: permanent_country
            ? BigInt(permanent_country)
            : permanentAddress.country,
          state: permanent_state
            ? Number(permanent_state)
            : permanentAddress.state,
          city: permanent_city ? Number(permanent_city) : permanentAddress.city,
          address: permanent_address || permanentAddress.address,
          pincode: permanent_pincode || permanentAddress.pincode,
          updated_at: new Date(),
        },
      });
    } else if (permanent_state && permanent_country) {
      await prisma.leadsaddress.create({
        data: {
          lead_id: BigInt(leadExist?.id),
          address_type: "Permanent",
          country: BigInt(permanent_country),
          state: Number(permanent_state),
          city: Number(permanent_city),
          address: permanent_address,
          pincode: permanent_pincode,
          created_at: new Date(),
        },
      });
    }

    if (professionalDetails) {
      await prisma.leadsprofession.update({
        where: { id: professionalDetails.id },
        data: {
          current_designation: current_designation
            ? current_designation
            : professionalDetails.current_designation,
          name_of_current_organization: name_of_current_organization
            ? name_of_current_organization
            : professionalDetails.name_of_current_organization,
          address_of_current_organization: address_of_current_organization
            ? address_of_current_organization
            : professionalDetails.address_of_current_organization,
          no_of_years_work_experience: no_of_years_work_experience
            ? Number(no_of_years_work_experience)
            : professionalDetails.no_of_years_work_experience,
          current_annual_income: current_annual_income
            ? Number(current_annual_income)
            : professionalDetails.current_annual_income,
          updated_at: new Date(),
        },
      });
    } else if (
      current_designation ||
      name_of_current_organization ||
      address_of_current_organization ||
      no_of_years_work_experience ||
      current_annual_income
    ) {
      await prisma.leadsprofession.create({
        data: {
          lead_id: BigInt(leadExist?.id),
          current_designation: current_designation || null,
          name_of_current_organization: name_of_current_organization || null,
          address_of_current_organization:
            address_of_current_organization || null,
          no_of_years_work_experience:
            parseFloat(no_of_years_work_experience) || null,
          current_annual_income: parseFloat(current_annual_income) || null,
          created_at: new Date(),
        },
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Lead updated successfully",
      uuid: leadExist?.uuid,
    });
  } catch (error) {
    logger.error(
      `Update Lead Error: ${error.message}, File: leadsController-EditLead`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.DeleteLead = async (req, res) => {
  const { leadId, employeeId } = req.body;

  try {
    const lead = await prisma.leads.findUnique({
      where: { id: BigInt(leadId) },
      select: { uuid: true, profile_pic_path: true },
    });

    const leadFolder = path.resolve("uploads", "leads", `${lead?.uuid}`);

    if (fs.existsSync(leadFolder)) {
      await fs.promises.rm(leadFolder, { recursive: true, force: true });
      console.log(`✅ Deleted folder and all files: ${leadFolder}`);
    } else {
      console.log(`⚠️ Folder not found: ${leadFolder}`);
    }

    await prisma.leadsactivities.deleteMany({
      where: { lead_id: BigInt(leadId) },
    });

    await prisma.leadsfilemanager.deleteMany({
      where: { lead_id: BigInt(leadId) },
    });

    await prisma.leadsnotes.deleteMany({
      where: { lead_id: BigInt(leadId) },
    });

    await prisma.leadsaddress.deleteMany({
      where: { lead_id: BigInt(leadId) },
    });

    await prisma.leads.delete({
      where: { id: BigInt(leadId) },
    });

    return res.status(200).json({
      status: "success",
      message: "Lead deleted permanently successfully",
    });
  } catch (error) {
    logger.error(
      `Delete Lead Error: ${error.message}, File: leadsController-DeleteLead`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.GetSingleLead = async (req, res) => {
  const { leadUuid } = req.query;

  try {
    if (!leadUuid) {
      return res.status(200).json({
        status: "error",
        message: "Lead Id is required",
      });
    }

    const leadDetail = await prisma.leads.findFirst({
      where: {
        uuid: leadUuid,
      },
      select: {
        id: true,
        prefixes: true,
        project_id: true,
        full_name: true,
        email: true,
        email_2: true,
        phone_code: true,
        phone_number: true,
        assigned_to_employee_id: true,
        source_of_lead: true,
        gender: true,
        landline_country_code: true,
        landline_city_code: true,
        landline_number: true,
        date_of_birth: true,
        father_name: true,
        spouse_prefixes: true,
        spouse_name: true,
        marital_status: true,
        number_of_children: true,
        wedding_aniversary: true,
        spouse_dob: true,
        pan_card_no: true,
        aadhar_card_no: true,
        country_of_citizenship: true,
        country_of_residence: true,
        mother_tongue: true,
        name_of_poa: true,
        holder_poa: true,
        no_of_years_correspondence_address: true,
        no_of_years_city: true,
        have_you_owned_abode: true,
        if_owned_project_name: true,
        status: true,
        profile_pic_url: true,
        profile_pic_path: true,
        lead_stage_id: true,
        lead_assigned_date: true,
        lead_status: true,
        min_budget: true,
        max_budget: true,
        bedroom: true,
        purpose: true,
        funding: true,
        lead_age: true,
        country_of_citizenship_details: {
          select: {
            name: true,
          },
        },
        country_of_residence_details: {
          select: {
            name: true,
          },
        },
        assigned_to: {
          select: {
            id: true,
            name: true,
          },
        },
        stage_details: {
          select: {
            name: true,
          },
        },
        added_by_employee: {
          select: {
            name: true,
          },
        },
        project_details: {
          select: {
            project_name: true,
          },
        },
      },
    });

    if (!leadDetail) {
      return res.status(200).json({
        status: "error",
        message: "Lead not found",
      });
    }

    const address = await prisma.leadsaddress.findMany({
      where: {
        lead_id: BigInt(leadDetail?.id),
        address_type: {
          in: ["Correspondence", "Permanent"],
        },
      },
      select: {
        address_type: true,
        city_to_lead: {
          select: {
            id: true,
            name: true,
          },
        },
        state_to_lead: {
          select: {
            id: true,
            name: true,
          },
        },
        country_to_lead: {
          select: {
            id: true,
            name: true,
          },
        },
        address: true,
        pincode: true,
      },
    });

    const correspondenceCountryId =
      address.find((addr) => addr.address_type === "Correspondence")
        ?.country_to_lead?.id || null;
    const correspondenceCountryName =
      address.find((addr) => addr.address_type === "Correspondence")
        ?.country_to_lead?.name || null;
    const correspondenceStateId =
      address.find((addr) => addr.address_type === "Correspondence")
        ?.state_to_lead?.id || null;
    const correspondenceStateName =
      address.find((addr) => addr.address_type === "Correspondence")
        ?.state_to_lead?.name || null;
    const correspondenceCityId =
      address.find((addr) => addr.address_type === "Correspondence")
        ?.city_to_lead?.id || null;
    const correspondenceCityName =
      address.find((addr) => addr.address_type === "Correspondence")
        ?.city_to_lead?.name || null;
    const correspondenceAddress =
      address.find((addr) => addr.address_type === "Correspondence")?.address ||
      null;
    const correspondencePincode =
      address.find((addr) => addr.address_type === "Correspondence")?.pincode ||
      null;

    const permanentCountryId =
      address.find((addr) => addr.address_type === "Permanent")?.country_to_lead
        ?.id || null;
    const permanentCountryName =
      address.find((addr) => addr.address_type === "Permanent")?.country_to_lead
        ?.name || null;
    const permanentStateId =
      address.find((addr) => addr.address_type === "Permanent")?.state_to_lead
        ?.id || null;
    const permanentStateName =
      address.find((addr) => addr.address_type === "Permanent")?.state_to_lead
        ?.name || null;
    const permanentCityId =
      address.find((addr) => addr.address_type === "Permanent")?.city_to_lead
        ?.id || null;
    const permanentCityName =
      address.find((addr) => addr.address_type === "Permanent")?.city_to_lead
        ?.name || null;
    const permanentAddress =
      address.find((addr) => addr.address_type === "Permanent")?.address ||
      null;
    const permanentPincode =
      address.find((addr) => addr.address_type === "Permanent")?.pincode ||
      null;

    const professionalDetails = await prisma.leadsprofession.findFirst({
      where: {
        lead_id: BigInt(leadDetail?.id),
      },
      select: {
        current_designation: true,
        name_of_current_organization: true,
        address_of_current_organization: true,
        no_of_years_work_experience: true,
        current_annual_income: true,
      },
    });

    let lead_assignee = null;

    if (leadDetail.assigned_to) {
      lead_assignee = {
        assignee_id: leadDetail.assigned_to.id.toString(),
        name: leadDetail.assigned_to.name,
      };
    }

    const leadData = {
      id: leadDetail?.id?.toString(),
      prefixes: leadDetail?.prefixes,
      project_id: leadDetail?.project_id?.toString(),
      project_name: leadDetail?.project_details?.project_name,
      full_name: leadDetail?.full_name,
      email: leadDetail?.email,
      email_2: leadDetail?.email_2,
      phone_code: leadDetail?.phone_code,
      phone_number: leadDetail?.phone_number,
      assigned_to_employee_id: leadDetail?.assigned_to_employee_id?.toString(),
      source_of_lead: leadDetail?.source_of_lead,
      gender: leadDetail?.gender,
      landline_country_code: leadDetail?.landline_country_code,
      landline_city_code: leadDetail?.landline_city_code,
      landline_number: leadDetail?.landline_number,
      date_of_birth: leadDetail?.date_of_birth,
      profile_pic_url: leadDetail?.profile_pic_url,
      profile_pic_path: leadDetail?.profile_pic_path,
      father_name: leadDetail?.father_name,
      spouse_prefixes: leadDetail?.spouse_prefixes,
      spouse_name: leadDetail?.spouse_name,
      marital_status: leadDetail?.marital_status,
      number_of_children: leadDetail?.number_of_children,
      wedding_aniversary: leadDetail?.wedding_aniversary,
      spouse_dob: leadDetail?.spouse_dob,
      pan_card_no: leadDetail?.pan_card_no,
      aadhar_card_no: leadDetail?.aadhar_card_no,
      country_of_citizenship: leadDetail?.country_of_citizenship?.toString(),
      country_of_residence: leadDetail?.country_of_residence?.toString(),
      mother_tongue: leadDetail?.mother_tongue,
      name_of_poa: leadDetail?.name_of_poa,
      holder_poa: leadDetail?.holder_poa,
      no_of_years_correspondence_address:
        leadDetail?.no_of_years_correspondence_address,
      no_of_years_city: leadDetail?.no_of_years_city,
      have_you_owned_abode: leadDetail?.have_you_owned_abode?.toString(),
      if_owned_project_name: leadDetail?.if_owned_project_name,
      status: leadDetail.status,
      lead_stage_id: leadDetail?.lead_stage_id?.toString(),
      lead_stage_name: leadDetail?.stage_details?.name,
      country_of_citizenship_details:
        leadDetail?.country_of_citizenship_details?.name,
      country_of_residence_details:
        leadDetail?.country_of_residence_details?.name,
      correspondenceCountryId: correspondenceCountryId?.toString(),
      correspondenceCountryName: correspondenceCountryName,
      correspondenceStateId: correspondenceStateId?.toString(),
      correspondenceStateName: correspondenceStateName,
      correspondenceCityId: correspondenceCityId?.toString(),
      correspondenceCityName: correspondenceCityName,
      correspondenceAddress: correspondenceAddress,
      correspondencePincode: correspondencePincode,
      permanentCountryId: permanentCountryId?.toString(),
      permanentCountryName: permanentCountryName,
      permanentStateId: permanentStateId?.toString(),
      permanentStateName: permanentStateName,
      permanentCityId: permanentCityId?.toString(),
      permanentCityName: permanentCityName,
      permanentAddress: permanentAddress,
      permanentPincode: permanentPincode,
      current_designation: professionalDetails?.current_designation || null,
      name_of_current_organization:
        professionalDetails?.name_of_current_organization || null,
      address_of_current_organization:
        professionalDetails?.address_of_current_organization || null,
      no_of_years_work_experience:
        professionalDetails?.no_of_years_work_experience || null,
      current_annual_income: professionalDetails?.current_annual_income || null,
      lead_assignee: lead_assignee || null,
      assigned_to: leadDetail?.assigned_to?.name || null,
      lead_added_by: leadDetail?.added_by_employee?.name || null,
      source_of_lead: leadDetail?.source_of_lead || null,
      lead_assigned_date: leadDetail?.lead_assigned_date,
      lead_status: leadDetail?.lead_status || null,
      min_budget: leadDetail?.min_budget || null,
      max_budget: leadDetail?.max_budget || null,
      bedroom: leadDetail?.bedroom || null,
      purpose: leadDetail?.purpose || null,
      funding: leadDetail?.funding || null,
      lead_age: leadDetail?.lead_age || null,
    };

    return res.status(200).json({
      status: "success",
      message: "Lead fetched succesfully",
      data: leadData,
    });
  } catch (error) {
    logger.error(
      `Get Single Customer Data Error: ${error.message}, File: customerController-getSingleCustomerData`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.GetLeadActivities = async (req, res) => {
  const { lead_uuid, employee_uuid, limit, offset = 0 } = req.query;

  try {
    if (!lead_uuid) {
      return res.status(200).json({
        status: "error",
        message: "Lead UUID is required",
      });
    }

    if (!employee_uuid) {
      return res.status(200).json({
        status: "error",
        message: "Employee UUID is required",
      });
    }

    const leadDetail = await prisma.leads.findFirst({
      where: { uuid: lead_uuid },
      select: { id: true },
    });

    if (!leadDetail) {
      return res.status(200).json({
        status: "error",
        message: "Lead not found",
      });
    }

    const employee = await prisma.employees.findFirst({
      where: { uuid: employee_uuid },
      select: { id: true },
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
      });
    }

    const totalCount = await prisma.leadsactivities.count({
      where: {
        lead_id: BigInt(leadDetail?.id),
        // employee_id: BigInt(employee?.id),
      },
    });

    const leadActivities = await prisma.leadsactivities.findMany({
      where: {
        lead_id: BigInt(leadDetail?.id),
        // employee_id: BigInt(employee?.id),
      },
      select: {
        id: true,
        ca_message: true,
        created_at: true,
        updated_at: true,
        color_code: true,
        employee_short_name: true,
        employee_details: {
          select: {
            id: true,
            name: true,
            profile_pic_url: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit ? parseInt(limit) : undefined,
      skip: parseInt(offset),
    });

    const activities = leadActivities.map((ele) => ({
      id: ele?.id?.toString(),
      ca_message: ele?.ca_message,
      color_code: ele?.color_code,
      created_at: ele?.created_at,
      updated_at: ele?.updated_at,
      employee_short_name: ele?.employee_short_name,
      employee: {
        id: ele?.employee_details?.id?.toString(),
        name: ele?.employee_details.name,
        profilePicture: ele?.employee_details.profile_pic_url,
      },
    }));

    return res.status(200).json({
      status: "success",
      message: "Lead activities fetched successfully",
      activities,
      totalCount,
      hasMore: parseInt(offset) + activities.length < totalCount,
    });
  } catch (error) {
    logger.error(
      `Lead Activities Error: ${error.message}, File: leadsController-LeadActivities `,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.UploadLeadProfilePic = async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (error, fields, files) => {
    if (error) {
      logger.error(
        `Upload Lead Profile Pic Error: ${error.message}, File: leadsController-UploadLeadProfilePic`,
      );
      return res
        .status(500)
        .json({ status: "error", message: "Internal server error" });
    }

    const lead_id = fields.lead_id ? fields.lead_id[0] : null;
    const profilePicture = files.file ? files.file[0] : null;

    if (!lead_id || !profilePicture) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing lead ID or file" });
    }

    try {
      const leadDetail = await prisma.leads.findFirst({
        where: { id: BigInt(lead_id) },
        select: { uuid: true, profile_pic_path: true },
      });

      if (!leadDetail) {
        return res.status(404).json({
          status: "error",
          message: "Lead not found",
        });
      }

      const tempFilePath = profilePicture.path || profilePicture.filepath;
      if (!tempFilePath) {
        return res.status(400).json({
          status: "error",
          message: "File path is missing",
        });
      }

      const uploadDir = path.join(
        __dirname,
        "../uploads/leads",
        `${leadDetail.uuid}`,
      );
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      if (
        leadDetail.profile_pic_path &&
        fs.existsSync(leadDetail.profile_pic_path)
      ) {
        fs.unlinkSync(leadDetail.profile_pic_path);
      }

      const savedFilePath = path.join(
        uploadDir,
        profilePicture.originalFilename,
      );
      fs.copyFileSync(tempFilePath, savedFilePath);
      fs.unlinkSync(tempFilePath);

      const profileUrl = `${process.env.API_URL}/uploads/leads/${leadDetail.uuid}/${profilePicture.originalFilename}`;

      await prisma.leads.update({
        where: {
          id: BigInt(lead_id),
        },
        data: {
          profile_pic_url: profileUrl,
          profile_pic_path: savedFilePath,
        },
      });

      return res.status(200).json({
        status: "success",
        message: "Leads profile picture uploaded successfully",
        filePath: savedFilePath,
      });
    } catch (error) {
      logger.error(
        `Upload Lead Profile Pic Error: ${error.message}, File: leadsController-UploadLeadProfilePic`,
      );
      return res
        .status(500)
        .json({ status: "error", message: "Internal server error" });
    }
  });
};

exports.AddleadNote = async (req, res) => {
  const { note, user_id, lead_uuid, employeeId } = req.body;
  try {
    const lead = await prisma.leads.findFirst({
      where: {
        uuid: lead_uuid,
      },
    });

    if (!lead) {
      return res.status(404).json({
        status: "error",
        message: "Lead not found",
      });
    }

    await prisma.leadsnotes.create({
      data: {
        note_message: note,
        lead_id: lead.id,
        employee_id: parseInt(user_id),
      },
    });

    await prisma.leadsactivities.create({
      data: {
        lead_id: BigInt(lead.id),
        employee_id: BigInt(employeeId),
        ca_message: `Notes Added`,
        employee_short_name: "N",
        color_code: "brown",
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Note added successfully",
    });
  } catch (error) {
    logger.error(
      `Add Lead Note Error: ${error.message}, File: leadController-AddLeadnote`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.GetLeadNotes = async (req, res) => {
  const { lead_uuid } = req.query;

  try {
    const lead = await prisma.leads.findFirst({
      where: { uuid: lead_uuid },
    });

    if (!lead) {
      return res.status(200).json({
        status: "error",
        message: "Lead not found",
      });
    }

    const leadnotes = await prisma.leadsnotes.findMany({
      where: {
        lead_id: lead.id,
      },
      select: {
        id: true,
        note_message: true,
        created_at: true,
        updated_at: true,
        employee_details: {
          select: {
            id: true,
            name: true,
            profile_pic_url: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const serializedLeadnotes = leadnotes.map((note) => ({
      id: note.id.toString(),
      note_message: note.note_message,
      created_at: note.created_at.toISOString(),
      updated_at: note.updated_at ? note.updated_at.toISOString() : null,
      user: {
        id: note.employee_details.id.toString(),
        name: note.employee_details.name,
        profile_pic_url: note.employee_details.profile_pic_url,
      },
    }));

    return res.status(200).json({
      status: "success",
      message: "Notes retrieved successfully",
      customer: {
        id: lead.id.toString(),
        uuid: lead.uuid,
        notes: serializedLeadnotes,
      },
    });
  } catch (error) {
    logger.error(
      `Get Lead Notes Error: ${error.message}, File: leadController-GetLeadNotes`,
    );
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

exports.assignLeadToEmployee = async (req, res) => {
  const { leadUuid, assignEmployee, employee_id } = req.body;

  try {
    // Find the lead based on the provided leadUuid
    const lead = await prisma.leads.findFirst({
      where: {
        uuid: leadUuid,
      },
    });

    if (!lead) {
      return res.status(200).json({
        status: "error",
        message: "Lead not found",
      });
    }

    const employee = await prisma.employees.findFirst({
      where: {
        id: parseInt(assignEmployee),
      },
    });

    if (!employee) {
      return res.status(200).json({
        status: "error",
        message: "Employee not found",
      });
    }

    await prisma.leads.update({
      where: {
        id: lead.id,
      },
      data: {
        assigned_to_employee_id: parseInt(assignEmployee),
        lead_assigned_date: new Date(),
      },
    });

    await prisma.leadsactivities.create({
      data: {
        lead_id: BigInt(lead?.id),
        employee_id: BigInt(employee_id),
        ca_message: `Lead assigned to ${employee.name}`,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Lead assigned to employee successfully",
    });
  } catch (error) {
    logger.error(
      `while lead assigning to employee Error: ${error.message}, File: leadsController-assignLeadToEmployee`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.assignMultipleLeadsToEmployee = async (req, res) => {
  const { leadIds, assignEmployee, employee_id } = req.body;

  try {
    // Validate input
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(200).json({
        status: "error",
        message: "No lead IDs provided",
      });
    }

    if (!assignEmployee) {
      return res.status(200).json({
        status: "error",
        message: "No employee specified for assignment",
      });
    }

    // Check if employee exists
    const employee = await prisma.employees.findFirst({
      where: {
        id: parseInt(assignEmployee),
      },
    });

    if (!employee) {
      return res.status(200).json({
        status: "error",
        message: "Employee not found",
      });
    }

    // Find all leads based on the provided lead IDs
    const leads = await prisma.leads.findMany({
      where: {
        id: {
          in: leadIds.map((id) => BigInt(id)),
        },
      },
    });

    if (leads.length === 0) {
      return res.status(200).json({
        status: "error",
        message: "No valid leads found",
      });
    }

    // Update all leads with the assigned employee
    await prisma.leads.updateMany({
      where: {
        id: {
          in: leads.map((lead) => lead.id),
        },
      },
      data: {
        assigned_to_employee_id: parseInt(assignEmployee),
        lead_assigned_date: new Date(),
      },
    });

    // Create activity records for each lead
    const activityPromises = leads.map((lead) =>
      prisma.leadsactivities.create({
        data: {
          lead_id: lead.id,
          employee_id: BigInt(employee_id),
          ca_message: `Lead assigned to ${employee.name}`,
        },
      }),
    );

    await Promise.all(activityPromises);

    return res.status(200).json({
      status: "success",
      message: `${leads.length} lead(s) assigned to employee successfully`,
    });
  } catch (error) {
    logger.error(
      `While assigning multiple leads to employee Error: ${error.message}, File: leadsController-assignMultipleLeadsToEmployee`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.transferLeadToEmployee = async (req, res) => {
  const { leadUuid, assignEmployee, employee_id } = req.body;

  try {
    // Find the lead based on the provided leadUuid
    const lead = await prisma.leads.findFirst({
      where: {
        uuid: leadUuid,
      },
      include: {
        assigned_to: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!lead) {
      return res.status(200).json({
        status: "error",
        message: "Lead not found",
      });
    }

    const previousEmployee = lead?.assigned_to.name;

    const employee = await prisma.employees.findFirst({
      where: {
        id: parseInt(assignEmployee),
      },
    });

    if (!employee) {
      return res.status(200).json({
        status: "error",
        message: "Employee not found",
      });
    }

    await prisma.leadtransfer.create({
      data: {
        from_employee_id: lead.assigned_to_employee_id,
        to_employee_id: parseInt(assignEmployee),
        lead_id: lead.id,
        transfered_by: parseInt(employee_id),
      },
    });

    await prisma.leads.update({
      where: {
        id: lead.id,
      },
      data: {
        assigned_to_employee_id: parseInt(assignEmployee),
      },
    });

    await prisma.leadsactivities.create({
      data: {
        lead_id: BigInt(lead?.id),
        employee_id: BigInt(employee_id),
        ca_message: `lead transfered from ${previousEmployee} to ${employee.name} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Lead transferred successfully",
    });
  } catch (error) {
    logger.error(
      `while lead transfering lead to employee Error: ${error.message}, File: leadsController-transferLeadToEmployee`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.GetLeadStagesByOrderWise = async (req, res) => {
  try {
    const stagesData = await prisma.leadstages.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    const data = stagesData.map((ele) => ({
      value: ele?.id?.toString(),
      label: ele?.name,
      // order: ele?.order,
    }));

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    logger.error(
      `Get Lead Stages Error: ${error.message}, File: leadsController-GetLeadStagesByOrderWise`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.EditLeadStage = async (req, res) => {
  const { leadId, leadStageId, employeeId } = req.body;

  try {
    if (!leadId || !leadStageId) {
      return res.status(200).json({
        status: "error",
        message: "Missing required fields",
      });
    }

    // Get current lead stage
    const currentLead = await prisma.leads.findUnique({
      where: { id: BigInt(leadId) },
      select: {
        stage_details: {
          select: {
            id: true,
            name: true,
            order: true,
          },
        },
      },
    });

    if (!currentLead) {
      return res.status(200).json({
        status: "error",
        message: "Lead not found",
      });
    }

    const currentStage = currentLead.stage_details;

    // If already on same stage → don't update
    if (currentStage && BigInt(currentStage.id) === BigInt(leadStageId)) {
      return res.status(200).json({
        status: "error",
        message: "Lead is already in this stage",
      });
    }

    // Get new stage details for logging
    const newStage = await prisma.leadstages.findUnique({
      where: { id: BigInt(leadStageId) },
      select: { id: true, name: true },
    });

    if (!newStage) {
      return res.status(200).json({
        status: "error",
        message: "New stage not found",
      });
    }

    // Update lead with new stage
    const updatedLeadStage = await prisma.leads.update({
      where: { id: BigInt(leadId) },
      data: {
        // stage_details: { connect: { id: BigInt(leadStageId) } },
        lead_stage_id: BigInt(leadStageId),
        updated_at: new Date(),
      },
    });

    // Create activity log
    await prisma.leadsactivities.create({
      data: {
        lead_id: BigInt(leadId),
        employee_id: BigInt(employeeId),
        ca_message: `Lead stage updated from "${currentStage ? currentStage.name : "None"}" to "${newStage.name}"`,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Lead stage updated successfully",
      // data: updatedLeadStage,
    });
  } catch (error) {
    logger.error(
      `Update Lead Stage Error: ${error.message}, File: leadsController-EditLeadStage`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.UploadParsedLeads = async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (error, fields, files) => {
    if (error) {
      console.log(`Error parsing form: ${error}`);
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }

    const file = files.bulkleads?.[0];
    const employee_id = fields.employee_id?.[0];

    if (!file) {
      return res.status(200).json({
        status: "error",
        message: "No file uploaded.",
      });
    }

    if (!employee_id) {
      return res.status(200).json({
        status: "error",
        message: "Employee ID is required.",
      });
    }

    try {
      const workbook = xlsx.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const skipped = [];
      const inserted = [];
      const validPrefixes = ["Mr", "Mrs", "Miss", "Mx"];

      for (const row of data) {
        try {
          // ✅ Validate required fields first
          if (
            !row["Project"] ||
            !row["Full Name"] ||
            !row["Phone Number"]
            // !row["Email Address"] ||
          ) {
            skipped.push({
              row,
              reason:
                "Missing required fields (Project, Full Name, Phone Number)",
            });
            continue;
          }

          // ✅ Resolve Project
          let projectId = null;
          if (row["Project"]) {
            const project = await prisma.project.findFirst({
              where: {
                project_name: row["Project"],
              },
            });

            if (!project) {
              skipped.push({
                row,
                reason: `Project '${row["Project"]}' not found`,
              });
              continue;
            }
            projectId = Number(project.id);
          }

          // ✅ Validate and clean prefix
          let prefix = null;
          if (row["Prefixes"] && validPrefixes.includes(row["Prefixes"])) {
            prefix = row["Prefixes"];
          }

          // ✅ Email validation and duplicate check
          // const email = row["Email Address"]?.toString().trim().toLowerCase();
          const email = row["Email Address"] ? row["Email Address"].toString().trim().toLowerCase() : null;

          if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              skipped.push({ row, reason: "Invalid email format" });
              continue;
            }

            const emailExists = await prisma.leads.findFirst({
              where: { email: email },
            });
            if (emailExists) {
              skipped.push({ row, reason: "Email already exists" });
              continue;
            }
          }

          // ✅ Phone validation and duplicate check
          // const phone = row["Phone Number"].toString().trim();
          const phone = row["Phone Number"] ? row["Phone Number"].toString().trim() : null;

          if (phone) {
            if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
              skipped.push({
                row,
                reason: "Phone number must be exactly 10 digits",
              });
              continue;
            }

            const phoneExists = await prisma.leads.findFirst({
              where: { phone_number: phone },
            });
            if (phoneExists) {
              skipped.push({ row, reason: "Phone number already exists" });
              continue;
            }
          }

          // ✅ Validate assigned employee exists
          const assignedEmployee = await prisma.employees.findFirst({
            where: {
              OR: [
                // { label: row["Assign to Employee"]?.toString().trim() },
                { name: row["Assign to Employee"]?.toString().trim() },
              ],
            },
          });

          if (!assignedEmployee) {
            skipped.push({
              row,
              reason: `Assigned employee '${row["Assign to Employee"]}' not found`,
            });
            continue;
          }

          // ✅ Resolve location data with error handling
          const resolveLocation = async (countryName, stateName, cityName) => {
            let countryId = null,
              stateId = null,
              cityId = null;

            if (countryName?.trim()) {
              const country = await prisma.country.findFirst({
                where: {
                  name: {
                    equals: countryName.trim(),
                    // mode: 'insensitive'
                  },
                },
              });
              countryId = country ? Number(country.id) : null;
            }

            if (stateName?.trim()) {
              const state = await prisma.states.findFirst({
                where: {
                  name: {
                    equals: stateName.trim(),
                    // mode: 'insensitive'
                  },
                },
              });
              stateId = state ? state.id : null;
            }

            if (cityName?.trim()) {
              const city = await prisma.cities.findFirst({
                where: {
                  name: {
                    equals: cityName.trim(),
                    // mode: 'insensitive'
                  },
                },
              });
              cityId = city ? city.id : null;
            }

            return { countryId, stateId, cityId };
          };

          const location = await resolveLocation(
            row["Country"],
            row["State"],
            row["City"],
          );

          // ✅ Generate UUID
          const uuid = "LEAD" + Math.floor(100000 + Math.random() * 900000);

          let stage = null;
          const leadStageName = row["Lead Stage"]?.toString().trim();

          if (leadStageName) {
            stage = await prisma.leadstages.findFirst({
              where: { name: leadStageName },
            });

            if (!stage) {
              skipped.push({
                row,
                reason: `Lead stage '${leadStageName}' not found`,
              });
              continue;
            }
          } else {
            stage = await prisma.leadstages.findFirst({
              where: { name: "New Lead" },
            });

            if (!stage) {
              return res.status(200).json({
                status: "error",
                message: "Default lead stage 'New Lead' not found",
              });
            }
          }

          // ✅ Validate New Fields
          const validLeadStatus = ["Hot", "Cold"];
          const validBedroom = ["2 BHK", "3 BHK"];
          const validPurpose = ["Enduse", "Investment"];
          const validFunding = ["Selfloan", "Bankloan"];

          let leadStatus = row["Lead Status"]?.toString().trim();
          if (stage && stage.name && stage.name.toLowerCase() === "not interested") {
            leadStatus = null;
          } else if (!leadStatus) {
            leadStatus = "Hot";
          } else if (leadStatus && !validLeadStatus.includes(leadStatus)) {
            leadStatus = null;
          }

          let bedroomVal = row["Bedroom"]?.toString().trim();
          if (bedroomVal && !validBedroom.includes(bedroomVal)) bedroomVal = null;

          let purposeVal = row["Purpose"]?.toString().trim();
          if (purposeVal && !validPurpose.includes(purposeVal)) purposeVal = null;

          let fundingVal = row["Funding"]?.toString().trim();
          if (fundingVal && !validFunding.includes(fundingVal)) fundingVal = null;

          let minBudget = row["Min Budget"] ? parseFloat(row["Min Budget"]) : null;
          if (minBudget !== null && isNaN(minBudget)) minBudget = null;

          let maxBudget = row["Max Budget"] ? parseFloat(row["Max Budget"]) : null;
          if (maxBudget !== null && isNaN(maxBudget)) maxBudget = null;

          let leadAge = row["Lead Age"] ? parseInt(row["Lead Age"]) : null;
          if (leadAge !== null && isNaN(leadAge)) leadAge = null;

          // ✅ Create lead
          const lead = await prisma.leads.create({
            data: {
              uuid,
              project_details: projectId
                ? { connect: { id: BigInt(projectId) } }
                : undefined,
              prefixes: prefix,
              full_name: row["Full Name"].toString().trim(),
              email: email,
              phone_code: "91",
              phone_number: phone,
              source_of_lead: row["Source of lead"]?.toString().trim() || null,
              assigned_to: employee_id
                ? { connect: { id: BigInt(assignedEmployee?.id) } }
                : undefined,
              // assigned_to: BigInt(assignedEmployee?.id) || null,
              // stage_id: BigInt(stage?.id),
              stage_details: stage
                ? { connect: { id: BigInt(stage?.id) } }
                : undefined,
              added_by_employee: { connect: { id: BigInt(employee_id) } },
              lead_status: leadStatus,
              min_budget: minBudget,
              max_budget: maxBudget,
              bedroom: bedroomVal,
              purpose: purposeVal,
              funding: fundingVal,
              lead_age: leadAge,
            },
          });

          // ✅ Create address if provided
          if (row["Address"]?.toString().trim()) {
            await prisma.leadsaddress.create({
              data: {
                lead_id: BigInt(lead.id),
                address_type: "Correspondence",
                address: row["Address"].toString().trim(),
                city: location.cityId ? Number(location.cityId) : null,
                state: location.stateId ? Number(location.stateId) : null,
                country: location.countryId ? BigInt(location.countryId) : null,
                pincode: row["Pincode"]
                  ? row["Pincode"].toString().trim()
                  : null,
              },
            });
          }

          // ✅ Create activity log
          await prisma.leadsactivities.create({
            data: {
              lead_id: BigInt(lead.id),
              ca_message: `Lead ${lead.full_name} created via bulk upload`,
              employee_id: BigInt(employee_id),
            },
          });

          inserted.push({
            email: lead.email,
            name: lead.first_name,
            phone: lead.phone_number,
          });
        } catch (rowError) {
          console.error(
            `Error processing row: ${JSON.stringify(row)} | ${rowError.message}`,
          );
          skipped.push({ row, reason: rowError.message });
        }
      }

      return res.status(200).json({
        status: "success",
        message: `Successfully processed ${inserted.length} leads. ${skipped.length} rows were skipped.`,
        insertedCount: inserted.length,
        skippedCount: skipped.length,
        inserted,
        skipped: skipped.slice(0, 10), // Only return first 10 skipped for response size
      });
    } catch (error) {
      console.error("Upload Leads error:", error);
      logger.error(
        `Upload Parsed Leads Error: ${error.message}, File: leadController-UploadParsedLeads`,
      );
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  });
};

exports.ConvertLeadToCustomer = async (req, res) => {
  const {
    leadUuid,
    prefixes,
    first_name,
    last_name,
    email,
    email_2,
    phone_code,
    phone_number,
    employee_id,
    sourse_of_lead,
    gender,
    landline_country_code,
    landline_city_code,
    landline_number,
    date_of_birth,
    father_name,
    spouse_prefixes,
    spouse_name,
    marital_status,
    number_of_children,
    wedding_aniversary,
    spouse_dob,
    pan_card_no,
    aadhar_card_no,
    country_of_citizenship,
    country_of_residence,
    mother_tongue,
    name_of_poa,
    holder_poa,
    no_of_years_correspondence_address,
    no_of_years_city,
    have_you_owned_abode,
    if_owned_project_name,
    correspondence_address,
    correspondence_city,
    correspondence_state,
    correspondence_country,
    correspondence_pincode,
    permanent_address,
    permanent_city,
    permanent_state,
    permanent_country,
    permanent_pincode,
    employeeId,
    current_designation,
    name_of_current_organization,
    address_of_current_organization,
    no_of_years_work_experience,
    current_annual_income,
  } = req.body;

  try {
    if (!leadUuid) {
      return res
        .status(200)
        .json({ status: "error", message: "Lead Uuid is required" });
    }

    // Get lead (we need id and uuid and profile pic info)
    const lead = await prisma.leads.findUnique({
      where: { uuid: leadUuid },
    });

    if (!lead) {
      return res
        .status(404)
        .json({ status: "error", message: "Lead not found" });
    }

    // Duplicate checks
    const emailVal = email ? email.toString().trim() : null;
    const email2Val = email_2 ? email_2.toString().trim() : null;

    if (emailVal) {
      const existingEmail = await prisma.customers.findFirst({
        where: { email: emailVal },
      });
      if (existingEmail) {
        return res
          .status(200)
          .json({ status: "error", message: "Email already exists" });
      }
    }
    const existingPhone = await prisma.customers.findFirst({
      where: { phone_code, phone_number },
    });
    if (existingPhone) {
      return res
        .status(200)
        .json({ status: "error", message: "Phone number already exists" });
    }

    // New customer UUID
    const uuid = "CUST" + Math.floor(100000 + Math.random() * 900000);

    // ---------- Helper utilities ----------
    // Normalize path replacements handling Unix-style and Windows backslashes
    const replaceLeadToCustomerInPath = (str, leadUuidVal, customerUuidVal) => {
      if (!str) return str;
      // Replace /uploads/leads/<leadUuid>/  => /uploads/customers/<customerUuid>/
      let out = str.replace(
        new RegExp(`/uploads/leads/${leadUuidVal}`, "g"),
        `/uploads/customers/${customerUuidVal}`,
      );
      // Replace backslash windows path e.g. \uploads\leads\ABODE12345\ -> \uploads\customers\ABODEXXXXX\
      out = out.replace(
        new RegExp(`\\\\uploads\\\\leads\\\\${leadUuidVal}`, "g"),
        `\\\\uploads\\\\customers\\\\${customerUuidVal}`,
      );
      // Also catch any "leads/<uuid>/" occurrences
      out = out.replace(
        new RegExp(`leads/${leadUuidVal}`, "g"),
        `customers/${customerUuidVal}`,
      );
      out = out.replace(
        new RegExp(`leads\\\\${leadUuidVal}`, "g"),
        `customers\\\\${customerUuidVal}`,
      );
      return out;
    };

    // ---------- 1) Create customer ----------
    const customer = await prisma.customers.create({
      data: {
        uuid,
        prefixes,
        first_name,
        last_name,
        email: emailVal,
        email_2: email2Val,
        phone_code,
        phone_number,
        gender,
        landline_country_code,
        landline_city_code,
        landline_number,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        father_name,
        spouse_prefixes: spouse_prefixes || null,
        spouse_name,
        marital_status: marital_status || null,
        number_of_children,
        wedding_aniversary: wedding_aniversary
          ? new Date(wedding_aniversary)
          : null,
        spouse_dob: spouse_dob ? new Date(spouse_dob) : null,
        pan_card_no,
        aadhar_card_no,
        country_of_citizenship_details: country_of_citizenship
          ? { connect: { id: BigInt(country_of_citizenship) } }
          : undefined,
        country_of_residence_details: country_of_residence
          ? { connect: { id: BigInt(country_of_residence) } }
          : undefined,
        mother_tongue,
        name_of_poa,
        holder_poa: holder_poa || null,
        no_of_years_correspondence_address,
        no_of_years_city,
        have_you_owned_abode: have_you_owned_abode === "true",
        if_owned_project_name,
        source_of_lead: lead?.source_of_lead || null,
        status: "Active",
        created_at: new Date(),
      },
    });

    // ---------- 2) Profession ----------
    await prisma.profession.create({
      data: {
        customer_id: BigInt(customer.id),
        current_designation: current_designation || null,
        name_of_current_organization: name_of_current_organization || null,
        address_of_current_organization:
          address_of_current_organization || null,
        no_of_years_work_experience:
          parseFloat(no_of_years_work_experience) || null,
        current_annual_income: parseFloat(current_annual_income) || null,
        created_at: new Date(),
      },
    });

    // ---------- 3) Transfer Activities ----------
    const leadActivities = await prisma.leadsactivities.findMany({
      where: { lead_id: BigInt(lead.id) },
    });
    if (leadActivities.length > 0) {
      await prisma.customeractivities.createMany({
        data: leadActivities.map((a) => ({
          customer_id: BigInt(customer.id),
          employee_id: a.employee_id,
          ca_message: a.ca_message,
          created_at: a.created_at,
          updated_at: a.updated_at,
          color_code: a.color_code,
          employee_short_name: a.employee_short_name,
        })),
      });
    }

    // ---------- 4) Transfer Notes ----------
    const leadNotes = await prisma.leadsnotes.findMany({
      where: { lead_id: BigInt(lead.id) },
    });
    if (leadNotes.length > 0) {
      await prisma.customernotes.createMany({
        data: leadNotes.map((n) => ({
          customer_id: BigInt(customer.id),
          user_id: n.employee_id,
          note_message: n.note_message,
          created_at: n.created_at,
          updated_at: n.updated_at,
        })),
      });
    }

    // ---------- 5) Transfer Files (DB + folder) ----------
    const leadFiles = await prisma.leadsfilemanager.findMany({
      where: { lead_id: BigInt(lead.id) },
    });

    // Prepare folders
    const leadFolder = path.resolve("uploads", "leads", `${lead.uuid}`);
    const customerFolder = path.resolve(
      "uploads",
      "customers",
      `${customer.uuid}`,
    );

    // Copy files/folder if present
    if (fs.existsSync(leadFolder)) {
      await fs.promises.mkdir(customerFolder, { recursive: true });
      // copy all recursively (node >=16 supports cp)
      await fs.promises.cp(leadFolder, customerFolder, { recursive: true });
      console.log(`Files copied from ${leadFolder} → ${customerFolder}`);
    } else {
      console.log(`Lead folder not found: ${leadFolder}`);
    }

    // Insert file metadata into customerfilemanager, adjusting paths/urls
    if (leadFiles.length > 0) {
      const customerFilesData = leadFiles.map((f) => {
        const newFilePath = replaceLeadToCustomerInPath(
          f.file_path || "",
          lead.uuid,
          customer.uuid,
        );
        const newFileUrl = replaceLeadToCustomerInPath(
          f.file_url || "",
          lead.uuid,
          customer.uuid,
        );
        return {
          uuid: f.uuid,
          name: f.name,
          file_icon_type: f.file_icon_type,
          file_type: f.file_type,
          file_size: f.file_size,
          file_path: newFilePath,
          file_url: newFileUrl,
          parent_id: f.parent_id,
          customer_id: BigInt(customer.id),
          added_by: f.added_by,
          created_at: f.created_at,
          updated_at: f.updated_at,
        };
      });
      await prisma.customerfilemanager.createMany({ data: customerFilesData });
    }

    // ---------- 5b) Transfer lead profile picture if present ----------
    // lead.profile_pic_url and lead.profile_pic_path should be moved/updated to customer
    let updatedProfile = {};
    if (lead.profile_pic_url || lead.profile_pic_path) {
      // Determine filename (basename works for both URL path and Windows path)
      const profileFilename = lead.profile_pic_path
        ? path.basename(lead.profile_pic_path)
        : lead.profile_pic_url
          ? path.basename(
            new URL(lead.profile_pic_url, "http://example.com").pathname,
          )
          : null;

      if (profileFilename) {
        // ensure customer folder exists
        await fs.promises.mkdir(customerFolder, { recursive: true });

        // source path prioritizes profile_pic_path (absolute path), fallback to constructed from leadFolder + filename
        let srcProfileAbsolute;
        if (lead.profile_pic_path && fs.existsSync(lead.profile_pic_path)) {
          srcProfileAbsolute = lead.profile_pic_path;
        } else {
          // try leadFolder + filename
          const candidate = path.join(leadFolder, profileFilename);
          if (fs.existsSync(candidate)) srcProfileAbsolute = candidate;
        }

        if (srcProfileAbsolute) {
          const destProfileAbsolute = path.join(
            customerFolder,
            profileFilename,
          );
          // copy profile pic file
          await fs.promises.copyFile(srcProfileAbsolute, destProfileAbsolute);
          console.log(
            `Profile pic copied: ${srcProfileAbsolute} → ${destProfileAbsolute}`,
          );

          // build new url (if original had a url pattern with /uploads/leads/..., replace it)
          let newProfileUrl = replaceLeadToCustomerInPath(
            lead.profile_pic_url || "",
            lead.uuid,
            customer.uuid,
          );
          if (!newProfileUrl) {
            // fallback: construct url path portion (server may serve uploads at /uploads)
            newProfileUrl = `/uploads/customers/${customer.uuid}/${profileFilename}`;
          }

          // build new path (absolute filesystem path)
          const newProfilePath = destProfileAbsolute;

          updatedProfile = {
            profile_pic_url: newProfileUrl,
            profile_pic_path: newProfilePath,
          };

          // update customer record with profile pic details
          await prisma.customers.update({
            where: { id: BigInt(customer.id) },
            data: {
              profile_pic_url: newProfileUrl,
              profile_pic_path: newProfilePath,
            },
          });
        } else {
          console.log(
            "Profile pic source file not found; skipping file copy for profile pic.",
          );
        }
      }
    }

    // ---------- 6) Transfer Addresses ----------
    if (correspondence_state && correspondence_country) {
      await prisma.customeraddress.create({
        data: {
          customer_id: BigInt(customer.id),
          address_type: "Correspondence",
          country: BigInt(correspondence_country),
          state: Number(correspondence_state),
          city: Number(correspondence_city),
          address: correspondence_address,
          pincode: correspondence_pincode,
          created_at: new Date(),
        },
      });
    }

    if (permanent_state && permanent_country) {
      await prisma.customeraddress.create({
        data: {
          customer_id: BigInt(customer.id),
          address_type: "Permanent",
          country: BigInt(permanent_country),
          state: Number(permanent_state),
          city: Number(permanent_city),
          address: permanent_address,
          pincode: permanent_pincode,
          created_at: new Date(),
        },
      });
    }

    // ---------- 7) Delete Lead DB records and lead folder (only after successful migration) ----------
    await prisma.leadsactivities.deleteMany({
      where: { lead_id: BigInt(lead.id) },
    });
    await prisma.leadsfilemanager.deleteMany({
      where: { lead_id: BigInt(lead.id) },
    });
    await prisma.leadsnotes.deleteMany({ where: { lead_id: BigInt(lead.id) } });
    await prisma.leadsaddress.deleteMany({
      where: { lead_id: BigInt(lead.id) },
    });
    await prisma.leads.delete({ where: { id: BigInt(lead.id) } });

    if (fs.existsSync(leadFolder)) {
      await fs.promises.rm(leadFolder, { recursive: true, force: true });
      console.log(`Deleted lead folder: ${leadFolder}`);
    }

    return res.status(201).json({
      status: "success",
      message: "Lead converted to customer successfully",
    });
  } catch (error) {
    logger.error(
      `Convert Lead to Customer Error: ${error.message}, File: leadsController-ConvertLeadToCustomer`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
