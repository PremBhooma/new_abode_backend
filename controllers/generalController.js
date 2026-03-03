const prisma = require("../utils/client");

const multiparty = require("multiparty");
const mysql = require('mysql2/promise');
const mysqldump = require('mysqldump');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const os = require('os');
const logger = require('../helper/logger');
const getAllocatedProjectIds = require("../utils/getAllocatedProjectIds");


const serializeBigInt = (obj) => {
    return JSON.parse(
        JSON.stringify(obj, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
        )
    );
};

exports.getCountries = async (req, res) => {
    try {
        //connect Country model
        const country = await prisma.country.findMany();
        let data = [];
        if (country !== null) {
            country.map((country) => {
                data.push({
                    value: country.phone_code,
                    label: `+${country.phone_code}`
                });
            });
        }

        return res.status(200).json({
            status: 'success',
            countrydata: data
        });

    } catch (error) {
        logger.error(`Get Countries Error: ${error.message}, File: generalController-getCountries`);
        return res.status(500).json({
            status: 'error',
            message: `Internal server error`
        });
    }
}

exports.getCountriesNames = async (req, res) => {
    try {
        const country = await prisma.country.findMany();
        let data = [];
        if (country !== null) {
            country.map((country) => {
                data.push({
                    value: country?.id?.toString(),
                    label: country?.name
                });
            });
        }

        return res.status(200).json({
            status: 'success',
            countryNames: data
        });

    } catch (error) {
        logger.error(`Get Countries Names Error: ${error.message}, File: generalController-getCountriesNames`);
        return res.status(500).json({
            status: 'error',
            message: `Internal server error`
        });
    }
}


exports.getDataBackup = async (req, res) => {
    try {
        // Get current date in dd_mm_yyyy format
        const now = new Date();
        const dateString = `${String(now.getDate()).padStart(2, '0')}_${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}`;

        // Use system temp directory (works on Windows, Mac, Linux)
        const tempDir = os.tmpdir();

        const backupFile = `backup_${dateString}.sql`;
        const backupPath = path.join(tempDir, backupFile);

        // Create MySQL dump
        await mysqldump({
            connection: {
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
            },
            dumpToFile: backupPath
        });

        // Zip the SQL dump
        const zipFile = `backup_${dateString}.zip`;
        const zipPath = path.join(tempDir, zipFile);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            fs.unlinkSync(backupPath); // delete SQL after zipping

            // Set headers for browser download
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${zipFile}"`);
            res.sendFile(zipPath, (err) => {
                fs.unlinkSync(zipPath); // delete ZIP after sending
                if (err) console.error(err);
            });
        });

        archive.on('error', (err) => { throw err; });
        archive.pipe(output);
        archive.file(backupPath, { name: backupFile });
        archive.finalize();

    } catch (error) {
        logger.error(`Get Data Backup  Error: ${error.message}, File: generalController-getDataBackup`);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
};

exports.restoreDataBackup = async (req, res) => {
    const form = new multiparty.Form();

    form.parse(req, async (error, fields, files) => {
        if (error) {
            console.error("Error parsing form:", error);
            return res.status(500).json({
                status: "error",
                message: "Failed to parse form"
            });
        }

        const backupFile = files.file ? files.file[0] : null;
        if (!backupFile) {
            return res.status(400).json({
                status: "error",
                message: "No backup file uploaded"
            });
        }

        const tempFilePath = backupFile.path || backupFile.filepath;
        if (!tempFilePath || !fs.existsSync(tempFilePath)) {
            return res.status(400).json({
                status: "error",
                message: "File path missing or file not found"
            });
        }

        try {
            const sqlContent = fs.readFileSync(tempFilePath, "utf8");

            const connection = await mysql.createConnection({
                host: "localhost",
                user: "root",
                password: "", // XAMPP default
                database: "abodedb",
                multipleStatements: true
            });

            // 1. Disable foreign key checks
            await connection.query("SET FOREIGN_KEY_CHECKS = 0");

            // 2. Get all tables in the database
            const [tables] = await connection.query("SHOW TABLES");
            const tableKey = Object.keys(tables[0])[0];

            // 3. Drop all tables
            for (let row of tables) {
                const tableName = row[tableKey];
                await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
            }

            // 4. Enable foreign key checks back
            await connection.query("SET FOREIGN_KEY_CHECKS = 1");

            // 5. Restore backup exactly as it is
            await connection.query(sqlContent);

            await connection.end();
            fs.unlinkSync(tempFilePath);

            return res.status(200).json({
                status: "success",
                message: "Database cleared and restored successfully."
            });
        } catch (err) {
            logger.error(`Restore Data Backup  Error: ${error.message}, File: generalController-restoreDataBackup`);
            return res.status(500).json({
                status: "error",
                message: "Failed to restore database",
                error: err.message
            });
        }
    });
};

