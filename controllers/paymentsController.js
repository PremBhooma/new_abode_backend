const prisma = require("../utils/client");
const multiparty = require("multiparty");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
const ExcelJS = require("exceljs");
const logger = require("../helper/logger");
const getAllocatedProjectIds = require("../utils/getAllocatedProjectIds");

const serializeBigInt = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) => (typeof value === "bigint" ? value.toString() : value)));
};

const updateAgeingRecordTotal = async (flat_id, project_id, block_id, customer_id) => {
  try {
    // Calculate total amount paid for the flat
    const totalPaid = await prisma.payments.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        flat_id: flat_id,
      },
    });

    const totalAmount = totalPaid._sum.amount || 0;

    // Fetch grand_total from customerflat to calculate balance
    const customerFlat = await prisma.customerflat.findFirst({
      where: {
        flat_id: flat_id,
        ...(customer_id ? { customer_id: customer_id } : {}),
      },
      select: {
        grand_total: true,
      },
    });

    let balance = 0;
    if (customerFlat && customerFlat.grand_total) {
      balance = customerFlat.grand_total - totalAmount;
    }

    // Update Ageing Record
    const whereClause = {
      flat_id: flat_id,
      project_id: project_id,
      flat: {
        block_id: block_id,
      },
    };

    if (customer_id) {
      whereClause.customer_id = customer_id;
    }

    await prisma.ageingrecord.updateMany({
      where: whereClause,
      data: {
        total_amount: totalAmount,
        advance_payment: true,
        customer_balance_payment: balance,
        updated_at: new Date(),
      },
    });
  } catch (error) {
    logger.error(`Error updating Ageing Record: ${error.message}, Flat ID: ${flat_id}`);
  }
};

exports.addPayment = async (req, res) => {
  const form = new multiparty.Form({
    maxFieldsSize: 100 * 1024 * 1024, // 100MB for form fields
    maxFilesSize: 100 * 1024 * 1024, // Optional: 100MB max file size
  });

  form.parse(req, async (error, fields, files) => {
    if (error) {
      logger.error(`Add Payment Error: ${error.message}, File: paymentsController-addPayment`);
      return res.status(500).json({
        status: "Error",
        message: error.message,
      });
    }

    const amount = fields.amount[0];
    const payment_type = fields.payment_type[0];
    const payment_towards = fields.payment_towards[0];
    const payment_method = fields.payment_method[0];
    const bank = fields.bank[0];
    const paymentdate = fields.paymentdate[0];
    const transactionid = fields.transactionid[0];
    const comment = fields.comment[0];
    const flat_id = fields.flat_id[0];
    const customer_id = fields.customer_id[0];
    const employee_id = fields.employee_id[0];
    const project_id = fields.project_id[0];

    // const receipt = files?.receipt[0];
    const receipt = files && files.receipt && files.receipt[0] ? files.receipt[0] : null;

    // Validate required fields
    if (!amount || !payment_type || !payment_towards || !payment_method || !flat_id || !employee_id || !project_id) {
      return res.status(200).json({
        status: "error",
        message: "Missing fields are required",
      });
    }

    // REMOVED: const uuid = "ABDPT" + Math.floor(100000 + Math.random() * 900000).toString();
    const { v4: uuidv4 } = require('uuid');
    const paymentUuid = uuidv4();
    let receiptUrl = null;
    let receiptPath = null;

    if (receipt) {
      const uploadDir = path.join(__dirname, "../uploads", `${paymentUuid}`);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const tempReceiptPath = receipt.path || receipt.filepath;
      if (!tempReceiptPath) {
        return res.status(400).json({ status: "error", message: "Receipt file path is missing" });
      }

      receiptPath = path.join(uploadDir, receipt.originalFilename);
      fs.copyFileSync(tempReceiptPath, receiptPath);
      fs.unlinkSync(tempReceiptPath);

      receiptUrl = `${process.env.API_URL}/uploads/${paymentUuid}/${receipt.originalFilename}`;
    }

    const flatCost = await prisma.customerflat.findFirst({
      where: {
        flat_id: flat_id,
      },
      select: {
        toatlcostofuint: true,
        grand_total: true,
        flat: {
          select: {
            block_id: true,
          },
        },
      },
    });

    if (!flatCost) {
      return res.status(200).json({
        status: "error",
        message: "Flat cost not found for this flat",
      });
    }

    const totalPayments = await prisma.payments.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        flat_id: flat_id,
      },
    });

    const existingPayments = totalPayments._sum.amount || 0;
    const newTotal = existingPayments + Number(amount);

    if (newTotal > flatCost?.grand_total) {
      return res.status(200).json({
        status: "error",
        message: `Total payments cannot exceed flat cost`,
      });
    }

    await prisma.parsedpayments.deleteMany();

    try {
      // Check if it's the first payment for this flat, project, and customer
      const existingPaymentCount = await prisma.payments.count({
        where: {
          flat_id: flat_id,
          project_id: project_id,
          customer_id: customer_id && customer_id !== "null" ? customer_id : null,
        },
      });

      if (existingPaymentCount === 0) {
        await prisma.flat.update({
          where: { id: flat_id },
          data: { advance_payment: true },
        });
      }

      await prisma.payments.create({
        data: {
          flat_id: flat_id,
          customer_id: customer_id ? customer_id : null,
          amount: parseFloat(amount),
          payment_type: payment_type,
          payment_towards: payment_towards,
          payment_method: payment_method,
          bank: bank,
          payment_date: paymentdate !== "null" && paymentdate !== "" ? new Date(paymentdate) : null,
          trasnaction_id: transactionid,
          receipt_path: receiptPath,
          receipt_url: receiptUrl,
          added_by_employee_id: employee_id,
          comment: comment,
          project_id: project_id,
        },
      });

      // Track payment activity
      if (customer_id !== "null") {
        await prisma.customeractivities.create({
          data: {
            customer_id: customer_id,
            employee_id: employee_id,
            ca_message: `Payment of ₹${amount} added via ${payment_method}`,
            employee_short_name: "C", // You might want to fetch this from employee data
            color_code: "green",
          },
        });
      } else {
        await prisma.taskactivities.create({
          data: {
            employee_id: employee_id,
            flat_id: flat_id,
            ta_message: `Payment of ₹${amount} received via ${payment_method}`,
            employee_short_name: "P", // P for Payment
            color_code: "green",
            created_at: new Date(),
          },
        });
      }


      // Update Ageing Record Total Amount
      if (flatCost?.flat?.block_id) {
        await updateAgeingRecordTotal(flat_id, project_id, flatCost.flat.block_id, customer_id);
      }

      return res.status(200).json({
        status: "success",
        message: "Payment added successfully",
      });
    } catch (error) {
      logger.error(`Add Payment Error: ${error.message}, File: paymentsController-addPayment`);
      return res.status(500).json({
        status: "Internal server error",
        message: error.message,
      });
    }
  });
};

