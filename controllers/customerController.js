const prisma = require("../utils/client");
const multiparty = require("multiparty");
const fs = require("fs");
const path = require("path");
const { type } = require("os");

const xlsx = require("xlsx");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
const ExcelJS = require("exceljs");
const logger = require("../helper/logger");
const getAllocatedProjectIds = require("../utils/getAllocatedProjectIds");

exports.GetCustomers = async (req, res) => {
  const {
    page,
    limit = 10,
    searchQuery,
    sortby = "created_at",
    sortbyType = "desc",
    startDate,
    endDate,
    projectId,
  } = req.query;

  const parsedLimit = parseInt(limit, 10);

  try {
    let offset = 0;
    if (page > 1) {
      offset = (page - 1) * parsedLimit;
    }

    // Get allocated project IDs for the current user
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);

    const searchCondition = {
      soft_delete: 0,
      ...(projectId && { project_id: projectId }),
      // Filter by allocated projects (null means admin - show all)
      ...(!projectId && allocatedProjectIds !== null && {
        project_id: { in: allocatedProjectIds },
      }),
      ...(searchQuery && {
        OR: [
          { first_name: { startsWith: searchQuery } },
          { last_name: { startsWith: searchQuery } },
          { email: { startsWith: searchQuery } },
          { phone_number: { contains: searchQuery } },
        ],
      }),
    };
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
    //     lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    //   };
    // }

    const customers = await prisma.customers.findMany({
      where: searchCondition,
      take: parsedLimit,
      skip: offset,
      orderBy: {
        created_at: "desc", // Keep original hardcoded sorting
      },

      select: {
        id: true,
        prefixes: true,
        first_name: true,
        last_name: true,
        email: true,
        email_2: true,
        phone_code: true,
        phone_number: true,
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
        loan_rejected: true,
        if_owned_project_name: true,
        status: true,
        profile_pic_url: true,
        profile_pic_path: true,
        project_details: {
          select: {
            id: true,
            project_name: true,
          },
        },
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
        flats: {
          select: {
            id: true,
            flat_no: true,
            floor_no: true,
            block_id: true,
            flat_img_path: true,
            block: {
              select: {
                block_name: true,
              },
            },
            type: true,
            flat_img_url: true,
            square_feet: true,
            totalAmount: true,
          },
        },
      },
    });

    const totalCustomersCount = await prisma.customers.count({
      where: searchCondition,
    });

    const pageCustomerCount = customers.length;

    const customerDetails = customers.map((customer) => ({
      id: customer?.id,
      customer_id_ref: customer?.id,
      prefixes: customer?.prefixes,
      first_name: customer?.first_name,
      last_name: customer?.last_name,
      email: customer?.email,
      phone_code: customer?.phone_code,
      phone_number: customer?.phone_number,
      father_name: customer?.father_name,
      status: customer?.status,
      project_name: customer?.project_details?.project_name ?? null,
      created_at: customer?.created_at,
      pan_card_no: customer?.pan_card_no,
      aadhar_card_no: customer?.aadhar_card_no,
      marital_status: customer?.marital_status,
      loan_rejected: customer?.loan_rejected,
      country_of_citizenship:
        customer?.country_of_citizenship_details?.name ?? null,
      country_of_residence:
        customer?.country_of_residence_details?.name ?? null,
      mother_tongue: customer?.mother_tongue,
      flat_details:
        customer?.flats.map((flat) => ({
          id: flat?.id,
          flat_no: flat?.flat_no,
          floor_no: flat?.floor_no,
          flat_img_path: flat?.flat_img_path,
          flat_img_url: flat?.flat_img_url,
          square_feet: flat?.square_feet,
          totalAmount: flat?.totalAmount,
          block: flat?.block,
          type: flat?.type,
        })) ?? [],
    }));

    // Sort: customers without flats first, then those with flats
    // Within each group, maintain the original created_at desc order
    customerDetails.sort((a, b) => {
      const aHasFlat = a.flat_details && a.flat_details.length > 0 ? 1 : 0;
      const bHasFlat = b.flat_details && b.flat_details.length > 0 ? 1 : 0;
      return aHasFlat - bHasFlat;
    });

    return res.status(200).json({
      status: "success",
      customers: customerDetails || [],
      totalCustomers: totalCustomersCount,
      totalPages: Math.ceil(totalCustomersCount / parsedLimit),
      pageCustomerCount,
    });
  } catch (error) {
    logger.error(
      `Get customers Error: ${error.message}, File: customerController-GetCustomers`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.AddCustomer = async (req, res) => {
  const {
    prefixes,
    first_name,
    last_name,
    email,
    email_2,
    phone_code,
    phone_number,
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
    project_id,
  } = req.body;

  try {
    if (email) {
      const existingEmail = await prisma.customers.findFirst({
        where: { email },
      });

      if (existingEmail) {
        return res.status(200).json({
          status: "error",
          message: "Email already exists",
        });
      }
    }

    const existingPhone = await prisma.customers.findFirst({
      where: {
        phone_code,
        phone_number,
        project_id: project_id ? project_id : undefined,
      },
    });
    if (existingPhone) {
      return res.status(200).json({
        status: "error",
        message: "Phone number already exists",
      });
    }

    // REMOVED: // REMOVED: // REMOVED: const uuid = "CUST" + Math.floor(100000 + Math.random() * 900000);

    const customer = await prisma.customers.create({
      data: {
        prefixes,
        first_name,
        last_name,
        email: email || null,
        email_2,
        phone_code,
        phone_number,
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
        country_of_citizenship: country_of_citizenship
          ? country_of_citizenship
          : null,
        country_of_residence: country_of_residence
          ? country_of_residence
          : null,
        mother_tongue,
        name_of_poa,
        holder_poa: holder_poa ? holder_poa : null,
        no_of_years_correspondence_address,
        no_of_years_city,
        have_you_owned_abode: have_you_owned_abode === "true" || have_you_owned_abode === true ? true : false,
        if_owned_project_name,
        project_id: project_id ? project_id : null,
        added_by_employee_id: employeeId,
        status: "Active",
        created_at: new Date(),
      },
    });

    await prisma.profession.create({
      data: {
        customer_id: customer?.id,
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

    await prisma.customeractivities.create({
      data: {
        customer_id: customer?.id,
        employee_id: employeeId,
        ca_message: "Customer created",
        employee_short_name: "C",
        color_code: "green",
      },
    });

    if (correspondence_state && correspondence_country) {
      await prisma.customeraddress.create({
        data: {
          customer_id: customer?.id,
          address_type: "Correspondence",
          country: correspondence_country,
          state: correspondence_state,
          city: correspondence_city,
          address: correspondence_address,
          pincode: correspondence_pincode,
          created_at: new Date(),
        },
      });
    }

    if (permanent_state && permanent_country) {
      await prisma.customeraddress.create({
        data: {
          customer_id: customer?.id,
          address_type: "Permanent",
          country: permanent_country,
          state: permanent_state,
          city: permanent_city,
          address: permanent_address,
          pincode: permanent_pincode,
          created_at: new Date(),
        },
      });
    }

    return res.status(201).json({
      status: "success",
      message: "Customer added successfully",
      id: customer?.id,
    });
  } catch (error) {
    logger.error(
      `Add Customer Error: ${error.message}, File: customerController-AddCustomer`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.AddCustomerFlat = async (req, res) => {
  const {
    customerUuid,
    customerId,
    flat_id,
    saleable_area_sq_ft,
    rate_per_sq_ft,
    discount,
    base_cost_unit,
    applicationdate,
    amenities,
    flatType,
    toatlcostofuint,
    gst,
    costofunitwithtax,
    registrationcharge,
    manjeeraConnectionCharge,
    manjeeraMeterCharge,
    maintenancecharge,
    documentaionfee,
    corpusfund,
    floor_rise_per_sq_ft,
    total_floor_rise,
    east_facing_per_sq_ft,
    total_east_facing,
    corner_per_sq_ft,
    total_corner,
    grand_total,
    custom_note,
    employeeId,
  } = req.body;

  try {
    const effectiveCustomerId = customerId || customerUuid;
    if (!flat_id && !effectiveCustomerId) {
      return res.status(200).json({
        status: "error",
        message: "Missing fields are required",
      });
    }

    const customer = await prisma.customers.findUnique({
      where: {
        id: effectiveCustomerId,
      },
      select: {
        id: true,
      },
    });

    let flat_project_id = null;
    if (flat_id) {
      const flatDetails = await prisma.flat.findUnique({
        where: { id: flat_id },
        select: { project_id: true }
      });
      if (flatDetails && flatDetails.project_id) {
        flat_project_id = flatDetails.project_id;
      }
    }

    let amenity;

    if (flatType) {
      let amenityWhere = { flat_type: flatType };
      if (flat_project_id) {
        amenityWhere.project_id = flat_project_id;
      }

      amenity = await prisma.amenities.findFirst({
        where: amenityWhere,
      });

      if (!amenity && amenities !== undefined && amenities !== null && amenities !== '') {
        let newAmenityData = {
          flat_type: flatType,
          amount: parseFloat(amenities),
          created_at: new Date(),
        };
        if (flat_project_id) {
          newAmenityData.project_id = flat_project_id;
        }

        amenity = await prisma.amenities.create({
          data: newAmenityData,
        });
      }
    }

    const customerFlatListCreate = await prisma.customerflat.create({
      data: {
        flat_id: flat_id ? flat_id : null,
        customer_id: customer?.id ? customer?.id : null,
        saleable_area_sq_ft,
        rate_per_sq_ft,
        discount: discount ? parseFloat(discount) : null,
        base_cost_unit,
        application_date: applicationdate ? new Date(applicationdate) : null,
        amenities: parseFloat(amenities),
        toatlcostofuint: toatlcostofuint,
        gst: gst,
        costofunitwithtax: costofunitwithtax,
        registrationcharge: registrationcharge,
        manjeera_connection_charge: manjeeraConnectionCharge,
        manjeera_meter_charge: manjeeraMeterCharge,
        maintenancecharge: maintenancecharge,
        documentaionfee: documentaionfee,
        corpusfund: corpusfund,
        floor_rise_per_sq_ft: floor_rise_per_sq_ft
          ? parseFloat(floor_rise_per_sq_ft)
          : null,
        total_floor_rise: total_floor_rise
          ? parseFloat(total_floor_rise)
          : null,
        east_facing_per_sq_ft: east_facing_per_sq_ft
          ? parseFloat(east_facing_per_sq_ft)
          : null,
        total_east_facing: total_east_facing
          ? parseFloat(total_east_facing)
          : null,
        corner_per_sq_ft: corner_per_sq_ft
          ? parseFloat(corner_per_sq_ft)
          : null,
        total_corner: total_corner ? parseFloat(total_corner) : null,
        grand_total: grand_total ? parseFloat(grand_total) : null,
        custom_note: custom_note,
        created_at: new Date(),
      },
      include: {
        flat: true,
      },
    });

    await prisma.ageingrecord.create({
      data: {
        project_id: customerFlatListCreate?.flat?.project_id
          ? customerFlatListCreate.flat.project_id
          : null,
        customer_id: customer?.id ? customer?.id : null,
        customer_flat: customerFlatListCreate?.id
          ? customerFlatListCreate?.id
          : null,
        flat_id: flat_id ? flat_id : null,
        booking_date: applicationdate ? new Date(applicationdate) : null,
        total_amount: 0,
        ageing_days: applicationdate
          ? Math.floor((new Date() - new Date(applicationdate)) / (1000 * 60 * 60 * 24))
          : 0,
        loan_Status: "NotApplied",
        registration_status: "NotRegistered",
        created_at: new Date(),
      },
    });

    await prisma.flat.update({
      where: {
        id: flat_id,
      },
      data: {
        totalAmount: parseFloat(toatlcostofuint),
      },
    });

    const check_booking_stage = await prisma.bookingStages.findFirst({
      where: {
        flat_id: flat_id,
      },
    });

    if (!check_booking_stage) {
      await prisma.bookingStages.create({
        data: {
          name: "Booking",
          flat_id: flat_id ? flat_id : null,
          customer_id: customer?.id ? customer?.id : null,
          created_at: new Date(),
        },
      });
    }

    const customerAct = await prisma.taskactivities.create({
      data: {
        flat_id: flat_id,
        employee_id: employeeId,
        ta_message: `Flat ${customerFlatListCreate.flat.flat_no} assigned to customer`,
        employee_short_name: "F",
        color_code: "purple",
      },
    });

    await prisma.flat.update({
      where: {
        id: flat_id,
      },
      data: {
        status: "Sold",
        customer_id: customer?.id,
        updated_at: new Date(),
      },
    });

    return res.status(201).json({
      status: "success",
      message: "Customer flat added successfully",
    });
  } catch (error) {
    logger.error(
      `Add Customer Flat Error: ${error.message}, File: customerController-AddCustomerFlat`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.UpdateCustomerFlat = async (req, res) => {
  const {
    customerFlatId,
    customerUuid,
    customerId,
    flat_id,
    saleable_area_sq_ft,
    discount,
    rate_per_sq_ft,
    base_cost_unit,
    applicationdate,
    amenities,
    toatlcostofuint,
    gst,
    costofunitwithtax,
    registrationcharge,
    manjeeraConnectionCharge,
    manjeeraMeterCharge,
    maintenancecharge,
    documentaionfee,
    corpusfund,
    floor_rise_per_sq_ft,
    total_floor_rise,
    east_facing_per_sq_ft,
    total_east_facing,
    corner_per_sq_ft,
    total_corner,
    grand_total,
    custom_note,
    employeeId,
  } = req.body;

  try {
    const effectiveCustomerId = customerId || customerUuid;
    if (!effectiveCustomerId) {
      return res.status(200).json({
        status: "error",
        message: "Customer id is required",
      });
    }

    if (!customerFlatId) {
      return res.status(200).json({
        status: "error",
        message: "Customer flat id is required",
      });
    }

    const customerFlatExist = await prisma.customerflat.findUnique({
      where: {
        id: customerFlatId,
      },
    });

    if (!customerFlatExist) {
      return res.status(200).json({
        status: "error",
        message: "Customer flat detail not found",
      });
    }

    const customerExist = await prisma.customers.findUnique({
      where: {
        id: effectiveCustomerId,
      },
    });

    if (!customerExist) {
      return res.status(200).json({
        status: "error",
        message: "Customer not found",
      });
    }

    let flat_project_id = null;
    let flat_type = null;
    const final_flat_id = flat_id ? flat_id : customerFlatExist.flat_id;
    if (final_flat_id) {
      const flatDetails = await prisma.flat.findUnique({
        where: { id: final_flat_id },
        select: { project_id: true, type: true }
      });
      if (flatDetails) {
        flat_project_id = flatDetails.project_id;
        flat_type = flatDetails.type;
      }
    }

    if (flat_type && amenities !== undefined && amenities !== null && amenities !== '') {
      let amenityWhere = { flat_type: flat_type };
      if (flat_project_id) {
        amenityWhere.project_id = flat_project_id;
      }

      let amenity = await prisma.amenities.findFirst({
        where: amenityWhere,
      });

      if (!amenity) {
        let newAmenityData = {
          flat_type: flat_type,
          amount: parseFloat(amenities),
          created_at: new Date(),
        };
        if (flat_project_id) {
          newAmenityData.project_id = flat_project_id;
        }

        await prisma.amenities.create({
          data: newAmenityData,
        });
      }
    }

    const changes = [];
    const compareAndTrack = (fieldName, newValue, oldValue) => {
      if (newValue !== undefined && newValue !== null && newValue != oldValue) {
        changes.push(
          `The ${fieldName} changed from ${oldValue} to ${newValue}`,
        );
        return newValue;
      }
      return oldValue;
    };

    const customerFlatListCreate = await prisma.customerflat.update({
      where: { id: customerFlatId },
      data: {
        flat_id: flat_id ? flat_id : existingCustomerFlat.flat_id,
        customer_id: customer?.id
          ? customer?.id
          : existingCustomerFlat.customer_id,
        saleable_area_sq_ft: compareAndTrack(
          "Saleable Area Sqft",
          saleable_area_sq_ft,
          existingCustomerFlat.saleable_area_sq_ft,
        ),
        rate_per_sq_ft: compareAndTrack(
          "Rate Per Sqft",
          rate_per_sq_ft,
          existingCustomerFlat.rate_per_sq_ft,
        ),
        discount: compareAndTrack(
          "Discount",
          discount,
          existingCustomerFlat.discount,
        ),
        base_cost_unit: compareAndTrack(
          "Base Cost Unit",
          base_cost_unit,
          existingCustomerFlat.base_cost_unit,
        ),
        application_date: applicationdate
          ? compareAndTrack(
            "Application Date",
            new Date(applicationdate).toISOString(),
            existingCustomerFlat.application_date?.toISOString(),
          )
          : existingCustomerFlat.application_date,
        amenities: compareAndTrack(
          "Amenities",
          amenities,
          existingCustomerFlat.amenities,
        ),
        toatlcostofuint: compareAndTrack(
          "Total Cost of Unit",
          toatlcostofuint,
          existingCustomerFlat.toatlcostofuint,
        ),
        gst: compareAndTrack("GST", gst, existingCustomerFlat.gst),
        costofunitwithtax: compareAndTrack(
          "Cost of Unit With Tax",
          costofunitwithtax,
          existingCustomerFlat.costofunitwithtax,
        ),
        registrationcharge: compareAndTrack(
          "Registration Charge",
          registrationcharge,
          existingCustomerFlat.registrationcharge,
        ),
        maintenancecharge: compareAndTrack(
          "Maintenance Charge",
          maintenancecharge,
          existingCustomerFlat.maintenancecharge,
        ),
        manjeera_connection_charge: compareAndTrack(
          "Manjeera Connection Charge",
          manjeeraConnectionCharge,
          existingCustomerFlat.manjeera_connection_charge,
        ),
        manjeera_meter_charge: compareAndTrack(
          "Manjeera Meter Charge",
          manjeeraMeterCharge,
          existingCustomerFlat.manjeera_meter_charge,
        ),
        documentaionfee: compareAndTrack(
          "Documentaion Fee",
          documentaionfee,
          existingCustomerFlat.documentaionfee,
        ),
        corpusfund: compareAndTrack(
          "Corpus Fund",
          corpusfund,
          existingCustomerFlat.corpusfund,
        ),

        floor_rise_per_sq_ft: compareAndTrack(
          "Floor Rise Per Sqft",
          floor_rise_per_sq_ft,
          existingCustomerFlat.floor_rise_per_sq_ft,
        ),
        total_floor_rise: compareAndTrack(
          "Total Floor Rise",
          total_floor_rise,
          existingCustomerFlat.total_floor_rise,
        ),
        east_facing_per_sq_ft: compareAndTrack(
          "East Facing Per Sqft",
          east_facing_per_sq_ft,
          existingCustomerFlat.east_facing_per_sq_ft,
        ),
        total_east_facing: compareAndTrack(
          "Total East Facing",
          total_east_facing,
          existingCustomerFlat.total_east_facing,
        ),
        corner_per_sq_ft: compareAndTrack(
          "Corner Per Sqft",
          corner_per_sq_ft,
          existingCustomerFlat.corner_per_sq_ft,
        ),
        total_corner: compareAndTrack(
          "Total Corner",
          total_corner,
          existingCustomerFlat.total_corner,
        ),
        grand_total: compareAndTrack(
          "Grand Total",
          grand_total,
          existingCustomerFlat.grand_total,
        ),
        custom_note: compareAndTrack(
          "Custom Note",
          custom_note,
          existingCustomerFlat.custom_note,
        ),
        updated_at: new Date(),
      },
      include: { flat: true },
    });

    if (changes.length > 0) {
      await prisma.customerflatupdateactivities.create({
        data: {
          employee_id: employeeId,
          customerflat_id: customerFlatId,
          message: changes.map((c) => `• ${c}`).join("\n"),
        },
      });
    }

    await prisma.flat.update({
      where: {
        id: flat_id,
      },
      data: {
        totalAmount: parseFloat(toatlcostofuint),
      },
    });

    const customerAct = await prisma.taskactivities.create({
      data: {
        flat_id: flat_id,
        employee_id: employeeId,
        ta_message: `Flat ${customerFlatListCreate.flat.flat_no} assigned to customer`,
        employee_short_name: "F",
        color_code: "purple",
      },
    });

    return res.status(201).json({
      status: "success",
      message: "Customer flat updated successfully",
    });
  } catch (error) {
    logger.error(
      `Update Customer Flat Error: ${error.message}, File: customerController-UpdateCustomerFlat`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.UpdateCustomer = async (req, res) => {
  const {
    customerUuid,
    customerId,
    prefixes,
    first_name,
    last_name,
    email,
    email_2,
    phone_code,
    phone_number,
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
    project_id,
  } = req.body;

  try {
    const effectiveCustomerId = customerId || customerUuid;
    if (!effectiveCustomerId) {
      return res.status(200).json({
        status: "error",
        message: "Customer id is required",
      });
    }

    const customerExist = await prisma.customers.findUnique({
      where: {
        id: effectiveCustomerId,
      },
    });

    if (!customerExist) {
      return res.status(200).json({
        status: "error",
        message: "Customer not found",
      });
    }

    if (email && email !== customerExist?.email) {
      const isEmailExist = await prisma.customers.findFirst({
        where: {
          email,
          id: { not: effectiveCustomerId },
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
      (phone_code && phone_code !== customerExist?.phone_code) ||
      (phone_number && phone_number !== customerExist?.phone_number)
    ) {
      const isPhoneExist = await prisma.customers.findFirst({
        where: {
          phone_code,
          phone_number,
          project_id: customerExist?.project_id,
          id: { not: effectiveCustomerId },
        },
      });
      if (isPhoneExist) {
        return res.status(200).json({
          status: "error",
          message: "Phone number already exists",
        });
      }
    }

    const updatedCustomer = await prisma.customers.update({
      where: { id: effectiveCustomerId },
      data: {
        prefixes: prefixes ? prefixes : customerExist?.prefixes,
        first_name: first_name ? first_name : customerExist?.first_name,
        last_name: last_name ? last_name : customerExist?.last_name,
        email: email ? email : customerExist?.email,
        email_2: email_2 ? email_2 : customerExist?.email_2,
        phone_code: phone_code ? phone_code : customerExist?.phone_code,
        phone_number: phone_number ? phone_number : customerExist?.phone_number,
        gender: gender ? gender : customerExist?.gender,
        landline_country_code: landline_country_code
          ? landline_country_code
          : customerExist?.landline_country_code,
        landline_city_code: landline_city_code
          ? landline_city_code
          : customerExist?.landline_city_code,
        landline_number: landline_number
          ? landline_number
          : customerExist?.landline_number,
        date_of_birth: date_of_birth
          ? new Date(date_of_birth)
          : customerExist?.date_of_birth,
        father_name: father_name ? father_name : customerExist?.father_name,
        spouse_prefixes: spouse_prefixes
          ? spouse_prefixes
          : customerExist?.spouse_prefixes,
        spouse_name: spouse_name ? spouse_name : customerExist?.spouse_name,
        marital_status:
          marital_status === ""
            ? null
            : (marital_status ?? customerExist?.marital_status),
        number_of_children: number_of_children
          ? number_of_children
          : customerExist?.number_of_children,
        wedding_aniversary: wedding_aniversary
          ? new Date(wedding_aniversary)
          : customerExist?.wedding_aniversary,
        spouse_dob: spouse_dob
          ? new Date(spouse_dob)
          : customerExist?.spouse_dob,
        pan_card_no: pan_card_no ? pan_card_no : customerExist?.pan_card_no,
        aadhar_card_no: aadhar_card_no
          ? aadhar_card_no
          : customerExist?.aadhar_card_no,
        ...(country_of_citizenship || customerExist?.country_of_citizenship
          ? {
            country_of_citizenship:
              country_of_citizenship || customerExist?.country_of_citizenship,
          }
          : {}),
        ...(country_of_residence || customerExist?.country_of_residence
          ? {
            country_of_residence:
              country_of_residence || customerExist?.country_of_residence,
          }
          : {}),
        mother_tongue: mother_tongue
          ? mother_tongue
          : customerExist?.mother_tongue,
        name_of_poa: name_of_poa ? name_of_poa : customerExist?.name_of_poa,
        holder_poa:
          holder_poa === "" ? null : (holder_poa ?? customerExist?.holder_poa),
        no_of_years_correspondence_address: no_of_years_correspondence_address
          ? no_of_years_correspondence_address
          : customerExist?.no_of_years_correspondence_address,
        no_of_years_city: no_of_years_city
          ? no_of_years_city
          : customerExist?.no_of_years_city,
        have_you_owned_abode:
          have_you_owned_abode !== undefined
            ? have_you_owned_abode === "true" || have_you_owned_abode === true
            : customerExist?.have_you_owned_abode,
        if_owned_project_name:
          have_you_owned_abode === "false"
            ? if_owned_project_name
            : customerExist?.if_owned_project_name,
        project_id: project_id ? project_id : customerExist?.project_id,
        updated_at: new Date(),
      },
    });

    await prisma.customeractivities.create({
      data: {
        customer_id: customerExist.id,
        employee_id: employeeId,
        ca_message: "Customer details updated",
        employee_short_name: "U",
        color_code: "blue",
      },
    });

    const correspondenceAddress = await prisma.customeraddress.findFirst({
      where: {
        customer_id: customerExist?.id,
        address_type: "Correspondence",
      },
    });

    const permanentAddress = await prisma.customeraddress.findFirst({
      where: {
        customer_id: customerExist?.id,
        address_type: "Permanent",
      },
    });

    const professionalDetails = await prisma.profession.findFirst({
      where: {
        customer_id: customerExist?.id,
      },
    });

    if (correspondenceAddress) {
      await prisma.customeraddress.update({
        where: { id: correspondenceAddress.id },
        data: {
          country: correspondence_country
            ? correspondence_country
            : correspondenceAddress.country,
          state: correspondence_state
            ? correspondence_state
            : correspondenceAddress.state,
          city: correspondence_city
            ? correspondence_city
            : correspondenceAddress.city,
          address: correspondence_address || correspondenceAddress.address,
          pincode: correspondence_pincode || correspondenceAddress.pincode,
          updated_at: new Date(),
        },
      });
    } else if (correspondence_state && correspondence_country) {
      await prisma.customeraddress.create({
        data: {
          customer_id: customerExist?.id,
          address_type: "Correspondence",
          country: correspondence_country,
          state: correspondence_state,
          city: correspondence_city,
          address: correspondence_address,
          pincode: correspondence_pincode,
          created_at: new Date(),
        },
      });
    }

    if (permanentAddress) {
      await prisma.customeraddress.update({
        where: { id: permanentAddress.id },
        data: {
          country: permanent_country
            ? permanent_country
            : permanentAddress.country,
          state: permanent_state
            ? permanent_state
            : permanentAddress.state,
          city: permanent_city ? permanent_city : permanentAddress.city,
          address: permanent_address || permanentAddress.address,
          pincode: permanent_pincode || permanentAddress.pincode,
          updated_at: new Date(),
        },
      });
    } else if (permanent_state && permanent_country) {
      await prisma.customeraddress.create({
        data: {
          customer_id: customerExist?.id,
          address_type: "Permanent",
          country: permanent_country,
          state: permanent_state,
          city: permanent_city,
          address: permanent_address,
          pincode: permanent_pincode,
          created_at: new Date(),
        },
      });
    }

    if (professionalDetails) {
      await prisma.profession.update({
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
      await prisma.profession.create({
        data: {
          customer_id: customerExist?.id,
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
      message: "Customer updated successfully",
      id: customerExist?.id,
    });
  } catch (error) {
    logger.error(
      `Update Customer Error: ${error.message}, File: customerController-UpdateCustomer`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.getSingleCustomerData = async (req, res) => {
  const { customerId } = req.query;

  try {
    if (!customerId) {
      return res.status(200).json({
        status: "error",
        message: "Customer Id is required",
      });
    }

    const customer = await prisma.customers.findFirst({
      where: {
        id: customerId,
      },
      select: {
        id: true,
        prefixes: true,
        first_name: true,
        last_name: true,
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
        project_id: true,
        status: true,
        loan_rejected: true,
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
        project_details: {
          select: {
            project_name: true,
          },
        },
      },
    });

    if (!customer) {
      return res.status(200).json({
        status: "error",
        message: "Customer not found",
      });
    }

    const address = await prisma.customeraddress.findMany({
      where: {
        customer_id: customer?.id,
        address_type: {
          in: ["Correspondence", "Permanent"],
        },
      },
      select: {
        address_type: true,
        city_to_customers: {
          select: {
            id: true,
            name: true,
          },
        },
        state_to_customers: {
          select: {
            id: true,
            name: true,
          },
        },
        country_to_customers: {
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
        ?.country_to_customers?.id || null;
    const correspondenceCountryName =
      address.find((addr) => addr.address_type === "Correspondence")
        ?.country_to_customers?.name || null;
    const correspondenceStateId =
      address.find((addr) => addr.address_type === "Correspondence")
        ?.state_to_customers?.id || null;
    const correspondenceStateName =
      address.find((addr) => addr.address_type === "Correspondence")
        ?.state_to_customers?.name || null;
    const correspondenceCityId =
      address.find((addr) => addr.address_type === "Correspondence")
        ?.city_to_customers?.id || null;
    const correspondenceCityName =
      address.find((addr) => addr.address_type === "Correspondence")
        ?.city_to_customers?.name || null;
    const correspondenceAddress =
      address.find((addr) => addr.address_type === "Correspondence")?.address ||
      null;
    const correspondencePincode =
      address.find((addr) => addr.address_type === "Correspondence")?.pincode ||
      null;

    const permanentCountryId =
      address.find((addr) => addr.address_type === "Permanent")
        ?.country_to_customers?.id || null;
    const permanentCountryName =
      address.find((addr) => addr.address_type === "Permanent")
        ?.country_to_customers?.name || null;
    const permanentStateId =
      address.find((addr) => addr.address_type === "Permanent")
        ?.state_to_customers?.id || null;
    const permanentStateName =
      address.find((addr) => addr.address_type === "Permanent")
        ?.state_to_customers?.name || null;
    const permanentCityId =
      address.find((addr) => addr.address_type === "Permanent")
        ?.city_to_customers?.id || null;
    const permanentCityName =
      address.find((addr) => addr.address_type === "Permanent")
        ?.city_to_customers?.name || null;
    const permanentAddress =
      address.find((addr) => addr.address_type === "Permanent")?.address ||
      null;
    const permanentPincode =
      address.find((addr) => addr.address_type === "Permanent")?.pincode ||
      null;

    const professionalDetails = await prisma.profession.findFirst({
      where: {
        customer_id: customer?.id,
      },
      select: {
        current_designation: true,
        name_of_current_organization: true,
        address_of_current_organization: true,
        no_of_years_work_experience: true,
        current_annual_income: true,
      },
    });

    const customerData = {
      id: customer?.id?.toString(),
      prefixes: customer?.prefixes,
      first_name: customer?.first_name,
      last_name: customer?.last_name,
      email: customer?.email,
      email_2: customer?.email_2,
      phone_code: customer?.phone_code,
      phone_number: customer?.phone_number,
      gender: customer?.gender,
      landline_country_code: customer?.landline_country_code,
      landline_city_code: customer?.landline_city_code,
      landline_number: customer?.landline_number,
      date_of_birth: customer?.date_of_birth,
      profile_pic_url: customer?.profile_pic_url,
      profile_pic_path: customer?.profile_pic_path,
      father_name: customer?.father_name,
      spouse_prefixes: customer?.spouse_prefixes,
      spouse_name: customer?.spouse_name,
      marital_status: customer?.marital_status,
      number_of_children: customer?.number_of_children,
      wedding_aniversary: customer?.wedding_aniversary,
      spouse_dob: customer?.spouse_dob,
      pan_card_no: customer?.pan_card_no,
      aadhar_card_no: customer?.aadhar_card_no,
      country_of_citizenship: customer?.country_of_citizenship?.toString(),
      country_of_residence: customer?.country_of_residence?.toString(),
      mother_tongue: customer?.mother_tongue,
      name_of_poa: customer?.name_of_poa,
      holder_poa: customer?.holder_poa,
      no_of_years_correspondence_address:
        customer?.no_of_years_correspondence_address,
      no_of_years_city: customer?.no_of_years_city,
      have_you_owned_abode: customer?.have_you_owned_abode?.toString(),
      have_you_owned_abode: customer?.have_you_owned_abode?.toString(),
      if_owned_project_name: customer?.if_owned_project_name,
      project_name: customer?.project_details?.project_name,
      status: customer.status,
      loan_rejected: customer.loan_rejected,
      country_of_citizenship_details:
        customer?.country_of_citizenship_details?.name,
      country_of_residence_details:
        customer?.country_of_residence_details?.name,
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
      project_id: customer?.project_id?.toString() || null,
    };

    const customerFlat = await prisma.customerflat.count({
      where: {
        customer_id: customer?.id,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Customer found",
      data: customerData,
      totalFlats: customerFlat,
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

// exports.DeleteCustomer = async (req, res) => {
//   const { singlecustomer_id, employeeId } = req.body;

//   try {
//     await prisma.flat.updateMany({
//       where: { customer_id: singlecustomer_id },
//       data: { customer_id: null, status: "Unsold" },
//     });

//     await prisma.customerflat.deleteMany({
//       where: { customer_id: singlecustomer_id },
//     });

//     await prisma.customers.update({
//       where: {
//         id: singlecustomer_id,
//       },
//       data: {
//         soft_delete: 1,
//       },
//     });

//     await prisma.customeractivities.create({
//       data: {
//         customer_id: singlecustomer_id,
//         employee_id: employeeId,
//         ca_message: "Customer deleted",
//         employee_short_name: "D",
//         color_code: "red",
//       },
//     });

//     return res.status(200).json({
//       status: "success",
//       message: "Customer soft deleted successfully",
//     });
//   } catch (error) {
//     logger.error(`Delete Customer Error: ${error.message}, File: customerController-DeleteCustomer`);
//     return res.status(500).json({
//       status: "error",
//       message: "Internal server error",
//     });
//   }
// };

exports.DeleteCustomer = async (req, res) => {
  const { singlecustomer_id, employeeId } = req.body;

  try {
    const customer = await prisma.customers.findUnique({
      where: { id: singlecustomer_id },
      select: { id: true, profile_pic_path: true },
    });

    const customerFolder = path.resolve(
      "uploads",
      "customers",
      `${customer?.id}`,
    );

    if (fs.existsSync(customerFolder)) {
      await fs.promises.rm(customerFolder, { recursive: true, force: true });
      logger.info(`✅ Deleted folder and all files: ${customerFolder}`);
    } else {
      logger.info(`⚠️ Folder not found: ${customerFolder}`);
    }

    await prisma.customeractivities.deleteMany({
      where: { customer_id: singlecustomer_id },
    });

    await prisma.customerfilemanager.deleteMany({
      where: { customer_id: singlecustomer_id },
    });

    await prisma.customernotes.deleteMany({
      where: { customer_id: singlecustomer_id },
    });

    await prisma.customeraddress.deleteMany({
      where: { customer_id: singlecustomer_id },
    });

    await prisma.customerflat.deleteMany({
      where: { customer_id: singlecustomer_id },
    });

    await prisma.ageingrecord.deleteMany({
      where: { customer_id: singlecustomer_id },
    });

    await prisma.refundageingrecord.deleteMany({
      where: { customer_id: singlecustomer_id },
    });

    await prisma.rewards.deleteMany({
      where: { customer_id: singlecustomer_id },
    });

    await prisma.payments.deleteMany({
      where: { customer_id: singlecustomer_id },
    });

    await prisma.flat.updateMany({
      where: { customer_id: singlecustomer_id },
      data: { customer_id: null, status: "Unsold" },
    });

    await prisma.customers.delete({
      where: { id: singlecustomer_id },
    });

    return res.status(200).json({
      status: "success",
      message: "Customer deleted permanently successfully",
    });
  } catch (error) {
    logger.error(
      `Delete Customer Error: ${error.message}, File: customerController-DeleteCustomer`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.DeleteAllCustomer = async (req, res) => {
  try {
    const customers = await prisma.customers.findMany({
      select: { id: true, id: true },
    });

    if (!customers || customers.length === 0) {
      return res.status(200).json({
        status: "error",
        message: "No customers found",
      });
    }

    const customerIds = customers.map((c) => c.id);

    for (const customer of customers) {
      const customerFolder = path.resolve(
        "uploads",
        "customers",
        `${customer.id}`,
      );

      if (fs.existsSync(customerFolder)) {
        await fs.promises.rm(customerFolder, { recursive: true, force: true });
        console.log(`✅ Deleted folder and all files: ${customerFolder}`);
      } else {
        console.log(`⚠️ Folder not found: ${customerFolder}`);
      }
    }

    await prisma.customeractivities.deleteMany({
      where: { customer_id: { in: customerIds } },
    });

    await prisma.customerfilemanager.deleteMany({
      where: { customer_id: { in: customerIds } },
    });

    await prisma.customernotes.deleteMany({
      where: { customer_id: { in: customerIds } },
    });

    await prisma.customeraddress.deleteMany({
      where: { customer_id: { in: customerIds } },
    });

    await prisma.customerflat.deleteMany({
      where: { customer_id: { in: customerIds } },
    });

    await prisma.ageingrecord.deleteMany({
      where: { customer_id: { in: customerIds } },
    });

    await prisma.refundageingrecord.deleteMany({
      where: { customer_id: { in: customerIds } },
    });

    await prisma.rewards.deleteMany({
      where: { customer_id: { in: customerIds } },
    });

    await prisma.payments.deleteMany({
      where: { customer_id: { in: customerIds } },
    });

    await prisma.flat.updateMany({
      where: { customer_id: { in: customerIds } },
      data: { customer_id: null, status: "Unsold" },
    });

    await prisma.customers.deleteMany({
      where: { id: { in: customerIds } },
    });

    return res.status(200).json({
      status: "success",
      message: "All customers deleted permanently successfully",
    });
  } catch (error) {
    logger.error(
      `Delete All Customers Error: ${error.message}, File: customerController-DeleteAllCustomer`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.AddCustomernote = async (req, res) => {
  const { note, user_id, customer_id, customerId, customer_uuid, employeeId, employee_id } = req.body;
  const target_customer_id = customer_id || customerId || customer_uuid;
  const target_employee_id = employeeId || employee_id;
  try {
    const customer = await prisma.customers.findFirst({
      where: {
        id: target_customer_id,
      },
    });

    if (!customer) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }

    await prisma.customernotes.create({
      data: {
        note_message: note,
        customer_id: customer.id,
        user_id: user_id,
      },
    });

    await prisma.customeractivities.create({
      data: {
        customer_id: customer.id,
        employee_id: target_employee_id,
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
      `Add Customer Note Error: ${error.message}, File: customerController-AddCustomernote`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

module.exports.GetCustomerNotes = async (req, res) => {
  const { customer_id, customerId, customer_uuid } = req.query;
  const target_customer_id = customer_id || customerId || customer_uuid;

  try {
    const customer = await prisma.customers.findFirst({
      where: { id: target_customer_id },
    });

    if (!customer) {
      return res.status(200).json({
        status: "error",
        message: "Customer not found",
      });
    }

    const customernotes = await prisma.customernotes.findMany({
      where: {
        customer_id: customer.id,
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

    const serializedCustomernotes = customernotes.map((note) => ({
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
      customer: {
        id: customer.id,
        id: customer.id,
        notes: serializedCustomernotes,
      },
    });
  } catch (error) {
    logger.error(
      `Get Customer Notes Error: ${error.message}, File: customerController-GetCustomerNotes`,
    );
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

exports.uploadCustomerProfilePic = async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (error, fields, files) => {
    if (error) {
      logger.error(
        `Upload Customer Profile Pic Error: ${error.message}, File: customerController-uploadCustomerProfilePic`,
      );
      return res
        .status(500)
        .json({ status: "error", message: "Internal server error" });
    }

    const customer_id = fields.customer_id ? fields.customer_id[0] : null;
    const profilePicture = files.file ? files.file[0] : null;

    if (!customer_id || !profilePicture) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing customer ID or file" });
    }

    try {
      const customer = await prisma.customers.findFirst({
        where: { id: customer_id },
        select: { id: true, profile_pic_path: true },
      });

      if (!customer) {
        return res
          .status(404)
          .json({ status: "error", message: "Customer not found" });
      }

      const tempFilePath = profilePicture.path || profilePicture.filepath;
      if (!tempFilePath) {
        return res
          .status(400)
          .json({ status: "error", message: "File path is missing" });
      }

      const uploadDir = path.join(
        __dirname,
        "../uploads/customers",
        `${customer.id}`,
      );
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      if (
        customer.profile_pic_path &&
        fs.existsSync(customer.profile_pic_path)
      ) {
        fs.unlinkSync(customer.profile_pic_path);
      }

      const savedFilePath = path.join(
        uploadDir,
        profilePicture.originalFilename,
      );
      fs.copyFileSync(tempFilePath, savedFilePath);
      fs.unlinkSync(tempFilePath);

      const profileUrl = `${process.env.API_URL}/uploads/customers/${customer.id}/${profilePicture.originalFilename}`;

      await prisma.customers.update({
        where: { id: customer_id },
        data: {
          profile_pic_url: profileUrl,
          profile_pic_path: savedFilePath,
        },
      });

      return res.status(200).json({
        status: "success",
        message: "Customer profile picture uploaded successfully",
        filePath: savedFilePath,
      });
    } catch (error) {
      logger.error(
        `Upload Customer Profile Pic Error: ${error.message}, File: customerController-uploadCustomerProfilePic`,
      );
      return res
        .status(500)
        .json({ status: "error", message: "Internal server error" });
    }
  });
};

exports.searchCustomerForFlats = async (req, res) => {
  try {
    const { searchQuery, project_id } = req.query;

    const searchCondition = {
      AND: [
        { soft_delete: 0 },
        ...(project_id ? [{ project_id: project_id }] : []),
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

    const flats = await prisma.customers.findMany({
      where: searchCondition,
      select: {
        id: true,
        id: true,
        profile_pic_url: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_code: true,
        phone_number: true,
        date_of_birth: true,
        pan_card_no: true,
        aadhar_card_no: true,
        mother_tongue: true,
        project_id: true,
        Customerflat: {
          where: {
            flat: {
              status: "Sold",
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    const data = flats.map((ele) => {
      const isFlatBooked = ele.Customerflat && ele.Customerflat.length > 0;
      return {
        value: ele.id,
        label: `${ele.first_name} ${ele.last_name}`,
        isFlatBooked,
        id: ele?.id,
        profile_pic_url: ele?.profile_pic_url,
        first_name: ele?.first_name,
        last_name: ele?.last_name,
        email: ele?.email,
        phone_code: ele?.phone_code,
        phone_number: ele?.phone_number,
        date_of_birth: ele?.date_of_birth,
        pan_card_no: ele?.pan_card_no,
        aadhar_card_no: ele?.aadhar_card_no,
        mother_tongue: ele?.mother_tongue,
        project_id: ele?.project_id?.toString(),
      };
    });

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    logger.error(
      `Search Customer For Flats Error: ${error.message}, File: customerController-searchCustomerForFlats`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

module.exports.GetCustomerFlats = async (req, res) => {
  const { customer_uuid, customerId } = req.query;

  try {
    const effectiveCustomerId = customerId || customer_uuid;
    const customer = await prisma.customers.findFirst({
      where: { id: effectiveCustomerId },
    });

    if (!customer) {
      return res.status(200).json({
        status: "error",
        message: "Customer not found",
      });
    }

    const customerFlatsList = await prisma.customerflat.findMany({
      where: {
        customer_id: customer?.id,
      },
      select: {
        id: true,
        flat: {
          select: {
            id: true,
            id: true,
            flat_img_url: true,
            flat_no: true,
            project: {
              select: {
                project_name: true,
              },
            },
            block: {
              select: {
                block_name: true,
              },
            },
            floor_no: true,
            square_feet: true,
            type: true,
            facing: true,
            bedrooms: true,
            bathrooms: true,
            balconies: true,
            parking: true,
            furnished_status: true,
            corner: true,
            status: true,
            payments: {
              select: {
                customer_id: true,
                amount: true,
                payment_date: true,
                payment_type: true,
                payment_towards: true,
                trasnaction_id: true,
                receipt_url: true,
                id: true,
              },
            },
          },
        },
        customer_id: true,
        saleable_area_sq_ft: true,
        rate_per_sq_ft: true,
        base_cost_unit: true,
        toatlcostofuint: true,
        gst: true,
        registrationcharge: true,
        manjeera_connection_charge: true,
        manjeera_meter_charge: true,
        maintenancecharge: true,
        documentaionfee: true,
        corpusfund: true,
        grand_total: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const flatsData = customerFlatsList.map((note) => {
      const matchingPayments =
        note?.flat?.payments?.filter(
          (payment) => payment.customer_id === note.customer_id,
        ) || [];

      const totalPayment = matchingPayments.reduce(
        (sum, payment) => sum + (Number(payment.amount) || 0),
        0,
      );

      const getPaidAmount = (towards) => {
        const lowerTowards = towards.map(t => t.toLowerCase());
        return matchingPayments
          .filter(p => p.payment_towards && lowerTowards.includes(p.payment_towards.toLowerCase()))
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      };

      const paymentSummary = {
        flat: {
          actual: note.toatlcostofuint || 0,
          paid: getPaidAmount(["Flat", "Flat Cost", "Base Price", "Flat Cost (Base Price)"]),
          remaining: (note.toatlcostofuint || 0) - getPaidAmount(["Flat", "Flat Cost", "Base Price", "Flat Cost (Base Price)"])
        },
        gst: {
          actual: note.gst || 0,
          paid: getPaidAmount(["GST"]),
          remaining: (note.gst || 0) - getPaidAmount(["GST"])
        },
        corpusFund: {
          actual: note.corpusfund || 0,
          paid: getPaidAmount(["Corpus Fund"]),
          remaining: (note.corpusfund || 0) - getPaidAmount(["Corpus Fund"])
        },
        maintenanceCharges: {
          actual: note.maintenancecharge || 0,
          paid: getPaidAmount(["Maintenance Charges", "Maintenance"]),
          remaining: (note.maintenancecharge || 0) - getPaidAmount(["Maintenance Charges", "Maintenance"])
        },
        documentationFee: {
          actual: note.documentaionfee || 0,
          paid: getPaidAmount(["Documentation Fee", "Documentation", "Documentation Charges"]),
          remaining: (note.documentaionfee || 0) - getPaidAmount(["Documentation Fee", "Documentation", "Documentation Charges"])
        },
        manjeeraConnectionCharge: {
          actual: note.manjeera_connection_charge || 0,
          paid: getPaidAmount(["Manjeera Connection Charge", "Manjeera Connection"]),
          remaining: (note.manjeera_connection_charge || 0) - getPaidAmount(["Manjeera Connection Charge", "Manjeera Connection"])
        },
        manjeeraMeterCharge: {
          actual: note.manjeera_meter_charge || 0,
          paid: getPaidAmount(["Manjeera Meter Charge", "Manjeera Meter", "Manjeera Connection Meter", "Manjeera Meter Connection"]),
          remaining: (note.manjeera_meter_charge || 0) - getPaidAmount(["Manjeera Meter Charge", "Manjeera Meter", "Manjeera Connection Meter", "Manjeera Meter Connection"])
        },
        registration: {
          actual: note.registrationcharge || 0,
          paid: getPaidAmount(["Registration", "Registration Charge", "Registration Charges"]),
          remaining: (note.registrationcharge || 0) - getPaidAmount(["Registration", "Registration Charge", "Registration Charges"])
        }
      };

      return {
        id: note?.id,
        flat_details: {
          id: note?.flat?.id,
          id: note?.flat?.id,
          flat_img_url: note?.flat?.flat_img_url,
          flat_no: note?.flat?.flat_no,
          project_name: note?.flat?.project?.project_name,
          block: note?.flat?.block?.block_name,
          floor_no: note?.flat?.floor_no,
          square_feet: note?.flat?.square_feet,
          type: note?.flat?.type,
          facing: note?.flat?.facing,
          bedrooms: note?.flat?.bedrooms,
          bathrooms: note?.flat?.bathrooms,
          balconies: note?.flat?.balconies,
          parking: note?.flat?.parking,
          furnished_status: note?.flat?.furnished_status,
          corner: note?.flat?.corner,
          status: note?.flat?.status,
          totalPayment,
          payment_history: matchingPayments.map((p) => ({
            id: p.id,
            date: p.payment_date,
            type: p.payment_type,
            amount: p.amount,
            transaction_id: p.trasnaction_id,
            receipt_url: p.receipt_url,
          })),
        },
        saleable_area_sq_ft: note?.saleable_area_sq_ft,
        rate_per_sq_ft: note?.rate_per_sq_ft,
        base_cost_unit: note?.base_cost_unit,
        toatlcostofuint: note?.toatlcostofuint,
        grand_total: note?.grand_total,
        // gst: note?.gst,
        // registrationcharge: note?.registrationcharge,
        // manjeera_connection_charge: note?.manjeera_connection_charge,
        // manjeera_meter_charge: note?.manjeera_meter_charge,
        // maintenancecharge: note?.maintenancecharge,
        // documentaionfee: note?.documentaionfee,
        // corpusfund: note?.corpusfund,
        paymentSummary,
      };
    });

    return res.status(200).json({
      status: "success",
      message: "Customer flats retrieved successfully",
      data: flatsData,
    });
  } catch (error) {
    logger.error(
      `Get Customer Flats Error: ${error.message}, File: customerController-GetCustomerFlats`,
    );
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

module.exports.CustomerActivities = async (req, res) => {
  const { customer_id, customerId, customer_uuid, employeeId, employee_uuid, limit, offset = 0 } = req.query;
  const target_customer_id = customer_id || customerId || customer_uuid;
  const target_employee_id = employeeId || employee_uuid;

  try {
    if (!target_customer_id) {
      return res.status(400).json({
        status: "error",
        message: "Customer ID is required",
      });
    }

    if (!target_employee_id) {
      return res.status(400).json({
        status: "error",
        message: "Employee ID is required",
      });
    }

    const customer = await prisma.customers.findFirst({
      where: { id: target_customer_id },
      select: { id: true },
    });

    if (!customer) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
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

    const totalCount = await prisma.customeractivities.count({
      where: {
        customer_id: customer.id,
      },
    });

    const customerActivities = await prisma.customeractivities.findMany({
      where: {
        customer_id: customer.id,
      },
      select: {
        id: true,
        ca_message: true,
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

    const activities = customerActivities.map((activity) => ({
      id: activity.id,
      ca_message: activity.ca_message,
      created_at: activity.created_at,
      updated_at: activity.updated_at,
      color_code: activity.color_code,
      employee_short_name: activity.employee_short_name,
      employee: {
        id: activity.employeedetails.id,
        name: activity.employeedetails.name,
        profilePicture: activity.employeedetails.profile_pic_url,
      },
    }));

    return res.status(200).json({
      status: "success",
      message: "Customer activities fetched successfully",
      activities,
      totalCount,
      hasMore: Number(offset) + activities.length < totalCount,
    });
  } catch (error) {
    logger.error(
      `Customer Activities Error: ${error.message}, File: customerController-CustomerActivities `,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.GetCustomersList = async (req, res) => {
  try {
    const { flat_id, block_id } = req.query;
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);

    let whereCondition = {
      soft_delete: 0,
      ...(allocatedProjectIds !== null && {
        project_id: { in: allocatedProjectIds },
      }),
    };

    if (flat_id) {
      whereCondition = {
        ...whereCondition,
        payments: {
          some: {
            flat_id: Number(flat_id),
          },
        },
      };
    }

    if (block_id) {
      whereCondition = {
        ...whereCondition,
        flats: {
          some: {
            block_id: Number(block_id),
          },
        },
      };
    }
    const customers = await prisma.customers.findMany({
      where: whereCondition,
      select: {
        id: true,
        first_name: true,
        last_name: true,
      },
      orderBy: {
        first_name: "asc",
      },
    });

    const formattedCustomers = customers.map((customer) => ({
      value: customer.id,
      label: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
    }));

    return res.status(200).json({
      status: "success",
      message: "Customers fetched successfully",
      data: formattedCustomers,
    });
  } catch (error) {
    logger.error(
      `Get Customer List Error: ${error.message}, File: customerController-GetCustomerList `,
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch customers",
    });
  }
};

exports.GetCustomersForExcel = async (req, res) => {
  const { searchQuery, startDate, endDate, projectId } = req.query;

  try {
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);

    const searchCondition = {
      soft_delete: 0,
      ...(projectId && { project_id: projectId }),
      ...(!projectId && allocatedProjectIds !== null && {
        project_id: { in: allocatedProjectIds },
      }),
      ...(searchQuery && {
        OR: [
          { first_name: { startsWith: searchQuery } },
          { last_name: { startsWith: searchQuery } },
          { email: { startsWith: searchQuery } },
        ],
      }),
    };
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

    const customers = await prisma.customers.findMany({
      where: searchCondition,
      orderBy: {
        created_at: "desc",
      },

      select: {
        id: true,
        id: true,
        prefixes: true,
        first_name: true,
        last_name: true,
        email: true,
        email_2: true,
        phone_code: true,
        phone_number: true,
        landline_country_code: true,
        landline_city_code: true,
        landline_number: true,
        gender: true,
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
        // name_of_poa: true,
        // holder_poa: true,
        // no_of_years_correspondence_address: true,
        // no_of_years_city: true,
        // have_you_owned_abode: true,
        // if_owned_project_name: true,
        profile_pic_url: true,
        profile_pic_path: true,
        project_details: {
          select: {
            id: true,
            project_name: true,
          },
        },
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
        status: true,
        created_at: true,
        Customeraddress: {
          select: {
            address_type: true,
            address: true,
            pincode: true,
            city_to_customers: { select: { name: true } },
            state_to_customers: { select: { name: true } },
            country_to_customers: { select: { name: true } },
          },
        },

        flats: {
          select: {
            id: true,
            flat_no: true,
            floor_no: true,
            block_id: true,
            flat_img_path: true,
            block: {
              select: {
                block_name: true,
              },
            },
            type: true,
            flat_img_url: true,
            square_feet: true,
            totalAmount: true,
          },
        },
      },
    });

    const customersData = customers.map((customer) => {
      const permanent = customer?.Customeraddress?.find(
        (a) => a.address_type === "Permanent",
      );
      const correspondence = customer?.Customeraddress?.find(
        (a) => a.address_type === "Correspondence",
      );

      return {
        id: customer?.id?.toString(),
        customer_id_ref: customer?.id,
        prefixes: customer?.prefixes,
        first_name: customer?.first_name,
        last_name: customer?.last_name,
        email: customer?.email,
        email_2: customer?.email_2,
        phone_code: customer?.phone_code,
        phone_number: customer?.phone_number,
        gender: customer?.gender,
        date_of_birth: customer?.date_of_birth,
        father_name: customer?.father_name,
        spouse_prefixes: customer?.spouse_prefixes,
        spouse_name: customer?.spouse_name,
        marital_status: customer?.marital_status,
        number_of_children: customer?.number_of_children,
        wedding_aniversary: customer?.wedding_aniversary,
        spouse_dob: customer?.spouse_dob,
        pan_card_no: customer?.pan_card_no,
        aadhar_card_no: customer?.aadhar_card_no,
        marital_status: customer?.marital_status,
        project_name: customer?.project_details?.project_name ?? null,
        country_of_citizenship:
          customer?.country_of_citizenship_details?.name ?? null,
        country_of_residence:
          customer?.country_of_residence_details?.name ?? null,
        mother_tongue: customer?.mother_tongue,
        // name_of_poa: customer?.name_of_poa,
        // holder_poa: customer?.holder_poa,
        // no_of_years_correspondence_address: customer?.no_of_years_correspondence_address,
        // no_of_years_city: customer?.no_of_years_city,
        // have_you_owned_abode: customer?.have_you_owned_abode,
        // if_owned_project_name: customer?.if_owned_project_name,
        status: customer?.status,
        created_at: customer?.created_at,

        // ✅ Correspondence Address
        correspondenceCountryName:
          correspondence?.country_to_customers?.name || null,
        correspondenceStateName:
          correspondence?.state_to_customers?.name || null,
        correspondenceCityName: correspondence?.city_to_customers?.name || null,
        correspondenceAddress: correspondence?.address || null,
        correspondencePincode: correspondence?.pincode || null,

        // ✅ Permanent Address
        permanentCountryName: permanent?.country_to_customers?.name || null,
        permanentStateName: permanent?.state_to_customers?.name || null,
        permanentCityName: permanent?.city_to_customers?.name || null,
        permanentAddress: permanent?.address || null,
        permanentPincode: permanent?.pincode || null,

        flat_details:
          customer?.flats?.map((flat) => ({
            id: flat?.id,
            flat_no: flat?.flat_no,
            floor_no: flat?.floor_no,
            flat_img_path: flat?.flat_img_path,
            flat_img_url: flat?.flat_img_url,
            square_feet: flat?.square_feet,
            totalAmount: flat?.totalAmount,
            block: flat?.block,
            type: flat?.type,
          })) ?? [],
      };
    });

    const worksheetData = customersData?.map((customer, index) => ({
      "S.No": index + 1,
      "Customer Name":
        `${customer.prefixes || ""} ${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
        "N/A",
      "Customer Email": customer.email || "N/A",
      "Secondary Email": customer.email_2 || "N/A",
      "Customer Phone":
        customer.phone_code && customer.phone_number
          ? `+${customer.phone_code} ${customer.phone_number}`.trim()
          : "N/A",
      "Landline Number":
        customer.landline_country_code ||
          customer.landline_city_code ||
          customer.landline_number
          ? `+${customer.landline_country_code || ""}${customer.landline_city_code || ""} ${customer.landline_number || ""}`.trim()
          : "N/A",
      Gender: customer.gender || "N/A",
      "Date of Birth": customer.date_of_birth
        ? new Date(customer.date_of_birth).toLocaleDateString("en-CA")
        : "N/A",
      "Father Name": customer.father_name || "N/A",
      "Spouse Name":
        `${customer.spouse_prefixes || ""} ${customer.spouse_name || ""}` ||
        "N/A",
      "Marital Status": customer.marital_status || "N/A",
      "Number of Children":
        customer.number_of_children != null
          ? customer.number_of_children
          : "N/A",
      "Wedding Anniversary": customer.wedding_aniversary
        ? new Date(customer.wedding_aniversary).toLocaleDateString("en-CA")
        : "N/A",
      "Spouse DOB": customer.spouse_dob
        ? new Date(customer.spouse_dob).toLocaleDateString("en-CA")
        : "N/A",
      "PAN Card Number": customer.pan_card_no || "N/A",
      "Aadhar Card Number": customer.aadhar_card_no || "N/A",
      "Country of Citizenship": customer.country_of_citizenship || "N/A",
      "Country of Residence": customer.country_of_residence || "N/A",
      "Mother Tongue": customer.mother_tongue || "N/A",
      "Project Name": customer.project_name || "N/A",
      // "Name of POA": customer.name_of_poa || "N/A",
      // "Holder POA": customer.holder_poa || "N/A",
      // "Years at Correspondence Address": customer.no_of_years_correspondence_address != null ? customer.no_of_years_correspondence_address : "N/A",
      // "Years in City": customer.no_of_years_city != null ? customer.no_of_years_city : "N/A",
      // "Owned Abode": customer.have_you_owned_abode != null ? customer.have_you_owned_abode.toString() : "N/A",
      // "Owned Abode": customer.have_you_owned_abode === true ? "Yes" : customer.have_you_owned_abode === false ? "No" : "N/A",
      // "Previous Project Name": customer.if_owned_project_name || "N/A",
      Status: customer.status || "N/A",
      "Created At": customer.created_at
        ? new Date(customer.created_at).toLocaleDateString("en-CA")
        : "N/A",
      "Correspondence Country Name":
        customer.correspondenceCountryName || "N/A",
      "Correspondence State Name": customer.correspondenceStateName || "N/A",
      "Correspondence City Name": customer.correspondenceCityName || "N/A",
      "Correspondence Pincode": customer.correspondencePincode || "N/A",
      "Correspondence Address": customer.correspondenceAddress || "N/A",
      "Permanent Country Name": customer.permanentCountryName || "N/A",
      "Permanent State Name": customer.permanentStateName || "N/A",
      "Permanent City Name": customer.permanentCityName || "N/A",
      "Permanent Address": customer.permanentAddress || "N/A",
      "Permanent Pincode": customer.permanentPincode || "N/A",
    }));

    // Create Excel file with exceljs
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Customers Report");

    // Leave Row 1 empty
    worksheet.getRow(1).height = 5;

    // Main Title in Row 2
    const formattedStartDate = startDate
      ? new Date(startDate).toLocaleDateString("en-IN")
      : null;
    const formattedEndDate = endDate
      ? new Date(endDate).toLocaleDateString("en-IN")
      : null;

    let mainHeader = "Abode Customers";
    if (formattedStartDate && formattedEndDate) {
      mainHeader += ` (From ${formattedStartDate} to ${formattedEndDate})`;
    } else if (formattedStartDate) {
      mainHeader += ` (From ${formattedStartDate})`;
    } else if (formattedEndDate) {
      mainHeader += ` (Up to ${formattedEndDate})`;
    }

    if (searchQuery) {
      mainHeader += `Search by (${searchQuery})`;
    }

    const headers = [
      "S.No",
      "Customer Name",
      "Customer Email",
      "Secondary Email",
      "Customer Phone",
      "Landline Number",
      "Gender",
      "Date of Birth",
      "Father Name",
      "Spouse Name",
      "Marital Status",
      "Number of Children",
      "Wedding Anniversary",
      "Spouse DOB",
      "PAN Card Number",
      "Aadhar Card Number",
      "Country of Citizenship",
      "Country of Residence",
      "Mother Tongue",
      "Project Name",
      "Status",
      "Created At",
      "Correspondence Country Name",
      "Correspondence State Name",
      "Correspondence City Name",
      "Correspondence Pincode",
      "Correspondence Address",
      "Permanent Country Name",
      "Permanent State Name",
      "Permanent City Name",
      "Permanent Address",
      "Permanent Pincode",
    ];

    // const headers = ["S.No", "Customer Name", "Customer Email", "Secondary Email", "Customer Phone", "Landline Number", "Gender", "Date of Birth", "Father Name", "Spouse Name", "Marital Status", "Number of Children", "Wedding Anniversary", "Spouse DOB", "PAN Card Number", "Aadhar Card Number", "Country of Citizenship", "Country of Residence", "Mother Tongue", "Name of POA", "Holder POA", "Years at Correspondence Address", "Years in City", "Owned Abode", "Previous Project Name", "Status", "Created At", "Correspondence Country Name", "Correspondence State Name", "Correspondence City Name", "Correspondence Pincode", "Correspondence Address", "Permanent Country Name", "Permanent State Name", "Permanent City Name", "Permanent Address", "Permanent Pincode"];

    const lastColLetter = worksheet.getColumn(headers.length).letter;

    worksheet.mergeCells(`A2:${lastColLetter}2`);
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
      fgColor: { argb: "0083BF" }, // Ensure blue background
    };
    titleCell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    worksheet.getRow(2).height = 30;

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
      { header: "Customer Name", key: "Customer Name" },
      { header: "Customer Email", key: "Customer Email" },
      { header: "Secondary Email", key: "Secondary Email" },
      { header: "Customer Phone", key: "Customer Phone" },
      { header: "Landline Number", key: "Landline Number" },
      { header: "Gender", key: "Gender" },
      { header: "Date of Birth", key: "Date of Birth" },
      { header: "Father Name", key: "Father Name" },
      { header: "Spouse Name", key: "Spouse Name" },
      { header: "Marital Status", key: "Marital Status" },
      { header: "Number of Children", key: "Number of Children" },
      { header: "Wedding Anniversary", key: "Wedding Anniversary" },
      { header: "Spouse DOB", key: "Spouse DOB" },
      { header: "PAN Card Number", key: "PAN Card Number" },
      { header: "Aadhar Card Number", key: "Aadhar Card Number" },
      { header: "Country of Citizenship", key: "Country of Citizenship" },
      { header: "Country of Residence", key: "Country of Residence" },
      { header: "Mother Tongue", key: "Mother Tongue" },
      { header: "Project Name", key: "Project Name" },
      // { header: "Name of POA", key: "Name of POA" },
      // { header: "Holder POA", key: "Holder POA" },
      // { header: "Years at Correspondence Address", key: "Years at Correspondence Address" },
      // { header: "Years in City", key: "Years in City" },
      // { header: "Owned Abode", key: "Owned Abode" },
      // { header: "Previous Project Name", key: "Previous Project Name" },
      { header: "Status", key: "Status" },
      { header: "Created At", key: "Created At" },
      {
        header: "Correspondence Country Name",
        key: "Correspondence Country Name",
      },
      { header: "Correspondence State Name", key: "Correspondence State Name" },
      { header: "Correspondence City Name", key: "Correspondence City Name" },
      { header: "Correspondence Pincode", key: "Correspondence Pincode" },
      { header: "Correspondence Address", key: "Correspondence Address" },
      { header: "Permanent Country Name", key: "Permanent Country Name" },
      { header: "Permanent State Name", key: "Permanent State Name" },
      { header: "Permanent City Name", key: "Permanent City Name" },
      { header: "Permanent Address", key: "Permanent Address" },
      { header: "Permanent Pincode", key: "Permanent Pincode" },
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

        row.getCell("Marital Status").alignment = { horizontal: "center" };
        // row.getCell("Number of Children").alignment = { horizontal: "center" };
        // row.getCell("Years at Correspondence Address").alignment = { horizontal: "center" };
        // row.getCell("Years in City").alignment = { horizontal: "center" };
        // row.getCell("Owned Abode").alignment = { horizontal: "center" };
        row.getCell("Status").alignment = { horizontal: "center" };
        row.getCell("Date of Birth").numFmt = "yyyy-mm-dd";
        row.getCell("Wedding Anniversary").numFmt = "yyyy-mm-dd";
        row.getCell("Spouse DOB").numFmt = "yyyy-mm-dd";
        row.getCell("Created At").numFmt = "yyyy-mm-dd";
      }
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=customers-report.xlsx",
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error(
      `Get Customers For Excel Error: ${error.message}, File: customerController-GetCustomersForExcel `,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

// exports.uploadParsedCustomers = async (req, res) => {
//   const form = new multiparty.Form();

//   form.parse(req, async (error, fields, files) => {
//     if (error) {
//       return res.status(500).json({ status: "error", message: error.message });
//     }

//     const file = files.bulkcustomers?.[0];
//     if (!file) {
//       return res.status(200).json({ status: "error", message: "No file uploaded." });
//     }

//     try {
//       const workbook = xlsx.readFile(file.path);
//       const sheetName = workbook.SheetNames[0];
//       const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

//       const skipped = [];
//       const inserted = [];

//       const validMaritalStatus = ["Single", "Married"];
//       const validPOA = ["Resident", "NRI"];
//       const validOwnedAbode = ["Yes", "No"];

//       const parseDate = (val) => {
//         if (!val) return null;

//         // Only allow strings in DD-MM-YYYY format
//         if (typeof val === "string") {
//           // Validate strictly using regex
//           const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
//           const match = val.match(regex);

//           if (!match) return null;

//           const [_, dd, mm, yyyy] = match;

//           // Convert to integers
//           const day = parseInt(dd, 10);
//           const month = parseInt(mm, 10);
//           const year = parseInt(yyyy, 10);

//           // Basic range checks
//           if (month < 1 || month > 12) return null;
//           if (day < 1 || day > 31) return null;

//           // Construct date in ISO (yyyy-mm-dd)
//           const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
//           const date = new Date(iso);

//           // Final validation: ensure parsed date matches input values
//           if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
//             return null; // invalid (like 31-02-2024)
//           }

//           return date;
//         }

//         // For everything else (numbers, Date objects, other formats), reject
//         return null;
//       };

//       for (const row of data) {
//         try {
//           // ✅ Required fields
//           if (!row["First Name"] || !row["Last Name"] || !row["Email Address"] || !row["Phone Number"] || !row["Date of Birth"]) {
//             skipped.push({ row, reason: "Missing required fields" });
//             continue;
//           }

//           // ✅ Email validation
//           const email = row["Email Address"]?.toString().trim().toLowerCase();
//           if (email) {
//             // simple email regex
//             const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//             if (!emailRegex.test(email)) {
//               skipped.push({ row, reason: "Email address is not valid" });
//               continue;
//             }

//             const emailExists = await prisma.customers.findFirst({
//               where: { email: email },
//             });
//             if (emailExists) {
//               skipped.push({ row, reason: "Email already exists" });
//               continue;
//             }
//           }

//           // ✅ Phone validation
//           const phone = row["Phone Number"].toString().trim();
//           if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
//             skipped.push({ row, reason: "Phone number is not valid (must be 10 digits)" });
//             continue;
//           }
//           const phoneExists = await prisma.customers.findFirst({
//             where: { phone_number: phone },
//           });
//           if (phoneExists) {
//             skipped.push({ row, reason: "Phone number already exists" });
//             continue;
//           }

//           // ✅ Dropdown validations
//           if (row["Marital Status"] && !validMaritalStatus.includes(row["Marital Status"])) {
//             skipped.push({ row, reason: "Invalid Marital Status" });
//             continue;
//           }
//           if (row["If POA Holder is Indian, specify status"] && !validPOA.includes(row["If POA Holder is Indian, specify status"])) {
//             skipped.push({ row, reason: "Invalid POA Status" });
//             continue;
//           }
//           if (row["Have you ever owned a Abode home / property?"] && !validOwnedAbode.includes(row["Have you ever owned a Abode home / property?"])) {
//             skipped.push({ row, reason: "Invalid Owned Abode Value" });
//             continue;
//           }

//           // ✅ If owned Abode = Yes → Project Name required
//           if (row["Have you ever owned a Abode home / property?"]?.toString().toLowerCase() === "yes" && !row["If Yes, Project Name"]) {
//             skipped.push({ row, reason: "Project Name is required when Abode Owned is Yes" });
//             continue;
//           }

//           // ✅ Date validations
//           const dob = parseDate(row["Date of Birth"]);
//           const anniversary = parseDate(row["Wedding Aniversary"]);
//           const spouseDob = parseDate(row["Spouse DOB"]);

//           // ✅ Resolve Country / State / City
//           const resolveLocation = async (countryName, stateName, cityName) => {
//             let countryId = null,
//               stateId = null,
//               cityId = null;

//             if (countryName) {
//               const country = await prisma.country.findFirst({
//                 where: { name: countryName.trim() },
//               });
//               if (!country) return { error: `Country '${countryName}' not found` };
//               countryId = Number(country.id);
//             }

//             if (stateName) {
//               const state = await prisma.states.findFirst({
//                 where: { name: stateName.trim() },
//               });
//               if (!state) return { error: `State '${stateName}' not found` };
//               stateId = state.id;
//             }

//             if (cityName) {
//               const city = await prisma.cities.findFirst({
//                 where: { name: cityName.trim() },
//               });
//               if (!city) return { error: `City '${cityName}' not found` };
//               cityId = city.id;
//             }

//             return { countryId, stateId, cityId };
//           };

//           const corrLocation = await resolveLocation(row["Address of Correspondence, Country"], row["Address of Correspondence, State"], row["Address of Correspondence, City"]);
//           if (corrLocation.error) {
//             skipped.push({ row, reason: corrLocation.error });
//             continue;
//           }

//           const permLocation = await resolveLocation(row["Permanent Address, Country"], row["Permanent Address, State"], row["Permanent Address, City"]);
//           if (permLocation.error) {
//             skipped.push({ row, reason: permLocation.error });
//             continue;
//           }

//           // ✅ Resolve Country by name (case-insensitive if Prisma supports it)
//           const resolveCountry = async (countryName) => {
//             if (!countryName) return null;

//             const country = await prisma.country.findFirst({
//               where: {
//                 name: countryName.trim(),
//               },
//             });

//             return country ? Number(country.id) : null;
//           };

//           // inside the for (const row of data) loop, just before creating customer
//           const citizenshipId = await resolveCountry(row["Country of Citizenship"]);
//           const residenceId = await resolveCountry(row["Country of Residence"]);

//           if (row["Country of Citizenship"] && !citizenshipId) {
//             skipped.push({ row, reason: `Country of Citizenship '${row["Country of Citizenship"]}' not found` });
//             continue;
//           }
//           if (row["Country of Residence"] && !residenceId) {
//             skipped.push({ row, reason: `Country of Residence '${row["Country of Residence"]}' not found` });
//             continue;
//           }

//           // ✅ Generate UUID
//           // REMOVED: // REMOVED: // REMOVED: const uuid = "CUST" + Math.floor(100000 + Math.random() * 900000);

//           // ✅ Insert Customer
//           const customer = await prisma.customers.create({
//             data: {
//
//               first_name: row["First Name"].trim(),
//               last_name: row["Last Name"].trim(),
//               email: row["Email Address"].trim(),
//               email_2: row["Alternate Email Address"] || null,
//               phone_code: "91",
//               phone_number: phone,
//               date_of_birth: dob || null,
//               father_name: row["Father Name"] || null,
//               spouse_name: row["Spouse Name"] || null,
//               marital_status: row["Marital Status"] || null,
//               number_of_children: row["Number of Children"] ? parseInt(row["Number of Children"]) : null,
//               wedding_aniversary: anniversary || null,
//               spouse_dob: spouseDob || null,
//               pan_card_no: row["Pan Card No"] || null,
//               aadhar_card_no: row["Aadhar Card No"] ? String(row["Aadhar Card No"]) : null,
//               country_of_citizenship: citizenshipId || null,
//               country_of_residence: residenceId || null,
//               mother_tongue: row["Mother Tongue"] || null,
//               name_of_poa: row["Name of Power of Attorney (POA) Holder"] || null,
//               holder_poa: row["If POA Holder is Indian, specify status"] || null,
//               no_of_years_correspondence_address: row["Number of years residing at correspondence address"] ? parseInt(row["Number of years residing at correspondence address"]) : null,
//               no_of_years_city: row["Number of years residing at city"] ? parseInt(row["Number of years residing at city"]) : null,
//               have_you_owned_abode: row["Have you ever owned a Abode home / property?"]?.toString().toLowerCase() === "yes",
//               if_owned_project_name: row["If Yes, Project Name"] || null,
//             },
//           });

//           // ✅ Insert Correspondence Address
//           if (row["Address of Correspondence, Address"]) {
//             await prisma.customeraddress.create({
//               data: {
//                 customer_id: customer.id,
//                 address_type: "Correspondence",
//                 address: row["Address of Correspondence, Address"],
//                 city: corrLocation.cityId,
//                 state: corrLocation.stateId,
//                 country: corrLocation.countryId,
//                 pincode: row["Address of Correspondence, Pincode"] ? String(row["Address of Correspondence, Pincode"]) : null,
//               },
//             });
//           }

//           // ✅ Insert Permanent Address
//           if (row["Permanent Address, Address"]) {
//             await prisma.customeraddress.create({
//               data: {
//                 customer_id: customer.id,
//                 address_type: "Permanent",
//                 address: row["Permanent Address, Address"],
//                 city: permLocation.cityId,
//                 state: permLocation.stateId,
//                 country: permLocation.countryId,
//                 pincode: row["Permanent Address, Pincode"] ? String(row["Permanent Address, Pincode"]) : null,
//               },
//             });
//           }

//           inserted.push(customer.email);
//         } catch (err) {
//           skipped.push({ row, reason: err.message });
//         }
//       }

//       // console.log("skipped:", skipped)

//       return res.status(200).json({
//         status: "success",
//         insertedCount: inserted.length,
//         skippedCount: skipped.length,
//         skipped,
//       });
//     } catch (error) {
//       logger.error(`Upload Parsed Customers Error: ${error.message}, File: customerController-UploadParsedCustomers `);
//       return res.status(500).json({ status: "error", message: error.message });
//     }
//   });
// };

exports.uploadParsedCustomers = async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (error, fields, files) => {
    if (error) {
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }

    const file = files.bulkcustomers?.[0];
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

      const skipped = [];
      const inserted = [];

      const validPrefixes = ["Mr", "Mrs", "Miss", "Mx"];
      const validGender = ["Male", "Female"];

      const validMaritalStatus = ["Single", "Married"];
      const validPOA = ["Resident", "NRI"];
      const validOwnedAbode = ["Yes", "No"];

      const parseDate = (val) => {
        if (!val) return null;

        let date = null;

        // Case 1: Excel serial number
        if (!isNaN(val)) {
          const excelEpoch = new Date(Date.UTC(1900, 0, 1));
          date = new Date(excelEpoch.getTime() + (val - 2) * 86400000);
        } else if (typeof val === "string") {
          // Case 2: String formats
          const parsedDate = dayjs(
            val,
            ["DD-MM-YYYY", "D/M/YYYY", "MM-DD-YYYY", "YYYY-MM-DD"],
            true,
          );
          if (parsedDate.isValid()) {
            date = new Date(
              Date.UTC(
                parsedDate.year(),
                parsedDate.month(),
                parsedDate.date(),
              ),
            );
          }
        }

        return date;
      };

      for (const row of data) {
        try {
          if (row["Prefixes"] && !validPrefixes.includes(row["Prefixes"])) {
            throw new Error(`Invalid Prefix: '${row["Prefixes"]}'. Valid options are: ${validPrefixes.join(", ")}`);
          }

          // ✅ Required fields
          const requiredFields = [
            "Project",
            "Prefixes",
            "First Name",
            "Last Name",
            "Phone Number",
            "Gender"
          ];

          const missingFields = requiredFields.filter(
            (field) => !row[field] || row[field].toString().trim() === ""
          );

          if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
          }

          // ✅ Resolve Project
          let projectId = null;
          if (row["Project"]) {
            const project = await prisma.project.findFirst({
              where: {
                project_name: row["Project"].toString().trim(),
              },
            });

            if (!project) {
              throw new Error(`Project '${row["Project"]}' not found in the database.`);
            }
            projectId = project.id;
          }

          // ✅ Email validation
          const email = row["Email Address"]?.toString().trim().toLowerCase();
          if (email) {
            // simple email regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              throw new Error("Email address is not valid");
            }

            const emailExists = await prisma.customers.findFirst({
              where: { email: email },
            });
            if (emailExists) {
              throw new Error("Email already exists");
            }
          }

          // ✅ Phone validation
          const phone = row["Phone Number"].toString().trim();
          if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
            throw new Error("Phone number is not valid (must be 10 digits)");
          }
          const phoneExists = await prisma.customers.findFirst({
            where: { phone_number: phone, project_id: projectId ? projectId : undefined },
          });
          if (phoneExists) {
            throw new Error("Phone number already exists");
          }

          if (row["Gender"] && !validGender.includes(row["Gender"])) {
            throw new Error(`Invalid Gender: '${row["Gender"]}'. Valid options are: ${validGender.join(", ")}`);
          }

          // ✅ Aadhar Card Validation
          const aadharCardNo = row["Aadhar Card No"];
          if (aadharCardNo && aadharCardNo.toString().trim().length !== 12) {
            throw new Error("Aadhar Card is invalid (must be 12 digits)");
          }

          // ✅ PAN Card Validation
          const panCardNo = row["Pan Card No"];
          if (panCardNo) {
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!panRegex.test(panCardNo.toString().trim().toUpperCase())) {
              throw new Error("PAN Card is invalid");
            }
          }

          // ✅ Dropdown validations
          if (
            row["Marital Status"] &&
            !validMaritalStatus.includes(row["Marital Status"])
          ) {
            row["Marital Status"] = null;
          }
          if (
            row["Spouse Prefixes"] &&
            !validPrefixes.includes(row["Spouse Prefixes"])
          ) {
            row["Spouse Prefixes"] = null;
          }

          if (
            row["If POA Holder is Indian, specify status"] &&
            !validPOA.includes(row["If POA Holder is Indian, specify status"])
          ) {
            row["If POA Holder is Indian, specify status"] = null;
          }
          if (
            row["Have you ever owned a Abode home / property?"] &&
            !validOwnedAbode.includes(
              row["Have you ever owned a Abode home / property?"],
            )
          ) {
            row["Have you ever owned a Abode home / property?"] = null;
            continue;
          }

          // ✅ If owned Abode = Yes → Project Name required
          if (
            row["Have you ever owned a Abode home / property?"]
              ?.toString()
              .toLowerCase() === "yes" &&
            !row["If Yes, Project Name"]
          ) {
            row["If Yes, Project Name"] = null;
          }

          // ✅ Date validations
          const dob = parseDate(row["Date of Birth"]);
          const anniversary = parseDate(row["Wedding Aniversary"]);
          const spouseDob = parseDate(row["Spouse DOB"]);

          // ✅ Resolve Country / State / City
          const resolveLocation = async (countryName, stateName, cityName) => {
            let countryId = null,
              stateId = null,
              cityId = null;

            if (countryName) {
              const country = await prisma.country.findFirst({
                where: { name: countryName.trim() },
              });
              if (!country)
                return { error: `Country '${countryName}' not found` };
              countryId = country.id;
            }

            if (stateName) {
              const state = await prisma.states.findFirst({
                where: { name: stateName.trim() },
              });
              if (!state) return { error: `State '${stateName}' not found` };
              stateId = state.id;
            }

            if (cityName) {
              const city = await prisma.cities.findFirst({
                where: { name: cityName.trim() },
              });
              if (!city) return { error: `City '${cityName}' not found` };
              cityId = city.id;
            }

            return { countryId, stateId, cityId };
          };

          const corrLocation = await resolveLocation(
            row["Address of Correspondence, Country"],
            row["Address of Correspondence, State"],
            row["Address of Correspondence, City"],
          );
          if (corrLocation.error) {
            row["Address of Correspondence, Country"] = null;
            row["Address of Correspondence, State"] = null;
            row["Address of Correspondence, City"] = null;
          }

          const permLocation = await resolveLocation(
            row["Permanent Address, Country"],
            row["Permanent Address, State"],
            row["Permanent Address, City"],
          );
          if (permLocation.error) {
            row["Permanent Address, Country"] = null;
            row["Permanent Address, State"] = null;
            row["Permanent Address, City"] = null;
          }

          // ✅ Resolve Country by name (case-insensitive if Prisma supports it)
          const resolveCountry = async (countryName) => {
            if (!countryName) return null;

            const country = await prisma.country.findFirst({
              where: {
                name: countryName.trim(),
              },
            });

            return country ? country.id : null;
          };

          // inside the for (const row of data) loop, just before creating customer
          const citizenshipId = await resolveCountry(
            row["Country of Citizenship"],
          );
          const residenceId = await resolveCountry(row["Country of Residence"]);

          if (row["Country of Citizenship"] && !citizenshipId) {
            row["Country of Citizenship"] = null;
          }
          if (row["Country of Residence"] && !residenceId) {
            row["Country of Residence"] = null;
          }

          // ✅ Generate UUID
          // REMOVED: // REMOVED: // REMOVED: const uuid = "CUST" + Math.floor(100000 + Math.random() * 900000);

          // ✅ Insert Customer
          const customer = await prisma.customers.create({
            data: {
              prefixes: row["Prefixes"] || null,
              first_name: row["First Name"].toString().trim(),
              last_name: row["Last Name"].toString().trim(),
              email: email,
              email_2: row["Alternate Email Address"] ? row["Alternate Email Address"].toString().trim() : null,
              phone_code: "91",
              phone_number: phone,
              gender: row["Gender"] || null,
              date_of_birth: dob || null,
              father_name: row["Father Name"] || null,
              spouse_prefixes: row["Spouse Prefixes"] || null,
              spouse_name: row["Spouse Name"] || null,
              marital_status: row["Marital Status"] || null,
              number_of_children: row["Number of Children"]
                ? parseInt(row["Number of Children"])
                : null,
              wedding_aniversary: anniversary || null,
              spouse_dob: spouseDob || null,
              pan_card_no: row["Pan Card No"]
                ? row["Pan Card No"].toString().toUpperCase()
                : null,
              aadhar_card_no: row["Aadhar Card No"]
                ? String(row["Aadhar Card No"])
                : null,
              country_of_citizenship: citizenshipId || null,
              country_of_residence: residenceId || null,
              mother_tongue: row["Mother Tongue"] || null,
              name_of_poa:
                row["Name of Power of Attorney (POA) Holder"] || null,
              holder_poa:
                row["If POA Holder is Indian, specify status"] || null,
              no_of_years_correspondence_address: row[
                "Number of years residing at correspondence address"
              ]
                ? parseInt(
                  row["Number of years residing at correspondence address"],
                )
                : null,
              no_of_years_city: row["Number of years residing at city"]
                ? parseInt(row["Number of years residing at city"])
                : null,
              have_you_owned_abode:
                row["Have you ever owned a Abode home / property?"]
                  ?.toString()
                  .toLowerCase() === "yes",
              if_owned_project_name: row["If Yes, Project Name"] || null,
              added_by_employee_id: employee_id,
              project_id: projectId, // ✅ Add Project ID
            },
          });
          // ✅ Insert Correspondence Address
          if (row["Address of Correspondence, Address"]) {
            await prisma.customeraddress.create({
              data: {
                customer_id: customer.id,
                address_type: "Correspondence",
                address: row["Address of Correspondence, Address"],
                city: corrLocation.cityId,
                state: corrLocation.stateId,
                country: corrLocation.countryId,
                pincode: row["Address of Correspondence, Pincode"]
                  ? String(row["Address of Correspondence, Pincode"])
                  : null,
              },
            });
          }

          // ✅ Insert Permanent Address
          if (row["Permanent Address, Address"]) {
            await prisma.customeraddress.create({
              data: {
                customer_id: customer.id,
                address_type: "Permanent",
                address: row["Permanent Address, Address"],
                city: permLocation.cityId,
                state: permLocation.stateId,
                country: permLocation.countryId,
                pincode: row["Permanent Address, Pincode"]
                  ? String(row["Permanent Address, Pincode"])
                  : null,
              },
            });
          }

          if (row["Current Designation"]) {
            await prisma.profession.create({
              data: {
                customer_id: customer?.id,
                current_designation: row["Current Designation"] || null,
                name_of_current_organization:
                  row["Current Organization"] || null,
                address_of_current_organization:
                  row["Organization Address"] || null,
                no_of_years_work_experience: row["Work Experience"]
                  ? parseFloat(row["Work Experience"])
                  : null,
                current_annual_income: row["Annual Income"]
                  ? parseFloat(row["Annual Income"])
                  : null,
              },
            });
          }

          await prisma.customeractivities.create({
            data: {
              customer_id: customer.id,
              ca_message: "Customer created via bulk upload",
              employee_id: employee_id,
            },
          });

          inserted.push({
            name: `${row["First Name"]} ${row["Last Name"]}`,
            phone: phone,
            email: row["Email Address"] || "N/A"
          });
        } catch (err) {
          skipped.push({ row, reason: err.message });
        }
      }

      return res.status(200).json({
        status: "success",
        message: `Successfully processed ${inserted.length} customers. ${skipped.length} rows were skipped.`,
        insertedCount: inserted.length,
        skippedCount: skipped.length,
        inserted,
        skipped: skipped.slice(0, 10),
      });
    } catch (error) {
      console.error("Upload customers error:", error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  });
};

exports.ConvertCustomerToLead = async (req, res) => {
  const { customerUuid, customerId, employee_id } = req.body;

  try {
    const effectiveCustomerId = customerId || customerUuid;
    if (!effectiveCustomerId) {
      return res
        .status(200)
        .json({ status: "error", message: "Customer id is required" });
    }

    // Get customer details including relations
    const customer = await prisma.customers.findUnique({
      where: { id: effectiveCustomerId },
      include: {
        flats: true,
        Profession: true,
        Customeraddress: true,
        Customerfilemanager: true,
        Customernotes: true,
        Customeractivities: true,
      },
    });

    if (!customer) {
      return res
        .status(200)
        .json({ status: "error", message: "Customer not found" });
    }

    // Check if customer has assigned flats
    if (customer.flats.length > 0) {
      return res.status(200).json({
        status: "error",
        message: "Cannot convert customer with assigned flats to lead",
      });
    }

    // Check for existing lead with same email or phone to avoid duplication
    if (customer.email) {
      const existingLeadEmail = await prisma.leads.findFirst({
        where: { email: customer.email },
      });
      if (existingLeadEmail) {
        return res.status(200).json({
          status: "error",
          message: "A lead with this email already exists",
        });
      }
    }

    const existingLeadPhone = await prisma.leads.findFirst({
      where: {
        phone_code: customer.phone_code,
        phone_number: customer.phone_number,
      },
    });
    if (existingLeadPhone) {
      return res.status(200).json({
        status: "error",
        message: "A lead with this phone number already exists",
      });
    }

    // --- NEW LOGIC: Lead Stage handling ---
    let returnedStage = await prisma.leadstages.findFirst({
      where: { name: "Returned" },
    });

    if (!returnedStage) {
      // Find max order to avoid unique constraint error
      const maxOrder = await prisma.leadstages.aggregate({
        _max: { order: true },
      });
      const nextOrder = (maxOrder._max.order || 0) + 1;

      returnedStage = await prisma.leadstages.create({
        data: {
          name: "Returned",
          order: nextOrder,
        },
      });
    }
    // --- END NEW LOGIC ---

    const leadUuid = "LEAD" + Math.floor(100000 + Math.random() * 900000);

    // Helper to replace paths
    const replaceCustomerToLeadInPath = (str, custUuidVal, leadUuidVal) => {
      if (!str) return str;
      let out = str.replace(
        new RegExp(`/uploads/customers/${custUuidVal}`, "g"),
        `/uploads/leads/${leadUuidVal}`,
      );
      out = out.replace(
        new RegExp(`\\\\uploads\\\\customers\\\\${custUuidVal}`, "g"),
        `\\\\uploads\\\\leads\\\\${leadUuidVal}`,
      );
      out = out.replace(
        new RegExp(`customers/${custUuidVal}`, "g"),
        `leads/${leadUuidVal}`,
      );
      out = out.replace(
        new RegExp(`customers\\\\${custUuidVal}`, "g"),
        `leads\\\\${leadUuidVal}`,
      );
      return out;
    };

    // Prepare folders
    const customerFolder = path.resolve("uploads", "customers", `${customer.id}`);
    const leadFolder = path.resolve("uploads", "leads", `${leadUuid}`);

    // Copy physical files if exists
    if (fs.existsSync(customerFolder)) {
      await fs.promises.mkdir(leadFolder, { recursive: true });
      await fs.promises.cp(customerFolder, leadFolder, { recursive: true });
      console.log(`Files copied from ${customerFolder} → ${leadFolder}`);
    }

    // 1) Create Lead
    const newLead = await prisma.leads.create({
      data: {
        id: leadUuid,
        prefixes: customer.prefixes,
        full_name: `${customer.first_name} ${customer.last_name}`.trim(),
        email: customer.email || null,
        email_2: customer.email_2 || null,
        phone_code: customer.phone_code,
        phone_number: customer.phone_number,
        gender: customer.gender,
        landline_country_code: customer.landline_country_code,
        landline_city_code: customer.landline_city_code,
        landline_number: customer.landline_number,
        date_of_birth: customer.date_of_birth,
        father_name: customer.father_name,
        spouse_prefixes: customer.spouse_prefixes,
        spouse_name: customer.spouse_name,
        marital_status: customer.marital_status,
        number_of_children: customer.number_of_children,
        wedding_aniversary: customer.wedding_aniversary,
        spouse_dob: customer.spouse_dob,
        pan_card_no: customer.pan_card_no,
        aadhar_card_no: customer.aadhar_card_no,
        country_of_citizenship: customer.country_of_citizenship,
        country_of_residence: customer.country_of_residence,
        mother_tongue: customer.mother_tongue,
        name_of_poa: customer.name_of_poa,
        holder_poa: customer.holder_poa,
        no_of_years_correspondence_address: customer.no_of_years_correspondence_address,
        no_of_years_city: customer.no_of_years_city,
        have_you_owned_abode: customer.have_you_owned_abode,
        if_owned_project_name: customer.if_owned_project_name,
        project_id: customer.project_id,
        source_of_lead: customer.source_of_lead,
        lead_stage_id: returnedStage.id, // Assign the 'Returned' stage ID
        status: "Active",
        added_by_employee_id: customer.added_by_employee_id,
        profile_pic_url: replaceCustomerToLeadInPath(customer.profile_pic_url, customer.id, leadUuid),
        profile_pic_path: replaceCustomerToLeadInPath(customer.profile_pic_path, customer.id, leadUuid),
        created_at: customer.created_at,
      },
    });

    // 2) Profession
    if (customer.Profession.length > 0) {
      const prof = customer.Profession[0];
      await prisma.leadsprofession.create({
        data: {
          lead_id: newLead.id,
          current_designation: prof.current_designation,
          name_of_current_organization: prof.name_of_current_organization,
          address_of_current_organization: prof.address_of_current_organization,
          no_of_years_work_experience: prof.no_of_years_work_experience,
          current_annual_income: prof.current_annual_income,
          created_at: prof.created_at,
        },
      });
    }

    // 3) Activities
    if (customer.Customeractivities.length > 0) {
      await prisma.leadsactivities.createMany({
        data: customer.Customeractivities.map((a) => ({
          lead_id: newLead.id,
          employee_id: a.employee_id,
          ca_message: a.ca_message,
          color_code: a.color_code,
          employee_short_name: a.employee_short_name,
          created_at: a.created_at,
          updated_at: a.updated_at,
        })),
      });
    }

    // 4) Notes
    if (customer.Customernotes.length > 0) {
      await prisma.leadsnotes.createMany({
        data: customer.Customernotes.map((n) => ({
          lead_id: newLead.id,
          employee_id: n.user_id,
          note_message: n.note_message,
          created_at: n.created_at,
          updated_at: n.updated_at,
        })),
      });
    }

    // 5) Addresses
    if (customer.Customeraddress.length > 0) {
      await prisma.leadsaddress.createMany({
        data: customer.Customeraddress.map((addr) => ({
          lead_id: newLead.id,
          address_type: addr.address_type,
          address: addr.address,
          city: addr.city,
          state: addr.state,
          country: addr.country,
          pincode: addr.pincode,
          created_at: addr.created_at,
          updated_at: addr.updated_at,
        })),
      });
    }

    // 6) FileManager
    if (customer.Customerfilemanager.length > 0) {
      await prisma.leadsfilemanager.createMany({
        data: customer.Customerfilemanager.map((f) => ({
          id: f.id,
          name: f.name,
          file_icon_type: f.file_icon_type,
          file_type: f.file_type,
          file_size: f.file_size,
          file_path: replaceCustomerToLeadInPath(f.file_path, customer.id, leadUuid),
          file_url: replaceCustomerToLeadInPath(f.file_url, customer.id, leadUuid),
          parent_id: f.parent_id,
          lead_id: newLead.id,
          added_by: f.added_by,
          created_at: f.created_at,
          updated_at: f.updated_at,
        })),
      });
    }

    // 7) Clean up customer data
    // Prisma deleteMany for cascading-like cleanup if not handled by DB
    await prisma.profession.deleteMany({ where: { customer_id: customer.id } });
    await prisma.customeractivities.deleteMany({ where: { customer_id: customer.id } });
    await prisma.customernotes.deleteMany({ where: { customer_id: customer.id } });
    await prisma.customeraddress.deleteMany({ where: { customer_id: customer.id } });
    await prisma.customerfilemanager.deleteMany({ where: { customer_id: customer.id } });
    await prisma.customers.delete({ where: { id: customer.id } });

    // Delete customer folder
    if (fs.existsSync(customerFolder)) {
      await fs.promises.rm(customerFolder, { recursive: true, force: true });
    }

    return res.status(200).json({
      status: "success",
      message: "Customer converted to lead successfully",
    });

  } catch (error) {
    logger.error(
      `Convert Customer to Lead Error: ${error.message}, File: customerController-ConvertCustomerToLead`,
    );
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.uploadCostSheet = async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      logger.error(`Upload Cost Sheet Error: ${err.message}, File: customerController-uploadCostSheet`);
      return res.status(500).json({ status: "error", message: err.message });
    }

    if (!fields.flat_id?.[0] || !fields.customer_flat_id?.[0] || !fields.id?.[0] || !fields.employee_id?.[0] || !files.uploadfile?.[0]) {
      return res.status(200).json({
        status: "error",
        message: "Missing required fields (flat_id, customer_flat_id, flat_uuid, employee_id, uploadfile)",
      });
    }

    const flat_id = fields.flat_id[0];
    const customer_flat_id = fields.customer_flat_id[0];
    const flat_uid = fields.id[0];
    const employee_id = fields.employee_id[0];
    const uploadedFile = files.uploadfile[0];

    try {
      const flatdetails = await prisma.flat.findFirst({
        where: { id: flat_uid },
      });

      if (!flatdetails) {
        return res.status(200).json({ status: "error", message: "Flat not found" });
      }

      const fileType = uploadedFile.headers['content-type'] === 'application/pdf' ? 'pdf' : path.extname(uploadedFile.originalFilename).substring(1);
      if (fileType !== 'pdf') {
        return res.status(200).json({ status: "error", message: "Only PDF files are allowed" });
      }

      // Cost sheets specifically go into uploads/flats/<flat_uuid>/cost_sheets/
      const maindir = path.join(__dirname, "..", "uploads", "flats", flat_uid);
      if (!fs.existsSync(maindir)) {
        fs.mkdirSync(maindir, { recursive: true });
      }

      const costSheetDir = path.join(maindir, "cost_sheets");
      if (!fs.existsSync(costSheetDir)) {
        fs.mkdirSync(costSheetDir, { recursive: true });
      }

      const tempPath = uploadedFile.path;
      const originalFilename = uploadedFile.originalFilename;
      const ext = path.extname(originalFilename);
      const timestamp = Date.now();
      const newFilename = `${path.basename(originalFilename, ext)}_${timestamp}.pdf`;
      const targetPath = path.join(costSheetDir, newFilename);

      fs.copyFileSync(tempPath, targetPath);
      fs.unlinkSync(tempPath);

      const file_url = `${process.env.API_URL}/uploads/flats/${flat_uid}/cost_sheets/${newFilename}`;
      const file_path = `cost_sheets/${newFilename}`;

      // Find existing customerflat to delete old file if it exists
      const existingCustomerFlat = await prisma.customerflat.findUnique({
        where: { id: customer_flat_id },
      });

      if (existingCustomerFlat && existingCustomerFlat.cost_sheet_path) {
        const oldFilePath = path.join(maindir, existingCustomerFlat.cost_sheet_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }

        // Delete the old file from flatfilemanager
        await prisma.flatfilemanager.deleteMany({
          where: {
            file_path: existingCustomerFlat.cost_sheet_path,
            flat_id: flat_uid,
          },
        });
      }

      // Update Customerflat
      await prisma.customerflat.update({
        where: { id: customer_flat_id },
        data: {
          cost_sheet_url: file_url,
          cost_sheet_path: file_path
        }
      });

      // Add to flatfilemanager so it shows up in documents
      const fileUid = "ABODEF" + Math.floor(100000 + Math.random() * 900000);
      await prisma.flatfilemanager.create({
        data: {
          name: originalFilename,
          id: fileUid,
          file_type: "pdf",
          file_url: file_url,
          file_icon_type: "pdf_icon",
          file_path: file_path,
          parent_id: null,
          flat_id: flatdetails.id,
          added_by: employee_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Add to Customerflatupdateactivities
      await prisma.customerflatupdateactivities.create({
        data: {
          customerflat_id: customer_flat_id,
          employee_id: employee_id,
          message: `• Uploaded new Cost Sheet: ${originalFilename}`,
          created_at: new Date(),
        },
      });

      // Also log in flat task activities
      await prisma.taskactivities.create({
        data: {
          employee_id: employee_id,
          flat_id: flatdetails.id,
          ta_message: `Cost Sheet uploaded: ${originalFilename}`,
          employee_short_name: "F",
          color_code: "blue",
          created_at: new Date(),
        },
      });

      return res.status(200).json({
        status: "success",
        message: "Cost sheet uploaded successfully",
        data: {
          cost_sheet_url: file_url,
          cost_sheet_path: file_path
        }
      });

    } catch (error) {
      logger.error(`Upload Cost Sheet Error: ${error.message}, File: customerController-uploadCostSheet`);
      return res.status(500).json({ status: "error", message: "Error saving file info to database" });
    }
  });
};