exports.getBlockslist = async (req, res) => {
    const { flat_id, customer_id } = req.query;
    try {
        let whereCondition = {};

        if (flat_id) {
            const flat = await prisma.flat.findUnique({
                where: {
                    id: BigInt(flat_id)
                },
                select: {
                    block_id: true
                }
            });

            if (!flat || !flat.block_id) {
                return res.status(200).json({
                    status: "error",
                    message: "Flat not found or has no associated block"
                });
            }

            whereCondition.id = flat.block_id;
        }

        if (customer_id) {
            // Fetch all flats of that customer
            const flats = await prisma.flat.findMany({
                where: {
                    customer_id: BigInt(customer_id)
                },
                select: {
                    block_id: true
                }
            });

            const blockIds = flats
                .map(f => f.block_id)
                .filter(id => id !== null); // only valid block_ids

            if (blockIds.length === 0) {
                return res.status(200).json({
                    status: "success",
                    message: "No blocks found for this customer",
                    blocks: null
                });
            }

            whereCondition.id = { in: blockIds };
        }

        const blocks = await prisma.block.findMany({
            where: whereCondition,
            include: {
                flats: true
            }
        });

        const blockslist = blocks.map(block => ({
            label: block.block_name,
            value: block.id.toString(),
        }));

        return res.status(200).json({
            status: "success",
            message: "Blocks are fetched successfully",
            blocks: blockslist,
        });
    } catch (error) {
        logger.error(`Get Blocks List Error: ${error.message}, File: generalController-getBlockslist`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getAllEmployees = async (req, res) => {
    const { assignEmployee } = req.query;
    try {
        const whereClause = {
            employee_status: "Active"
        };

        if (assignEmployee) {
            whereClause.id = {
                notIn: [BigInt(assignEmployee)]
            };
        }

        const employees = await prisma.employees.findMany({
            where: whereClause
        });

        const data = employees.map(employee => ({
            value: employee.id.toString(),
            label: employee.name
        }));

        return res.status(200).json({
            status: "success",
            message: "All Employees are fetched successfully",
            employees: data,
        });

    } catch (error) {
        logger.error(`getting error while fetching all employees Error: ${error.message}, File: generalController-getAllEmployees`);
        return res.status(500).json({
            status: 'error',
            message: `Internal server error`
        });
    }
}


exports.addBank = async (req, res) => {
    const { name } = req.body;
    try {
        const existingBank = await prisma.banksList.findFirst({
            where: {
                name: {
                    equals: name
                }
            }
        });
        if (existingBank) {
            return res.status(200).json({
                status: "error",
                message: "Bank already exists",
            });
        }
        await prisma.banksList.create({
            data: {
                name: name,
                created_at: new Date(),
            },
        });
        return res.status(200).json({
            status: "success",
            message: "Bank added successfully",
        });
    } catch (error) {
        logger.error(`Add Bank Error: ${error.message}, File: settingsController-addBank`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.updateBank = async (req, res) => {
    const { id, name } = req.body;
    try {
        const existingBank = await prisma.banksList.findFirst({
            where: {
                name: {
                    equals: name
                },
                NOT: {
                    id: BigInt(id)
                }
            }
        });

        if (existingBank) {
            return res.status(200).json({
                status: "error",
                message: "Bank name already exists",
            });
        }

        await prisma.banksList.update({
            where: { id: BigInt(id) },
            data: {
                name: name,
                updated_at: new Date(),
            },
        });

        return res.status(200).json({
            status: "success",
            message: "Bank updated successfully",
        });
    } catch (error) {
        logger.error(`Update Bank Error: ${error.message}, File: settingsController-updateBank`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getAllBanks = async (req, res) => {

    const { page, limit = 10, searchQuery } = req.query;
    try {
        let offset = 0;
        if (page > 1) {
            offset = limit * (page - 1);
        }

        const searchCondition = {
            ...(searchQuery ? {
                name: {
                    contains: searchQuery,
                },
            } : {}),
        };

        const banksData = await prisma.banksList.findMany({
            where: searchCondition,
            select: {
                id: true,
                name: true,
            },
            skip: offset,
            take: parseInt(limit),
            orderBy: {
                id: "desc",
            },
        });

        const totalBanks = await prisma.banksList.count({
            where: searchCondition,
        });

        return res.status(200).json({
            status: "success",
            data: serializeBigInt(banksData),
            totalBanks,
            totalPages: Math.ceil(totalBanks / limit),
            currentPage: parseInt(page),
        });
    } catch (error) {
        logger.error(`Get All Banks Error: ${error.message}, File: settingsController-getAllBanks`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.deleteBank = async (req, res) => {
    const { id } = req.body;
    try {
        await prisma.banksList.delete({
            where: { id: BigInt(id) },
        });

        return res.status(200).json({
            status: "success",
            message: "Bank deleted successfully",
        });
    } catch (error) {
        logger.error(`Delete Bank Error: ${error.message}, File: settingsController-deleteBank`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getCurrentUserPermissions = async (req, res) => {

    const { id } = req.user;

    if (!id) {
        return res.status(400).json({ status: "error", message: "User ID missing in token" });
    }

    try {
        const employee = await prisma.employees.findFirst({
            where: {
                id: BigInt(id),
            },
            select: {
                role_id: true,
            },
        });

        if (!employee || !employee.role_id) {
            // If no role, return empty permissions
            return res.status(200).json({
                status: "success",
                permissionsData: {},
            });
        }

        const rolePermissions = await prisma.rolepermissions.findFirst({
            where: {
                role_id: employee.role_id,
            },
        });

        let permissionsData = {};
        if (rolePermissions && rolePermissions.permissions) {
            permissionsData = JSON.parse(rolePermissions.permissions);
        }

        return res.status(200).json({
            status: "success",
            permissionsData: permissionsData,
        });
    } catch (error) {
        logger.error(`Get Current User Permissions Error: ${error.message}, File: employeeController-getCurrentUserPermissions`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.addCouponGift = async (req, res) => {
    const form = new multiparty.Form();

    form.parse(req, async (error, fields, files) => {
        if (error) {
            logger.error(`Add Coupon Gift Error: ${error.message}, File: generalController-addCouponGift`);
            return res.status(500).json({
                status: "error",
                message: "Internal server error",
            });
        }

        const project_id = fields.project_id ? fields.project_id[0] : null;
        const name = fields.name ? fields.name[0] : null;
        const coupon_gift_id = fields.coupon_gift_id ? fields.coupon_gift_id[0] : null;
        const coupon_gift_status = fields.coupon_gift_status ? fields.coupon_gift_status[0] : "Active";
        const couponGiftPic = files.file ? files.file[0] : null;

        if (!project_id || !name || !coupon_gift_id || !couponGiftPic) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields or file",
            });
        }

        try {
            const existingCouponGift = await prisma.coupongifts.findFirst({
                where: {
                    name: {
                        equals: name
                    }
                }
            });
            if (existingCouponGift) {
                return res.status(200).json({
                    status: "error",
                    message: "Coupon Gift already exists",
                });
            }

            const tempFilePath = couponGiftPic.path || couponGiftPic.filepath;
            const uploadDir = path.join(__dirname, "../uploads/coupon_gifts");

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const savedFilePath = path.join(uploadDir, `${Date.now()}_${couponGiftPic.originalFilename}`);
            fs.copyFileSync(tempFilePath, savedFilePath);
            fs.unlinkSync(tempFilePath);

            const fileUrl = `${process.env.API_URL}/uploads/coupon_gifts/${path.basename(savedFilePath)}`;

            await prisma.coupongifts.create({
                data: {
                    project_id: BigInt(project_id),
                    name: name,
                    coupon_gift_id: coupon_gift_id,
                    coupon_gift_status: coupon_gift_status,
                    coupon_gift_pic_url: fileUrl,
                    coupon_gift_pic_path: savedFilePath,
                    created_at: new Date(),
                },
            });

            return res.status(200).json({
                status: "success",
                message: "Coupon Gift added successfully",
            });
        } catch (error) {
            logger.error(`Add Coupon Gift Error: ${error.message}, File: generalController-addCouponGift`);
            return res.status(500).json({
                status: "error",
                message: "Internal server error",
            });
        }
    });
};

exports.updateCouponGift = async (req, res) => {
    const form = new multiparty.Form();

    form.parse(req, async (error, fields, files) => {
        if (error) {
            logger.error(`Update Coupon Gift Error: ${error.message}, File: generalController-updateCouponGift`);
            return res.status(500).json({
                status: "error",
                message: "Internal server error",
            });
        }

        const id = fields.id ? fields.id[0] : null;
        const project_id = fields.project_id ? fields.project_id[0] : null;
        const name = fields.name ? fields.name[0] : null;
        const coupon_gift_id = fields.coupon_gift_id ? fields.coupon_gift_id[0] : null;
        const coupon_gift_status = fields.coupon_gift_status ? fields.coupon_gift_status[0] : undefined;
        const couponGiftPic = files.file ? files.file[0] : null;

        if (!id) {
            return res.status(400).json({
                status: "error",
                message: "Coupon Gift ID is required",
            });
        }

        try {
            const existingCouponGift = await prisma.coupongifts.findFirst({
                where: {
                    name: {
                        equals: name
                    },
                    NOT: {
                        id: BigInt(id)
                    }
                }
            });
            if (existingCouponGift) {
                return res.status(200).json({
                    status: "error",
                    message: "Coupon Gift already exists",
                });
            }

            const couponGift = await prisma.coupongifts.findUnique({
                where: { id: BigInt(id) }
            });

            if (!couponGift) {
                return res.status(404).json({
                    status: "error",
                    message: "Coupon Gift not found",
                });
            }

            let fileUrl = couponGift.coupon_gift_pic_url;
            let savedFilePath = couponGift.coupon_gift_pic_path;

            if (couponGiftPic) {
                const tempFilePath = couponGiftPic.path || couponGiftPic.filepath;
                const uploadDir = path.join(__dirname, "../uploads/coupon_gifts");

                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // Delete old file if it exists
                if (couponGift.coupon_gift_pic_path && fs.existsSync(couponGift.coupon_gift_pic_path)) {
                    fs.unlinkSync(couponGift.coupon_gift_pic_path);
                }

                savedFilePath = path.join(uploadDir, `${Date.now()}_${couponGiftPic.originalFilename}`);
                fs.copyFileSync(tempFilePath, savedFilePath);
                fs.unlinkSync(tempFilePath);

                fileUrl = `${process.env.API_URL}/uploads/coupon_gifts/${path.basename(savedFilePath)}`;
            }

            await prisma.coupongifts.update({
                where: { id: BigInt(id) },
                data: {
                    project_id: project_id ? BigInt(project_id) : undefined,
                    name: name || undefined,
                    coupon_gift_id: coupon_gift_id || undefined,
                    coupon_gift_status: coupon_gift_status || undefined,
                    coupon_gift_pic_url: fileUrl,
                    coupon_gift_pic_path: savedFilePath,
                    updated_at: new Date(),
                },
            });

            return res.status(200).json({
                status: "success",
                message: "Coupon Gift updated successfully",
            });
        } catch (error) {
            logger.error(`Update Coupon Gift Error: ${error.message}, File: generalController-updateCouponGift`);
            return res.status(500).json({
                status: "error",
                message: "Internal server error",
            });
        }
    });
};

exports.getAllCouponGifts = async (req, res) => {
    const { page, limit = 10, searchQuery } = req.query;
    try {
        let offset = 0;
        if (page > 1) {
            offset = limit * (page - 1);
        }

        const searchCondition = {
            ...(searchQuery ? {
                name: {
                    contains: searchQuery,
                },
            } : {}),
        };

        const couponGiftsData = await prisma.coupongifts.findMany({
            where: searchCondition,
            select: {
                id: true,
                project_id: true,
                name: true,
                coupon_gift_id: true,
                coupon_gift_status: true,
                coupon_gift_pic_url: true,
                coupon_gift_pic_path: true,
            },
            skip: offset,
            take: parseInt(limit),
            orderBy: {
                id: "desc",
            },
        });

        const totalCouponGifts = await prisma.coupongifts.count({
            where: searchCondition,
        });

        return res.status(200).json({
            status: "success",
            data: serializeBigInt(couponGiftsData),
            totalCouponGifts,
            totalPages: Math.ceil(totalCouponGifts / limit),
            currentPage: parseInt(page),
        });
    } catch (error) {
        logger.error(`Get All Coupon Gifts Error: ${error.message}, File: generalController-getAllCouponGifts`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.deleteCouponGift = async (req, res) => {
    const { id } = req.body;
    try {
        await prisma.coupongifts.delete({
            where: { id: BigInt(id) },
        });
        return res.status(200).json({
            status: "success",
            message: "Coupon Gift deleted successfully",
        });
    } catch (error) {
        logger.error(`Delete Coupon Gift Error: ${error.message}, File: generalController-deleteCouponGift`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.searchSoldFlatsWithAdvance = async (req, res) => {
    try {
        const { flat_no, searchQuery } = req.query;
        const MIN_PAYMENT_THRESHOLD = 200000;

        // Get allocated project IDs for the logged-in employee
        const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);

        let whereClause = {
            status: "Sold",
            advance_payment: true,
            ...(allocatedProjectIds ? { project_id: { in: allocatedProjectIds } } : {}),
        };

        if (flat_no) {
            whereClause.flat_no = {
                contains: flat_no.toString(),
            };
        } else if (searchQuery) {
            whereClause.Customerflat = {
                some: {
                    customer: {
                        OR: [
                            { first_name: { contains: searchQuery } },
                            { last_name: { contains: searchQuery } },
                            { email: { contains: searchQuery } },
                            { phone_number: { contains: searchQuery } },
                        ],
                        soft_delete: 0,
                    },
                },
            };
        }

        const flats = await prisma.flat.findMany({
            where: whereClause,
            select: {
                id: true,
                flat_no: true,
                uuid: true,
                flat_reward: true,
                project: {
                    select: {
                        id: true,
                        project_name: true,
                    },
                },
                Customerflat: {
                    select: {
                        customer: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                phone_number: true,
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

        // Filter by payment threshold and format data
        const data = flats
            .map((flat) => {
                const totalPaid = flat.payments.reduce((sum, p) => sum + (p.amount || 0), 0);

                if (totalPaid < MIN_PAYMENT_THRESHOLD) return null;

                const customerFlat = flat.Customerflat[0];
                const customer = customerFlat?.customer;
                const customerName = customer ? `${customer.first_name} ${customer.last_name}` : "Unknown";

                return {
                    id: flat.id.toString(),
                    flat_no: flat.flat_no,
                    project_id: flat.project?.id.toString(),
                    project_name: flat.project?.project_name || "N/A",
                    customer_id: customer?.id.toString(),
                    customer_name: customerName,
                    customer_phone: customer?.phone_number || "",
                    total_paid: totalPaid,
                    flat_reward: flat.flat_reward ?? false,
                    label: `${flat.flat_no} - ${flat.project?.project_name || "N/A"} - ${customerName} (Paid: ₹${totalPaid.toLocaleString()})`,
                    value: flat.id.toString()
                };
            })
            .filter(Boolean);

        return res.status(200).json({
            status: "success",
            data: serializeBigInt(data),
        });

    } catch (error) {
        logger.error(`Search Sold Flats With Advance Error: ${error.message}, File: generalController-searchSoldFlatsWithAdvance`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getLoggedInEmployee = async (req, res) => {
    try {
        const { id } = req.user;

        const employee = await prisma.employees.findUnique({
            where: { id: BigInt(id) },
            select: {
                id: true,
                name: true,
                phone_number: true,
            }
        });

        if (!employee) {
            return res.status(404).json({
                status: "error",
                message: "Employee not found",
            });
        }

        return res.status(200).json({
            status: "success",
            data: serializeBigInt(employee),
        });

    } catch (error) {
        logger.error(`Get Logged In Employee Error: ${error.message}, File: generalController-getLoggedInEmployee`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

// Refined sendRedemptionOTP logic using findFirst + update/create
exports.sendRedemptionOTP = async (req, res) => {
    try {
        const { flat_id, employee_id, customer_id, employee_phone, customer_phone, project_id } = req.body;

        if (!employee_phone || employee_phone.length !== 10) return res.status(400).json({ status: "error", message: "Invalid Employee phone number" });
        if (!customer_phone || customer_phone.length !== 10) return res.status(400).json({ status: "error", message: "Invalid Customer phone number" });

        const employee_otp = Math.floor(100000 + Math.random() * 900000).toString();
        const customer_otp = Math.floor(100000 + Math.random() * 900000).toString();

        console.log(`\x1b[32m[REWARD REDEMPTION]\x1b[0m Employee OTP: \x1b[1m${employee_otp}\x1b[0m for ${employee_phone}`);
        console.log(`\x1b[32m[REWARD REDEMPTION]\x1b[0m Customer OTP: \x1b[1m${customer_otp}\x1b[0m for ${customer_phone}`);

        const existingReward = await prisma.rewards.findFirst({
            where: { flat_id: BigInt(flat_id), employee_id: BigInt(employee_id), customer_id: BigInt(customer_id) }
        });

        if (existingReward) {
            await prisma.rewards.update({
                where: { id: existingReward.id },
                data: {
                    employee_otp,
                    customer_otp,
                    employee_otp_verified: false,
                    customer_otp_verified: false,
                    updated_at: new Date()
                }
            });
        } else {
            await prisma.rewards.create({
                data: {
                    flat_id: BigInt(flat_id),
                    employee_id: BigInt(employee_id),
                    customer_id: BigInt(customer_id),
                    project_id: BigInt(project_id),
                    employee_otp,
                    customer_otp,
                    employee_otp_verified: false,
                    customer_otp_verified: false,
                    created_at: new Date()
                }
            });
        }

        return res.status(200).json({
            status: "success",
            message: "OTPs sent successfully",
            debug: { employee_otp, customer_otp }
        });

    } catch (error) {
        logger.error(`Send Redemption OTP Error: ${error.message}, File: generalController-sendRedemptionOTP`);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.resendRedemptionOTP = async (req, res) => {
    try {
        const { flat_id, employee_id, customer_id, target } = req.body;
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

        const existingReward = await prisma.rewards.findFirst({
            where: { flat_id: BigInt(flat_id), employee_id: BigInt(employee_id), customer_id: BigInt(customer_id) }
        });

        if (!existingReward) return res.status(404).json({ status: "error", message: "Reward session not found" });

        const updateData = {};
        if (target === 'employee') {
            updateData.employee_otp = newOtp;
            updateData.employee_otp_verified = false;
            console.log(`\x1b[33m[RESEND OTP]\x1b[0m Employee OTP: \x1b[1m${newOtp}\x1b[0m`);
        } else if (target === 'customer') {
            updateData.customer_otp = newOtp;
            updateData.customer_otp_verified = false;
            console.log(`\x1b[33m[RESEND OTP]\x1b[0m Customer OTP: \x1b[1m${newOtp}\x1b[0m`);
        } else {
            return res.status(400).json({ status: "error", message: "Invalid resend target" });
        }

        await prisma.rewards.update({
            where: { id: existingReward.id },
            data: { ...updateData, updated_at: new Date() }
        });

        return res.status(200).json({ status: "success", message: `OTP resent to ${target}`, otp: newOtp });

    } catch (error) {
        logger.error(`Resend Redemption OTP Error: ${error.message}, File: generalController-resendRedemptionOTP`);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.verifyRedemptionOTP = async (req, res) => {
    try {
        const { flat_id, employee_id, customer_id, employee_otp, customer_otp } = req.body;

        const reward = await prisma.rewards.findFirst({
            where: { flat_id: BigInt(flat_id), employee_id: BigInt(employee_id), customer_id: BigInt(customer_id) }
        });

        if (!reward) return res.status(404).json({ status: "error", message: "Redemption session not found" });

        const isEmployeeVerified = reward.employee_otp === employee_otp;
        const isCustomerVerified = reward.customer_otp === customer_otp;

        if (!isEmployeeVerified || !isCustomerVerified) {
            return res.status(400).json({
                status: "error",
                message: "Invalid OTPs",
                details: { employee: isEmployeeVerified, customer: isCustomerVerified }
            });
        }

        // OTPs Verified, Pick a Gift
        const activeGifts = await prisma.coupongifts.findMany({
            where: {
                project_id: reward.project_id,
                coupon_gift_status: "Active"
            }
        });

        if (activeGifts.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "No active gifts available for this project. Please contact admin."
            });
        }

        const randomGift = activeGifts[Math.floor(Math.random() * activeGifts.length)];

        const updatedReward = await prisma.rewards.update({
            where: { id: reward.id },
            data: {
                employee_otp_verified: true,
                customer_otp_verified: true,
                employee_otp: null,
                customer_otp: null,
                rewards_step: 4,
                coupon_name: randomGift.name,
                coupon_gift_id: randomGift.coupon_gift_id,
                coupon_gift_pic_url: randomGift.coupon_gift_pic_url,
                coupon_gift_pic_path: randomGift.coupon_gift_pic_path,
                updated_at: new Date()
            }
        });

        return res.status(200).json({
            status: "success",
            message: "Verfied successfully",
            data: serializeBigInt(updatedReward)
        });

    } catch (error) {
        logger.error(`Verify Redemption OTP Error: ${error.message}, File: generalController-verifyRedemptionOTP`);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.getRewardStatus = async (req, res) => {
    try {
        const { flat_id, customer_id } = req.query;

        if (!flat_id || !customer_id) {
            return res.status(400).json({ status: "error", message: "flat_id and customer_id are required" });
        }

        const reward = await prisma.rewards.findFirst({
            where: {
                flat_id: BigInt(flat_id),
                customer_id: BigInt(customer_id)
            },
            select: {
                id: true,
                rewards_step: true,
                employee_otp_verified: true,
                customer_otp_verified: true,
                coupon_name: true,
                coupon_gift_id: true,
                coupon_gift_pic_url: true
            }
        });

        if (!reward) {
            return res.status(200).json({
                status: "success",
                data: null,
                message: "No existing reward session found"
            });
        }

        return res.status(200).json({
            status: "success",
            data: serializeBigInt(reward)
        });

    } catch (error) {
        logger.error(`Get Reward Status Error: ${error.message}, File: generalController-getRewardStatus`);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.updateRewardStep = async (req, res) => {
    try {
        const { reward_id, step } = req.body;

        if (!reward_id || !step) {
            return res.status(400).json({ status: "error", message: "reward_id and step are required" });
        }

        const updatedReward = await prisma.rewards.update({
            where: { id: BigInt(reward_id) },
            data: {
                rewards_step: step,
                updated_at: new Date()
            }
        });

        return res.status(200).json({
            status: "success",
            message: "Reward step updated",
            data: serializeBigInt(updatedReward)
        });

    } catch (error) {
        logger.error(`Update Reward Step Error: ${error.message}, File: generalController-updateRewardStep`);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.getRewardRecords = async (req, res) => {
    try {
        const { page = 1, limit = 10, searchQuery = "", sortby = "created_at", sortbyType = "desc" } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);
        const projectFilter = allocatedProjectIds ? { project_id: { in: allocatedProjectIds } } : {};

        const where = {
            ...projectFilter,
            rewards_step: 5,
            OR: [
                { coupon_name: { contains: searchQuery } },
                { coupon_gift_id: { contains: searchQuery } },
                { customer: { first_name: { contains: searchQuery } } },
                { customer: { last_name: { contains: searchQuery } } },
                { customer: { phone_number: { contains: searchQuery } } },
                { employee: { name: { contains: searchQuery } } },
                { employee: { phone_number: { contains: searchQuery } } },
            ]
        };

        const [records, totalRecords] = await Promise.all([
            prisma.rewards.findMany({
                where,
                skip,
                take,
                orderBy: { [sortby]: sortbyType },
                include: {
                    employee: true,
                    customer: true,
                    project: true,
                    flat: {
                        include: {
                            block: true
                        }
                    }
                }
            }),
            prisma.rewards.count({ where })
        ]);

        return res.status(200).json({
            status: "success",
            records: serializeBigInt(records),
            totalRecords,
            totalPages: Math.ceil(totalRecords / take),
            currentPage: parseInt(page)
        });

    } catch (error) {
        logger.error(`Get Reward Records Error: ${error.message}, File: generalController-getRewardRecords`);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.updateRewardReceivedStatus = async (req, res) => {
    try {
        const { reward_id, received_reward } = req.body;

        if (reward_id === undefined || received_reward === undefined) {
            return res.status(400).json({ status: "error", message: "reward_id and received_reward are required" });
        }

        const updatedReward = await prisma.rewards.update({
            where: { id: BigInt(reward_id) },
            data: {
                received_reward: Boolean(received_reward),
                received_reward_date: Boolean(received_reward) ? new Date() : null,
                updated_at: new Date()
            }
        });

        return res.status(200).json({
            status: "success",
            message: "Reward received status updated",
            data: serializeBigInt(updatedReward)
        });

    } catch (error) {
        logger.error(`Update Reward Received Status Error: ${error.message}, File: generalController-updateRewardReceivedStatus`);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};