exports.addBulkPayment = async (req, res) => {
  const form = new multiparty.Form({
    maxFieldsSize: 100 * 1024 * 1024,
    maxFilesSize: 100 * 1024 * 1024,
  });

  form.parse(req, async (error, fields, files) => {
    if (error) {
      logger.error(`Add Bulk Payment Error: ${error.message}, File: paymentsController-addBulkPayment`);
      return res.status(500).json({ status: "error", message: error.message });
    }

    // 🔹 Step 1: Normalize all rows into a clean array
    const rowsMap = {};
    Object.keys(fields).forEach((key) => {
      const match = key.match(/^rows\[(\d+)\]\[(.+)\]$/);
      if (match) {
        const index = parseInt(match[1], 10);
        const field = match[2];
        if (!rowsMap[index]) rowsMap[index] = {};
        rowsMap[index][field] = fields[key][0]; // take first value
      }
    });

    // Handle file uploads per row if sent
    if (files && files.receipt) {
      Object.keys(files.receipt).forEach((key) => {
        const match = key.match(/^rows\[(\d+)\]\[receipt\]$/);
        if (match) {
          const index = parseInt(match[1], 10);
          rowsMap[index].receipt = files.receipt[key][0];
        }
      });
    }

    const rows = Object.values(rowsMap);
    const errors = [];

    // 🔹 Step 2: Validate each row
    for (let row of rows) {
      const { amount, payment_type, payment_towards, payment_method, flat_id, employee_id, project_id } = row;

      if (!amount || !payment_type || !payment_towards || !payment_method || !flat_id || !employee_id || !project_id) {
        errors.push({
          flat_id,
          message: `Missing required fields`,
        });
        continue;
      }

      const flatCost = await prisma.customerflat.findFirst({
        where: { flat_id: flat_id },
        select: {
          toatlcostofuint: true,
          grand_total: true,
          grand_total: true,
          flat: { select: { flat_no: true, block_id: true, block: { select: { block_name: true } } } },
        },
      });

      if (!flatCost) {
        errors.push({ flat_id, message: `Flat ${flat_id} → Cost not found` });
        continue;
      }

      // Append block_id to row for later use
      row.block_id = flatCost.flat.block_id;

      const totalPayments = await prisma.payments.aggregate({
        _sum: { amount: true },
        where: { flat_id: flat_id },
      });

      const existingPayments = totalPayments._sum.amount || 0;
      const newTotal = existingPayments + Number(row.amount);

      if (newTotal > flatCost?.grand_total) {
        errors.push({
          flat_id,
          message: `Flat: ${flatCost.flat.flat_no} (Block: ${flatCost.flat.block.block_name}) → Total payments cannot exceed flat cost`,
        });
      }
    }

    // 🔹 Step 3: If errors → stop and return
    if (errors.length > 0) {
      return res.status(200).json({
        status: "error",
        errors,
      });
    }

    // 🔹 Step 4: Insert all rows (since no errors)
    try {
      for (let row of rows) {
        const {
          amount,
          payment_type,
          payment_towards,
          payment_method,
          bank,
          paymentdate,
          transactionid,
          comment,
          flat_id,
          customer_id,
          employee_id,
          receipt,
          project_id,
          block_id, // Extract block_id
        } = row;

        // REMOVED: const uuid = "ABDPT" + Math.floor(100000 + Math.random() * 900000).toString();
        const { v4: uuidv4 } = require('uuid');
        const paymentUuid = uuidv4();
        let receiptUrl = null;
        let receiptPath = null;

        if (receipt) {
          const uploadDir = path.join(__dirname, "../uploads", `${paymentUuid}`);
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

          const tempReceiptPath = receipt.path || receipt.filepath;
          if (tempReceiptPath) {
            receiptPath = path.join(uploadDir, receipt.originalFilename);
            fs.copyFileSync(tempReceiptPath, receiptPath);
            fs.unlinkSync(tempReceiptPath);
            receiptUrl = `${process.env.API_URL}/uploads/${paymentUuid}/${receipt.originalFilename}`;
          }
        }

        await prisma.payments.create({
          data: {
            flat_id: flat_id,
            project_id: project_id ? project_id : null,
            customer_id: customer_id ? customer_id : null,
            amount: parseFloat(amount),
            payment_type,
            payment_towards,
            payment_method,
            bank,
            payment_date: paymentdate && paymentdate !== "null" ? new Date(paymentdate) : null,
            trasnaction_id: transactionid,
            receipt_path: receiptPath,
            receipt_url: receiptUrl,
            added_by_employee_id: employee_id,
            comment,
          },
        });

        // Track activities
        if (customer_id !== "null") {
          await prisma.customeractivities.create({
            data: {
              customer_id: customer_id,
              employee_id: employee_id,
              ca_message: `Payment of ₹${amount} added via ${payment_method}`,
              employee_short_name: "C",
              color_code: "green",
            },
          });
        } else {
          await prisma.taskactivities.create({
            data: {
              employee_id: employee_id,
              flat_id: flat_id,
              ta_message: `Payment of ₹${amount} received via ${payment_method}`,
              employee_short_name: "P",
              color_code: "green",
              created_at: new Date(),
            },
          });
        }

        // Update Ageing Record Total Amount
        if (block_id) {
          await updateAgeingRecordTotal(flat_id, project_id, block_id, customer_id);
        }
      }

      return res.status(200).json({
        status: "success",
        message: "All payments added successfully",
      });
    } catch (err) {
      logger.error(`Bulk Insert Error: ${err.message}, File: paymentsController-addBulkPayment`);
      return res.status(500).json({ status: "error", message: err.message });
    }
  });
};

