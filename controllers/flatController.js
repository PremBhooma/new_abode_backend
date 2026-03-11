const prisma = require("../utils/client");
const multiparty = require("multiparty");
const path = require("path");
const fs = require("fs");
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');;
const { exec } = require("child_process");

const xlsx = require("xlsx");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const { v4: uuidv4 } = require('uuid');
dayjs.extend(customParseFormat);
const ExcelJS = require("exceljs");
const logger = require("../helper/logger");
const getAllocatedProjectIds = require("../utils/getAllocatedProjectIds");

function toRoman(num) {
  const romanMap = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];

  let result = "";
  for (const [value, symbol] of romanMap) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}

function numberToIndianWords(num) {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
  }

  return inWords(num).trim();
}

function numberToWords(num) {
  const words = [
    "Zero", "First", "Second", "Third", "Fourth", "Fifth",
    "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
    "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth",
    "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth"
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  if (num < 20) return words[num] || num.toString();

  if (num < 100) {
    let tensWord = tens[Math.floor(num / 10)];
    let onesWord = num % 10 !== 0 ? " " + words[num % 10] : "";
    return tensWord + onesWord;
  }

  return num.toString(); // fallback for large numbers
}

function calculateAge(dobString) {
  const dob = new Date(dobString); // e.g., "2005-06-14"
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  // adjust if birthday hasn't happened yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
}

const serializeBigInt = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) => (typeof value === "bigint" ? value.toString() : value)));
};

module.exports.AddFlat = async (req, res) => {
  const { employee_id, flatNo, block, floorNo, squareFeet, flatType, facing, parking, udlNo, group_owner, corner, mortgage, deedNo,
    // floorRise, 
    bedrooms, bathrooms, balconies, furnishingStatus, description, east_face, west_face, north_face, south_face, google_map_link, project_id, flat_reward } = req.body;

  try {
    let project;
    if (project_id) {
      project = await prisma.project.findUnique({
        where: { id: project_id },
      });
    } else {
      project = await prisma.project.findFirst({
        orderBy: { id: "desc" },
      });
    }

    if (!project) {
      return res.status(200).json({
        status: "error",
        message: "Project is not found, please add one project",
      });
    }

    const existingFlat = await prisma.flat.findFirst({
      where: {
        flat_no: flatNo,
        block_id: block ? block : null,
        project_id: project.id,
      },
    });

    if (existingFlat) {
      return res.status(200).json({
        status: "error",
        message: `Flat already exists in the selected block.`,
      });
    }

    // REMOVED: const uuid = "ABODE" + Math.floor(100000000 + Math.random() * 900000000).toString();

    const flat = await prisma.flat.create({
      data: {
        flat_no: flatNo,
        project_id: project.id,
        block_id: block ? block : null,
        floor_no: floorNo || null,
        square_feet: parseFloat(squareFeet) || null,
        type: flatType || null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        balconies: balconies ? parseInt(balconies) : null,
        east_face: east_face || null,
        west_face: west_face || null,
        north_face: north_face || null,
        south_face: south_face || null,
        furnished_status: furnishingStatus || null,
        description: description || null,
        facing: facing || null,
        parking: parking ? parseFloat(parking) : null,
        udl: udlNo || null,
        group_owner_id: group_owner ? group_owner : null, // ✅ direct FK
        corner: corner === "true" || corner === true,
        mortgage: mortgage === "true" || mortgage === true,
        flat_reward: flat_reward === "true" || flat_reward === true,
        deed_number: deedNo || null,
        // floor_rise: (floorRise === "true" || floorRise === true) ? true : false,
        google_map_link: google_map_link || null,
        added_by_employee_id: employee_id,
      },
    });

    await prisma.taskactivities.create({
      data: {
        employee_id: employee_id,
        flat_id: flat.id,
        ta_message: `${flatNo} Flat Added`,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Flat added successfully",
    });
  } catch (error) {
    logger.error(`Add Flat Error: ${error.message}, File: flatController-AddFlat`);
    return res.status(500).json({
      status: "error",
      message: "Failed to add flat",
      error: error.message,
    });
  }
};

module.exports.GetAllFlats = async (req, res) => {
  const { page, limit, searchQuery = "", startDate, endDate, status, customerId, selectedGroupOwner, selectedMortgage } = req.query;

  try {
    const pageInt = parseInt(page, 10) || 1;
    const limitInt = parseInt(limit, 10) || 10;
    const offset = pageInt > 1 ? limitInt * (pageInt - 1) : 0;

    // Get allocated project IDs for the current user
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);

    // Define search condition
    const searchCondition = {};

    // Filter by allocated projects (null means admin - show all)
    if (allocatedProjectIds !== null) {
      searchCondition.project_id = { in: allocatedProjectIds };
    }

    if (searchQuery) {
      searchCondition.OR = [
        { flat_no: { contains: searchQuery } },
        { block: { block_name: { contains: searchQuery } } },
        { customer: { phone_number: { contains: searchQuery } } }
      ];
    }

    if (customerId) {
      searchCondition.customer = {
        id: customerId,
      };
    }

    // if (selectedGroupOwner) {
    //   searchCondition.group_owner = {
    //     id: parseInt(selectedGroupOwner),
    //   };
    // }
    if (selectedMortgage) {
      searchCondition.mortgage = selectedMortgage === "true" ? true : false;
    }

    // if (startDate && endDate) {
    //   searchCondition.created_at = {
    //     gte: new Date(startDate),
    //     lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    //   };
    // } else if (startDate) {
    //   searchCondition.created_at = {
    //     gte: new Date(startDate),
    //   };
    // } else if (endDate) {
    //   searchCondition.created_at = {
    //     lte: new Date(endDate),
    //   };
    // }

    if (status) {
      searchCondition.status = status;
    }

    // 1. Fetch ALL matching flats with minimal fields for sorting
    const allMatchingFlats = await prisma.flat.findMany({
      where: searchCondition,
      select: {
        id: true,
        flat_no: true,
        project: {
          select: { project_name: true },
        },
        block: {
          select: { block_name: true },
        },
      },
    });

    // 2. Perform Natural Sort in Memory
    allMatchingFlats.sort((a, b) => {
      // Sort by Project Name
      const pA = a.project?.project_name || "";
      const pB = b.project?.project_name || "";
      const cmpP = pA.localeCompare(pB, undefined, { numeric: true, sensitivity: 'base' });
      if (cmpP !== 0) return cmpP;

      // Sort by Block Name
      const bA = a.block?.block_name || "";
      const bB = b.block?.block_name || "";
      const cmpB = bA.localeCompare(bB, undefined, { numeric: true, sensitivity: 'base' });
      if (cmpB !== 0) return cmpB;

      // Sort by Flat Number
      const fA = a.flat_no || "";
      const fB = b.flat_no || "";
      return fA.localeCompare(fB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const totalFlats = allMatchingFlats.length;

    // 3. Pagination Slice
    const pagedFlatIds = allMatchingFlats.slice(offset, offset + limitInt).map((f) => f.id);

    // 4. Fetch full details for the sliced IDs
    const pagedFlatsUnsorted = await prisma.flat.findMany({
      where: {
        id: { in: pagedFlatIds },
      },
      select: {
        id: true, // Needed for re-ordering
        flat_no: true,
        project: {
          select: {
            project_name: true,
          },
        },
        block: true,
        floor_no: true,
        square_feet: true,
        facing: true,
        type: true,
        status: true,
        totalAmount: true,
        group_owner: {
          select: {
            id: true,
            name: true,
          },
        },
        mortgage: true,
        customer: {
          select: {
            id: true,
            profile_pic_url: true,
            prefixes: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_code: true,
            phone_number: true,
          },
        },
        created_at: true,
      },
    });

    // 5. Re-order to match the sorted IDs
    // Create a map for quick lookup. Note: keys in Map are strict, convert BigInt to string if needed or just use the value.
    const flatMap = new Map(pagedFlatsUnsorted.map((f) => [f.id, f]));
    const flats = pagedFlatIds.map((id) => flatMap.get(id.toString())).filter(Boolean);

    const pageFlatsCount = flats.length;

    // Map flat data for response
    const flatDetails = flats.map((flat) => ({
      id: flat?.id,
      flat_no: flat?.flat_no,
      project_name: flat?.project?.project_name,
      block: flat?.block,
      floor_no: flat?.floor_no,
      square_feet: flat?.square_feet,
      facing: flat?.facing,
      type: flat?.type,
      status: flat?.status,
      totalAmount: flat?.totalAmount || 0,
      group_owner: {
        id: flat?.group_owner ? flat?.group_owner?.id : null,
        name: flat?.group_owner ? `${flat?.group_owner?.name || ""}`.trim() : null,
      },
      mortgage: flat?.mortgage,
      customer: flat?.customer ? `${flat?.customer?.prefixes || ""} ${flat?.customer?.first_name} ${flat?.customer?.last_name || ""}`.trim() : "N/A",
      customer_details: {
        id: flat?.customer?.id,
        profile_pic_url: flat?.customer?.profile_pic_url,
        prefixes: flat?.customer?.prefixes,
        first_name: flat?.customer?.first_name,
        email: flat?.customer?.email,
        phone_code: flat?.customer?.phone_code,
        phone_number: flat?.customer?.phone_number,
      },
    }));

    return res.status(200).json({
      status: "success",
      message: "Flats fetched successfully",
      totalFlats,
      flats: flatDetails,
      totalPages: Math.ceil(totalFlats / limitInt),
      pageFlatsCount,
    });
  } catch (error) {
    logger.error(`Get All Flat Error: ${error.message}, File: flatController-GetAllFlats`);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch flats",
      error: error.message,
    });
  }
};

module.exports.GetFlatById = async (req, res) => {
  const { id } = req.params;

  try {
    if (!id) {
      return res.status(200).json({
        status: "error",
        message: "ID is required",
      });
    }

    const flat = await prisma.flat.findUnique({
      where: { id: id },
      include: {
        block: true,
        customer: true,
        payments: true,
        group_owner: {
          select: {
            id: true,
            name: true,
            isDefault: true,
          },
        },
      },
    });

    if (!flat) {
      return res.status(200).json({
        status: "error",
        message: "Flat not found",
      });
    }

    const getCustomerFlat = await prisma.customerflat.findFirst({
      where: {
        flat_id: flat?.id,
        customer_id: flat?.customer_id,
      },
      include: {
        customer: {
          select: {
            id: true,
            profile_pic_url: true,
            prefixes: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_code: true,
            phone_number: true,
            date_of_birth: true,
            mother_tongue: true,
            pan_card_no: true,
            aadhar_card_no: true,
          },
        },
      },
    });


    let canAssignFlat = false;

    try {
      const employeeId = req.query?.employeeId;
      if (employeeId) {
        const employee = await prisma.employees.findUnique({
          where: { id: employeeId },
          select: { role_id: true },
        });

        if (employee) {
          const rolePermission = await prisma.rolepermissions.findFirst({
            where: { role_id: employee.role_id },
            select: { permissions: true },
          });

          let hasAssignGroupOwnerPermission = false;
          let hasMortgagePermission = false;

          if (rolePermission?.permissions) {
            const parsedPermissions = JSON.parse(rolePermission.permissions);
            hasAssignGroupOwnerPermission = parsedPermissions?.group_owner_default_page?.includes("assign_group_owner_to_flat") ?? false;
            hasMortgagePermission = parsedPermissions?.group_owner_default_page?.includes("mortgage") ?? false;
          }

          const isDefault = flat.group_owner?.isDefault ?? false;
          const isMortgage = flat.mortgage ?? false;

          if (isDefault && !isMortgage) canAssignFlat = true;
          else if (isDefault && isMortgage) canAssignFlat = hasMortgagePermission;
          else if (!isDefault && !isMortgage) canAssignFlat = hasAssignGroupOwnerPermission;
          else if (!isDefault && isMortgage) canAssignFlat = hasAssignGroupOwnerPermission || hasMortgagePermission;
        }
      }
    } catch (err) {
      console.error("Permission check failed:", err);
    }
    let paymentSummary = null;
    if (getCustomerFlat) {
      const getPaidAmount = (towards) => {
        if (!flat.payments) return 0;
        const lowerTowards = towards.map(t => t.toLowerCase());
        return flat.payments
          .filter(p => p.payment_towards && lowerTowards.includes(p.payment_towards.toLowerCase()))
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      };

      paymentSummary = {
        flat: {
          actual: getCustomerFlat.toatlcostofuint || 0,
          paid: getPaidAmount(["Flat", "Flat Cost", "Base Price", "Flat Cost (Base Price)"]),
          remaining: (getCustomerFlat.toatlcostofuint || 0) - getPaidAmount(["Flat", "Flat Cost", "Base Price", "Flat Cost (Base Price)"])
        },
        gst: {
          actual: getCustomerFlat.gst || 0,
          paid: getPaidAmount(["GST"]),
          remaining: (getCustomerFlat.gst || 0) - getPaidAmount(["GST"])
        },
        corpusFund: {
          actual: getCustomerFlat.corpusfund || 0,
          paid: getPaidAmount(["Corpus Fund"]),
          remaining: (getCustomerFlat.corpusfund || 0) - getPaidAmount(["Corpus Fund"])
        },
        maintenanceCharges: {
          actual: getCustomerFlat.maintenancecharge || 0,
          paid: getPaidAmount(["Maintenance Charges", "Maintenance"]),
          remaining: (getCustomerFlat.maintenancecharge || 0) - getPaidAmount(["Maintenance Charges", "Maintenance"])
        },
        documentationFee: {
          actual: getCustomerFlat.documentaionfee || 0,
          paid: getPaidAmount(["Documentation Fee", "Documentation", "Documentation Charges"]),
          remaining: (getCustomerFlat.documentaionfee || 0) - getPaidAmount(["Documentation Fee", "Documentation", "Documentation Charges"])
        },
        manjeeraConnectionCharge: {
          actual: getCustomerFlat.manjeera_connection_charge || 0,
          paid: getPaidAmount(["Manjeera Connection Charge", "Manjeera Connection"]),
          remaining: (getCustomerFlat.manjeera_connection_charge || 0) - getPaidAmount(["Manjeera Connection Charge", "Manjeera Connection"])
        },
        manjeeraMeterCharge: {
          actual: getCustomerFlat.manjeera_meter_charge || 0,
          paid: getPaidAmount(["Manjeera Meter Charge", "Manjeera Meter", "Manjeera Connection Meter"]),
          remaining: (getCustomerFlat.manjeera_meter_charge || 0) - getPaidAmount(["Manjeera Meter Charge", "Manjeera Meter", "Manjeera Connection Meter"])
        },
        registration: {
          actual: getCustomerFlat.registrationcharge || 0,
          paid: getPaidAmount(["Registration", "Registration Charge", "Registration Charges"]),
          remaining: (getCustomerFlat.registrationcharge || 0) - getPaidAmount(["Registration", "Registration Charge", "Registration Charges"])
        }
      };
    }

    return res.status(200).json({
      status: "success",
      message: "Flat fetched successfully",
      flat: flat,
      getCustomerFlat: getCustomerFlat,
      canAssignFlat,
      paymentSummary
    });
  } catch (error) {
    logger.error(`Get Flat By UUID Error: ${error.message}, File: flatController-GetFlatById`);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch flat",
      error: error.message,
    });
  }
};

