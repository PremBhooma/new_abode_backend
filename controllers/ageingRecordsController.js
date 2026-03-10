const prisma = require("../utils/client");
const logger = require("../helper/logger");
const ExcelJS = require("exceljs");
const getAllocatedProjectIds = require("../utils/getAllocatedProjectIds");

exports.GetAgeingRecords = async (req, res) => {

  const formatLoanStatus = (status) => {
    if (status === "NotApplied") return "Not Applied";
    return status;
  };

  const formatRegistrationStatus = (status) => {
    if (status === "NotRegistered") return "Not Registered";
    return status;
  };

  const { page = 1, limit = 10, searchQuery, sortby = "created_at", sortbyType = "desc" } = req.query;

  const parsedLimit = parseInt(limit, 10);

  try {
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);
    const projectFilter = allocatedProjectIds ? { project_id: { in: allocatedProjectIds } } : {};

    const currentDate = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Pre-calculate/Update loan_time_days for consistency
    await prisma.ageingrecord.updateMany({
      where: {
        loan_Status: "NotApplied",
        booking_date: { lt: sevenDaysAgo },
        loan_time_days: false,
      },
      data: {
        loan_time_days: true,
        updated_at: new Date(),
      },
    });

    let offset = 0;
    if (page > 1) {
      offset = (page - 1) * parsedLimit;
    }

    const searchCondition = {
      ...(searchQuery && {
        OR: [
          { customer: { first_name: { startsWith: searchQuery } } },
          { customer: { last_name: { startsWith: searchQuery } } },
          { customer: { phone_number: { startsWith: searchQuery } } },
          { flat: { flat_no: { startsWith: searchQuery } } },
          { bank_name: { startsWith: searchQuery } },
          { agent_name: { startsWith: searchQuery } },
        ],
      }),
    };

    // 2. Fetch ALL matching records (lightweight) for JS sorting
    // We cannot efficiently sort by custom logic in Prisma without raw SQL, 
    // and raw SQL with search filters (joins) is complex.
    // Fetching IDs + sort fields is a robust compromise for reasonable dataset sizes.
    const allMatchingRecords = await prisma.ageingrecord.findMany({
      where: {
        ...searchCondition,
        ...projectFilter,
        loan_Status: {
          not: "Cancelled",
        },
      },
      select: {
        id: true,
        loan_Status: true,
        loan_time_days: true,
        created_at: true,
        booking_date: true,
      },
    });

    const totalRecordsCount = allMatchingRecords.length;

    // 3. Custom Sort in JavaScript
    // Order: Loan Delay (loan_time_days=true) -> Not Applied -> Applied -> Approved -> Rejected
    const statusPriority = {
      "NotApplied": 1,
      "Applied": 2,
      "Approved": 3,
      "Rejected": 4,
      "Cancelled": 5,
    };

    const sortedRecords = allMatchingRecords.sort((a, b) => {
      // 1. Loan Delay (loan_time_days === true) comes first
      // Note: we pre-calculated loan_time_days so it should be accurate.
      // We also verify the dynamic condition just in case (though updateMany handled it)
      const isDelayedA = a.loan_time_days === true;
      const isDelayedB = b.loan_time_days === true;

      if (isDelayedA && !isDelayedB) return -1;
      if (!isDelayedA && isDelayedB) return 1;

      // 2. Status Priority
      const priorityA = statusPriority[a.loan_Status] || 99;
      const priorityB = statusPriority[b.loan_Status] || 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 3. Default Sort (created_at desc)
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // 4. Paginate IDs
    const paginatedRecords = sortedRecords.slice(offset, offset + parsedLimit);
    const paginatedIds = paginatedRecords.map(r => r.id);

    // 5. Fetch Full Details for Paginated IDs
    const ageingRecordsDetails = await prisma.ageingrecord.findMany({
      where: {
        id: { in: paginatedIds },
      },
      include: {
        flat: {
          select: {
            id: true,
            id: true,
            flat_no: true,
            floor_no: true,
            block: { select: { block_name: true } },
          },
        },
        customer: {
          select: {
            id: true,
            id: true,
            first_name: true,
            last_name: true,
            phone_code: true,
            phone_number: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true, project_name: true,
          },
        },
      },
    });

    // 6. Re-sort details to match the ID order (since 'IN' query does not preserve order)
    const recordsMap = new Map(ageingRecordsDetails.map(r => [r.id, r]));
    const orderedDetails = paginatedIds.map(id => recordsMap.get(id.toString())).filter(Boolean);


    const pageRecordsCount = orderedDetails.length;

    // Process records (formatting)
    const records = orderedDetails.map((record) => {
      let ageing_days = null;
      // We rely on the DB value or recalculate for display.
      // Since we updated loan_time_days potentially, we can use the record's value or recalculate.
      // Using existing logic to be safe for display values.
      if (record?.booking_date) {
        const bookingDate = new Date(record.booking_date);
        const timeDiff = currentDate.getTime() - bookingDate.getTime();
        ageing_days = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
      }

      return {
        id: record?.id?.toString(),
        flat_id: record?.flat_id?.toString(),
        customer_id: record?.customer_id?.toString(),
        customer_flat: record?.customer_flat?.toString(),
        booking_date: record?.booking_date,
        total_amount: record?.total_amount,
        ageing_days: ageing_days,
        loan_Status: formatLoanStatus(record?.loan_Status),
        registration_status: formatRegistrationStatus(record?.registration_status),
        loan_time_days: record?.loan_time_days,
        bank_name: record?.bank_name,
        agent_name: record?.agent_name,
        agent_contact: record?.agent_contact,
        agent_number: record?.agent_number,
        loan_amount: record?.loan_amount,
        created_at: record?.created_at,
        updated_at: record?.updated_at,
        flat: record?.flat ? {
          id: record?.flat?.id?.toString(),
          id: record?.flat?.id,
          flat_no: record?.flat?.flat_no,
          floor_no: record?.flat?.floor_no,
          block_name: record?.flat?.block?.block_name,
        } : null,
        customer: record?.customer ? {
          id: record?.customer?.id?.toString(),
          id: record?.customer?.id,
          first_name: record?.customer?.first_name,
          last_name: record?.customer?.last_name,
          full_name: `${record?.customer?.first_name || ""} ${record?.customer?.last_name || ""}`.trim(),
          phone_code: record?.customer?.phone_code,
          phone_number: record?.customer?.phone_number,
          email: record?.customer?.email,
        } : null,
        project: record?.project ? {
          id: record?.project?.id?.toString(),
          project_name: record?.project?.project_name,
        } : null,
      };
    });

    return res.status(200).json({
      status: "success",
      records: records || [],
      totalRecords: totalRecordsCount,
      totalPages: Math.ceil(totalRecordsCount / parsedLimit),
      pageRecordsCount,
    });
  } catch (error) {
    logger.error(`Get Ageing records Error: ${error.message}, File: ageingRecordsController-GetAgeingRecords`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.GetDashboardAgeingRecords = async (req, res) => {

  const formatLoanStatus = (status) => {
    if (status === "NotApplied") return "Not Applied";
    return status;
  };

  const formatRegistrationStatus = (status) => {
    if (status === "NotRegistered") return "Not Registered";
    return status;
  };

  const { limit = 5 } = req.query;
  const parsedLimit = parseInt(limit, 10);

  try {
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);
    const projectFilter = allocatedProjectIds ? { project_id: { in: allocatedProjectIds } } : {};

    const currentDate = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Pre-calculate/Update loan_time_days
    await prisma.ageingrecord.updateMany({
      where: {
        loan_Status: "NotApplied",
        booking_date: { lt: sevenDaysAgo },
        loan_time_days: false,
      },
      data: {
        loan_time_days: true,
        updated_at: new Date(),
      },
    });

    // 2. Fetch ALL matching records (lightweight) for JS sorting
    const allMatchingRecords = await prisma.ageingrecord.findMany({
      where: {
        ...projectFilter,
        loan_Status: {
          not: "Cancelled",
        },
      },
      select: {
        id: true,
        loan_Status: true,
        loan_time_days: true,
        created_at: true,
      },
    });

    // 3. Custom Sort (Same logic as GetAgeingRecords)
    const statusPriority = {
      "NotApplied": 1,
      "Applied": 2,
      "Approved": 3,
      "Rejected": 4,
      "Cancelled": 5,
    };

    const sortedRecords = allMatchingRecords.sort((a, b) => {
      // 1. Loan Delay
      const isDelayedA = a.loan_time_days === true;
      const isDelayedB = b.loan_time_days === true;
      if (isDelayedA && !isDelayedB) return -1;
      if (!isDelayedA && isDelayedB) return 1;

      // 2. Status Priority
      const priorityA = statusPriority[a.loan_Status] || 99;
      const priorityB = statusPriority[b.loan_Status] || 99;
      if (priorityA !== priorityB) return priorityA - priorityB;

      // 3. Default Sort (created_at desc)
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // 4. Take Top N
    const topRecords = sortedRecords.slice(0, parsedLimit);
    const topIds = topRecords.map(r => r.id);

    // 5. Fetch Full Details
    const ageingRecordsDetails = await prisma.ageingrecord.findMany({
      where: {
        id: { in: topIds },
      },
      include: {
        flat: {
          select: {
            id: true,
            id: true,
            flat_no: true,
            floor_no: true,
            block: { select: { block_name: true } },
          },
        },
        customer: {
          select: {
            id: true,
            id: true,
            first_name: true,
            last_name: true,
            phone_code: true,
            phone_number: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true, project_name: true,
          },
        },
      },
    });

    // 6. Re-sort details
    const recordsMap = new Map(ageingRecordsDetails.map(r => [r.id, r]));
    const orderedDetails = topIds.map(id => recordsMap.get(id.toString())).filter(Boolean);

    // Process/Format
    const records = orderedDetails.map((record) => {
      let ageing_days = null;
      if (record?.booking_date) {
        const bookingDate = new Date(record.booking_date);
        const timeDiff = currentDate.getTime() - bookingDate.getTime();
        ageing_days = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
      }

      return {
        id: record.id,
        flat_id: record.flat_id?.toString(),
        customer_id: record.customer_id?.toString(),
        booking_date: record.booking_date,
        total_amount: record.total_amount,
        ageing_days,
        loan_Status: formatLoanStatus(record.loan_Status),
        registration_status: formatRegistrationStatus(record.registration_status),
        loan_time_days: record.loan_time_days,
        bank_name: record.bank_name,
        agent_name: record.agent_name,
        agent_contact: record.agent_contact,
        agent_number: record.agent_number,
        loan_amount: record.loan_amount,
        created_at: record.created_at,
        updated_at: record.updated_at,

        flat: record.flat && {
          id: record.flat.id,
          id: record.flat.id,
          flat_no: record.flat.flat_no,
          floor_no: record.flat.floor_no,
          block_name: record.flat.block?.block_name,
        },

        customer: record.customer && {
          id: record.customer.id,
          id: record.customer.id,
          first_name: record.customer.first_name,
          last_name: record.customer.last_name,
          full_name: `${record.customer.first_name || ""} ${record.customer.last_name || ""}`.trim(),
          phone_code: record.customer.phone_code,
          phone_number: record.customer.phone_number,
          email: record.customer.email,
        },

        project: record.project && {
          id: record.project.id,
          project_name: record.project.project_name,
        },
      };
    });

    return res.status(200).json({
      status: "success",
      records,
      count: records.length,
    });

  } catch (error) {
    logger.error(`GetDashboardAgeingRecords Error: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message: `Internal server error: ${error.message}`,
    });
  }
};


exports.GetSingleAgeingRecord = async (req, res) => {
  const { id } = req.query;

  try {
    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Record ID is required",
      });
    }

    const ageingRecord = await prisma.ageingrecord.findUnique({
      where: {
        id: id,
      },
      include: {
        flat: {
          select: {
            id: true,
            id: true,
            flat_no: true,
            floor_no: true,
            block: {
              select: {
                block_name: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            id: true,
            first_name: true,
            last_name: true,
            phone_code: true,
            phone_number: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            project_name: true,
          },
        },
      },
    });

    if (!ageingRecord) {
      return res.status(404).json({
        status: "error",
        message: "Ageing record not found",
      });
    }

    const currentDate = new Date();
    let ageing_days = null;
    let loan_time_days = ageingRecord?.loan_time_days || false;

    if (ageingRecord?.booking_date) {
      const bookingDate = new Date(ageingRecord.booking_date);

      // Calculate ageing_days (days passed since booking_date)
      const timeDiff = currentDate.getTime() - bookingDate.getTime();
      ageing_days = Math.max(
        0,
        Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      );

      await prisma.ageingrecord.update({
        where: { id: ageingRecord.id },
        data: {
          ageing_days,
          updated_at: new Date(),
        },
      });

      const daysSinceBooking = Math.ceil(
        (currentDate.getTime() - bookingDate.getTime()) /
        (1000 * 60 * 60 * 24)
      );

      if (ageingRecord?.loan_Status === "NotApplied" && daysSinceBooking > 7) {
        if (!ageingRecord.loan_time_days) {
          loan_time_days = true;
          await prisma.ageingrecord.update({
            where: { id: ageingRecord.id },
            data: {
              loan_time_days: true,
              updated_at: new Date(),
            },
          });
        }
      }
    }

    // Fetch latest refund status
    const latestRefund = await prisma.refundageingrecord.findFirst({
      where: {
        flat_id: ageingRecord.flat_id,
        customer_id: ageingRecord.customer_id,
        refund_status: true,
        created_at: {
          gte: ageingRecord.created_at
        }
      }
    });

    const record = {
      id: ageingRecord?.id?.toString(),
      flat_id: ageingRecord?.flat_id?.toString(),
      customer_id: ageingRecord?.customer_id?.toString(),
      customer_flat: ageingRecord?.customer_flat?.toString(),
      booking_date: ageingRecord?.booking_date,
      total_amount: ageingRecord?.total_amount,
      ageing_days, // Ensure this is explicitly included
      loan_Status: ageingRecord?.loan_Status === "NotApplied" ? "Not Applied" : ageingRecord?.loan_Status,
      registration_status: ageingRecord?.registration_status === "NotRegistered" ? "Not Registered" : ageingRecord?.registration_status,
      loan_time_days, // Ensure this is explicitly included
      bank_name: ageingRecord?.bank_name,
      agent_name: ageingRecord?.agent_name,
      agent_contact: ageingRecord?.agent_contact,
      agent_number: ageingRecord?.agent_number,
      loan_amount: ageingRecord?.loan_amount,
      loan_approved_amount: ageingRecord?.loan_approved_amount,
      advance_payment: ageingRecord?.advance_payment,
      bank_agreement: ageingRecord?.bank_agreement,
      disbursement: ageingRecord?.disbursement,
      customer_balance_payment: ageingRecord?.customer_balance_payment,
      created_at: ageingRecord?.created_at,
      updated_at: ageingRecord?.updated_at,
      refund_status: !!latestRefund,
      flat: ageingRecord?.flat ? {
        id: ageingRecord?.flat?.id?.toString(),
        id: ageingRecord?.flat?.id,
        flat_no: ageingRecord?.flat?.flat_no,
        floor_no: ageingRecord?.flat?.floor_no,
        block_name: ageingRecord?.flat?.block?.block_name,
      } : null,
      customer: ageingRecord?.customer ? {
        id: ageingRecord?.customer?.id?.toString(),
        id: ageingRecord?.customer?.id,
        first_name: ageingRecord?.customer?.first_name,
        last_name: ageingRecord?.customer?.last_name,
        full_name: `${ageingRecord?.customer?.first_name || ""} ${ageingRecord?.customer?.last_name || ""}`.trim(),
        phone_code: ageingRecord?.customer?.phone_code,
        phone_number: ageingRecord?.customer?.phone_number,
        email: ageingRecord?.customer?.email,
      } : null,
      project: ageingRecord?.project ? {
        id: ageingRecord?.project?.id?.toString(),
        project_name: ageingRecord?.project?.project_name,
      } : null,
    };

    return res.status(200).json({
      status: "success",
      record,
    });
  } catch (error) {
    logger.error(`Get Single Ageing record Error: ${error.message}, File: ageingRecordsController-GetSingleAgeingRecord`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.UpdateLoanStatus = async (req, res) => {
  const {
    id,
    loan_Status,
    registration_status,
    bank_name,
    agent_name,
    agent_contact,
    agent_number,
    loan_amount,
    loan_approved_amount,
    bank_agreement,
    disbursement,
    customer_balance_payment
  } = req.body;


  try {
    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Record ID is required",
      });
    }

    const existingRecord = await prisma.ageingrecord.findUnique({
      where: {
        id: id,
      },
    });

    if (!existingRecord) {
      return res.status(404).json({
        status: "error",
        message: "Ageing record not found",
      });
    }

    // Special handling for Rejected status
    if (loan_Status === "Rejected") {
      // 1. Update Ageing Record (set status, clear customer_flat link to avoid FK issues during deletion)
      const updatedRecord = await prisma.ageingrecord.update({
        where: { id: id },
        data: {
          loan_Status: "Rejected",
          customer_flat: null, // Unlink to allow deletion
          updated_at: new Date(),
        },
      });

      // 2. Update Customer (loan_rejected = true)
      if (existingRecord.customer_id) {
        await prisma.customers.update({
          where: { id: existingRecord.customer_id },
          data: { loan_rejected: true },
        });
      }

      // 3. Update Flat (Unassign customer and set status to Unsold)
      if (existingRecord.flat_id) {
        await prisma.flat.update({
          where: { id: existingRecord.flat_id },
          data: {
            customer_id: null,
            status: "Unsold"
          },
        });
      }

      // 4. Delete CustomerFlat record (Unassign flat) using flat_id for broader cleanup if needed as per request
      // Using deleteMany on flat_id ensures we catch the link even if customer_flat ID in ageing record is somehow desynced
      if (existingRecord.flat_id) {
        try {
          await prisma.customerflat.deleteMany({
            where: { flat_id: existingRecord.flat_id },
          });
        } catch (delError) {
          logger.error(`Error deleting customerflat: ${delError.message}`);
        }
      }

      return res.status(200).json({
        status: "success",
        message: "Loan rejected and flat unassigned successfully",
        record: {
          id: updatedRecord.id,
          loan_Status: updatedRecord.loan_Status,
          flat_id: updatedRecord.flat_id?.toString(),
          customer_id: updatedRecord.customer_id?.toString(),
          project_id: updatedRecord.project_id?.toString(),
          updated_at: updatedRecord.updated_at
        }
      });
    }

    const updatedRecord = await prisma.ageingrecord.update({
      where: {
        id: id,
      },
      data: {
        loan_Status: loan_Status !== undefined ? loan_Status : existingRecord.loan_Status,
        registration_status: registration_status !== undefined ? registration_status : existingRecord.registration_status,
        bank_name: bank_name !== undefined ? bank_name : existingRecord.bank_name,
        agent_name: agent_name !== undefined ? agent_name : existingRecord.agent_name,
        agent_contact: agent_contact !== undefined ? agent_contact : existingRecord.agent_contact,
        agent_number: agent_number !== undefined ? agent_number : existingRecord.agent_number,
        loan_amount: loan_amount !== undefined ? (loan_amount !== null ? parseFloat(loan_amount) : null) : existingRecord.loan_amount,
        loan_approved_amount: loan_approved_amount !== undefined ? (loan_approved_amount !== null ? parseFloat(loan_approved_amount) : null) : existingRecord.loan_approved_amount,
        bank_agreement: bank_agreement !== undefined ? bank_agreement : existingRecord.bank_agreement,
        disbursement: disbursement !== undefined ? disbursement : existingRecord.disbursement,
        customer_balance_payment: customer_balance_payment !== undefined ? (customer_balance_payment !== null ? parseFloat(customer_balance_payment) : null) : existingRecord.customer_balance_payment,
        loan_time_days: false,
        updated_at: new Date(),
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Loan status updated successfully",
      record: {
        id: updatedRecord?.id?.toString(),
        loan_Status: updatedRecord?.loan_Status,
        registration_status: updatedRecord?.registration_status,
        bank_name: updatedRecord?.bank_name,
        agent_name: updatedRecord?.agent_name,
        agent_contact: updatedRecord?.agent_contact,
        agent_number: updatedRecord?.agent_number,
        loan_amount: updatedRecord?.loan_amount,
        loan_approved_amount: updatedRecord?.loan_approved_amount,
        bank_agreement: updatedRecord?.bank_agreement,
        disbursement: updatedRecord?.disbursement,
        customer_balance_payment: updatedRecord?.customer_balance_payment,
      },
    });
  } catch (error) {
    logger.error(`Update Loan Status Error: ${error.message}, File: ageingRecordsController-UpdateLoanStatus`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// exports.UpdateAgeingRecord = async (req, res) => {
//   const { id, booking_date, total_amount, loan_Status, bank_name, agent_name, agent_contact, agent_number, loan_amount } = req.body;

//   try {
//     if (!id) {
//       return res.status(400).json({
//         status: "error",
//         message: "Record ID is required",
//       });
//     }

//     const existingRecord = await prisma.ageingrecord.findUnique({
//       where: {
//         id: id,
//       },
//     });

//     if (!existingRecord) {
//       return res.status(404).json({
//         status: "error",
//         message: "Ageing record not found",
//       });
//     }

//     const updatedRecord = await prisma.ageingrecord.update({
//       where: {
//         id: id,
//       },
//       data: {
//         booking_date: booking_date ? new Date(booking_date) : existingRecord.booking_date,
//         total_amount: total_amount !== undefined ? parseFloat(total_amount) : existingRecord.total_amount,
//         loan_Status: loan_Status !== undefined ? loan_Status : existingRecord.loan_Status,
//         bank_name: bank_name !== undefined ? bank_name : existingRecord.bank_name,
//         agent_name: agent_name !== undefined ? agent_name : existingRecord.agent_name,
//         agent_contact: agent_contact !== undefined ? agent_contact : existingRecord.agent_contact,
//         agent_number: agent_number !== undefined ? agent_number : existingRecord.agent_number,
//         loan_amount: loan_amount !== undefined ? parseFloat(loan_amount) : existingRecord.loan_amount,
//         updated_at: new Date(),
//       },
//     });

//     return res.status(200).json({
//       status: "success",
//       message: "Ageing record updated successfully",
//       record: {
//         id: updatedRecord?.id?.toString(),
//       },
//     });
//   } catch (error) {
//     logger.error(`Update Ageing Record Error: ${error.message}, File: ageingRecordsController-UpdateAgeingRecord`);
//     return res.status(500).json({
//       status: "error",
//       message: "Internal server error",
//     });
//   }
// };

exports.DeleteAgeingRecord = async (req, res) => {
  const { id } = req.body;

  try {
    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Record ID is required",
      });
    }

    const existingRecord = await prisma.ageingrecord.findUnique({
      where: {
        id: id,
      },
    });

    if (!existingRecord) {
      return res.status(404).json({
        status: "error",
        message: "Ageing record not found",
      });
    }

    await prisma.ageingrecord.delete({
      where: {
        id: id,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Ageing record deleted successfully",
    });
  } catch (error) {
    logger.error(`Delete Ageing record Error: ${error.message}, File: ageingRecordsController-DeleteAgeingRecord`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// exports.DeleteMultipleAgeingRecords = async (req, res) => {
//   const { ids } = req.body;

//   try {
//     if (!ids || !Array.isArray(ids) || ids.length === 0) {
//       return res.status(400).json({
//         status: "error",
//         message: "Record IDs array is required",
//       });
//     }

//     const bigIntIds = ids.map(id => id);

//     await prisma.ageingrecord.deleteMany({
//       where: {
//         id: {
//           in: bigIntIds,
//         },
//       },
//     });

//     return res.status(200).json({
//       status: "success",
//       message: `${ids.length} ageing record(s) deleted successfully`,
//     });
//   } catch (error) {
//     logger.error(`Delete Multiple Ageing records Error: ${error.message}, File: ageingRecordsController-DeleteMultipleAgeingRecords`);
//     return res.status(500).json({
//       status: "error",
//       message: "Internal server error",
//     });
//   }
// };

exports.GetAgeingRecordsForExcel = async (req, res) => {
  const { searchQuery, startDate, endDate } = req.query;

  try {
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);
    const projectFilter = allocatedProjectIds ? { project_id: { in: allocatedProjectIds } } : {};

    const searchCondition = {
      ...projectFilter,
      ...(searchQuery && {
        OR: [
          { customer: { first_name: { startsWith: searchQuery } } },
          { customer: { last_name: { startsWith: searchQuery } } },
          { customer: { phone_number: { startsWith: searchQuery } } },
          { flat: { flat_no: { startsWith: searchQuery } } },
          { bank_name: { startsWith: searchQuery } },
          { agent_name: { startsWith: searchQuery } },
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

    const ageingRecords = await prisma.ageingrecord.findMany({
      where: searchCondition,
      orderBy: {
        created_at: "desc",
      },
      include: {
        flat: {
          select: {
            flat_no: true,
            floor_no: true,
            block: {
              select: {
                block_name: true,
              },
            },
          },
        },
        customer: {
          select: {
            first_name: true,
            last_name: true,
            phone_code: true,
            phone_number: true,
          },
        },
        project: {
          select: {
            project_name: true,
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ageing Records");

    worksheet.columns = [
      { header: "S.No", key: "s_no", width: 10 },
      { header: "Project Name", key: "project_name", width: 20 },
      { header: "Block No", key: "block_name", width: 15 },
      { header: "Flat No", key: "flat_no", width: 15 },
      { header: "Floor No", key: "floor_no", width: 10 },
      { header: "Customer Name", key: "customer_name", width: 25 },
      { header: "Customer Phone", key: "customer_phone", width: 20 },
      { header: "Booking Date", key: "booking_date", width: 15 },
      { header: "Ageing (Days)", key: "ageing_days", width: 15 },
      { header: "Total Payment", key: "total_amount", width: 15 },
      { header: "Loan Status", key: "loan_status", width: 15 },
      { header: "Bank Name", key: "bank_name", width: 20 },
      { header: "Agent Name", key: "agent_name", width: 20 },
      { header: "Agent Phone", key: "agent_number", width: 15 },
      { header: "Applied Loan Amount", key: "loan_amount", width: 20 },
      { header: "Approved Loan Amount", key: "loan_approved_amount", width: 20 },
      { header: "Customer Balance", key: "customer_balance_payment", width: 20 },
      { header: "Bank Agreement", key: "bank_agreement", width: 15 },
      { header: "Disbursement", key: "disbursement", width: 15 },
      { header: "Registration Status", key: "registration_status", width: 20 },
    ];

    ageingRecords.forEach((record, index) => {
      worksheet.addRow({
        s_no: index + 1,
        project_name: record?.project?.project_name || "N/A",
        block_name: record?.flat?.block?.block_name || "N/A",
        flat_no: record?.flat?.flat_no || "N/A",
        floor_no: record?.flat?.floor_no || "N/A",
        customer_name: `${record?.customer?.first_name || ""} ${record?.customer?.last_name || ""}`.trim() || "N/A",
        customer_phone: record?.customer?.phone_number ? `+${record?.customer?.phone_code || ""} ${record?.customer?.phone_number}` : "N/A",
        booking_date: record?.booking_date ? new Date(record.booking_date).toLocaleDateString("en-IN") : "N/A",
        ageing_days: record?.ageing_days || 0,
        total_amount: record?.total_amount || 0,
        loan_status: record?.loan_Status || "N/A",
        bank_name: record?.bank_name || "N/A",
        agent_name: record?.agent_name || "N/A",
        agent_number: record?.agent_number || "N/A",
        loan_amount: record?.loan_amount || 0,
        loan_approved_amount: record?.loan_approved_amount || 0,
        customer_balance_payment: record?.customer_balance_payment || 0,
        bank_agreement: record?.bank_agreement ? "Yes" : "No",
        disbursement: record?.disbursement ? "Yes" : "No",
        registration_status: record?.registration_status === "NotRegistered" ? "Not Registered" : (record?.registration_status || "N/A"),
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=AgeingRecords.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error(`Get Ageing Records Excel Error: ${error.message}, File: ageingRecordsController-GetAgeingRecordsForExcel`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.GetCancellationDetails = async (req, res) => {
  const { flat_id, customer_id, ageing_id } = req.query;

  try {
    if (!flat_id || !customer_id || !ageing_id) {
      return res.status(400).json({ status: "error", message: "Flat ID, Customer ID, and Ageing ID are required" });
    }

    const ageingRecord = await prisma.ageingrecord.findUnique({
      where: { id: ageing_id },
      select: { created_at: true }
    });

    if (!ageingRecord) {
      return res.status(404).json({ status: "error", message: "Ageing record not found" });
    }

    const creationDate = ageingRecord.created_at;

    const payments = await prisma.payments.findMany({
      where: {
        flat_id: flat_id,
        customer_id: customer_id,
        created_at: { gte: creationDate }
      }
    });

    const refunds = await prisma.refundageingrecord.findMany({
      where: {
        flat_id: flat_id,
        customer_id: customer_id,
        created_at: { gte: creationDate }
      }
    });

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRefunded = refunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0);
    const remainingBalance = totalPaid - totalRefunded;

    return res.status(200).json({
      status: "success",
      hasPayments: payments.length > 0,
      totalPaid: totalPaid,
      totalRefunded: totalRefunded,
      remainingBalance: remainingBalance
    });

  } catch (error) {
    logger.error(`GetCancellationDetails Error: ${error.message}`);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

exports.ProcessAgeingCancellation = async (req, res) => {
  const { ageing_id, flat_id, customer_id, project_id, refund_amount, refund_date, refund_transactionid } = req.body;

  try {
    if (!ageing_id || !flat_id || !customer_id) {
      return res.status(400).json({ status: "error", message: "Missing required IDs" });
    }

    const ageingRecord = await prisma.ageingrecord.findUnique({
      where: { id: ageing_id },
      select: { created_at: true }
    });

    if (!ageingRecord) {
      return res.status(404).json({ status: "error", message: "Ageing record not found" });
    }

    const creationDate = ageingRecord.created_at;

    await prisma.$transaction(async (tx) => {
      // Fetch current paid and refunded for this specific instance
      const payments = await tx.payments.findMany({
        where: {
          flat_id: flat_id,
          customer_id: customer_id,
          created_at: { gte: creationDate }
        }
      });
      const refunds = await tx.refundageingrecord.findMany({
        where: {
          flat_id: flat_id,
          customer_id: customer_id,
          created_at: { gte: creationDate }
        }
      });

      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalRefunded = refunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0);
      const remainingBalance = totalPaid - totalRefunded;

      // Ensure currentRefundAmount is a valid number
      let currentRefundAmount = parseFloat(refund_amount);
      if (isNaN(currentRefundAmount)) currentRefundAmount = 0;

      // Validation
      if (currentRefundAmount > remainingBalance && totalPaid > 0) {
        throw new Error(`Refund amount cannot exceed remaining balance of ₹${remainingBalance}`);
      }

      // 1. Create Refund Record
      // If no payments existed, it's effectively a full refund of 0
      const isFullRefund = totalPaid === 0 || (totalRefunded + currentRefundAmount) >= totalPaid;

      if (currentRefundAmount > 0 || refund_transactionid) {
        await tx.refundageingrecord.create({
          data: {
            project_id: project_id ? project_id : null,
            flat_id: flat_id,
            customer_id: customer_id,
            refund_amount: currentRefundAmount,
            refund_date: refund_date ? new Date(refund_date) : new Date(),
            refund_transactionid: refund_transactionid || "",
            refund_status: isFullRefund
          }
        });
      }

      // Update Ageing Record Status to Cancelled instead of deleting
      await tx.ageingrecord.update({
        where: { id: ageing_id },
        data: {
          loan_Status: 'Cancelled',
          updated_at: new Date()
        }
      });

      // 2. Check if Fully Refunded (or if no payments existed)
      if (isFullRefund) {
        // Full Refund - Proceed with Cancellation

        // Delete CustomerFlat
        await tx.customerflat.deleteMany({
          where: {
            flat_id: flat_id,
            customer_id: customer_id
          }
        });

        // Update Flat -> Unsold, customer_id = null
        await tx.flat.update({
          where: { id: flat_id },
          data: {
            status: "Unsold",
            customer_id: null
          }
        });

        // Delete only payments from this specific sale instance
        await tx.payments.deleteMany({
          where: {
            flat_id: flat_id,
            customer_id: customer_id,
            created_at: { gte: creationDate }
          }
        });
      }
    });

    return res.status(200).json({ status: "success", message: "Processed Successfully" });

  } catch (error) {
    logger.error(`ProcessAgeingCancellation Error: ${error.message}`);
    return res.status(500).json({ status: "error", message: error.message || "Internal server error" });
  }
};

exports.GetRefundRecords = async (req, res) => {
  const { page = 1, limit = 10, searchQuery, sortby = "created_at", sortbyType = "desc" } = req.query;
  const parsedLimit = parseInt(limit, 10);
  const offset = (page - 1) * parsedLimit;

  try {
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);
    const projectFilter = allocatedProjectIds ? { project_id: { in: allocatedProjectIds } } : {};

    const searchCondition = {
      ...projectFilter,
      ...(searchQuery && {
        OR: [
          { customer: { first_name: { startsWith: searchQuery } } },
          { customer: { last_name: { startsWith: searchQuery } } },
          { customer: { phone_number: { startsWith: searchQuery } } },
          { flat: { flat_no: { startsWith: searchQuery } } },
          { refund_transactionid: { startsWith: searchQuery } },
        ],
      }),
    };

    const refundRecords = await prisma.refundageingrecord.findMany({
      where: searchCondition,
      take: parsedLimit,
      skip: offset,
      orderBy: { [sortby]: sortbyType },
      include: {
        flat: {
          select: {
            flat_no: true,
            floor_no: true,
            block: { select: { block_name: true } },
          },
        },
        customer: {
          select: {
            first_name: true,
            last_name: true,
            phone_code: true,
            phone_number: true,
            email: true,
          },
        },
        project: { select: { project_name: true } },
      },
    });

    const totalRecords = await prisma.refundageingrecord.count({ where: searchCondition });

    const records = refundRecords.map(record => ({
      ...record,
      id: record.id,
      flat_id: record.flat_id?.toString(),
      customer_id: record.customer_id?.toString(),
      project_id: record.project_id?.toString(),
      customer: record.customer, // Already included
      flat: record.flat, // Already included
      project: record.project // Already included
    }));

    return res.status(200).json({
      status: "success",
      records,
      totalRecords,
      totalPages: Math.ceil(totalRecords / parsedLimit),
    });

  } catch (error) {
    logger.error(`Get Refund Records Error: ${error.message}`);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

exports.GetRefundRecordsForExcel = async (req, res) => {
  const { searchQuery } = req.query;

  try {
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);
    const projectFilter = allocatedProjectIds ? { project_id: { in: allocatedProjectIds } } : {};

    const searchCondition = {
      ...projectFilter,
      ...(searchQuery && {
        OR: [
          { customer: { first_name: { startsWith: searchQuery } } },
          { customer: { last_name: { startsWith: searchQuery } } },
          { flat: { flat_no: { startsWith: searchQuery } } },
          { refund_transactionid: { startsWith: searchQuery } },
        ],
      }),
    };

    const refundRecords = await prisma.refundageingrecord.findMany({
      where: searchCondition,
      orderBy: { created_at: "desc" },
      include: {
        flat: {
          select: {
            flat_no: true,
            floor_no: true,
            block: { select: { block_name: true } },
          },
        },
        customer: {
          select: {
            first_name: true,
            last_name: true,
            phone_code: true,
            phone_number: true,
            email: true,
          },
        },
        project: { select: { project_name: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Refund Records");

    worksheet.columns = [
      { header: "Customer Name", key: "customer_name", width: 25 },
      { header: "Phone Number", key: "phone_number", width: 20 },
      { header: "Project", key: "project_name", width: 20 },
      { header: "Block", key: "block_name", width: 15 },
      { header: "Flat No", key: "flat_no", width: 10 },
      { header: "Refund Amount", key: "refund_amount", width: 15 },
      { header: "Refund Date", key: "refund_date", width: 15 },
      { header: "Transaction ID", key: "transaction_id", width: 20 },
      { header: "Created At", key: "created_at", width: 20 },
    ];

    refundRecords.forEach((record) => {
      worksheet.addRow({
        customer_name: `${record.customer?.first_name || ""} ${record.customer?.last_name || ""}`.trim(),
        phone_number: `+${record.customer?.phone_code || ""} ${record.customer?.phone_number || ""}`,
        project_name: record.project?.project_name || "-",
        block_name: record.flat?.block?.block_name || "-",
        flat_no: record.flat?.flat_no || "-",
        refund_amount: record.refund_amount || 0,
        refund_date: record.refund_date ? new Date(record.refund_date).toLocaleDateString("en-IN") : "-",
        transaction_id: record.refund_transactionid || "-",
        created_at: record.created_at ? new Date(record.created_at).toLocaleDateString("en-IN") : "-",
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=RefundRecords.xlsx");

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    logger.error(`Get Refund Records Excel Error: ${error.message}`);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

exports.GetPartialCancelledAgeingRecords = async (req, res) => {
  const { searchQuery } = req.query;

  try {
    // 1. Identify valid (Flat, Customer) pairs from Refund records
    // Logic: Must have at least one 'false' status (partial) AND NO 'true' status (full)

    // Get all pairs that have a FULL refund (status = true)
    const fullyRefundedGroups = await prisma.refundageingrecord.groupBy({
      by: ['flat_id', 'customer_id'],
      where: { refund_status: true }
    });

    // Create a Set of signatures for fully refunded records
    const fullyRefundedSet = new Set(
      fullyRefundedGroups.map(g => `${g.flat_id}_${g.customer_id}`)
    );

    // Get all pairs that have a PARTIAL refund (status = false)
    const partiallyRefundedGroups = await prisma.refundageingrecord.groupBy({
      by: ['flat_id', 'customer_id'],
      where: { refund_status: false }
    });

    // Filter partials: Keep only if NOT in fully refunded set
    const validPairs = partiallyRefundedGroups.filter(g =>
      !fullyRefundedSet.has(`${g.flat_id}_${g.customer_id}`)
    );

    // If no valid pairs, return empty
    if (validPairs.length === 0) {
      return res.status(200).json({
        status: "success",
        records: [],
        count: 0,
      });
    }

    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);
    const projectFilter = allocatedProjectIds ? { project_id: { in: allocatedProjectIds } } : {};

    // 2. Build Search Condition
    const searchCondition = {
      ...projectFilter,
      loan_Status: "Cancelled",
      OR: validPairs.map(p => ({
        flat_id: p.flat_id,
        customer_id: p.customer_id
      })),
      ...(searchQuery && {
        AND: [
          {
            OR: [
              { customer: { first_name: { startsWith: searchQuery } } },
              { customer: { last_name: { startsWith: searchQuery } } },
              { customer: { phone_number: { startsWith: searchQuery } } },
              { flat: { flat_no: { startsWith: searchQuery } } },
              { bank_name: { startsWith: searchQuery } },
              { agent_name: { startsWith: searchQuery } },
            ]
          }
        ]
      }),
    };

    const ageingRecords = await prisma.ageingrecord.findMany({
      where: searchCondition,
      orderBy: {
        created_at: "desc",
      },
      include: {
        flat: {
          select: {
            id: true,
            id: true,
            flat_no: true,
            floor_no: true,
            block: {
              select: {
                block_name: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            id: true,
            first_name: true,
            last_name: true,
            phone_code: true,
            phone_number: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            project_name: true,
          },
        },
      },
    });

    const formatRegistrationStatus = (status) => status === "NotRegistered" ? "Not Registered" : status;
    const currentDate = new Date();

    const records = await Promise.all(ageingRecords.map(async (record) => {
      let ageing_days = null;
      let loan_time_days = record?.loan_time_days || false;

      if (record?.booking_date) {
        const bookingDate = new Date(record.booking_date);
        const timeDiff = currentDate.getTime() - bookingDate.getTime();
        ageing_days = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
      }

      return {
        id: record?.id?.toString(),
        flat_id: record?.flat_id?.toString(),
        customer_id: record?.customer_id?.toString(),
        customer_flat: record?.customer_flat?.toString(),
        booking_date: record?.booking_date,
        total_amount: record?.total_amount,
        ageing_days: ageing_days,
        loan_Status: "Partial Cancelled",
        registration_status: formatRegistrationStatus(record?.registration_status),
        loan_time_days: loan_time_days,
        bank_name: record?.bank_name,
        agent_name: record?.agent_name,
        agent_contact: record?.agent_contact,
        agent_number: record?.agent_number,
        loan_amount: record?.loan_amount,
        created_at: record?.created_at,
        updated_at: record?.updated_at,
        flat: record?.flat ? {
          id: record?.flat?.id?.toString(),
          id: record?.flat?.id,
          flat_no: record?.flat?.flat_no,
          floor_no: record?.flat?.floor_no,
          block_name: record?.flat?.block?.block_name,
        } : null,
        customer: record?.customer ? {
          id: record?.customer?.id?.toString(),
          id: record?.customer?.id,
          first_name: record?.customer?.first_name,
          last_name: record?.customer?.last_name,
          full_name: `${record?.customer?.first_name || ""} ${record?.customer?.last_name || ""}`.trim(),
          phone_code: record?.customer?.phone_code,
          phone_number: record?.customer?.phone_number,
          email: record?.customer?.email,
        } : null,
        project: record?.project ? {
          id: record?.project?.id?.toString(),
          project_name: record?.project?.project_name,
        } : null,
      };
    }));

    return res.status(200).json({
      status: "success",
      records: records || [],
      count: records.length,
    });
  } catch (error) {
    logger.error(`Get Partial Cancelled Ageing records Error: ${error.message}, File: ageingRecordsController-GetPartialCancelledAgeingRecords`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};