exports.updatePayment = async (req, res) => {
  const form = new multiparty.Form({
    maxFieldsSize: 100 * 1024 * 1024,
    maxFilesSize: 100 * 1024 * 1024,
  });

  form.parse(req, async (error, fields, files) => {
    if (error) {
      logger.error(`Update Payment Error: ${error.message}, File: paymentsController-updatePayment`);
      return res.status(500).json({
        status: "Error",
        message: error.message,
      });
    }

    try {
      // Extract fields
      const amount = fields.amount[0];
      const payment_type = fields.payment_type[0];
      const payment_towards = fields.payment_towards[0];
      const payment_method = fields.payment_method[0];
      const bank = fields.bank[0];
      const paymentdate = fields.paymentdate[0];
      const transactionid = fields.transactionid[0];
      const comment = fields.comment[0];
      const flat_id = fields.flat_id[0];
      const customer_id = fields.customer_id[0];
      const receipt_updated = fields.receipt_updated[0];
      const payment_uid = fields.payment_uid[0];
      const employee_id = fields.employee_id[0];
      const receipt = files?.receipt?.[0];
      const project_id = fields.project_id[0];

      // Validate required fields
      if (!amount || !payment_type || !payment_towards || !payment_method || !payment_uid || !employee_id || !project_id) {
        return res.status(200).json({
          status: "error",
          message: "Missing fields are required",
        });
      }

      // Find existing payment
      const payment = await prisma.payments.findFirst({
        where: { id: payment_uid },
      });

      if (!payment) {
        return res.status(404).json({
          status: "error",
          message: "Payment not found",
        });
      }

      const flatCost = await prisma.customerflat.findFirst({
        where: {
          flat_id: flat_id,
        },
        select: {
          grand_total: true,
          flat: {
            select: {
              block_id: true,
            },
          },
        },
      });

      if (!flatCost) {
        return res.status(200).json({
          status: "error",
          message: "Flat cost not found for this flat",
        });
      }

      const totalPayments = await prisma.payments.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          flat_id: flat_id,
        },
      });

      const existingPayments = totalPayments._sum.amount || 0;
      const newTotal = existingPayments + Number(amount);

      if (newTotal > flatCost?.grand_total) {
        return res.status(200).json({
          status: "error",
          message: `Total payments cannot exceed flat cost`,
        });
      }

      // Handle receipt update
      let receiptUrl = payment.receipt_url;
      let receiptPath = payment.receipt_path;

      if (receipt_updated === "true" || receipt) {
        if (receipt) {
          const uploadDir = path.join(__dirname, "../uploads", payment_uid);

          // Delete old receipt if exists
          if (payment?.receipt_path && fs.existsSync(payment.receipt_path)) {
            fs.unlinkSync(payment.receipt_path);
          }

          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const tempReceiptPath = receipt.path || receipt.filepath;
          if (!tempReceiptPath) {
            return res.status(400).json({
              status: "error",
              message: "Receipt file path is missing",
            });
          }

          receiptPath = path.join(uploadDir, receipt.originalFilename);
          fs.copyFileSync(tempReceiptPath, receiptPath);
          fs.unlinkSync(tempReceiptPath);
          receiptUrl = `${process.env.API_URL}/uploads/${payment_uid}/${receipt.originalFilename}`;
        } else {
          receiptUrl = null;
          receiptPath = null;
        }
      }


      // Update payment record
      const updatedPayment = await prisma.payments.update({
        where: { id: payment_uid },
        data: {
          flat_id: flat_id,
          customer_id: customer_id ? customer_id : payment.customer_id,
          amount: parseFloat(amount),
          payment_type: payment_type,
          payment_towards: payment_towards,
          payment_method: payment_method,
          bank: bank,
          payment_date: new Date(paymentdate),
          trasnaction_id: transactionid,
          receipt_path: receiptPath,
          receipt_url: receiptUrl,
          comment: comment,
          project_id: project_id,
        },
      });

      // Track payment update activity (only in one table)
      if (customer_id && customer_id !== "null") {
        // Track in customeractivities if customer exists
        await prisma.customeractivities.create({
          data: {
            customer_id: customer_id,
            employee_id: employee_id,
            ca_message: `Payment updated to ₹${amount} via ${payment_method}`,
            employee_short_name: "P",
            color_code: "blue",
            created_at: new Date(),
          },
        });
      } else {
        // Track in taskactivities if no customer
        await prisma.taskactivities.create({
          data: {
            employee_id: employee_id,
            flat_id: flat_id,
            ta_message: `Payment updated to ₹${amount} via ${payment_method}`,
            employee_short_name: "P",
            color_code: "blue",
            created_at: new Date(),
          },
        });
      }


      // Update Ageing Record Total Amount
      if (flatCost?.flat?.block_id) {
        await updateAgeingRecordTotal(flat_id, project_id, flatCost.flat.block_id, customer_id);
      }

      return res.status(200).json({
        status: "success",
        message: "Payment updated successfully",
        data: {
          paymentUuid: payment_uid,
          amount: amount,
          paymentMethod: payment_method,
        },
      });
    } catch (error) {
      logger.error(`Update Payment Error: ${error.message}, File: paymentsController-updatePayment`);
      return res.status(500).json({
        status: "error",
        message: error.message || "Internal server error",
      });
    }
  });
};