module.exports.UpdateFlat = async (req, res) => {
  const { employee_id, id, flatNo, block, floorNo, squareFeet, flatType, facing, parking, udlNo, group_owner, mortgage, east_face, west_face, north_face, south_face, bedrooms, bathrooms, balconies, furnishingStatus, description, corner, deedNo,
    // floorRise, 
    // floorRise, 
    google_map_link, project_id, flat_reward } = req.body;

  try {
    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "ID is required",
      });
    }

    const existingFlat = await prisma.flat.findUnique({
      where: {
        id: id,
      },
    });

    if (!existingFlat) {
      return res.status(200).json({
        status: "error",
        message: "Flat not found",
      });
    }

    let project;
    if (project_id) {
      project = await prisma.project.findUnique({
        where: { id: project_id },
      });

      if (!project) {
        return res.status(200).json({
          status: "error",
          message: "Project not found",
        });
      }
    } else {
      project = await prisma.project.findUnique({
        where: { id: existingFlat.project_id },
      });
    }

    const duplicateFlat = await prisma.flat.findFirst({
      where: {
        flat_no: flatNo,
        block_id: block,
        project_id: project ? project.id : existingFlat.project_id,
        NOT: {
          id: id,
        },
      },
    });

    if (duplicateFlat) {
      return res.status(200).json({
        status: "error",
        message: `Flat already exists in the selected block.`,
      });
    }



    const changes = [];
    const compareAndTrack = (fieldName, newValue, oldValue) => {
      if (newValue !== undefined && newValue != oldValue) {
        const emptyValue = newValue === null && "empty";
        changes.push(`The ${fieldName} changed from ${oldValue === null ? 0 : oldValue} to ${newValue || emptyValue}`);
        return newValue;
      }
      return oldValue;
    };

    const customerFlatDetails = await prisma.customerflat.findFirst({
      where: { flat_id: existingFlat?.id },
    });

    if (customerFlatDetails && (floorNo !== undefined || facing !== undefined || corner !== undefined)) {
      const updateData = {};
      const saleableArea = parseFloat(customerFlatDetails.saleable_area_sq_ft || 0);

      const floorRisePrice = parseFloat(project?.project_six_floor_onwards_price || 0);
      const eastFacingPrice = parseFloat(project?.project_east_price || 0);
      const cornerPrice = parseFloat(project?.project_corner_price || 0);

      // Floor Rise
      if (floorNo >= 5) {
        const floorsToCharge = floorNo - 5 + 1;
        const floorRisePerSqFt = floorsToCharge * floorRisePrice;
        updateData.floor_rise_per_sq_ft = compareAndTrack(
          "Floor Rise Per Sqft",
          floorRisePerSqFt,
          customerFlatDetails.floor_rise_per_sq_ft
        );
        updateData.total_floor_rise = compareAndTrack(
          "Total Floor Rise",
          floorRisePerSqFt * saleableArea,
          customerFlatDetails.total_floor_rise
        );
      } else if (floorNo < 5) {
        updateData.floor_rise_per_sq_ft = compareAndTrack(
          "Floor Rise Per Sqft",
          null,
          customerFlatDetails.floor_rise_per_sq_ft
        );
        updateData.total_floor_rise = compareAndTrack(
          "Total Floor Rise",
          null,
          customerFlatDetails.total_floor_rise
        );
      }

      // Facing (East)
      if (facing) {
        if (facing === "East") {
          updateData.east_facing_per_sq_ft = compareAndTrack(
            "East Facing Per Sqft",
            eastFacingPrice,
            customerFlatDetails.east_facing_per_sq_ft
          );
          updateData.total_east_facing = compareAndTrack(
            "Total East Facing",
            eastFacingPrice * saleableArea,
            customerFlatDetails.total_east_facing
          );
        } else {
          updateData.east_facing_per_sq_ft = compareAndTrack(
            "East Facing Per Sqft",
            null,
            customerFlatDetails.east_facing_per_sq_ft
          );
          updateData.total_east_facing = compareAndTrack(
            "Total East Facing",
            null,
            customerFlatDetails.total_east_facing
          );
        }
      }

      // Corner
      if (corner !== undefined) {
        if (corner === "true" || corner === true || corner === "Yes") {
          updateData.corner_per_sq_ft = compareAndTrack(
            "Corner Per Sqft",
            cornerPrice,
            customerFlatDetails.corner_per_sq_ft
          );
          updateData.total_corner = compareAndTrack(
            "Total Corner",
            cornerPrice * saleableArea,
            customerFlatDetails.total_corner
          );
        } else {
          updateData.corner_per_sq_ft = compareAndTrack(
            "Corner Per Sqft",
            null,
            customerFlatDetails.corner_per_sq_ft
          );
          updateData.total_corner = compareAndTrack(
            "Total Corner",
            null,
            customerFlatDetails.total_corner
          );
        }
      }

      // === Recalculate dependent totals ===
      if (
        updateData.total_floor_rise !== undefined ||
        updateData.total_east_facing !== undefined ||
        updateData.total_corner !== undefined
      ) {
        const baseCost = parseFloat(customerFlatDetails.base_cost_unit || 0);
        const amenities = parseFloat(customerFlatDetails.amenities || 0);

        const totalFloorRise =
          updateData.total_floor_rise !== undefined
            ? updateData.total_floor_rise
            : customerFlatDetails.total_floor_rise || 0;

        const totalEastFacing =
          updateData.total_east_facing !== undefined
            ? updateData.total_east_facing
            : customerFlatDetails.total_east_facing || 0;

        const totalCorner =
          updateData.total_corner !== undefined
            ? updateData.total_corner
            : customerFlatDetails.total_corner || 0;

        const newTotalCost =
          baseCost + amenities + (totalFloorRise || 0) + (totalEastFacing || 0) + (totalCorner || 0);

        updateData.toatlcostofuint = compareAndTrack(
          "Total Cost of Unit",
          newTotalCost,
          customerFlatDetails.toatlcostofuint
        );

        const newGst = (newTotalCost * 0.05).toFixed(2);
        updateData.gst = compareAndTrack("GST", parseFloat(newGst), customerFlatDetails.gst);

        const newCostWithTax = newTotalCost + parseFloat(newGst);
        updateData.costofunitwithtax = compareAndTrack(
          "Cost of Unit With Tax",
          newCostWithTax,
          customerFlatDetails.costofunitwithtax
        );

        const newRegCharge = newTotalCost * 0.076 + 1050;
        updateData.registrationcharge = compareAndTrack(
          "Registration Charge",
          newRegCharge,
          customerFlatDetails.registrationcharge
        );

        const newGrandTotal = parseFloat(newTotalCost) + parseFloat(newGst) + parseFloat(newRegCharge) + parseFloat(customerFlatDetails?.maintenancecharge) + parseFloat(customerFlatDetails?.documentaionfee) + parseFloat(customerFlatDetails?.corpusfund) + parseFloat(customerFlatDetails?.manjeera_connection_charge || 0) + parseFloat(customerFlatDetails?.manjeera_meter_charge || 0)
        updateData.grand_total = compareAndTrack(
          "Grand Total",
          newGrandTotal,
          customerFlatDetails.grand_total
        );
      }


      // Perform update if changes exist
      if (Object.keys(updateData).length > 0) {
        await prisma.customerflat.updateMany({
          where: { flat_id: existingFlat?.id },
          data: updateData,
        });
      }

      // Track changes log
      if (changes?.length > 0) {
        await prisma.customerflatupdateactivities.create({
          data: {
            employee_id: employee_id,
            customerflat_id: customerFlatDetails?.id,
            message: changes.map((c) => `• ${c}`).join("\n"),
          },
        });
      }
    }

    const flat = await prisma.flat.update({
      where: { id: id },
      data: {
        flat_no: flatNo,

        project_id: project ? project.id : existingFlat?.project_id,
        block_id: block ? block : existingFlat?.block_id,
        floor_no: floorNo,
        square_feet: parseFloat(squareFeet),
        type: flatType,
        facing,
        parking: parseFloat(parking),
        udl: udlNo,
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        balconies: parseInt(balconies),
        furnished_status: furnishingStatus,
        group_owner_id: group_owner ? group_owner : existingFlat?.group_owner_id,
        description,
        mortgage: mortgage === "true" || mortgage === true,
        east_face: east_face,
        west_face: west_face,
        north_face: north_face,
        south_face: south_face,
        corner: corner === "true" || corner === true,
        flat_reward: flat_reward === "true" || flat_reward === true,
        deed_number: deedNo,
        // floor_rise: floorRise === "true" ? true : false,
        google_map_link: google_map_link,
        updated_at: new Date(),
      },
    });

    const task_activities = await prisma.taskactivities.create({
      data: {
        employee_id: employee_id,
        flat_id: flat.id,
        ta_message: "Flat Edited",
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Flat updated successfully",
    });
  } catch (error) {
    logger.error(`Update Flat Error: ${error.message}, File: flatController-UpdateFlat`);
    return res.status(500).json({
      status: "error",
      message: "Failed to update flat",
      error: error.message,
    });
  }
};

// module.exports.DeleteFlat = async (req, res) => {
//   const { id, employeeId } = req.body;

//   try {
//     if (!uuid) {
//       return res.status(200).json({
//         status: "error",
//         message: "UUID is required",
//       });
//     }

//     const flat = await prisma.flat.findUnique({
//       where: {
//         id: id,
//       },
//     });

//     if (!flat) {
//       return res.status(200).json({
//         status: "error",
//         message: "Flat not found",
//       });
//     }

//     const task_activities = await prisma.taskactivities.create({
//       data: {
//         employee_id: employeeId,
//         flat_id: flat.id,
//         ta_message: "Flat Deleted",
//       },
//     });

//     await prisma.flat.delete({
//       where: { uuid },
//     });

//     return res.status(200).json({
//       status: "success",
//       message: "Flat deleted successfully",
//     });
//   } catch (error) {
//     logger.error(`Delete Flat Error: ${error.message}, File: flatController-DeleteFlat`);
//     return res.status(500).json({
//       status: "error",
//       message: "Failed to delete flat",
//       error: error.message,
//     });
//   }
// };

module.exports.DeleteFlat = async (req, res) => {
  const { id, employeeId } = req.body;

  try {
    if (!id) {
      return res.status(200).json({
        status: "error",
        message: "ID is required",
      });
    }

    const flat = await prisma.flat.findUnique({
      where: {
        id: id,
      },
    });

    if (!flat) {
      return res.status(200).json({
        status: "error",
        message: "Flat not found",
      });
    }

    // Paths for both folders
    const uploadsFolder = path.resolve("uploads", id); // uploads/ABODE734116508
    const flatsFolder = path.resolve("uploads", "flats", id); // uploads/flats/ABODE734116508

    // Helper function to delete folder if exists
    const deleteFolder = async (folderPath) => {
      if (fs.existsSync(folderPath)) {
        await fs.promises.rm(folderPath, { recursive: true, force: true });
        console.log(`✅ Deleted folder and all files: ${folderPath}`);
      } else {
        console.log(`⚠️ Folder not found: ${folderPath}`);
      }
    };

    // Delete both folders
    await deleteFolder(uploadsFolder);
    await deleteFolder(flatsFolder);

    await prisma.taskactivities.deleteMany({
      where: { flat_id: flat?.id },
    });

    await prisma.flatfilemanager.deleteMany({
      where: { flat_id: flat?.id },
    });

    await prisma.flatnotes.deleteMany({
      where: { flat_id: flat?.id },
    });

    await prisma.payments.deleteMany({
      where: { flat_id: flat?.id },
    });

    await prisma.ageingrecord.deleteMany({
      where: { flat_id: flat?.id },
    });

    await prisma.refundageingrecord.deleteMany({
      where: { flat_id: flat?.id },
    });

    await prisma.rewards.deleteMany({
      where: { flat_id: flat?.id },
    });

    await prisma.customerflat.deleteMany({
      where: { flat_id: flat?.id },
    });

    await prisma.flat.delete({
      where: { id },
    });

    return res.status(200).json({
      status: "success",
      message: "Flat deleted permantely successfully",
    });
  } catch (error) {
    logger.error(`Delete Flat Error: ${error.message}, File: flatController-DeleteFlat`);
    return res.status(500).json({
      status: "error",
      message: "Failed to delete flat",
      error: error.message,
    });
  }
};