exports.getSinglePayment = async (req, res) => {
  const { paymentuid } = req.query;

  try {
    const payment = await prisma.payments.findFirst({
      where: {
        id: paymentuid,
      },
      include: {
        flat: {
          include: {
            block: true,
          },
        },
        customer: true,
      },
    });

    if (!payment) {
      return res.status(200).json({
        status: "error",
        message: "Payment not found",
      });
    }

    const transaction_details = {
      payment_id: payment.id,
      id: payment.id,
      amount: payment.amount,
      payment_type: payment.payment_type,
      payment_towards: payment.payment_towards,
      payment_method: payment.payment_method,
      bank: payment.bank,
      payment_date: payment.payment_date,
      transaction_id: payment.trasnaction_id,
      receipt_url: payment.receipt_url,
      comment: payment.comment,
      flat: payment.flat
        ? {
          id: payment.flat.id,
          flat_no: payment.flat.flat_no,
          floor_no: payment.flat.floor_no,
          square_feet: payment.flat.square_feet,
          type: payment.flat.type,
          facing: payment.flat.facing,
          bedrooms: payment.flat.bedrooms,
          bathrooms: payment.flat.bathrooms,
          balconies: payment.flat.balconies,
          parking: payment.flat.parking,
          furnished_status: payment.flat.furnished_status,
          furnished_status: payment.flat.furnished_status,
          block_name: payment.flat.block?.block_name || "N/A",
          project_id: payment.project_id,
        }
        : null,
      customer: payment.customer
        ? {
          id: payment.customer.id,
          prefixes: payment.customer.prefixes,
          first_name: payment.customer.first_name,
          last_name: payment.customer.last_name,
          email: payment.customer.email,
          phone_code: payment.customer.phone_code,
          phone_number: payment.customer.phone_number,
          profile_pic_url: payment.customer.profile_pic_url,
        }
        : null,
    };

    return res.status(200).json({
      status: "success",
      payment_details: transaction_details,
    });
  } catch (error) {
    logger.error(`Get Single Payment Error: ${error.message}, File: paymentsController-getSinglePayment`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.getAllPayments = async (req, res) => {
  const { page, limit = 10, searchQuery, startDate, endDate, customer_id, flat_id, selected_block_id } = req.query;

  try {
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 10;
    const offset = (parsedPage - 1) * parsedLimit;

    // Get allocated project IDs for the current user
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);

    const searchCondition = {};

    // Filter by allocated projects (null means admin - show all)
    if (allocatedProjectIds !== null) {
      searchCondition.project_id = { in: allocatedProjectIds };
    }

    if (searchQuery) {
      searchCondition.OR = [
        {
          customer: {
            OR: [{ first_name: { contains: searchQuery } }, { last_name: { contains: searchQuery } }, { phone_number: { contains: searchQuery } }],
          },
        },
        {
          flat: {
            flat_no: { contains: searchQuery },
          },
        },
        {
          trasnaction_id: { contains: searchQuery },
        },
      ];
    }

    if (customer_id) {
      searchCondition.customer_id = customer_id;
    }

    if (flat_id) {
      searchCondition.flat_id = flat_id;
    }

    if (selected_block_id) {
      searchCondition.flat = {
        block_id: selected_block_id,
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
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const payments = await prisma.payments.findMany({
      where: {
        ...searchCondition,
        customer: {
          soft_delete: 0,
        },
      },
      skip: offset,
      take: parsedLimit,
      orderBy: { created_at: "desc" },
      include: {
        flat: {
          include: {
            block: true,
          },
        },
        customer: true,
      },
    });

    const totalPaymentsCount = await prisma.payments.count({
      where: {
        ...searchCondition,
        customer: {
          soft_delete: 0,
        },
      },
    });

    const paymentdetails = payments.map((payment) => ({
      payment_id: payment?.id?.toString(),
      id: payment?.id,
      flat_uuid: payment?.flat?.id,
      flat_number: payment?.flat?.flat_no,
      block_name: payment?.flat?.block?.block_name,
      customer_prefixes: payment?.customer?.prefixes,
      customer_first_name: payment?.customer?.first_name,
      customer_uuid: payment?.customer?.id,
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

    return res.status(200).json({
      status: "success",
      allpayments: paymentdetails || [],
      totalPayments: totalPaymentsCount,
      totalPages: Math.ceil(totalPaymentsCount / limit),
    });
  } catch (error) {
    logger.error(`Get All Payment Error: ${error.message}, File: paymentsController-getAllPayments`);
    return res.status(200).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

exports.getAllPrintPayments = async (req, res) => {
  const { searchQuery, startDate, endDate, customer_id, flat_id, selected_block_id } = req.query;

  try {
    const searchCondition = {};

    if (searchQuery) {
      searchCondition.OR = [
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
        {
          trasnaction_id: { contains: searchQuery },
        },
      ];
    }

    if (customer_id) {
      searchCondition.customer_id = customer_id;
    }

    if (flat_id) {
      searchCondition.flat_id = flat_id;
    }

    if (selected_block_id) {
      searchCondition.flat = {
        block_id: selected_block_id,
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
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const payments = await prisma.payments.findMany({
      where: {
        ...searchCondition,
        customer: {
          soft_delete: 0,
        },
      },
      orderBy: { created_at: "desc" },
      include: {
        flat: {
          include: {
            block: true,
          },
        },
        customer: true,
      },
    });

    const paymentdetails = payments.map((payment) => ({
      payment_id: payment?.id?.toString(),
      id: payment?.id,
      flat_uuid: payment?.flat?.id,
      flat_number: payment?.flat?.flat_no,
      block_name: payment?.flat?.block?.block_name,
      customer_first_name: payment?.customer?.first_name,
      customer_uuid: payment?.customer?.id,
      customer_last_name: payment?.customer?.last_name,
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
      allpayments: paymentdetails || [],
    });
  } catch (error) {
    logger.error(`Get All Print Payment Error: ${error.message}, File: paymentsController-getAllPrintPayments`);
    return res.status(200).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

exports.GetAllPaymentsByCustomer = async (req, res) => {
  const { page, limit = 10, searchQuery, startDate, endDate, customerUuid, flat_id } = req.query;
  try {
    let offset = 0;
    if (page > 1) {
      offset = (page - 1) * limit;
    }

    const customers = await prisma.customers.findFirst({
      where: {
        id: customerUuid,
      },
      select: {
        id: true,
      },
    });

    // Base condition - always filter by customer_id
    const searchCondition = {
      customer_id: customers.id,
    };

    // Add search query conditions if provided
    if (searchQuery) {
      searchCondition.OR = [
        {
          flat: {
            flat_no: { startsWith: searchQuery },
          },
        },
        { trasnaction_id: { startsWith: searchQuery } },
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
      take: parseInt(limit),
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

    const totalPaymentsCount = await prisma.payments.count({
      where: searchCondition,
    });

    const paymentdetails = payments.map((payment) => ({
      payment_id: payment?.id?.toString(),
      id: payment?.id,
      flat_number: payment?.flat?.flat_no,
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

    return res.status(200).json({
      status: "success",
      allpayments: paymentdetails || [],
      totalPayments: totalPaymentsCount,
      totalPages: Math.ceil(totalPaymentsCount / limit),
    });
  } catch (error) {
    logger.error(`Get All Payments By Customer Error: ${error.message}, File: paymentsController-GetAllPaymentsByCustomer`);
    return res.status(200).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

exports.GetAllPrintPaymentsByCustomer = async (req, res) => {
  const { searchQuery, startDate, endDate, customerUuid, flat_id } = req.query;
  try {
    const customers = await prisma.customers.findFirst({
      where: {
        id: customerUuid,
      },
      select: {
        id: true,
      },
    });

    // Base condition - always filter by customer_id
    const searchCondition = {
      customer_id: customers.id,
    };

    // Add search query conditions if provided
    if (searchQuery) {
      searchCondition.OR = [
        {
          flat: {
            flat_no: { startsWith: searchQuery },
          },
        },
        { trasnaction_id: { startsWith: searchQuery } },
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
        flat: {
          include: {
            block: true,
          }
        },
        customer: true,
      },
    });

    const paymentdetails = payments.map((payment) => ({
      payment_id: payment?.id?.toString(),
      id: payment?.id,
      flat_number: payment?.flat?.flat_no,
      block_name: payment?.flat?.block?.block_name,
      customer_first_name: payment?.customer?.first_name,
      customer_last_name: payment?.customer?.last_name,
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
      allpayments: paymentdetails || [],
    });
  } catch (error) {
    logger.error(`Get All Payments By Customer Error: ${error.message}, File: paymentsController-GetAllPaymentsByCustomer`);
    return res.status(200).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

exports.deletePayment = async (req, res) => {
  const { payment_id, employee_id } = req.body;

  if (!payment_id || !employee_id) {
    return res.status(200).json({
      status: "error",
      message: "Payment Id and Employee Id are required",
    });
  }

  try {
    const payment = await prisma.payments.findFirst({
      where: { id: payment_id },
      include: {
        flat: true,
      },
    });

    if (!payment) {
      return res.status(404).json({
        status: "error",
        message: "Payment not found",
      });
    }

    const paymentAmount = payment.amount;
    const paymentMethod = payment.payment_method;
    const customerId = payment.customer_id;
    const flatId = payment.flat_id;

    await prisma.payments.delete({
      where: { id: payment_id },
    });

    if (customerId && customerId !== "null") {
      await prisma.customeractivities.create({
        data: {
          customer_id: customerId,
          employee_id: employee_id,
          ca_message: `Payment of ₹${paymentAmount} via ${paymentMethod} was deleted`,
          employee_short_name: "P",
          color_code: "red",
          created_at: new Date(),
        },
      });
    } else {
      await prisma.taskactivities.create({
        data: {
          employee_id: employee_id,
          flat_id: flatId,
          ta_message: `Payment of ₹${paymentAmount} via ${paymentMethod} was deleted`,
          employee_short_name: "P",
          color_code: "red",
          created_at: new Date(),
        },
      });
    }

    if (payment?.receipt_path && fs.existsSync(payment.receipt_path)) {
      fs.unlinkSync(payment.receipt_path);
    }

    return res.status(200).json({
      status: "success",
      message: "Payment deleted successfully",
      data: {
        amount: paymentAmount,
        method: paymentMethod,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(`Delete Payments Error: ${error.message}, File: paymentsController-deletePayment`);
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

exports.uploadPayments = async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (error, fields, files) => {
    if (error) {
      logger.error(`Upload Payments Error: ${error.message}, File: paymentsController-uploadPayments`);
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }

    const file = files.bulkpayments?.[0];

    if (!file) {
      return res.status(200).json({
        status: "error",
        message: "No file uploaded.",
      });
    }

    try {
      const workbook = xlsx.readFile(file.path);
      const sheetName = workbook.SheetNames[0];

      const rawSheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
      });
      const headers = rawSheet[0] ?? [];

      const expectedHeaders = ["Amount", "Payment Type", "Payment Towards", "Payment Method", "Bank", "Date of Payment", "Transaction Id", "Comment"];

      const missingHeaders = expectedHeaders.filter((header) => !headers.includes(header));
      const extraHeaders = headers.filter((header) => !expectedHeaders.includes(header));

      if (missingHeaders?.length > 0 || extraHeaders?.length > 0) {
        return res.status(200).json({
          status: "error",
          message: `Invalid column headers. ${missingHeaders.length > 0 ? `Missing: ${missingHeaders.join(", ")}` : ""}${extraHeaders.length > 0 ? ` | Unexpected: ${extraHeaders.join(", ")}` : ""}`,
        });
      }

      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      for (const row of data) {
        // const {
        //     amount,
        //     paymentMethod,
        //     dateOfPayment,
        //     transactionId,
        //    comment
        // } = row;

        const amount = row["Amount"];
        const paymentType = row["Payment Type"];
        const paymentTowards = row["Payment Towards"];
        const paymentMethod = row["Payment Method"];
        const bankName = row["Bank"];
        const dateofPayment = row["Date of Payment"];
        const transactionId = row["Transaction Id"];
        const comment = row["Comment"];

        if (!amount || !paymentType || !paymentTowards || !paymentMethod || !dateofPayment || !transactionId) {
          console.log(`Missing required fields in row: ${JSON.stringify(row)}`);
          continue;
        }

        const parsedDate = dayjs(dateofPayment, "DD-MM-YYYY");
        const paymentData = parsedDate.isValid() ? parsedDate.toDate() : null;
        const parsedAmount = parseFloat(amount);

        await prisma.payments.create({
          data: {
            id: "ABDPT" + Math.floor(100000000 + Math.random() * 900000000).toString(),
            amount: parsedAmount,
            payment_type: paymentType,
            payment_towards: paymentTowards,
            payment_method: paymentMethod,
            bank: bankName,
            payment_date: paymentData,
            trasnaction_id: transactionId,
            comment: comment,
          },
        });
      }

      // logger.info("Payments uploaded successfully");
      return res.status(200).json({
        status: "success",
        message: "Payments uploaded successfully",
      });
    } catch (error) {
      logger.error(`Upload Payments Error: ${error.message}, File: paymentsController-uploadPayments`);
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  });
};

exports.uploadParsedPayments = async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (error, fields, files) => {
    if (error) {
      logger.error(`Upload Parsed Payments Error: ${error.message}, File: paymentsController-uploadParsedPayments`);
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }

    const file = files.bulkpayments?.[0];
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

      const rawSheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
      });
      const headers = rawSheet[0] ?? [];

      const expectedHeaders = [
        "Amount",
        "Payment Type",
        "Payment Towards",
        "Payment Method",
        "Bank",
        "Date of Payment",
        "Transaction Id",
        "Flat",
        "Block",
        "Project",
        "Comment"
      ];

      const missingHeaders = expectedHeaders.filter((header) => !headers.includes(header));
      const extraHeaders = headers.filter((header) => !expectedHeaders.includes(header));

      if (missingHeaders?.length > 0 || extraHeaders?.length > 0) {
        return res.status(200).json({
          status: "error",
          message: `Invalid column headers. ${missingHeaders.length > 0 ? `Missing: ${missingHeaders.join(", ")}` : ""}${extraHeaders.length > 0 ? ` | Unexpected: ${extraHeaders.join(", ")}` : ""}`,
        });
      }

      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const skipped = [];
      const inserted = [];
      let skippedCount = 0;
      let insertedCount = 0;

      await prisma.parsedpayments.deleteMany();

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // Accounting for header row usually at 1

        let isValid = true;
        let skipReason = [];

        const amount = row["Amount"];
        const paymentType = row["Payment Type"]?.toString()?.trim();
        const paymentTowards = row["Payment Towards"]?.toString()?.trim();
        const paymentMethod = row["Payment Method"]?.toString()?.trim();
        let bankName = row["Bank"]?.toString()?.trim() || null;
        const dateofPayment = row["Date of Payment"];
        const transactionId = row["Transaction Id"]?.toString()?.trim();
        const flat = row["Flat"]?.toString()?.trim();
        const block = row["Block"]?.toString()?.trim();
        const project = row["Project"]?.toString()?.trim();
        const comment = row["Comment"]?.toString()?.trim();

        // Required Validations
        if (!amount || !paymentType || !paymentTowards || !paymentMethod || !dateofPayment || !transactionId || !flat || !project) {
          skipReason.push("Missing required fields (Amount, Type, Towards, Method, Date, Txn ID, Flat, or Project)");
          isValid = false;
        }

        // Bank Requirement Logic
        if (paymentMethod === "DD" || paymentMethod === "Bank Deposit" || paymentMethod === "Cheque") {
          if (!bankName) {
            skipReason.push(`Bank is required for Payment Method '${paymentMethod}'`);
            isValid = false;
          }
        } else {
          bankName = null; // Enforce null if not required
        }

        // Date Parsing
        let paymentData = null;
        if (dateofPayment) {
          if (!isNaN(dateofPayment)) {
            const excelEpoch = new Date(Date.UTC(1900, 0, 1));
            paymentData = new Date(excelEpoch.getTime() + (dateofPayment - 2) * 86400000);
          } else {
            const parsedDate = dayjs(dateofPayment, ["DD-MM-YYYY", "D/M/YYYY", "MM-DD-YYYY", "YYYY-MM-DD"], true);
            if (parsedDate.isValid()) {
              paymentData = new Date(Date.UTC(parsedDate.year(), parsedDate.month(), parsedDate.date()));
            }
          }
          if (!paymentData || isNaN(paymentData.getTime())) {
            skipReason.push("Invalid Payment Date format");
            isValid = false;
          }
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
          skipReason.push("Amount must be a valid number");
          isValid = false;
        }

        // Context Resolution
        let projectId = null;
        if (project) {
          const projectData = await prisma.project.findFirst({
            where: { project_name: project },
          });
          if (projectData) {
            projectId = projectData.id;
          } else {
            skipReason.push("Project not found in DB");
            isValid = false;
          }
        }

        let dbFlat = null;
        let dbCustomerFlat = null;

        if (projectId && flat) {
          dbFlat = await prisma.flat.findFirst({
            where: {
              flat_no: flat.toString(),
              project_id: projectId,
            },
          });

          if (!dbFlat) {
            skipReason.push("Flat not found under the specified Project");
            isValid = false;
          } else {
            // Find active customer assignment to validate Booking Date
            dbCustomerFlat = await prisma.customerflat.findFirst({
              where: {
                flat_id: dbFlat.id,
              },
              orderBy: { created_at: "desc" },
              include: { customer: true }
            });

            if (!dbCustomerFlat || !dbCustomerFlat.customer) {
              skipReason.push("No Active Customer found for this assigned Flat/Project");
              isValid = false;
            }

            // else if (paymentData) {
            //   // Booking Date validation - Use application_date if available, else created_at
            //   const rawBookingDate = dbCustomerFlat.application_date || dbCustomerFlat.created_at;

            //   const bookingDate = dayjs(rawBookingDate).startOf('day').toDate();
            //   const normalizedPaymentDate = dayjs(paymentData).startOf('day').toDate();
            //   const currentDate = dayjs().endOf('day').toDate();

            //   if (normalizedPaymentDate < bookingDate) {
            //     skipReason.push(`Payment Date (${dayjs(normalizedPaymentDate).format('DD-MM-YYYY')}) cannot be before Booking Date (${dayjs(bookingDate).format('DD-MM-YYYY')})`);
            //     isValid = false;
            //   } else if (normalizedPaymentDate > currentDate) {
            //     skipReason.push(`Payment Date (${dayjs(normalizedPaymentDate).format('DD-MM-YYYY')}) cannot be in the future`);
            //     isValid = false;
            //   }
            // }
          }
        }

        if (isValid) {
          try {
            const newPayment = await prisma.parsedpayments.create({
              data: {
                id: "ABDPT" + Math.floor(100000000 + Math.random() * 900000000).toString(),
                amount: parsedAmount,
                payment_type: paymentType,
                payment_towards: paymentTowards,
                payment_method: paymentMethod,
                bank: bankName,
                payment_date: paymentData,
                transaction_id: transactionId,
                flat: flat,
                block: block || null,
                project_id: projectId ? projectId : null,
                comment: comment,
                added_by_employee_id: employee_id ? employee_id : null,
              },
            });
            inserted.push(newPayment);
            insertedCount++;
          } catch (createError) {
            skipReason.push(`DB Error: ${createError.message}`);
            isValid = false;
          }
        }

        if (!isValid) {
          skipped.push({
            transaction_id: transactionId || "N/A",
            flat: flat || "N/A",
            amount: amount || "N/A",
            reason: skipReason.join(" | "),
          });
          skippedCount++;
        }
      }

      return res.status(200).json({
        status: "success",
        message: "Payments uploaded successfully",
        insertedCount,
        skippedCount,
        skipped: skipped.slice(0, 10), // Send top 10 errors to avoid heavy payloads
      });
    } catch (error) {
      logger.error(`Upload Parsed Payments Error: ${error.message}, File: paymentsController-uploadParsedPayments`);
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  });
};

exports.getAllParsedPayments = async (req, res) => {
  try {
    const payment = await prisma.parsedpayments.findMany();

    return res.status(200).json({
      status: "success",
      data: payment,
    });
  } catch (error) {
    logger.error(`Get All Parsed Payments Error: ${error.message}, File: paymentsController-getAllParsedPayments`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.deleteParsedPaymentRecord = async (req, res) => {
  try {
    const { id } = req.body;

    const payment = await prisma.parsedpayments.delete({
      where: {
        id: id,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Parsed Payment record deleted successfully",
    });
  } catch (error) {
    logger.error(`Delete Parsed Payment Record Error: ${error.message}, File: paymentsController-deleteParsedPaymentRecord`);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.getCustomerPaymentsforexcel = async (req, res) => {
  const { searchQuery, startDate, endDate, customerUuid, flat_id } = req.query;

  try {
    const customer = await prisma.customers.findFirst({
      where: {
        id: customerUuid,
      },
    });

    if (!customer) {
      return res.status(200).json({
        status: "error",
        message: "Customer Uid is Required",
      });
    }

    const searchCondition = {
      customer_id: customer.id,
    };

    if (searchQuery) {
      searchCondition.OR = [
        {
          flat: {
            flat_no: { startsWith: searchQuery },
          },
        },
        { trasnaction_id: { startsWith: searchQuery } },
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

    if (payments.length === 0) {
      return res.status(200).json({
        status: "error",
        type: "No Payments",
        message: "No Payments are available to downlaod",
      });
    }

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
      Bank: payment?.bank || "-----",
      "Payment Date": payment?.paymet_date && dayjs(payment?.paymet_date).format("DD/MM/YYYY"),
      Receipt: payment?.receipturl || "-----",
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
    titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFF" } };
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

    // Set column headers on Row 3
    const headers = ["S.No", "Payment Ref Id", "Transaction ID", "Flat No", "Customer Name", "Customer Mobile Number", "Amount", "Payment Type", "Payment Towards", "Payment Method", "Bank", "Payment Date", "Receipt", "Comment"];
    worksheet.getRow(3).values = headers;
    const headerRow = worksheet.getRow(3);
    headerRow.font = { name: "Calibri", bold: true, size: 12, color: { argb: "000000" } };
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
    // Adjust worksheet columns with dynamic widths
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

    // Add data starting from Row 4
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
    // Style data rows
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
        row.getCell("Customer Mobile Number").alignment = { horizontal: "center" };
        row.getCell("Payment Date").numFmt = "yyyy-mm-dd";
      }
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=customer-report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error(`Get Customer Payment For Excel Error: ${error.message}, File: paymentsController-getCustomerPaymentsforexcel`);
    return res.status(500).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

exports.getPaymentsForExcel = async (req, res) => {
  const { searchQuery, customer_id, flat_id, startDate, endDate } = req.query;

  try {
    const flat = await prisma.flat.findFirst({
      where: {
        id: flat_id,
      },
      select: {
        flat_no: true,
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

    if (customer_id) {
      searchCondition.customer_id = customer_id;
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
      where: {
        ...searchCondition,
        customer: {
          soft_delete: 0,
        },
      },
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
      customer_prefixes: payment?.customer?.prefixes,
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

    let customerName;

    if (customer_id) {
      customerName = await prisma.customers.findFirst({
        where: {
          id: customer_id,
        },
        select: {
          first_name: true,
          last_name: true,
        },
      });
    }

    const worksheetData = paymentsData?.map((payment, index) => ({
      "S.No": index + 1,
      "Payment Ref Id": payment.id,
      "Transaction ID": payment.transaction_id,
      "Flat No": payment.flat_number,
      "Customer Name": payment.customer_prefixes + " " + payment.customer_first_name + " " + payment.customer_last_name,
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

    if (searchQuery) {
      mainHeader += `Search by (${searchQuery})`;
    }

    if (customer_id) {
      mainHeader += `Customer - (${customerName.first_name}) - (${customerName.last_name})`;
    }

    if (flat_id) {
      mainHeader += `Flat - (${flat.flat_no})`;
    }

    worksheet.mergeCells("A2:AR2");
    const titleCell = worksheet.getCell("A2");
    titleCell.value = mainHeader;
    titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFF" } };
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

    // Set column headers on Row 3
    const headers = ["S.No", "Payment Ref Id", "Transaction ID", "Flat No", "Customer Name", "Customer Mobile Number", "Amount", "Payment Type", "Payment Towards", "Payment Method", "Bank", "Payment Date", "Receipt", "Comment"];
    worksheet.getRow(3).values = headers;
    const headerRow = worksheet.getRow(3);
    headerRow.font = { name: "Calibri", bold: true, size: 12, color: { argb: "000000" } };
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
    // Adjust worksheet columns with dynamic widths
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

    // Add data starting from Row 4
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
    // Style data rows
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
        row.getCell("Customer Mobile Number").alignment = { horizontal: "center" };
        row.getCell("Payment Date").numFmt = "yyyy-mm-dd";
      }
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=customer-report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error(`Get Payments For Excel Error: ${error.message}, File: paymentsController-getPaymentsforexcel`);
    return res.status(500).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

// Get payments summary grouped by flat (for the new All Payments page)
exports.getPaymentsSummaryByFlat = async (req, res) => {
  const { searchQuery, block_id, flat_id, offset = 0, limit = 10, project_id } = req.query;

  try {
    const searchCondition = {
      // Only show flats that have a customer assignment
      Customerflat: {
        some: {},
      },
    };

    // Get allocated project IDs for the current user
    const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);
    if (allocatedProjectIds !== null) {
      // Non-admin: filter by allocated projects, or by specific project_id if provided
      if (project_id && project_id !== 'undefined' && project_id !== '') {
        searchCondition.project_id = project_id;
      } else {
        searchCondition.project_id = { in: allocatedProjectIds };
      }
    }
    // Super Admin (allocatedProjectIds === null): no project filter, show all data

    // Filter by block
    if (block_id && block_id !== 'undefined' && block_id !== '') {
      searchCondition.block_id = block_id;
    }

    // Filter by specific flat
    if (flat_id && flat_id !== 'undefined' && flat_id !== '') {
      searchCondition.id = flat_id;
    }

    // Search by flat number
    if (searchQuery) {
      searchCondition.flat_no = { contains: searchQuery };
    }

    // Get total count for pagination
    const totalCount = await prisma.flat.count({
      where: searchCondition,
    });

    // Get flats with their customerflat (for grand_total) and payments (for total_paid)
    const flats = await prisma.flat.findMany({
      where: searchCondition,
      skip: parseInt(offset),
      take: parseInt(limit),
      orderBy: {
        flat_no: "asc",
      },
      select: {
        id: true,
        id: true,
        flat_no: true,
        floor_no: true,
        project: {
          select: {
            id: true,
            project_name: true,
          },
        },
        block: {
          select: {
            id: true,
            block_name: true,
          },
        },
        Customerflat: {
          select: {
            application_date: true,
            grand_total: true,
            customer: {
              select: {
                id: true,
                id: true,
                first_name: true,
                last_name: true,
                prefixes: true,
              },
            },
          },
        },
        payments: {
          select: {
            amount: true,
          },
        },
      },
    });

    // Process the data to calculate totals and balance
    const flatsSummary = flats.map((flat) => {
      const customerFlat = flat.Customerflat[0];
      const grandTotal = customerFlat?.grand_total || 0;
      const totalPaid = flat.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const balance = grandTotal - totalPaid;

      return {
        flat_id: flat.id,
        flat_uuid: flat.id,
        flat_no: flat.flat_no,
        floor_no: flat.floor_no,
        project_id: flat.project?.id?.toString() || null,
        project_name: flat.project?.project_name || null,
        block_id: flat.block?.id?.toString() || null,
        block_name: flat.block?.block_name || null,
        customer: customerFlat?.customer || null,
        booking_date: customerFlat?.application_date || null,
        grand_total: grandTotal,
        total_paid: totalPaid,
        balance: balance,
      };
    });

    return res.status(200).json({
      status: "success",
      data: flatsSummary,
      pagination: {
        total: totalCount,
        offset: parseInt(offset),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error(`Get Payments Summary By Flat Error: ${error.message}, File: paymentsController-getPaymentsSummaryByFlat`);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