module.exports.AddFlatnote = async (req, res) => {
  const { note, user_id, flat_id, flatId, flat_uuid, employeeId, employee_id } = req.body;
  const target_flat_id = flat_id || flatId || flat_uuid;
  const target_employee_id = employeeId || employee_id;

  if (!note || !user_id || !target_flat_id || !target_employee_id) {
    return res.status(400).json({
      status: "error",
      message: "note, user_id, flat_id, and employee_id are required",
    });
  }

  try {
    const flatnote = await prisma.flat.findFirst({
      where: {
        id: target_flat_id,
      },
    });

    await prisma.flatnotes.create({
      data: {
        note_message: note,
        flat_id: flatnote.id,
        user_id: user_id,
      },
    });

    await prisma.taskactivities.create({
      data: {
        employee_id: target_employee_id,
        flat_id: flatnote.id,
        ta_message: `Note added for flat ${flatnote.flat_no}: ${note.substring(0, 50)}...`,
        employee_short_name: "N",
        color_code: "blue",
        created_at: new Date(),
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Note added successfully",
    });
  } catch (error) {
    logger.error(`Add Flat Note Error: ${error.message}, File: flatController-AddFlatnote`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

module.exports.GetFlatNotes = async (req, res) => {
  const { flat_id, flatId, flat_uuid, user_id } = req.query;
  const target_flat_id = flat_id || flatId || flat_uuid;

  try {
    const flat = await prisma.flat.findFirst({
      where: {
        id: target_flat_id,
      },
    });

    if (!flat) {
      return res.status(200).json({
        status: "error",
        message: "Flat not found",
      });
    }

    const flatnotes = await prisma.flatnotes.findMany({
      where: {
        flat_id: flat.id,
      },
      select: {
        id: true,
        note_message: true,
        created_at: true,
        updated_at: true,
        user: {
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

    const serializedFlatnotes = flatnotes.map((note) => ({
      id: note.id,
      note_message: note.note_message,
      created_at: note.created_at.toISOString(),
      updated_at: note.updated_at ? note.updated_at.toISOString() : null,
      user: {
        id: note.user.id,
        name: note.user.name,
        profile_pic_url: note.user.profile_pic_url,
      },
    }));

    return res.status(200).json({
      status: "success",
      message: "Notes retrieved successfully",
      flat: {
        id: flat.id,
        id: flat.id,
        notes: serializedFlatnotes,
      },
    });
  } catch (error) {
    logger.error(`Get Flat Notes Error: ${error.message}, File: flatController-GetFlatNotes`);
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

exports.uploadFlatPicture = async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (error, fields, files) => {
    if (error) {
      logger.error(`Upload Flat Picture Error: ${error.message}, File: flatController-uploadFlatPicture`);
      return res.status(500).json({ status: "error", message: "Internal server error" });
    }

    const flat_id = fields.user_id ? fields.user_id[0] : null;
    const profilePicture = files.file ? files.file[0] : null;

    if (!flat_id || !profilePicture) {
      return res.status(400).json({ status: "error", message: "Missing flat ID or file" });
    }

    try {
      const flat = await prisma.flat.findFirst({
        where: { id: flat_id },
        select: { id: true, flat_img_path: true },
      });

      if (!flat) {
        return res.status(404).json({ status: "error", message: "Flat not found" });
      }

      const tempFilePath = profilePicture.path || profilePicture.filepath;
      if (!tempFilePath) {
        return res.status(400).json({ status: "error", message: "File path is missing" });
      }

      const uploadDir = path.join(__dirname, "../uploads", `${flat.id}`);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      if (flat.flat_img_path && fs.existsSync(flat.flat_img_path)) {
        fs.unlinkSync(flat.flat_img_path);
      }

      const profilePicturePath = path.join(uploadDir, profilePicture.originalFilename);
      fs.copyFileSync(tempFilePath, profilePicturePath);
      fs.unlinkSync(tempFilePath);

      const profileUrl = `${process.env.API_URL}/uploads/${flat.id}/${profilePicture.originalFilename}`;

      await prisma.flat.update({
        where: { id: flat_id },
        data: {
          flat_img_url: profileUrl,
          flat_img_path: profilePicturePath,
        },
      });

      return res.status(200).json({
        status: "success",
        message: "Flat image uploaded successfully",
        filePath: profilePicturePath,
      });
    } catch (error) {
      logger.error(`Upload Flat Picture Error: ${error.message}, File: flatController-uploadFlatPicture`);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  });
};

exports.searchFlatsForCustomer = async (req, res) => {
  try {
    const { flat_no, block_id, employeeId, project_id } = req.query;

    // 1. Get Employee role_id
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      select: { role_id: true },
    });

    if (!employee) {
      return res.status(200).json({
        status: "error",
        message: "Employee not found",
      });
    }

    // 2. Get Role permissions
    const rolePermission = await prisma.rolepermissions.findFirst({
      where: { role_id: employee.role_id },
      select: { permissions: true },
    });

    let hasAssignGroupOwnerPermission = false;
    let hasMortgagePermission = false;

    if (rolePermission?.permissions) {
      const parsedPermissions = JSON.parse(rolePermission.permissions);
      hasAssignGroupOwnerPermission = parsedPermissions?.group_owner_default_page?.includes("assign_group_owner_to_flat") ?? false;

      hasMortgagePermission = parsedPermissions?.group_owner_default_page?.includes("mortgage") ?? false;
    }

    // 3. Get flats by search (initial fetch with relations)
    const flats = await prisma.flat.findMany({
      where: {
        ...(block_id
          ? {
            block_id: block_id,
            flat_no: {
              contains: flat_no?.toString(),
            },
          }
          : {
            flat_no: {
              contains: flat_no?.toString(),
            },
          }),
        ...(project_id ? { project_id: project_id } : {}),
        status: {
          not: "Sold",
        },
      },
      select: {
        id: true,
        flat_no: true,
        block: { select: { block_name: true } },
        project: { select: { project_name: true } },
        floor_no: true,
        square_feet: true,
        type: true,
        facing: true,
        bedrooms: true,
        bathrooms: true,
        balconies: true,
        parking: true,
        furnished_status: true,
        mortgage: true,
        corner: true,
        group_owner: { select: { isDefault: true } },
        project_id: true,
      },
    });

    // 4. Filter flats according to rules - REMOVED to allow all employees to see available flats
    // const filteredFlats = flats.filter((ele) => {
    //   const isDefault = ele.group_owner?.isDefault ?? false;
    //   const isMortgage = ele.mortgage;

    //   // CASE 1: isDefault = true && mortgage = false -> allowed always
    //   if (isDefault && !isMortgage) return true;

    //   // CASE 2: isDefault = true && mortgage = true -> needs mortgage permission
    //   if (isDefault && isMortgage) return hasMortgagePermission;

    //   // CASE 3: isDefault = false && mortgage = false -> needs assign_group_owner_to_flat permission
    //   if (!isDefault && !isMortgage) return hasAssignGroupOwnerPermission;

    //   // CASE 4: isDefault = false && mortgage = true -> needs either permission
    //   if (!isDefault && isMortgage) return hasAssignGroupOwnerPermission || hasMortgagePermission;

    //   return false;
    // });

    const flatTypes = [
      { value: "2 BHK", label: "2 BHK" },
      { value: "3 BHK", label: "3 BHK" },
    ];



    const flatData = flats.map((ele) => {
      const matchedType = flatTypes.find((t) => t.value === ele?.type);
      return {
        value: ele.id,
        label: `Project : ${ele.project?.project_name} - Flat : ${ele.flat_no} - Floor : ${ele.floor_no} - Block : ${ele.block?.block_name}`,
        flat_no: ele?.flat_no,
        id: ele?.id,
        block_name: ele?.block?.block_name,
        floor_no: ele?.floor_no,
        square_feet: ele?.square_feet,
        type: matchedType ? matchedType.label : ele?.type,
        facing: ele?.facing,
        bedrooms: ele?.bedrooms,
        bathrooms: ele?.bathrooms,
        balconies: ele?.balconies,
        parking: ele?.parking,
        furnished_status: ele?.furnished_status,
        corner: ele?.corner,
        project_name: ele?.project?.project_name,
        project_id: ele?.project_id?.toString(),
      };
    });

    // 5. Fetch group owners (same as before)
    let groupOwners = [];
    if (hasAssignGroupOwnerPermission) {
      groupOwners = await prisma.groupowner.findMany({
        select: { id: true, name: true, isDefault: true },
      });
    } else {
      groupOwners = await prisma.groupowner.findMany({
        where: { isDefault: false },
        select: { id: true, name: true, isDefault: true },
      });
    }

    return res.status(200).json({
      status: "success",
      data: flatData,
    });
  } catch (error) {
    logger.error(`Search Flats For Customer Error: ${error.message}, File: flatController-searchFlatsForCustomer`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.SearchSoldFlatsForCustomer = async (req, res) => {
  try {
    const { flat_no, searchQuery } = req.query;

    // Get allocated project IDs for the logged-in employee
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);

    // --------- CASE 1: SEARCH BY FLAT NO ---------
    if (flat_no) {
      const flatDetails = await prisma.flat.findMany({
        where: {
          flat_no: {
            contains: flat_no.toString(),
          },
          status: "Sold",
          ...(allocatedProjectIds ? { project_id: { in: allocatedProjectIds } } : {}),
        },
        select: {
          id: true,
          flat_no: true,
          id: true,
          floor_no: true,
          square_feet: true,
          type: true,
          facing: true,
          bedrooms: true,
          bathrooms: true,
          balconies: true,
          parking: true,
          furnished_status: true,
          block: {
            select: {
              block_name: true,
            },
          },
          project: {
            select: {
              id: true,
              project_name: true,
            },
          },
          Customerflat: {
            select: {
              id: true,
              customer: {
                select: {
                  id: true,
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                  phone_code: true,
                  phone_number: true,
                  profile_pic_url: true,
                },
              },
            },
          },
        },
      });

      if (!flatDetails || flatDetails.length === 0) {
        return res.status(201).json({
          status: "error",
          message: "No sold flat found with this number.",
        });
      }

      const data = flatDetails.map((flat) => {
        const customerFlat = flat.Customerflat[0]; // assuming only one per flat
        const customerName = customerFlat?.customer ? `${customerFlat.customer.first_name} ${customerFlat.customer.last_name}` : "Unknown Customer";
        return {
          value: customerFlat?.id?.toString() || flat.id, // fallback to flat id if no customerFlat
          label: `${flat.project?.project_name || "Project"} - ${flat.flat_no} - ${customerName} `,
          project_id: flat.project?.id?.toString(),
          project_name: flat.project?.project_name,
          flat_no: flat.flat_no,
          id: flat.id,
          id: flat.id,
          block_name: flat.block?.block_name,
          floor_no: flat.floor_no,
          square_feet: flat.square_feet,
          type: flat.type,
          facing: flat.facing,
          bedrooms: flat.bedrooms,
          bathrooms: flat.bathrooms,
          balconies: flat.balconies,
          parking: flat.parking,
          furnished_status: flat.furnished_status,
          customer: customerFlat?.customer || null,
        };
      });

      return res.status(200).json({
        status: "success",
        data: data,
      });
    }

    // --------- CASE 2: SEARCH BY CUSTOMER NAME / EMAIL ---------

    const searchCondition = {
      AND: [
        { soft_delete: 0 },
        ...(searchQuery
          ? [
            {
              OR: [
                { first_name: { contains: searchQuery } },
                { last_name: { contains: searchQuery } },
                { email: { contains: searchQuery } },
                { phone_number: { contains: searchQuery } },
              ],
            },
          ]
          : []),
      ],
    };

    const matchedCustomers = await prisma.customers.findMany({
      where: searchCondition,
      select: {
        id: true,
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_code: true,
        phone_number: true,
        profile_pic_url: true,
      },
    });

    if (matchedCustomers.length === 0) {
      return res.status(201).json({
        status: "error",
        message: "No customer found with this detail.",
      });
    }

    const customerIds = matchedCustomers.map((c) => c.id);

    const customerFlats = await prisma.customerflat.findMany({
      where: {
        customer_id: { in: customerIds },
        flat: {
          status: "Sold",
          ...(allocatedProjectIds ? { project_id: { in: allocatedProjectIds } } : {}),
        },
      },
      select: {
        id: true,
        customer: {
          select: {
            id: true,
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_code: true,
            phone_number: true,
            profile_pic_url: true,
          },
        },
        flat: {
          select: {
            id: true,
            flat_no: true,
            id: true,
            floor_no: true,
            square_feet: true,
            type: true,
            facing: true,
            bedrooms: true,
            bathrooms: true,
            balconies: true,
            parking: true,
            furnished_status: true,
            block: {
              select: {
                block_name: true,
              },
            },
            project: {
              select: {
                id: true,
                project_name: true,
              },
            },
          },
        },
      },
    });

    const data = customerFlats.map((entry) => {
      const customerName = entry.customer ? `${entry.customer.first_name} ${entry.customer.last_name}` : "Unknown Customer";
      return {
        value: entry.id, // customerFlat ID
        label: `${entry.flat.project?.project_name || "Project"} - ${entry.flat.flat_no} - ${customerName}`,
        flat_no: entry.flat.flat_no,
        id: entry.flat.id,
        id: entry.flat.id,
        project_id: entry.flat.project?.id?.toString(),
        project_name: entry.flat.project?.project_name,
        block_name: entry.flat.block?.block_name,
        floor_no: entry.flat.floor_no,
        square_feet: entry.flat.square_feet,
        type: entry.flat.type,
        facing: entry.flat.facing,
        bedrooms: entry.flat.bedrooms,
        bathrooms: entry.flat.bathrooms,
        balconies: entry.flat.balconies,
        parking: entry.flat.parking,
        furnished_status: entry.flat.furnished_status,
        customer: entry.customer,
      };
    });

    return res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    logger.error(`Search Sold Flats For Customer Error: ${error.message}, File: flatController-SearchSoldFlatsForCustomer`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.SearchSoldFlatsForCustomeruuid = async (req, res) => {
  try {
    const { customer_uuid } = req.query;

    const customer = await prisma.customers.findFirst({
      where: {
        id: customer_uuid,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }

    const flatDetails = await prisma.flat.findMany({
      where: {
        status: "Sold",
        customer_id: customer.id,
      },
      select: {
        id: true,
        flat_no: true,
        id: true,
        floor_no: true,
        square_feet: true,
        type: true,
        facing: true,
        bedrooms: true,
        bathrooms: true,
        balconies: true,
        parking: true,
        furnished_status: true,
        block: {
          select: {
            block_name: true,
          },
        },
        Customerflat: {
          select: {
            id: true,
            customer: {
              select: {
                id: true,
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone_code: true,
                phone_number: true,
                profile_pic_url: true,
              },
            },
          },
        },
      },
    });

    if (!flatDetails || flatDetails.length === 0) {
      return res.status(201).json({
        status: "error",
        message: "No sold flats found for the given number.",
      });
    }

    const data = flatDetails.map((flat) => {
      const customerFlat = flat.Customerflat[0];
      return {
        value: customerFlat?.id?.toString() || flat.id, // fallback to flat id if no customerFlat
        label: `${flat.flat_no} - ${flat.block?.block_name || "N/A"}`,
        flat_no: flat.flat_no,
        id: flat.id,
        id: flat.id,
        block_name: flat.block?.block_name,
        floor_no: flat.floor_no,
        square_feet: flat.square_feet,
        type: flat.type,
        facing: flat.facing,
        bedrooms: flat.bedrooms,
        bathrooms: flat.bathrooms,
        balconies: flat.balconies,
        parking: flat.parking,
        furnished_status: flat.furnished_status,
        customer: customerFlat?.customer || null,
      };
    });

    return res.status(200).json({
      status: "success",
      data: serializedata,
    });
  } catch (error) {
    logger.error(`Search Sold Flats For Customer UUID Error: ${error.message}, File: flatController-SearchSoldFlatsForCustomerUuid`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

module.exports.FlatActivities = async (req, res) => {
  const { flat_id, flatId, flat_uuid, employeeId, employee_uuid, limit, offset = 0 } = req.query;
  const target_flat_id = flat_id || flatId || flat_uuid;
  const target_employee_id = employeeId || employee_uuid;

  try {
    if (!target_flat_id) {
      return res.status(400).json({
        status: "error",
        message: "Flat ID is required",
      });
    }

    if (!target_employee_id) {
      return res.status(400).json({
        status: "error",
        message: "Employee ID is required",
      });
    }

    const flat = await prisma.flat.findFirst({
      where: { id: target_flat_id },
      select: { id: true },
    });

    if (!flat) {
      return res.status(404).json({
        status: "error",
        message: "Flat not found",
      });
    }

    const employee = await prisma.employees.findFirst({
      where: { id: target_employee_id },
      select: { id: true },
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
      });
    }

    // Get total count for pagination
    const totalCount = await prisma.taskactivities.count({
      where: {
        flat_id: flat.id,
        // employee_id: employee.id,
      },
    });

    const taskactivities = await prisma.taskactivities.findMany({
      where: {
        flat_id: flat.id,
        // employee_id: employee.id,
      },
      select: {
        id: true,
        ta_message: true,
        created_at: true,
        updated_at: true,
        color_code: true,
        employee_short_name: true,
        employeedetails: {
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
      take: limit ? Number(limit) : undefined,
      skip: Number(offset),
    });

    const activities = taskactivities.map((activity) => ({
      id: activity.id,
      ta_message: activity.ta_message,
      created_at: activity.created_at,
      updated_at: activity.updated_at,
      color_code: activity.color_code,
      employee_id: activity.employeedetails.id,
      employee_short_name: activity.employee_short_name,
      employee_name: activity.employeedetails.name,
      profilePicture: activity.employeedetails.profile_pic_url,
    }));

    return res.status(200).json({
      status: "success",
      message: "Flat activities fetched successfully",
      activities: activities,
      totalCount,
      hasMore: Number(offset) + activities.length < totalCount,
    });
  } catch (error) {
    logger.error(`Flat Activities Error: ${error.message}, File: flatController-FlatActivities`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

module.exports.GetPaymentsByFlatId = async (req, res) => {
  const { flat_id, page, limit, searchQuery = "", startDate, endDate } = req.query;

  try {
    if (!flat_id) {
      return res.status(200).json({
        status: "error",
        message: "Flat Id is required",
      });
    }

    const pageInt = parseInt(page, 10) || 1;
    const limitInt = parseInt(limit, 10) || 10;
    const offset = pageInt > 1 ? limitInt * (pageInt - 1) : 0;

    const searchCondition = {};
    if (searchQuery) {
      searchCondition.OR = [
        {
          trasnaction_id: { contains: searchQuery },
        },
        {
          payment_method: { contains: searchQuery },
        },
        {
          bank: { contains: searchQuery },
        },
        {
          customer: {
            OR: [{ first_name: { contains: searchQuery } }, { last_name: { contains: searchQuery } }],
          },
        },
        {
          flat: {
            flat_no: { contains: searchQuery },
          },
        },
      ];
    }

    if (flat_id) {
      searchCondition.flat_id = flat_id;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of day local time

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day local time

      searchCondition.created_at = {
        gte: start,
        lte: end,
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      searchCondition.created_at = {
        gte: start,
      };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      searchCondition.created_at = {
        lte: end,
      };
    }

    const payemntsList = await prisma.payments.findMany({
      where: searchCondition,
      take: limitInt,
      skip: offset,
      orderBy: {
        created_at: "desc",
      },
      include: {
        flat: {
          include: {
            block: true,
          }
        },
        customer: true,
      },
    });

    if (!payemntsList) {
      return res.status(200).json({
        status: "error",
        message: "Payment not found",
      });
    }

    const paymentdetails = payemntsList.map((payment) => ({
      payment_id: payment?.id?.toString(),
      id: payment?.id,
      flat_number: payment?.flat?.flat_no,
      flat_uuid: payment?.flat?.id,
      block_name: payment?.flat?.block?.block_name,
      customer_prefixes: payment?.customer?.prefixes,
      customer_first_name: payment?.customer?.first_name,
      customer_last_name: payment?.customer?.last_name,
      customer_email: payment?.customer?.email,
      customer_mobile_number: payment?.customer?.phone_number,
      amount: payment?.amount,
      payment_type: payment?.payment_type,
      payment_towards: payment?.payment_towards,
      payment_method: payment?.payment_method,
      bank: payment?.bank,
      paymet_date: payment?.payment_date,
      transaction_id: payment?.trasnaction_id,
      receipturl: payment?.receipt_url,
      comment: payment?.comment,
    }));

    const totalPayments = await prisma.payments.count({
      where: searchCondition,
    });

    return res.status(200).json({
      status: "success",
      message: "Payments of Flats fetched successfully",
      totalPayments,
      data: paymentdetails,
      totalPages: Math.ceil(totalPayments / limitInt),
    });
  } catch (error) {
    logger.error(`Get Payments By Flat ID Error: ${error.message}, File: flatController-GetPaymentsByFlatId`);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch flat",
      error: error.message,
    });
  }
};

module.exports.GetPrintPaymentsByFlatId = async (req, res) => {
  const { flat_id, searchQuery = "", startDate, endDate } = req.query;

  try {
    if (!flat_id) {
      return res.status(200).json({
        status: "error",
        message: "Flat Id is required",
      });
    }

    const searchCondition = {};
    if (searchQuery) {
      searchCondition.OR = [
        {
          trasnaction_id: { contains: searchQuery },
        },
        {
          payment_method: { contains: searchQuery },
        },
        {
          bank: { contains: searchQuery },
        },
        {
          customer: {
            OR: [{ first_name: { contains: searchQuery } }, { last_name: { contains: searchQuery } }],
          },
        },
        {
          flat: {
            flat_no: { contains: searchQuery },
          },
        },
      ];
    }

    if (flat_id) {
      searchCondition.flat_id = flat_id;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of day local time

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day local time

      searchCondition.created_at = {
        gte: start,
        lte: end,
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      searchCondition.created_at = {
        gte: start,
      };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      searchCondition.created_at = {
        lte: end,
      };
    }

    const payemntsList = await prisma.payments.findMany({
      where: searchCondition,
      orderBy: {
        created_at: "desc",
      },
      include: {
        flat: {
          include: {
            block: true,
          }
        },
        customer: true,
      },
    });

    if (!payemntsList) {
      return res.status(200).json({
        status: "error",
        message: "Payment not found",
      });
    }

    const paymentdetails = payemntsList.map((payment) => ({
      payment_id: payment?.id?.toString(),
      id: payment?.id,
      flat_number: payment?.flat?.flat_no,
      block_name: payment?.flat?.block?.block_name,
      customer_first_name: payment?.customer?.first_name,
      customer_last_name: payment?.customer?.last_name,
      customer_email: payment?.customer?.email,
      customer_mobile_number: payment?.customer?.phone_number,
      amount: payment?.amount,
      payment_type: payment?.payment_type,
      payment_towards: payment?.payment_towards,
      payment_method: payment?.payment_method,
      bank: payment?.bank,
      payment_date: payment?.payment_date,
      transaction_id: payment?.trasnaction_id,
      receipturl: payment?.receipt_url,
      comment: payment?.comment,
    }));

    return res.status(200).json({
      status: "success",
      message: "Payments of Flats fetched successfully",
      allpayments: paymentdetails,
    });
  } catch (error) {
    logger.error(`Get Payments By Flat ID Error: ${error.message}, File: flatController-GetPaymentsByFlatId`);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch flat",
      error: error.message,
    });
  }
};

exports.getFlatLists = async (req, res) => {
  try {
    const { customer_id, block_id } = req.query;

    let whereCondition = {};
    if (customer_id) {
      whereCondition.customer_id = customer_id;
    }
    if (block_id) {
      whereCondition.block_id = block_id;
    }

    const flatsList = await prisma.flat.findMany({
      where: whereCondition,
      select: {
        id: true,
        flat_no: true,
        project: {
          select: {
            project_name: true,
          },
        },
      },
    });

    const formattedFlats = flatsList.map((customer) => ({
      value: customer?.id?.toString(),
      label: `${customer?.project?.project_name}, Flat No: ${customer?.flat_no}`,
    }));

    return res.status(200).json({
      status: "success",
      message: "Flats fetched successfully",
      data: formattedFlats,
    });
  } catch (error) {
    logger.error(`Get Flat List Error: ${error.message}, File: flatController-getFlatLists`);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch customers",
    });
  }
};

exports.GetFlatPaymentsForExcel = async (req, res) => {
  const { searchQuery, startDate, endDate, flat_id } = req.query;

  try {
    const flat = await prisma.flat.findFirst({
      where: {
        id: flat_id,
      },
    });

    if (!flat) {
      return res.status(200).json({
        status: "error",
        message: "Flat is Required",
      });
    }

    const searchCondition = {};
    if (searchQuery) {
      searchCondition.OR = [
        {
          trasnaction_id: { contains: searchQuery },
        },
        {
          payment_method: { contains: searchQuery },
        },
        {
          bank: { contains: searchQuery },
        },
        {
          customer: {
            OR: [{ first_name: { contains: searchQuery } }, { last_name: { contains: searchQuery } }],
          },
        },
        {
          flat: {
            flat_no: { contains: searchQuery },
          },
        },
      ];
    }

    if (flat_id) {
      searchCondition.flat_id = flat_id;
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

    const payments = await prisma.payments.findMany({
      where: searchCondition,
      orderBy: {
        created_at: "desc",
      },
      include: {
        flat: true,
        customer: true,
      },
    });

    const paymentsData = payments.map((payment) => ({
      payment_id: payment?.id?.toString(),
      id: payment?.id,
      flat_number: payment?.flat?.flat_no,
      customer_first_name: payment?.customer?.first_name,
      customer_last_name: payment?.customer?.last_name,
      customer_mobile_number: payment?.customer?.phone_number,
      amount: payment?.amount,
      payment_type: payment?.payment_type,
      payment_towards: payment?.payment_towards,
      payment_method: payment?.payment_method,
      bank: payment?.bank,
      paymet_date: payment?.payment_date,
      transaction_id: payment?.trasnaction_id,
      receipturl: payment?.receipt_url,
      comment: payment?.comment,
    }));

    const worksheetData = paymentsData?.map((payment, index) => ({
      "S.No": index + 1,
      "Payment Ref Id": payment.id,
      "Transaction ID": payment.transaction_id,
      "Flat No": payment.flat_number,
      "Customer Name": payment.customer_first_name + payment.customer_last_name,
      "Customer Mobile Number": payment.customer_mobile_number,
      Amount: payment?.amount && `₹ ${parseFloat(payment?.amount).toFixed(2)}`,
      "Payment Type": payment?.payment_type,
      "Payment Towards": payment?.payment_towards,
      "Payment Method": payment.payment_method,
      Bank: payment.bank,
      "Payment Date": payment?.paymet_date && dayjs(payment?.paymet_date).format("DD/MM/YYYY"),
      Receipt: payment.receipturl,
      Comment: payment.comment,
    }));

    // Create Excel file with exceljs
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Payments Report");

    // Leave Row 1 empty
    worksheet.getRow(1).height = 5;

    // Main Title in Row 2
    const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString("en-IN") : null;
    const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString("en-IN") : null;

    let mainHeader = "Abode Payments";
    if (formattedStartDate && formattedEndDate) {
      mainHeader += ` (From ${formattedStartDate} to ${formattedEndDate})`;
    } else if (formattedStartDate) {
      mainHeader += ` (From ${formattedStartDate})`;
    } else if (formattedEndDate) {
      mainHeader += ` (Up to ${formattedEndDate})`;
    }

    worksheet.mergeCells("A2:AR2");
    const titleCell = worksheet.getCell("A2");
    titleCell.value = mainHeader;
    titleCell.font = {
      name: "Calibri",
      size: 16,
      bold: true,
      color: { argb: "FFFFFF" },
    };
    titleCell.alignment = { horizontal: "left", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "0083BF" },
    };
    titleCell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    worksheet.getRow(2).height = 30;

    const headers = ["S.No", "Payment Ref Id", "Transaction ID", "Flat No", "Customer Name", "Customer Mobile Number", "Amount", "Payment Type", "Payment Towards", "Payment Method", "Bank", "Payment Date", "Receipt", "Comment"];
    worksheet.getRow(3).values = headers;
    const headerRow = worksheet.getRow(3);
    headerRow.font = {
      name: "Calibri",
      bold: true,
      size: 12,
      color: { argb: "000000" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9E1F2" },
    };
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    worksheet.columns = [
      { header: "S.No", key: "S.No" },
      { header: "Payment Ref Id", key: "Payment Ref Id" },
      { header: "Transaction ID", key: "Transaction ID" },
      { header: "Flat No", key: "Flat No" },
      { header: "Customer Name", key: "Customer Name" },
      { header: "Customer Mobile Number", key: "Customer Mobile Number" },
      { header: "Amount", key: "Amount" },
      { header: "Payment Type", key: "Payment Type" },
      { header: "Payment Towards", key: "Payment Towards" },
      { header: "Payment Method", key: "Payment Method" },
      { header: "Bank", key: "Bank" },
      { header: "Payment Date", key: "Payment Date" },
      { header: "Receipt", key: "Receipt" },
      { header: "Comment", key: "Comment" },
    ];

    worksheet.addRows(worksheetData);

    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        let columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : 20 + 2;
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 4) {
        row.font = { name: "Calibri", size: 11, color: { argb: "2B2B2B99" } };
        row.alignment = { vertical: "middle" };
        row.height = 20;
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
        });
        row.getCell("Customer Name").alignment = { horizontal: "center" };
        row.getCell("Customer Mobile Number").alignment = {
          horizontal: "center",
        };
        row.getCell("Payment Date").numFmt = "yyyy-mm-dd";
      }
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=customer-report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error(`Get Flat Payments For Excel Error: ${error.message}, File: flatController-GetFlatPaymentsForExcel`);
    return res.status(500).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

exports.GetFlatsForExcel = async (req, res) => {
  const { searchQuery, startDate, endDate, status, customerId } = req.query;

  try {
    const searchCondition = {};
    if (searchQuery) {
      searchCondition.OR = [{ flat_no: { contains: searchQuery } }, { block: { block_name: { contains: searchQuery } } }];
    }

    if (customerId) {
      searchCondition.customer = {
        id: customerId,
      };
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
        lte: new Date(endDate),
      };
    }

    if (status) {
      searchCondition.status = status;
    }

    const flats = await prisma.flat.findMany({
      where: searchCondition,

      select: {
        id: true,
        flat_no: true,
        block: true,
        floor_no: true,
        square_feet: true,
        facing: true,
        type: true,
        status: true,
        totalAmount: true,
        mortgage: true,
        corner: true,
        east_face: true,
        west_face: true,
        north_face: true,
        south_face: true,
        project: {
          select: {
            project_name: true,
          },
        },
        customer: {
          select: {
            id: true,
            profile_pic_url: true,
            prefixes: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_code: true,
            phone_number: true,
          },
        },
        created_at: true,
      },
    });

    const flatDetails = flats.map((flat) => ({
      id: flat?.id,
      flat_no: flat?.flat_no,
      project_name: flat?.project?.project_name,
      block: flat?.block,
      floor_no: flat?.floor_no,
      square_feet: flat?.square_feet,
      facing: flat?.facing,
      east_face: flat?.east_face,
      west_face: flat?.west_face,
      north_face: flat?.north_face,
      south_face: flat?.south_face,
      mortgage: flat?.mortgage ? "Yes" : "No",
      corner: flat?.corner ? "Yes" : "No",
      type: flat?.type,
      status: flat?.status,
      totalAmount: flat?.totalAmount || 0,
      customer: flat?.customer ? `${flat?.customer?.prefixes || ""} ${flat?.customer?.first_name} ${flat?.customer?.last_name || ""}`.trim() : "N/A",
      customer_details: {
        id: flat?.customer?.id,
        profile_pic_url: flat?.customer?.profile_pic_url,
        prefixes: flat?.customer?.prefixes,
        first_name: flat?.customer?.first_name,
        email: flat?.customer?.email,
        phone_code: flat?.customer?.phone_code,
        phone_number: flat?.customer?.phone_number,
      },
      created_at: flat?.created_at,
    }));
    let customerName;

    if (customerId) {
      customerName = await prisma.customers.findFirst({
        where: {
          id: customerId,
        },
        select: {
          prefixes: true,
          first_name: true,
          last_name: true,
        },
      });
    }

    const flatsData = flatDetails;

    const worksheetData = flatsData.map((flat) => ({
      "Ref ID": flat.id || "N/A",
      "Customer Name": flat.customer || "N/A",
      "Customer Email": flat.customer_details?.email || "N/A",
      "Customer Phone": flat.customer_details ? `+${flat.customer_details.phone_code || ""} ${flat.customer_details.phone_number || ""}`.trim() : "N/A",
      "Project": flat.project_name || "N/A",
      "Flat No": flat.flat_no || "N/A",
      "Floor No": flat.floor_no || "N/A",
      "Block": flat.block?.block_name || "N/A",
      "Mortgage": flat.mortgage,
      "Area(Sq.ft.)": flat.square_feet || 0,
      "Facing": flat.facing || "N/A",
      "East Facing View": flat.east_face || "N/A",
      "West Facing View": flat.west_face || "N/A",
      "North Facing View": flat.north_face || "N/A",
      "South Facing View": flat.south_face || "N/A",
      "Corner": flat.corner,
      Status: flat.status || "N/A",
      "Total Amount": flat.totalAmount ? parseFloat(flat.totalAmount) : 0,
      "Created At": flat.created_at ? new Date(flat.created_at).toLocaleDateString("en-CA") : "N/A",
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Flats Report");

    worksheet.getRow(1).height = 5;

    const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString("en-IN") : null;
    const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString("en-IN") : null;

    let mainHeader = "Abode Flats";
    if (formattedStartDate && formattedEndDate) {
      mainHeader += ` (From ${formattedStartDate} to ${formattedEndDate})`;
    } else if (formattedStartDate) {
      mainHeader += ` (From ${formattedStartDate})`;
    } else if (formattedEndDate) {
      mainHeader += ` (Up to ${formattedEndDate})`;
    }

    if (status) {
      mainHeader += ` (${status})`;
    }

    if (searchQuery) {
      mainHeader += `Search by (${searchQuery})`;
    }

    if (customerId) {
      mainHeader += `Customer - (${customerName.first_name}) - (${customerName.last_name})`;
    }

    worksheet.mergeCells("A2:J2");
    const titleCell = worksheet.getCell("A2");
    titleCell.value = mainHeader;
    titleCell.font = {
      name: "Calibri",
      size: 16,
      bold: true,
      color: { argb: "FFFFFF" },
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "0083BF" },
    };
    titleCell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    worksheet.getRow(2).height = 30;

    const headers = ["Ref ID", "Customer Name", "Customer Email", "Customer Phone", "Project", "Flat No", "Floor No", "Block", "Mortgage", "Area(Sq.ft.)", "Facing", "East Facing View", "West Facing View", "North Facing View", "South Facing View", "Corner", "Status", "Total Amount", "Created At"];
    worksheet.getRow(3).values = headers;
    const headerRow = worksheet.getRow(3);
    headerRow.font = {
      name: "Calibri",
      bold: true,
      size: 12,
      color: { argb: "000000" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9E1F2" },
    };
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    worksheet.columns = [
      { header: "Ref ID", key: "Ref ID", width: 20 },
      { header: "Customer Name", key: "Customer Name", width: 20 },
      { header: "Customer Email", key: "Customer Email", width: 25 },
      { header: "Customer Phone", key: "Customer Phone", width: 20 },
      { header: "Project", key: "Project", width: 20 },
      { header: "Flat No", key: "Flat No", width: 10 },
      { header: "Floor No", key: "Floor No", width: 10 },
      { header: "Block", key: "Block", width: 15 },
      { header: "Mortgage", key: "Mortgage", width: 10 },
      { header: "Area(Sq.ft.)", key: "Area(Sq.ft.)", width: 15 },
      { header: "Facing", key: "Facing", width: 15 },
      { header: "East Facing View", key: "East Facing View", width: 20 },
      { header: "West Facing View", key: "West Facing View", width: 20 },
      { header: "North Facing View", key: "North Facing View", width: 20 },
      { header: "South Facing View", key: "South Facing View", width: 20 },
      { header: "Corner", key: "Corner", width: 10 },
      { header: "Status", key: "Status", width: 10 },
      { header: "Total Amount", key: "Total Amount", width: 20 },
      { header: "Created At", key: "Created At", width: 12 },
    ];

    worksheet.addRows(worksheetData);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 4) {
        row.font = { name: "Calibri", size: 11, color: { argb: "2B2B2B99" } };
        row.alignment = { vertical: "middle" };
        row.height = 20;
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
        });
        row.getCell("Floor No").alignment = { horizontal: "center" };
        row.getCell("Status").alignment = { horizontal: "center" };
        row.getCell("Total Amount").numFmt = "₹#,##0.00";
        row.getCell("Created At").numFmt = "yyyy-mm-dd";
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=flats-report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error(`Get Flats For Excel Error: ${error.message}, File: flatController-GetFlatsForExcel`);
    return res.status(500).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

exports.getCustomerFlats = async (req, res) => {
  const { customer_id_ref } = req.query;
  try {
    const customer = await prisma.customers.findFirst({
      where: {
        id: customer_id_ref,
      },
    });

    if (!customer) {
      return res.status(200).json({
        status: "error",
        message: "Customer is not found",
      });
    }

    const flatsList = await prisma.flat.findMany({
      where: {
        customer_id: customer.id,
      },
      select: {
        id: true,
        flat_no: true,
        block: {
          select: {
            block_name: true,
          },
        },
      },
    });

    const formattedFlats = flatsList.map((customer) => ({
      value: customer?.id?.toString(),
      label: `Flat No: ${customer?.flat_no}, Block: ${customer?.block?.block_name}`,
    }));

    return res.status(200).json({
      status: "success",
      message: "Flats fetched successfully",
      customerflats: formattedFlats,
    });
  } catch (error) {
    logger.error(`Get Customer Flats Error: ${error.message}, File: flatController-getCustomerFlats`);
    return res.status(500).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

exports.uploadParsedFlats = async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (error, fields, files) => {
    if (error) {
      console.log(`Error parsing form: ${error}`);
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }

    const file = files.bulkflats?.[0];
    const employee_id = fields.employee_id?.[0];
    if (!file) {
      return res.status(200).json({
        status: "error",
        message: "No file uploaded.",
      });
    }

    try {
      const workbook = xlsx.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      // ✅ Flat Type mapping: label → value
      const flatTypeMap = {
        "2 BHK": "2 BHK",
        "3 BHK": "3 BHK",
      };

      const googleMapRegex = /^https:\/\/(www\.)?google\.[a-z.]+\/maps|^https:\/\/maps\.app\.goo\.gl\//;

      const inserted = [];
      const skipped = [];

      for (const row of data) {
        try {
          // ✅ Required Columns Validation
          const requiredFields = [
            "Project",
            "Block",
            "Floor No",
            "Flat No",
            "Area(Sq.ft.)",
            "Flat Type",
            "Facing",
          ];

          const missingFields = requiredFields.filter(
            (field) => !row[field] || row[field].toString().trim() === ""
          );

          if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
          }

          // ✅ find or create block
          const project = row["Project"];
          let projectId = null;
          if (project) {
            const projectData = await prisma.project.findFirst({
              where: {
                project_name: project,
              },
            });
            if (projectData) {
              projectId = projectData.id;
            } else {
              console.log(`Project not found: ${project}`);
            }
          }


          if (!row["Flat No"]) {
            throw new Error(`Flat No is empty`);
          }

          if (!row["Block"] || !row["Block"].trim()) {
            throw new Error(`Block value is empty`);
          }

          let blockRecord = await prisma.block.findFirst({
            where: {
              block_name: row["Block"]?.trim(),
              project_id: projectId
            },
          });

          if (!blockRecord) {
            blockRecord = await prisma.block.create({
              data: {
                id: uuidv4(),
                block_name: row["Block"]?.trim(),
                project_id: projectId,
              },
            });
          }


          let groupOwnerRecord = null;

          if (row["Group/Owner"]?.trim()) {
            groupOwnerRecord = await prisma.groupowner.findFirst({
              where: { name: row["Group/Owner"].trim() },
            });

            if (!groupOwnerRecord) {
              groupOwnerRecord = await prisma.groupowner.create({
                data: {
                  id: uuidv4(),
                  name: row["Group/Owner"].trim(),
                },
              });
            }
          }

          // ✅ Convert Yes/No → Boolean
          const parseBoolean = (val) => {
            if (!val) return null;
            return val.toString().toLowerCase() === "yes" ? true : false;
          };

          const corner = parseBoolean(row["Corner"]);
          let flatReward = parseBoolean(row["Flat Reward"]);
          if (flatReward === null) flatReward = false;
          // const floorRise = parseBoolean(row["Floor Rise"]);

          // ✅ Convert Flat Type label → value
          const flatTypeValue = flatTypeMap[row["Flat Type"]] || null;

          // ✅ check if flat already exists with same flat_no and same block
          const existingFlat = await prisma.flat.findFirst({
            where: {
              flat_no: row["Flat No"]?.toString(),
              block_id: blockRecord.id,
              project_id: projectId,
            },
          });

          if (existingFlat) {
            throw new Error(`Duplicate Flat: Flat No ${row["Flat No"]} already exists in Block ${row["Block"]}`);
          }

          // ✅ Validate Google Map Link
          let googleMapLink = row["Google Map Link"]?.toString().trim() || null;
          if (googleMapLink && !googleMapRegex.test(googleMapLink)) {
            console.log(`Invalid Google Map Link found: ${googleMapLink}`);
            googleMapLink = null;
          }

          // REMOVED: const uuid = "ABODE" + Math.floor(100000000 + Math.random() * 900000000).toString();

          // ✅ Create flat with relations
          const newFlat = await prisma.flat.create({
            data: {
              flat_no: row["Flat No"]?.toString(),
              floor_no: row["Floor No"]?.toString(),
              block_id: blockRecord.id,
              square_feet: row["Area(Sq.ft.)"] ? parseFloat(row["Area(Sq.ft.)"]) : null,
              udl: row["UDL"]?.toString(),
              deed_number: row["Deed No"]?.toString(),
              type: flatTypeValue, // ✅ store value, not label
              bedrooms: row["Bedrooms"] ? parseInt(row["Bedrooms"]) : null,
              bathrooms: row["Bathrooms"] ? parseInt(row["Bathrooms"]) : null,
              balconies: row["Balconies"] ? parseInt(row["Balconies"]) : null,
              parking: row["Parking Area(Sq.ft.)"] ? parseFloat(row["Parking Area(Sq.ft.)"]) : null,
              facing: row["Facing"], // must match facingOptions value
              east_face: row["East Facing View"]?.toString(),
              west_face: row["West Facing View"]?.toString(),
              north_face: row["North Facing View"]?.toString(),
              south_face: row["South Facing View"]?.toString(),
              furnished_status: row["Furnishing Status"], // must match furnishingOptions value
              description: row["Description"]?.toString(),
              google_map_link: googleMapLink,
              flat_reward: flatReward,
              corner,
              // floor_rise: floorRise,
              group_owner_id: groupOwnerRecord ? groupOwnerRecord.id : null,
              project_id: projectId,
              added_by_employee_id: employee_id,
            },
          });

          await prisma.taskactivities.create({
            data: {
              employee_id: employee_id,
              flat_id: newFlat.id,
              ta_message: `${newFlat.flat_no} Flat Added via bulk upload`,
            },
          });

          inserted.push({
            project: row["Project"],
            block: row["Block"],
            flat_no: row["Flat No"],
          });
        } catch (err) {
          console.error(`Error processing row: ${JSON.stringify(row)} | ${err.message}`);
          skipped.push({ row, reason: err.message });
        }
      }

      return res.status(200).json({
        status: "success",
        message: `Successfully processed ${inserted.length} flats. ${skipped.length} rows were skipped.`,
        insertedCount: inserted.length,
        skippedCount: skipped.length,
        inserted,
        skipped: skipped.slice(0, 10), // Only return top 10 for size constraints
      });
    } catch (error) {
      logger.error(`Upload Parsed Flats Error: ${error.message}, File: flatController-uploadParsedFlats`);
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  });
};

module.exports.FlatUpdateActivities = async (req, res) => {
  const { customerflat_id, limit, offset = 0 } = req.query;

  try {
    if (!customerflat_id) {
      return res.status(400).json({
        status: "error",
        message: "Flat ID is required",
      });
    }

    // Get total count for pagination
    const totalCount = await prisma.customerflatupdateactivities.count({
      where: {
        customerflat_id: customerflat_id,
      },
    });

    const taskactivities = await prisma.customerflatupdateactivities.findMany({
      where: {
        customerflat_id: customerflat_id,
      },
      select: {
        id: true,
        message: true,
        created_at: true,
        updated_at: true,
        employeedetails: {
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
      take: limit ? Number(limit) : undefined,
      skip: Number(offset),
    });

    const activities = taskactivities.map((activity) => ({
      id: activity.id,
      message: activity.message,
      created_at: activity.created_at,
      updated_at: activity.updated_at,
      employee_id: activity.employeedetails.id,
      employee_name: activity.employeedetails.name,
      profilePicture: activity.employeedetails.profile_pic_url,
    }));

    return res.status(200).json({
      status: "success",
      message: "Customer flat updated activities fetched successfully",
      activities: activities,
      totalCount,
      hasMore: Number(offset) + activities.length < totalCount,
    });
  } catch (error) {
    logger.error(`Flat Activities Error: ${error.message}, File: flatController-FlatActivities`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

module.exports.GetFlatStages = async (req, res) => {
  const { flat_uuid } = req.query;

  try {
    if (!flat_uuid) {
      return res.status(200)({
        status: "error",
        message: "Flat UUID is required",
      })
    }

    const flat = await prisma.flat.findFirst({
      where: {
        id: flat_uuid,
      },
      select: {
        id: true,
      }
    });

    if (!flat) {
      return res.status(200).json({
        status: "error",
        message: "Flat is not found",
      })
    }

    const flat_id = flat?.id;

    const flat_stages_details = await prisma.bookingStages.findMany({
      where: {
        flat_id: flat_id,
      },
      select: {
        name: true,
        created_at: true,
      }
    })

    const flat_stages = flat_stages_details.map((stage) => {
      return {
        name: stage?.name,
        created_at: stage?.created_at,
      }
    })

    return res.status(200).json({
      status: "success",
      flat_stages: flat_stages,
    })

  } catch (error) {
    logger.error(`Get Flat Stages Error: ${error.message}, File: flatController-GetFlatStages`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

// module.exports.downloadSalesDeed = async (req, res) => {
//   const { formate, flatuuid } = req.query;
//   try {
//     const project = await prisma.project.findFirst({});
//     const flatdetails = await prisma.flat.findFirst({
//       where: {
//         id: flatuuid,
//       },
//       include: {
//         customer: {
//           include: {
//             Profession: true,
//             Customeraddress: {
//               where: {
//                 address_type: "Correspondence"
//               },
//               include: {
//                 city_to_customers: true,
//                 state_to_customers: true,
//                 country_to_customers: true
//               }
//             }
//           }
//         },
//         block: true,
//         payments: true
//       }
//     });

//     const pathName = await prisma.saledeedtemplates.findFirst();
//     if (!pathName || !pathName.path) {
//       return res.status(200).json({
//         status: "main_error",
//         message: "No sale deed template found. Please upload a template first.",
//       });
//     }
//     // 1. Load the template
//     const templatePath = path.join(process.cwd(), "uploads", pathName.path);
//     if (!fs.existsSync(templatePath)) {
//       return res.status(200).json({
//         status: "main_error",
//         message: "Template file not found on server. Please re-upload the template.",
//       });
//     }

//     const content = fs.readFileSync(templatePath, "binary");

//     // 2. Initialize docxtemplater
//     const zip = new PizZip(content);

//     const correspondenceAddress = flatdetails.customer.Customeraddress[0];

//     let missingFields = [];

//     // Project fields
//     if (!project?.project_name) {
//       missingFields.push({ section: "project", field: "Project Name" });
//     }

//     // Customer fields
//     if (!flatdetails?.customer?.first_name || !flatdetails?.customer?.last_name) {
//       missingFields.push({ section: "customer", field: "Customer Name" });
//     }
//     if (flatdetails?.customer?.first_name && flatdetails?.customer?.last_name && !flatdetails?.customer?.prefixes) {
//       missingFields.push({ section: "customer", field: "Customer Prefix" });
//     }
//     if (!flatdetails?.customer?.gender) {
//       missingFields.push({ section: "customer", field: "Gender" });
//     }
//     // if (!flatdetails?.customer?.father_name && !flatdetails?.customer?.spouse_name) {
//     //   missingFields.push({ section: "customer", field: "Father/Spouse Name" });
//     // }
//     // if (!flatdetails?.customer?.father_name && flatdetails?.customer?.spouse_name && !flatdetails?.customer?.spouse_prefixes) {
//     //   missingFields.push({ section: "customer", field: "Spouse Prefix" });
//     // }
//     if (!flatdetails?.customer?.date_of_birth) {
//       missingFields.push({ section: "customer", field: "Date of Birth" });
//     }
//     if (!flatdetails?.customer?.aadhar_card_no) {
//       missingFields.push({ section: "customer", field: "Aadhaar Number" });
//     }
//     if (!flatdetails?.customer?.pan_card_no) {
//       missingFields.push({ section: "customer", field: "PAN Number" });
//     }

//     // Profession
//     if (!flatdetails?.customer?.Profession[0]?.current_designation) {
//       missingFields.push({ section: "customer", field: "Occupation" });
//     }

//     // Address
//     if (!correspondenceAddress?.address) {
//       missingFields.push({ section: "customer", field: "Present Address" });
//     }
//     if (!correspondenceAddress?.city) {
//       missingFields.push({ section: "customer", field: "Present Address City" });
//     }
//     if (!correspondenceAddress?.state) {
//       missingFields.push({ section: "customer", field: "Present Address State" });
//     }
//     if (!correspondenceAddress?.country) {
//       missingFields.push({ section: "customer", field: "Present Address Country" });
//     }
//     if (!correspondenceAddress?.pincode) {
//       missingFields.push({ section: "customer", field: "Present Address Pincode" });
//     }

//     // Flat details
//     if (!flatdetails?.flat_no) missingFields.push({ section: "flat", field: "Flat Number" });
//     if (!flatdetails?.floor_no) missingFields.push({ section: "flat", field: "Floor Number" });
//     if (!flatdetails?.block?.block_name) missingFields.push({ section: "flat", field: "Block Name" });
//     if (!flatdetails?.square_feet) missingFields.push({ section: "flat", field: "Square Feet" });
//     if (!flatdetails?.udl) missingFields.push({ section: "flat", field: "UDL" });
//     if (!flatdetails?.parking) missingFields.push({ section: "flat", field: "Parking Area" });
//     if (!flatdetails?.totalAmount) missingFields.push({ section: "flatcost", field: "Total Amount" });

//     // Facing directions
//     if (!flatdetails?.north_face) missingFields.push({ section: "flat", field: "North Face" });
//     if (!flatdetails?.south_face) missingFields.push({ section: "flat", field: "South Face" });
//     if (!flatdetails?.east_face) missingFields.push({ section: "flat", field: "East Face" });
//     if (!flatdetails?.west_face) missingFields.push({ section: "flat", field: "West Face" });

//     // Receipts
//     if (!flatdetails?.payments?.length || flatdetails?.payments?.length <= 0) {
//       missingFields.push({ section: "payment", field: "Payments" });
//     }

//     if (missingFields.length > 0) {
//       return res.status(200).json({
//         status: "error",
//         message: "Missing required fields",
//         missingFields,
//         customerUid: flatdetails?.customer?.id
//       });
//     }
//     let GuardianName = "";

//     if (flatdetails?.customer?.gender === "Female") {
//       if (flatdetails?.customer?.marital_status === "Married" && flatdetails?.customer?.spouse_name) {
//         GuardianName = `W/O ${flatdetails?.customer?.spouse_prefixes || ""} ${flatdetails?.customer?.spouse_name},`;
//       } else if (flatdetails?.customer?.father_name) {
//         GuardianName = `D/O Mr. ${flatdetails?.customer?.father_name},`;
//       }
//     } else if (flatdetails?.customer?.gender === "Male") {
//       if (flatdetails?.customer?.father_name) {
//         GuardianName = `S/O Mr. ${flatdetails?.customer?.father_name},`;
//       }
//     }

//     const doc = new Docxtemplater(zip, {
//       delimiters: { start: '<<', end: '>>' }
//     });
//     // 3. Replace placeholder(s)
//     doc.render({
//       DATE: dayjs(new Date).format("DD MMM YYYY"),
//       PROJECT_NAME: project.project_name,
//       NUM_KEY: flatdetails.customer.prefixes,
//       NAME: flatdetails.customer.first_name + " " + flatdetails.customer.last_name,
//       GUARDIAN_NAME: GuardianName,
//       AGE: calculateAge(flatdetails.customer.date_of_birth),
//       OCCUPATION: flatdetails.customer.Profession[0].current_designation,
//       AADHAAR_NUMBER: flatdetails.customer.aadhar_card_no,
//       PAN_NUMBER: flatdetails.customer.pan_card_no,
//       ADDRESS: `${correspondenceAddress.address}, ${correspondenceAddress.city_to_customers.name}, ${correspondenceAddress.state_to_customers.name}, ${correspondenceAddress.country_to_customers.name}, ${correspondenceAddress.pincode}`,
//       FLAT_NO: flatdetails.flat_no,
//       FLOOR_NO: numberToWords(flatdetails.floor_no),
//       BLOCK_NO: flatdetails.block.block_name,
//       SFT: flatdetails.square_feet,
//       CAR_PARKING: flatdetails.parking,
//       UDS: flatdetails.udl,
//       SALE_VALUE: `Rs.${flatdetails.totalAmount.toLocaleString("en-IN")}/- (Rupees ${numberToIndianWords(flatdetails.totalAmount)} Only)`,
//       ANN_SALE_VALUE: `Rs.${flatdetails.totalAmount.toLocaleString("en-IN")}/-`,
//       NORTH: flatdetails.north_face,
//       SOUTH: flatdetails.south_face,
//       EAST: flatdetails.east_face,
//       WEST: flatdetails.west_face,
//       receipts: flatdetails.payments.map((p, i) => ({
//         RCPT_NUM: p.trasnaction_id || i + 1,
//         ROMAN_NUM: toRoman(i + 1).toLowerCase(),
//         RCPT_VALUE: `Rs.${p.amount.toLocaleString("en-IN")}/- (Rupees ${numberToIndianWords(p.amount)} Only)`,
//         RCPT_TYPE: p.payment_type,
//         RCPT_DATE: dayjs(p.payment_date).format("DD MMM YYYY"),
//       })),
//     });

//     // 4. Generate buffer
//     const buf = doc.getZip().generate({ type: "nodebuffer" });

//     const tempDocxPath = path.join(process.cwd(), "uploads", "temp_sale_deed.docx");
//     fs.writeFileSync(tempDocxPath, buf);

//     if (formate === "pdf") {
//       // 6. Convert to PDF using LibreOffice
//       const outputPdfPath = path.join(process.cwd(), "uploads", "temp_sale_deed.pdf");

//       const sofficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
//       const cmd = `${sofficePath} --headless --convert-to pdf "${tempDocxPath}" --outdir "${path.dirname(outputPdfPath)}"`;

//       exec(cmd, (error) => {
//         if (error) {
//           console.error("❌ LibreOffice Error:", error);
//           return res.status(200).json({ status: "main_error", message: "PDF conversion failed" });
//         }

//         res.setHeader("Content-Disposition", "attachment; filename=SaleDeed.pdf");
//         res.setHeader("Content-Type", "application/pdf");

//         // 7. Send PDF as download
//         res.download(outputPdfPath, "SaleDeed.pdf", (err) => {
//           if (err) console.error("Download error:", err);
//           // cleanup temp files
//           fs.unlinkSync(tempDocxPath);
//           fs.unlinkSync(outputPdfPath);
//         });
//       });
//     } else {
//       fs.unlinkSync(tempDocxPath);
//       // 5. Send as download
//       res.setHeader("Content-Disposition", "attachment; filename=SaleDeed.docx");
//       res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
//       res.send(buf);
//     }
//   } catch (error) {
//     logger.error(`Error while downloading sales deed. Error: ${error.message}. File: flatController-downloadSalesDeed`);
//     return res.status(500).json({
//       status: "error",
//       message: error.message,
//     });
//   }
// }

module.exports.downloadSalesDeed = async (req, res) => {
  const { formate, flatuuid } = req.query;
  try {
    const project = await prisma.project.findFirst({});
    const flatdetails = await prisma.flat.findFirst({
      where: {
        id: flatuuid,
      },
      include: {
        customer: {
          include: {
            Profession: true,
            Customeraddress: {
              where: {
                address_type: "Correspondence"
              },
              include: {
                city_to_customers: true,
                state_to_customers: true,
                country_to_customers: true
              }
            }
          }
        },
        block: true,
        payments: true
      }
    });

    const pathName = await prisma.agreementtemplates.findFirst();
    if (!pathName || !pathName.path) {
      return res.status(200).json({
        status: "main_error",
        message: "No agreement template found. Please upload a template first.",
      });
    }
    // 1. Load the template
    const templatePath = path.join(process.cwd(), "uploads", pathName.path);
    if (!fs.existsSync(templatePath)) {
      return res.status(200).json({
        status: "main_error",
        message: "Template file not found on server. Please re-upload the template.",
      });
    }

    const content = fs.readFileSync(templatePath, "binary");

    // 2. Initialize docxtemplater
    const zip = new PizZip(content);

    const correspondenceAddress = flatdetails.customer.Customeraddress[0];

    let missingFields = [];

    // Project fields
    if (!project?.project_name) {
      missingFields.push({ section: "project", field: "Project Name" });
    }

    // Customer fields
    if (!flatdetails?.customer?.first_name || !flatdetails?.customer?.last_name) {
      missingFields.push({ section: "customer", field: "Customer Name" });
    }
    if (flatdetails?.customer?.first_name && flatdetails?.customer?.last_name && !flatdetails?.customer?.prefixes) {
      missingFields.push({ section: "customer", field: "Customer Prefix" });
    }
    if (!flatdetails?.customer?.gender) {
      missingFields.push({ section: "customer", field: "Gender" });
    }
    if (!flatdetails?.customer?.date_of_birth) {
      missingFields.push({ section: "customer", field: "Date of Birth" });
    }
    if (!flatdetails?.customer?.aadhar_card_no) {
      missingFields.push({ section: "customer", field: "Aadhaar Number" });
    }
    if (!flatdetails?.customer?.pan_card_no) {
      missingFields.push({ section: "customer", field: "PAN Number" });
    }

    // Profession
    if (!flatdetails?.customer?.Profession[0]?.current_designation) {
      missingFields.push({ section: "customer", field: "Designation" });
    }

    // Address
    if (!correspondenceAddress?.address) {
      missingFields.push({ section: "customer", field: "Present Address" });
    }
    if (!correspondenceAddress?.city) {
      missingFields.push({ section: "customer", field: "Present Address City" });
    }
    if (!correspondenceAddress?.state) {
      missingFields.push({ section: "customer", field: "Present Address State" });
    }
    if (!correspondenceAddress?.country) {
      missingFields.push({ section: "customer", field: "Present Address Country" });
    }
    if (!correspondenceAddress?.pincode) {
      missingFields.push({ section: "customer", field: "Present Address Pincode" });
    }

    // Flat details
    if (!flatdetails?.flat_no) missingFields.push({ section: "flat", field: "Flat Number" });
    if (!flatdetails?.floor_no) missingFields.push({ section: "flat", field: "Floor Number" });
    if (!flatdetails?.block?.block_name) missingFields.push({ section: "flat", field: "Block Name" });
    if (!flatdetails?.square_feet) missingFields.push({ section: "flat", field: "Square Feet" });
    if (!flatdetails?.udl) missingFields.push({ section: "flat", field: "UDL" });
    if (!flatdetails?.parking) missingFields.push({ section: "flat", field: "Parking Area" });
    if (!flatdetails?.totalAmount) missingFields.push({ section: "flatcost", field: "Total Amount" });

    // Facing directions
    if (!flatdetails?.north_face) missingFields.push({ section: "flat", field: "North Face" });
    if (!flatdetails?.south_face) missingFields.push({ section: "flat", field: "South Face" });
    if (!flatdetails?.east_face) missingFields.push({ section: "flat", field: "East Face" });
    if (!flatdetails?.west_face) missingFields.push({ section: "flat", field: "West Face" });

    // Receipts
    if (!flatdetails?.payments?.length || flatdetails?.payments?.length <= 0) {
      missingFields.push({ section: "payment", field: "Payments" });
    }

    if (missingFields.length > 0) {
      return res.status(200).json({
        status: "error",
        message: "Missing required fields",
        missingFields,
        customerUid: flatdetails?.customer?.id
      });
    }
    let GuardianName = "";

    if (flatdetails?.customer?.gender === "Female") {
      if (flatdetails?.customer?.marital_status === "Married" && flatdetails?.customer?.spouse_name) {
        GuardianName = `W/O ${flatdetails?.customer?.spouse_prefixes || ""} ${flatdetails?.customer?.spouse_name},`;
      } else if (flatdetails?.customer?.father_name) {
        GuardianName = `D/O Mr. ${flatdetails?.customer?.father_name},`;
      }
    } else if (flatdetails?.customer?.gender === "Male") {
      if (flatdetails?.customer?.father_name) {
        GuardianName = `S/O Mr. ${flatdetails?.customer?.father_name},`;
      }
    }

    const doc = new Docxtemplater(zip, {
      delimiters: { start: '<<', end: '>>' }
    });

    // 3. Replace placeholder(s)
    doc.render({
      DATE: dayjs(new Date).format("DD MMM YYYY"),
      PROJECT_NAME: project.project_name,
      NUM_KEY: flatdetails.customer.prefixes,
      NAME: flatdetails.customer.first_name + " " + flatdetails.customer.last_name,
      GUARDIAN_NAME: GuardianName,
      AGE: calculateAge(flatdetails.customer.date_of_birth),
      OCCUPATION: flatdetails.customer.Profession[0].current_designation,
      AADHAAR_NUMBER: flatdetails.customer.aadhar_card_no,
      PAN_NUMBER: flatdetails.customer.pan_card_no,
      ADDRESS: `${correspondenceAddress.address}, ${correspondenceAddress.city_to_customers.name}, ${correspondenceAddress.state_to_customers.name}, ${correspondenceAddress.country_to_customers.name}, ${correspondenceAddress.pincode}`,
      FLAT_NO: flatdetails.flat_no,
      FLOOR_NO: numberToWords(flatdetails.floor_no),
      BLOCK_NO: flatdetails.block.block_name,
      SFT: flatdetails.square_feet,
      UDS: flatdetails.udl,
      SALE_VALUE: `Rs.${flatdetails.totalAmount.toLocaleString("en-IN")}/- (Rupees ${numberToIndianWords(flatdetails.totalAmount)} Only)`,
      ANN_SALE_VALUE: `Rs.${flatdetails.totalAmount.toLocaleString("en-IN")}/-`,
      receipts: flatdetails.payments.map((p, i) => ({
        RCPT_NUM: p.trasnaction_id || i + 1,
        ROMAN_NUM: toRoman(i + 1).toLowerCase(),
        RCPT_VALUE: `Rs.${p.amount.toLocaleString("en-IN")}/- (Rupees ${numberToIndianWords(p.amount)} Only)`,
        RCPT_TYPE: p.payment_type,
        RCPT_DATE: dayjs(p.payment_date).format("DD MMM YYYY"),
      })),
      CAR_PARKING: flatdetails.parking,
      NORTH: flatdetails.north_face,
      SOUTH: flatdetails.south_face,
      EAST: flatdetails.east_face,
      WEST: flatdetails.west_face,
    });

    // 4. Generate buffer
    const buf = doc.getZip().generate({ type: "nodebuffer" });

    // Create directory structure for flat templates
    const flatTemplateDir = path.join(process.cwd(), "uploads", "flats", flatuuid, "templates");
    if (!fs.existsSync(flatTemplateDir)) {
      fs.mkdirSync(flatTemplateDir, { recursive: true });
    }

    // Generate unique filenames with timestamp
    const timestamp = Date.now();
    const docxFileName = `Saledeed_${timestamp}.docx`;
    const pdfFileName = `Saledeed_${timestamp}.pdf`;

    const finalDocxPath = path.join(flatTemplateDir, docxFileName);
    const finalPdfPath = path.join(flatTemplateDir, pdfFileName);

    // Save DOCX file permanently
    fs.writeFileSync(finalDocxPath, buf);

    // Store file paths in flats table
    const fileUrlBase = `${process.env.API_URL}/uploads/flats/${flatuuid}/templates`;

    const updateData = {
      word_sale_deed_template_path: `flats/${flatuuid}/templates/${docxFileName}`,
      word_sale_deed_template_url: `${fileUrlBase}/${docxFileName}`,
      updated_at: new Date(),
    };

    if (formate === "pdf") {
      // Convert to PDF using LibreOffice
      const tempDocxPath = path.join(process.cwd(), "uploads", "temp_sale_deed.docx");
      fs.writeFileSync(tempDocxPath, buf);

      const sofficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
      const cmd = `${sofficePath} --headless --convert-to pdf "${tempDocxPath}" --outdir "${path.dirname(finalPdfPath)}"`;

      exec(cmd, async (error) => {
        if (error) {
          console.error("❌ LibreOffice Error:", error);
          // Cleanup temp file
          fs.unlinkSync(tempDocxPath);
          return res.status(200).json({ status: "main_error", message: "PDF conversion failed" });
        }

        // Rename the generated PDF to our desired filename
        const tempPdfPath = path.join(path.dirname(finalPdfPath), "temp_sale_deed.pdf");
        if (fs.existsSync(tempPdfPath)) {
          fs.renameSync(tempPdfPath, finalPdfPath);
        }

        // Update flats table with PDF info
        await prisma.flat.update({
          where: {
            id: flatuuid
          },
          data: {
            ...updateData,
            pdf_sale_deed_template_path: `flats/${flatuuid}/templates/${pdfFileName}`,
            pdf_sale_deed_template_url: `${fileUrlBase}/${pdfFileName}`,
          }
        });

        res.setHeader("Content-Disposition", "attachment; filename=SaleDeed.pdf");
        res.setHeader("Content-Type", "application/pdf");

        // Send PDF as download
        res.download(finalPdfPath, "SaleDeed.pdf", (err) => {
          if (err) console.error("Download error:", err);
          // Cleanup temp file only, keep final files
          fs.unlinkSync(tempDocxPath);
        });
      });
    } else {
      // Store DOCX info in flats table
      await prisma.flat.update({
        where: {
          id: flatuuid
        },
        data: updateData
      });

      // Send as download
      res.setHeader("Content-Disposition", "attachment; filename=SaleDeed.docx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.send(buf);
    }
  } catch (error) {
    logger.error(`Error while downloading sale deed. Error: ${error.message}. File: flatController-downloadSaleDeed`);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports.uploadSaledeedTemplate = async (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    // Handle parsing errors
    if (err) {
      logger.error(`Upload Tempalte File Error: ${err.message}, File: flatController-uploadSaledeedTemplate `);
      return res.status(500).json({ status: "error", message: err.message });
    }

    // Validate file input
    if (!files.uploadfile?.[0]) {
      return res.status(200).json({
        status: "error",
        message: "File is required",
      });
    }

    const uploadedFiles = files.uploadfile;

    const maindir = path.join(__dirname, "..", "uploads");
    // Check if maindir exists; if not, create it
    if (!fs.existsSync(maindir)) {
      fs.mkdirSync(maindir, { recursive: true });
    }

    const file = uploadedFiles[0];
    const tempPath = file.path;
    const originalFilename = file.originalFilename;
    const ext = path.extname(originalFilename); // keep extension (.docx)

    // Generate unique filename
    const timestamp = Date.now();
    const newFilename = `${path.basename(originalFilename, ext)}_${timestamp}${ext}`;
    const targetPath = path.join(maindir, newFilename);

    // Move file to uploads folder
    fs.copyFileSync(tempPath, targetPath);
    fs.unlinkSync(tempPath);

    try {
      const existing = await prisma.saledeedtemplates.findFirst();

      if (existing) {
        // Remove old file from uploads folder
        const oldFilePath = path.join(maindir, existing.path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }

        // Remove old record from DB
        await prisma.saledeedtemplates.delete({
          where: { id: existing.id },
        });
      }

      const fileUrl = `${process.env.API_URL}/uploads/${newFilename}`;


      await prisma.saledeedtemplates.create({
        data: {
          path: newFilename,
          file_url: fileUrl,
        },
      });

      return res.status(200).json({
        status: "success",
        message: "Template uploaded successfully",
      });
    } catch (error) {
      logger.error(`Upload Template File Error: ${error.message}, File: flatController-uploadSaledeedTemplate `);
      return res.status(500).json({
        status: "error",
        message: "Error saving file info to database",
      });
    }
  });
};

module.exports.uploadAgreementTemplate = async (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    // Handle parsing errors
    if (err) {
      logger.error(`Upload Tempalte File Error: ${err.message}, File: flatController-uploadAgreementTemplate `);
      return res.status(500).json({ status: "error", message: err.message });
    }

    // Validate file input
    if (!files.uploadfile?.[0]) {
      return res.status(200).json({
        status: "error",
        message: "File is required",
      });
    }

    const uploadedFiles = files.uploadfile;

    const maindir = path.join(__dirname, "..", "uploads");
    // Check if maindir exists; if not, create it
    if (!fs.existsSync(maindir)) {
      fs.mkdirSync(maindir, { recursive: true });
    }

    const file = uploadedFiles[0];
    const tempPath = file.path;
    const originalFilename = file.originalFilename;
    const ext = path.extname(originalFilename); // keep extension (.docx)

    // Generate unique filename
    const timestamp = Date.now();
    const newFilename = `${path.basename(originalFilename, ext)}_${timestamp}${ext}`;
    const targetPath = path.join(maindir, newFilename);

    // Move file to uploads folder
    fs.copyFileSync(tempPath, targetPath);
    fs.unlinkSync(tempPath);

    try {
      const existing = await prisma.agreementtemplates.findFirst();

      if (existing) {
        // Remove old file from uploads folder
        const oldFilePath = path.join(maindir, existing.path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }

        // Remove old record from DB
        await prisma.agreementtemplates.delete({
          where: { id: existing.id },
        });
      }

      const fileUrl = `${process.env.API_URL}/uploads/${newFilename}`;

      await prisma.agreementtemplates.create({
        data: {
          path: newFilename,
          file_url: fileUrl,
        },
      });

      return res.status(200).json({
        status: "success",
        message: "Template uploaded successfully",
      });
    } catch (error) {
      logger.error(`Upload Template File Error: ${error.message}, File: flatController-uploadAgreementTemplate `);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  });
};

module.exports.downloadAgreementTemplate = async (req, res) => {
  const { formate, flatuuid } = req.query;
  try {
    const project = await prisma.project.findFirst({});
    const flatdetails = await prisma.flat.findFirst({
      where: {
        id: flatuuid,
      },
      include: {
        customer: {
          include: {
            Profession: true,
            Customeraddress: {
              where: {
                address_type: "Correspondence"
              },
              include: {
                city_to_customers: true,
                state_to_customers: true,
                country_to_customers: true
              }
            }
          }
        },
        block: true,
        payments: true
      }
    });

    const pathName = await prisma.agreementtemplates.findFirst();
    if (!pathName || !pathName.path) {
      return res.status(200).json({
        status: "main_error",
        message: "No agreement template found. Please upload a template first.",
      });
    }
    // 1. Load the template
    const templatePath = path.join(process.cwd(), "uploads", pathName.path);
    if (!fs.existsSync(templatePath)) {
      return res.status(200).json({
        status: "main_error",
        message: "Template file not found on server. Please re-upload the template.",
      });
    }

    const content = fs.readFileSync(templatePath, "binary");

    // 2. Initialize docxtemplater
    const zip = new PizZip(content);

    const correspondenceAddress = flatdetails.customer.Customeraddress[0];

    let missingFields = [];

    // Project fields
    if (!project?.project_name) {
      missingFields.push({ section: "project", field: "Project Name" });
    }

    // Customer fields
    if (!flatdetails?.customer?.first_name || !flatdetails?.customer?.last_name) {
      missingFields.push({ section: "customer", field: "Customer Name" });
    }
    if (flatdetails?.customer?.first_name && flatdetails?.customer?.last_name && !flatdetails?.customer?.prefixes) {
      missingFields.push({ section: "customer", field: "Customer Prefix" });
    }
    if (!flatdetails?.customer?.gender) {
      missingFields.push({ section: "customer", field: "Gender" });
    }
    if (!flatdetails?.customer?.date_of_birth) {
      missingFields.push({ section: "customer", field: "Date of Birth" });
    }
    if (!flatdetails?.customer?.aadhar_card_no) {
      missingFields.push({ section: "customer", field: "Aadhaar Number" });
    }
    if (!flatdetails?.customer?.pan_card_no) {
      missingFields.push({ section: "customer", field: "PAN Number" });
    }

    // Profession
    if (!flatdetails?.customer?.Profession[0]?.current_designation) {
      missingFields.push({ section: "customer", field: "Designation" });
    }

    // Address
    if (!correspondenceAddress?.address) {
      missingFields.push({ section: "customer", field: "Present Address" });
    }
    if (!correspondenceAddress?.city) {
      missingFields.push({ section: "customer", field: "Present Address City" });
    }
    if (!correspondenceAddress?.state) {
      missingFields.push({ section: "customer", field: "Present Address State" });
    }
    if (!correspondenceAddress?.country) {
      missingFields.push({ section: "customer", field: "Present Address Country" });
    }
    if (!correspondenceAddress?.pincode) {
      missingFields.push({ section: "customer", field: "Present Address Pincode" });
    }

    // Flat details
    if (!flatdetails?.flat_no) missingFields.push({ section: "flat", field: "Flat Number" });
    if (!flatdetails?.floor_no) missingFields.push({ section: "flat", field: "Floor Number" });
    if (!flatdetails?.block?.block_name) missingFields.push({ section: "flat", field: "Block Name" });
    if (!flatdetails?.square_feet) missingFields.push({ section: "flat", field: "Square Feet" });
    if (!flatdetails?.udl) missingFields.push({ section: "flat", field: "UDL" });
    if (!flatdetails?.parking) missingFields.push({ section: "flat", field: "Parking Area" });
    if (!flatdetails?.totalAmount) missingFields.push({ section: "flatcost", field: "Total Amount" });

    // Facing directions
    if (!flatdetails?.north_face) missingFields.push({ section: "flat", field: "North Face" });
    if (!flatdetails?.south_face) missingFields.push({ section: "flat", field: "South Face" });
    if (!flatdetails?.east_face) missingFields.push({ section: "flat", field: "East Face" });
    if (!flatdetails?.west_face) missingFields.push({ section: "flat", field: "West Face" });

    // Receipts
    if (!flatdetails?.payments?.length || flatdetails?.payments?.length <= 0) {
      missingFields.push({ section: "payment", field: "Payments" });
    }

    if (missingFields.length > 0) {
      return res.status(200).json({
        status: "error",
        message: "Missing required fields",
        missingFields,
        customerUid: flatdetails?.customer?.id
      });
    }
    let GuardianName = "";

    if (flatdetails?.customer?.gender === "Female") {
      if (flatdetails?.customer?.marital_status === "Married" && flatdetails?.customer?.spouse_name) {
        GuardianName = `W/O ${flatdetails?.customer?.spouse_prefixes || ""} ${flatdetails?.customer?.spouse_name},`;
      } else if (flatdetails?.customer?.father_name) {
        GuardianName = `D/O Mr. ${flatdetails?.customer?.father_name},`;
      }
    } else if (flatdetails?.customer?.gender === "Male") {
      if (flatdetails?.customer?.father_name) {
        GuardianName = `S/O Mr. ${flatdetails?.customer?.father_name},`;
      }
    }

    const doc = new Docxtemplater(zip, {
      delimiters: { start: '<<', end: '>>' }
    });

    // 3. Replace placeholder(s)
    doc.render({
      DATE: dayjs(new Date).format("DD MMM YYYY"),
      PROJECT_NAME: project.project_name,
      NUM_KEY: flatdetails.customer.prefixes,
      NAME: flatdetails.customer.first_name + " " + flatdetails.customer.last_name,
      GUARDIAN_NAME: GuardianName,
      AGE: calculateAge(flatdetails.customer.date_of_birth),
      OCCUPATION: flatdetails.customer.Profession[0].current_designation,
      AADHAAR_NUMBER: flatdetails.customer.aadhar_card_no,
      PAN_NUMBER: flatdetails.customer.pan_card_no,
      ADDRESS: `${correspondenceAddress.address}, ${correspondenceAddress.city_to_customers.name}, ${correspondenceAddress.state_to_customers.name}, ${correspondenceAddress.country_to_customers.name}, ${correspondenceAddress.pincode}`,
      FLAT_NO: flatdetails.flat_no,
      FLOOR_NO: numberToWords(flatdetails.floor_no),
      BLOCK_NO: flatdetails.block.block_name,
      SFT: flatdetails.square_feet,
      UDS: flatdetails.udl,
      SALE_VALUE: `Rs.${flatdetails.totalAmount.toLocaleString("en-IN")}/- (Rupees ${numberToIndianWords(flatdetails.totalAmount)} Only)`,
      ANN_SALE_VALUE: `Rs.${flatdetails.totalAmount.toLocaleString("en-IN")}/-`,
      receipts: flatdetails.payments.map((p, i) => ({
        RCPT_NUM: p.trasnaction_id || i + 1,
        ROMAN_NUM: toRoman(i + 1).toLowerCase(),
        RCPT_VALUE: `Rs.${p.amount.toLocaleString("en-IN")}/- (Rupees ${numberToIndianWords(p.amount)} Only)`,
        RCPT_TYPE: p.payment_type,
        RCPT_DATE: dayjs(p.payment_date).format("DD MMM YYYY"),
      })),
      CAR_PARKING: flatdetails.parking,
      NORTH: flatdetails.north_face,
      SOUTH: flatdetails.south_face,
      EAST: flatdetails.east_face,
      WEST: flatdetails.west_face,
    });

    // 4. Generate buffer
    const buf = doc.getZip().generate({ type: "nodebuffer" });

    // Create directory structure for flat templates
    const flatTemplateDir = path.join(process.cwd(), "uploads", "flats", flatuuid, "templates");
    if (!fs.existsSync(flatTemplateDir)) {
      fs.mkdirSync(flatTemplateDir, { recursive: true });
    }

    // Generate unique filenames with timestamp
    const timestamp = Date.now();
    const docxFileName = `Agreement_${timestamp}.docx`;
    const pdfFileName = `Agreement_${timestamp}.pdf`;

    const finalDocxPath = path.join(flatTemplateDir, docxFileName);
    const finalPdfPath = path.join(flatTemplateDir, pdfFileName);

    // Save DOCX file permanently
    fs.writeFileSync(finalDocxPath, buf);

    // Store file paths in flats table
    const fileUrlBase = `${process.env.API_URL}/uploads/flats/${flatuuid}/templates`;

    const updateData = {
      word_agreement_template_path: `flats/${flatuuid}/templates/${docxFileName}`,
      word_agreement_template_url: `${fileUrlBase}/${docxFileName}`,
      updated_at: new Date(),
    };

    if (formate === "pdf") {
      // Convert to PDF using LibreOffice
      const tempDocxPath = path.join(process.cwd(), "uploads", "temp_agreement.docx");
      fs.writeFileSync(tempDocxPath, buf);

      const sofficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;
      const cmd = `${sofficePath} --headless --convert-to pdf "${tempDocxPath}" --outdir "${path.dirname(finalPdfPath)}"`;

      exec(cmd, async (error) => {
        if (error) {
          console.error("❌ LibreOffice Error:", error);
          // Cleanup temp file
          fs.unlinkSync(tempDocxPath);
          return res.status(200).json({ status: "main_error", message: "PDF conversion failed" });
        }

        // Rename the generated PDF to our desired filename
        const tempPdfPath = path.join(path.dirname(finalPdfPath), "temp_agreement.pdf");
        if (fs.existsSync(tempPdfPath)) {
          fs.renameSync(tempPdfPath, finalPdfPath);
        }

        // Update flats table with PDF info
        await prisma.flat.update({
          where: {
            id: flatuuid
          },
          data: {
            ...updateData,
            pdf_agreement_template_path: `flats/${flatuuid}/templates/${pdfFileName}`,
            pdf_agreement_template_url: `${fileUrlBase}/${pdfFileName}`,
          }
        });

        res.setHeader("Content-Disposition", "attachment; filename=Agreement.pdf");
        res.setHeader("Content-Type", "application/pdf");

        // Send PDF as download
        res.download(finalPdfPath, "Agreement.pdf", (err) => {
          if (err) console.error("Download error:", err);
          // Cleanup temp file only, keep final files
          fs.unlinkSync(tempDocxPath);
        });
      });

      // booking stage update
      const booking = await prisma.bookingStages.findFirst({
        where: {
          flat_id: flatdetails.id,
          customer_id: flatdetails.customer.id,
          name: "Booking"
        }
      })
      if (!booking) {
        return res.status(200).json({
          status: "error",
          message: "Booking Stage Not Found to update the stage",
        })
      }
      await prisma.bookingStages.update({
        where: {
          id: booking?.id
        },
        data: {
          name: "Agreement",
          updated_at: new Date(),
        },
      });
    } else {
      // Store DOCX info in flats table
      await prisma.flat.update({
        where: {
          id: flatuuid
        },
        data: updateData
      });

      // booking stage update
      const booking = await prisma.bookingStages.findFirst({
        where: {
          flat_id: flatdetails.id,
          customer_id: flatdetails.customer.id,
          name: "Booking"
        }
      })
      if (!booking) {
        return res.status(200).json({
          status: "error",
          message: "Booking Stage Not Found to update the stage",
        })
      }
      await prisma.bookingStages.update({
        where: {
          id: booking?.id
        },
        data: {
          name: "Agreement",
          updated_at: new Date(),
        },
      });
      // Send as download
      res.setHeader("Content-Disposition", "attachment; filename=Agreement.docx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.send(buf);
    }

  } catch (error) {
    logger.error(`Error while downloading agreement. Error: ${error.message}. File: flatController-downloadAgreementTemplate`);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports.GetTemplates = async (req, res) => {
  try {
    const agreement_template = await prisma.agreementtemplates.findFirst();
    const agreement_file_url = agreement_template?.file_url

    const sale_deed_template = await prisma.saledeedtemplates.findFirst();
    const sale_deed_file_url = sale_deed_template?.file_url


    return res.status(200).json({
      status: "success",
      agreement_file_url,
      sale_deed_file_url,
    });

  } catch (error) {
    logger.error(`Error while get agreement details. Error: ${error.message}. File: flatController-GetTemplates`);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports.getProjectCharges = async (req, res) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(200).json({
        status: "error",
        message: "Project ID is required",
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: project_id },
      select: {
        project_corner_price: true,
        project_east_price: true,
        project_six_floor_onwards_price: true,
        project_name: true,
        gst_percentage: true,
        manjeera_connection_charges: true,
        manjeera_meter_charges: true,
        documentation_fee: true,
        registration_percentage: true,
        registration_base_charge: true,
        maintenance_rate_per_sqft: true,
        maintenance_duration_months: true,
        corpus_fund: true,
      },
    });

    if (!project) {
      return res.status(200).json({
        status: "error",
        message: "Project not found",
      });
    }

    return res.status(200).json({
      status: "success",
      charges: {
        corner_price: project.project_corner_price,
        east_price: project.project_east_price,
        floor_rise_price: project.project_six_floor_onwards_price,
        gst_percentage: project.gst_percentage,
        manjeera_connection_charges: project.manjeera_connection_charges,
        manjeera_meter_charges: project.manjeera_meter_charges,
        documentation_fee: project.documentation_fee,
        registration_percentage: project.registration_percentage,
        registration_base_charge: project.registration_base_charge,
        maintenance_rate_per_sqft: project.maintenance_rate_per_sqft,
        maintenance_duration_months: project.maintenance_duration_months,
        corpus_fund: project.corpus_fund,
      },
      project_name: project.project_name,
    });
  } catch (error) {
    logger.error(`Get Project Charges Error: ${error.message}, File: flatController-getProjectCharges`);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

exports.getFlatPaymentDetails = async (req, res) => {
  try {
    const { flat_id } = req.query;

    if (!flat_id) {
      return res.status(200).json({
        status: "error",
        message: "Flat ID is required",
      });
    }

    const flatDetails = await prisma.flat.findUnique({
      where: { id: flat_id },
      select: {
        id: true,
        flat_no: true,
        project: {
          select: {
            id: true,
            project_name: true,
          },
        },
        Customerflat: {
          select: {
            grand_total: true,
            application_date: true,
            Ageingrecord: {
              select: {
                loan_Status: true
              }
            },
            customer: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone_code: true,
                phone_number: true,
                profile_pic_url: true
              }
            }
          }
        },
        payments: {
          orderBy: {
            payment_date: 'desc'
          },
          select: {
            id: true,
            amount: true,
            payment_date: true,
            payment_type: true,
            payment_towards: true,
            payment_method: true,
            trasnaction_id: true
          }
        }
      }
    });

    if (!flatDetails) {
      return res.status(200).json({
        status: "error",
        message: "Flat not found"
      });
    }

    const customerFlat = flatDetails.Customerflat[0];
    const grandTotal = customerFlat?.grand_total || 0;
    const payments = flatDetails.payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balance = grandTotal - totalPaid;

    const result = {
      flat_no: flatDetails.flat_no,
      project_name: flatDetails.project?.project_name || null,
      customer_details: customerFlat?.customer || null,
      financials: {
        grand_total: grandTotal,
        total_paid: totalPaid,
        balance: balance
      },
      payment_history: payments,
      advance_payment: totalPaid > 0,
      application_date: customerFlat?.application_date || null,
      loan_status: customerFlat?.Ageingrecord?.[0]?.loan_Status || null
    };

    return res.status(200).json({
      status: "success",
      data: result,
    });

  } catch (error) {
    logger.error(`Get Flat Payment Details Error: ${error.message}, File: flatController-getFlatPaymentDetails`);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};
