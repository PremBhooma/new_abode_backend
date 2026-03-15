const prisma = require("../utils/client");
const multiparty = require("multiparty");
const mysql = require("mysql2/promise");
const mysqldump = require("mysqldump");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");
const os = require("os");
const cron = require("node-cron");
const fse = require("fs-extra");
const logger = require("../helper/logger");
const xlsx = require("xlsx");
const dayjs = require("dayjs");
const { v4: uuidv4 } = require('uuid');

let currentTask = null;

function getCronExpression(schedule) {
    switch (schedule) {
        case "twoMinutes":
            return "*/2 * * * *";
        case "fiveMinutes":
            return "*/5 * * * *";
        case "Daily":
            return "0 0 * * *"; // every day at midnight
        case "Weekly":
            return "0 0 * * 0"; // every Sunday midnight
        case "Monthly":
            return "0 0 1 * *"; // first day of month midnight
        default:
            return null;
    }
}

async function startBackupSchedule() {
    const backupSchedule = await prisma.backupschedule.findFirst();

    if (!backupSchedule || !backupSchedule.schedule) {
        console.log("No backup schedule set in DB.");
        return;
    }

    const cronExpression = getCronExpression(backupSchedule?.schedule);

    if (!cronExpression) {
        console.log("Invalid backup schedule:", backupSchedule?.schedule);
        return;
    }

    if (currentTask) {
        currentTask.stop();
    }

    currentTask = cron.schedule(cronExpression, () => {
        console.log(`Running ${backupSchedule?.schedule} backup...`);
        runBackup();
    });

    console.log(`Backup scheduled as ${backupSchedule?.schedule} (${cronExpression})`);
}

startBackupSchedule();

const serializeBigInt = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => (typeof value === "bigint" ? value.toString() : value)));
};

function formatAmount(num) {
    if (num === null || num === undefined) return "";

    const n = Number(num);
    if (isNaN(n)) return num;

    if (n >= 10000000) {
        return (n / 10000000).toFixed(1).replace(/\.0$/, "") + "C"; // Crores
    } else if (n >= 100000) {
        return (n / 100000).toFixed(1).replace(/\.0$/, "") + "L"; // Lakhs
    } else if (n >= 1000) {
        return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K"; // Thousands
    }
    return n.toString();
}

exports.getCompanyInfo = async (req, res) => {
    try {
        const companyData = await prisma.companyinfo.findFirst({
            select: {
                companyname: true,
                address_one: true,
                address_two: true,
                city: true,
                state: true,
                zipcode: true,
                country: true,
                phone_number: true,
                phone_code: true,
                email: true,
            },
        });

        const companyDetails = companyData
            ? {
                name: companyData.companyname,
                address_line1: companyData.address_one,
                address_line2: companyData.address_two,
                city: companyData.city,
                state: companyData.state,
                zip_code: companyData.zipcode,
                country: companyData.country,
                phone_number: companyData.phone_number,
                email: companyData.email,
                phone_code: companyData.phone_code,
            }
            : {};

        return res.status(200).json({
            status: "success",
            message: "Company details retrieved successfully",
            data: companyDetails,
        });
    } catch (error) {
        logger.error(`Get CompanyInfo Error: ${error.message}, File: settingController-getCompanyInfo`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.updateCompanyInfo = async (req, res) => {
    const { company_name, email, phone_number, addressone, addresstwo, city, state, country, pincode } = req.body;

    try {
        const existingCompanyInfo = await prisma.companyinfo.findFirst();

        const dataToUpdate = {
            companyname: company_name,
            email,
            phone_number,
            address_one: addressone,
            address_two: addresstwo,
            city,
            state,
            country,
            zipcode: pincode?.toString() || null,
        };

        if (!existingCompanyInfo) {
            await prisma.companyinfo.create({
                data: dataToUpdate,
            });
        } else {
            await prisma.companyinfo.update({
                where: { id: existingCompanyInfo.id },
                data: dataToUpdate,
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Company details updated successfully",
        });
    } catch (error) {
        logger.error(`Update CompanyInfo Error: ${error.message}, File: settingController-updateCompanyInfo`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getStates = async (req, res) => {
    const { country_id } = req.query;
    // console.log("Country id", country_id)
    try {
        const statesData = await prisma.states.findMany({
            where: {
                country_id: country_id,
            },
            select: {
                id: true,
                name: true,
            },
        });

        const data = statesData.map((ele) => ({
            value: ele?.id,
            label: ele?.name,
        }));

        return res.status(200).json({
            status: "success",
            data,
        });
    } catch (error) {
        logger.error(`Get States Error: ${error.message}, File: settingController-getStates`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getCities = async (req, res) => {
    try {
        const { state_id } = req.query;

        console.log("State_id:", state_id)
        const citiesData = await prisma.cities.findMany({
            where: {
                state_id: state_id,
            },
            select: {
                id: true,
                name: true,
            },
        });

        const data = citiesData.map((ele) => ({
            value: ele?.id,
            label: ele?.name,
        }));

        return res.status(200).json({
            status: "success",
            data,
        });
    } catch (error) {
        logger.error(`Get Cities Error: ${error.message}, File: settingController-getCities`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.columnStore = async (req, res) => {
    const { employee_id, page_name, columns } = req.body;

    try {
        // REMOVED: // REMOVED: // REMOVED: const uuid = "ABODE" + Math.floor(100000000 + Math.random() * 900000000).toString();

        const existingRecord = await prisma.columnstore.findFirst({
            where: {
                employee_id: employee_id,
                page_name: page_name,
            },
        });

        if (existingRecord) {
            await prisma.columnstore.update({
                where: { id: existingRecord?.id },
                data: {
                    columns: columns,
                    updated_at: new Date(),
                },
            });
        } else {
            await prisma.columnstore.create({
                data: {
                    employee_id: employee_id,
                    page_name: page_name,
                    columns: columns,
                    created_at: new Date(),
                },
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Column details saved successfully",
        });
    } catch (error) {
        logger.error(`Column Store Error: ${error.message}, File: settingController-columnStore`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getColumnStore = async (req, res) => {
    const { employee_id, page_name } = req.query;

    try {
        const columnData = await prisma.columnstore.findFirst({
            where: {
                employee_id: employee_id,
                page_name: page_name,
            },
        });

        return res.status(200).json({
            status: "success",
            message: "Column details retrieved successfully",
            data: columnData ? columnData?.columns : [],
        });
    } catch (error) {
        logger.error(`Get Column Store Error: ${error.message}, File: settingController-getColumnStore`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

const runBackup = async () => {
    try {
        // India timezone
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

        const dateString = `${String(now.getDate()).padStart(2, "0")}_${String(now.getMonth() + 1).padStart(2, "0")}_${now.getFullYear()}`;
        const hours = now.getHours() % 12 || 12;
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const ampm = now.getHours() >= 12 ? "PM" : "AM";
        const timeString = `${String(hours).padStart(2, "0")}_${minutes}_${ampm}`;

        // Main backup folder
        const backupDir = path.join(__dirname, "../backup");
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Create subfolder for this backup
        const backupFolderName = `backup_${dateString}_${timeString}`;
        const backupFolderPath = path.join(backupDir, backupFolderName);
        if (!fs.existsSync(backupFolderPath)) {
            fs.mkdirSync(backupFolderPath, { recursive: true });
        }

        // SQL backup path inside subfolder
        const backupFileWithExt = `${backupFolderName}.sql`;
        const backupPath = path.join(backupFolderPath, backupFileWithExt);

        // Run MySQL dump
        await mysqldump({
            connection: {
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
            },
            dumpToFile: backupPath,
        });

        // 🔹 Zip uploads folder into backup folder
        const uploadsDir = path.join(__dirname, "../uploads");
        const uploadsZipPath = path.join(backupFolderPath, "uploads.zip");

        if (fs.existsSync(uploadsDir)) {
            await new Promise((resolve, reject) => {
                const output = fs.createWriteStream(uploadsZipPath);
                const archive = archiver("zip", { zlib: { level: 9 } });

                output.on("close", () => {
                    console.log(`✅ Uploads folder zipped: ${uploadsZipPath} (${archive.pointer()} total bytes)`);
                    resolve();
                });

                archive.on("error", (err) => reject(err));

                archive.pipe(output);
                archive.directory(uploadsDir, false);
                archive.finalize();
            });
        }

        // Save to DB
        // REMOVED: // REMOVED: // REMOVED: const uuid = "ABDDB" + Math.floor(100000000 + Math.random() * 900000000).toString();
        await prisma.backupdata.create({
            data: {
                backup_name: backupFolderName,
                backup_path: backupFolderPath,
                created_at: new Date(),
            },
        });

        // 🔹 Keep only last 5 backups
        const backups = await prisma.backupdata.findMany({
            orderBy: { created_at: "asc" }, // oldest → newest
        });

        while (backups.length > 5) {
            const oldest = backups.shift();
            if (fs.existsSync(oldest.backup_path)) {
                fse.removeSync(oldest.backup_path); // remove full folder (sql + zip)
                console.log(`🗑️ Deleted old backup folder: ${oldest.backup_path}`);
            }
            await prisma.backupdata.delete({ where: { id: oldest.id } });
        }

        console.log(`✅ Backup completed at: ${backupFolderPath}`);
    } catch (error) {
        console.error("❌ Backup failed:", error);
        logger.error(`Run Backup Error: ${error.message}, File: settingController-runBackup`);
    }
};

exports.getDataBackup = async (req, res) => {
    try {
        await runBackup();
        res.status(200).json({
            status: "success",
            message: "Backup completed and cleanup performed",
        });
    } catch (error) {
        logger.error(`Get Data Backup Error: ${error.message}, File: settingController-getDataBackup`);
        res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message,
        });
    }
};

exports.getBackupRecords = async (req, res) => {
    try {
        const records = await prisma.backupdata.findMany({
            orderBy: { created_at: "desc" },
        });

        // Filter only those records where file exists in backup folder
        const existingRecords = records.filter((record) => {
            if (!record.backup_path) return false;
            return fs.existsSync(record.backup_path);
        });

        return res.status(200).json({
            status: "success",
            message: "Backup records retrieved successfully",
            data: existingRecords,
        });
    } catch (error) {
        logger.error(`Get Backup Records Error: ${error.message}, File: settingController-getBackupRecords`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.restoreDataBackup = async (req, res) => {
    try {
        const { backup_path } = req.body;

        // Validate backup path
        if (!backup_path) {
            return res.status(400).json({
                status: "error",
                message: "Backup path is required",
            });
        }

        // Check if backup exists
        if (!fs.existsSync(backup_path)) {
            return res.status(404).json({
                status: "error",
                message: "Backup file not found on server",
            });
        }

        /* ---------------------------------------------
         * 1. Restore SQL backup
         * --------------------------------------------- */
        let sqlFilePath = backup_path;

        // Handle directory case
        if (fs.lstatSync(backup_path).isDirectory()) {
            const files = fs.readdirSync(backup_path);
            const sqlFile = files.find((f) => f.endsWith(".sql"));
            if (!sqlFile) {
                throw new Error("No .sql file found in backup folder");
            }
            sqlFilePath = path.join(backup_path, sqlFile);
        }

        // Read SQL content
        const sqlContent = fs.readFileSync(sqlFilePath, "utf8");

        // Create database connection
        const connection = await mysql.createConnection({
            // host: "localhost",
            // user: "root",
            // password: "",
            // database: "abodedb",
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,

            multipleStatements: true,
        });

        try {
            // Disable foreign key checks
            await connection.query("SET FOREIGN_KEY_CHECKS = 0");

            // Truncate all tables
            const [tables] = await connection.query("SHOW TABLES");
            const tableKey = Object.keys(tables[0])[0];

            for (const row of tables) {
                const tableName = row[tableKey];
                await connection.query(`TRUNCATE TABLE \`${tableName}\``);
            }

            // Enable foreign key checks
            await connection.query("SET FOREIGN_KEY_CHECKS = 1");

            // Execute restore SQL
            await connection.query(sqlContent);
        } finally {
            await connection.end();
        }

        /* ---------------------------------------------
         * 2. Restore uploads from zip
         * --------------------------------------------- */
        const backupFolder = path.dirname(backup_path);
        const uploadsZipPath = path.join(backupFolder, "uploads.zip");
        const uploadsDir = path.join(__dirname, "../Uploads");

        if (fs.existsSync(uploadsZipPath)) {
            // Clear current uploads
            if (fs.existsSync(uploadsDir)) {
                fse.emptyDirSync(uploadsDir);
            }

            // Extract uploads.zip
            await new Promise((resolve, reject) => {
                fs.createReadStream(uploadsZipPath)
                    .pipe(unzipper.Extract({ path: uploadsDir }))
                    .on("close", resolve)
                    .on("error", reject);
            });

            console.log("✅ Uploads restored from zip");
        }

        /* ---------------------------------------------
         * 3. Maintain 5 backups policy
         * --------------------------------------------- */

        const backupRoot = path.join(__dirname, "../backup");

        // 1. Get DB backups
        let dbBackups = await prisma.backupdata.findMany({
            orderBy: { created_at: "desc" },
        });
        dbBackups = dbBackups.filter((b) => fs.existsSync(b.backup_path));

        // 2. Get filesystem backups (scan backup folder)
        let fileBackups = fs
            .readdirSync(backupRoot)
            .filter((f) => f.startsWith("backup_"))
            .map((folder) => {
                return {
                    backup_name: folder,
                    backup_path: path.join(backupRoot, folder),
                    created_at: fs.statSync(path.join(backupRoot, folder)).ctime,
                };
            })
            .sort((a, b) => b.created_at - a.created_at); // newest first

        // 3. Merge DB + filesystem
        let finalBackups = [];

        // Rule: prefer actual folders (filesystem) first
        for (const fb of fileBackups) {
            if (finalBackups.length < 5) {
                // Try to match DB record
                const dbMatch = dbBackups.find((d) => d.backup_name === fb.backup_name);
                if (dbMatch) {
                    finalBackups.push(dbMatch);
                } else {
                    // If not in DB, insert it
                    const newRec = await prisma.backupdata.create({
                        data: {
                            id: uuidv4(), // or your uuid gen
                            backup_name: fb.backup_name,
                            backup_path: fb.backup_path,
                            created_at: fb.created_at,
                        },
                    });
                    finalBackups.push(newRec);
                }
            }
        }

        // 4. Delete backups not in finalBackups (both disk + DB)
        const keepNames = finalBackups.map((b) => b.backup_name);

        for (const db of dbBackups) {
            if (!keepNames.includes(db.backup_name)) {
                await prisma.backupdata.delete({ where: { id: db.id } });
            }
        }

        for (const fb of fileBackups) {
            if (!keepNames.includes(fb.backup_name)) {
                if (fs.existsSync(fb.backup_path)) {
                    fse.removeSync(fb.backup_path);
                    console.log(`🗑️ Deleted old backup folder: ${fb.backup_path}`);
                }
            }
        }

        return res.status(200).json({
            status: "success",
            message: "Database and uploads restored successfully from backup",
        });
    } catch (err) {
        logger.error(`Restore Data Backup Error: ${error.message}, File: settingController-restoreDataBackup`);
        return res.status(500).json({
            status: "error",
            message: "Failed to restore database",
            error: err.message,
        });
    }
};

exports.updateBackupSchedule = async (req, res) => {
    try {
        const { schedule } = req.body;

        if (!schedule) {
            return res.status(200).json({
                status: "error",
                message: "Schedule is required",
            });
        }

        const existingSchedule = await prisma.backupschedule.findFirst();

        if (existingSchedule) {
            await prisma.backupschedule.update({
                where: { id: existingSchedule?.id },
                data: { schedule: schedule },
            });
        } else {
            await prisma.backupschedule.create({
                data: { schedule: schedule },
            });
        }

        await startBackupSchedule();

        return res.status(200).json({
            status: "success",
            message: `Backup schedule ${existingSchedule ? "updated" : "created"} successfully`,
        });
    } catch (error) {
        logger.error(`Update Backup Schedule Error: ${error.message}, File: settingController-updateBackupSchedule`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getBackupSchedule = async (req, res) => {
    try {
        const recordsSchedule = await prisma.backupschedule.findFirst({
            select: {
                schedule: true,
            },
        });

        return res.status(200).json({
            status: "success",
            message: "Backup schedule retrieved successfully",
            data: recordsSchedule,
        });
    } catch (error) {
        logger.error(`Get Backup Schedule Error: ${error.message}, File: settingController-getBackupSchedule`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getAllAmenities = async (req, res) => {
    const { page, limit = 5, searchQuery } = req.query;
    try {

        let offset = 0;
        if (page > 1) {
            offset = limit * (page - 1);
        }

        const searchCondition = {
            ...(searchQuery ? {
                amount: {
                    contains: searchQuery,
                    mode: "insensitive",
                },
            } : {}),
        };

        const amenitiesData = await prisma.amenities.findMany({
            where: searchCondition,
            include: {
                projectdetails: {
                    select: {
                        project_name: true
                    }
                }
            },
            select: {
                id: true,
                flat_type: true,
                amount: true,
                project_id: true,
                projectdetails: {
                    select: {
                        project_name: true
                    }
                }
            },
            skip: offset,
            take: parseInt(limit),
            orderBy: {
                id: "desc",
            },
        });

        const totalAmenities = await prisma.amenities.count({
            where: searchCondition,
        });

        return res.status(200).json({
            status: "success",
            data: amenitiesData,
            totalAmenities,
            totalPages: Math.ceil(totalAmenities / limit),
            currentPage: parseInt(page),
        });
    } catch (error) {
        logger.error(`Get All Amenities Error: ${error.message}, File: settingController-getAllAmenities`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.addAmenities = async (req, res) => {
    const { amount, flat_type, project_id } = req.body;

    try {
        const existingAmenity = await prisma.amenities.findFirst({
            where: {
                flat_type: flat_type,
                project_id: project_id ? project_id : null
            },
        });

        if (existingAmenity) {
            return res.status(200).json({
                status: "error",
                message: "Amenity with this flat type already exists for the selected project",
            });
        }


        await prisma.amenities.create({
            data: {
                flat_type: flat_type,
                amount: parseInt(amount),
                project_id: project_id ? project_id : null,
                created_at: new Date(),
            },
        });

        return res.status(200).json({
            status: "success",
            message: "Amenity created successfully",
        });
    } catch (error) {
        logger.error(`Add Amenities Error: ${error.message}, File: settingController-addAmenities`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.updateAmenities = async (req, res) => {
    const { amenitiesId, amount, flat_type, project_id } = req.body;

    try {
        const existingAmenity = await prisma.amenities.findFirst({
            where: { id: amenitiesId },
        });

        if (!existingAmenity) {
            return res.status(200).json({
                status: "error",
                message: "Amenity not found",
            });
        }

        if (flat_type || project_id) {
            const duplicateAmenity = await prisma.amenities.findFirst({
                where: {
                    flat_type: flat_type || existingAmenity.flat_type,
                    project_id: project_id ? project_id : existingAmenity.project_id,
                    NOT: { id: amenitiesId },
                },
            });

            if (duplicateAmenity) {
                return res.status(200).json({
                    status: "error",
                    message: "Amenity with this flat_type already exists in this project",
                });
            }
        }

        await prisma.amenities.update({
            where: { id: amenitiesId },
            data: {
                amount: amount ? parseInt(amount) : existingAmenity.amount,
                flat_type: flat_type ? flat_type : existingAmenity.flat_type,
                project_id: project_id ? project_id : existingAmenity.project_id,
                updated_at: new Date(),
            },
        });

        return res.status(200).json({
            status: "success",
            message: "Amenity updated successfully",
        });
    } catch (error) {
        logger.error(`Update Amenities Error: ${error.message}, File: settingController-updateAmenities`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};


exports.getAllAmenities = async (req, res) => {
    const { page, limit = 5, searchQuery } = req.query;
    try {
        let offset = 0;
        if (page > 1) {
            offset = limit * (page - 1);
        }

        const searchCondition = {
            ...(searchQuery ? {
                OR: [
                    { flat_type: { contains: searchQuery } },
                ]
            } : {}),
        };

        const amenitiesData = await prisma.amenities.findMany({
            where: searchCondition,
            select: {
                id: true,
                amount: true,
                flat_type: true,
                project_id: true,
                projectdetails: {
                    select: {
                        project_name: true
                    }
                }
            },
            take: parseInt(limit),
            skip: offset,
            orderBy: {
                created_at: "desc",
            }
        });

        const totalAmenities = await prisma.amenities.count({
            where: searchCondition
        });


        const amenitiesDetails = amenitiesData.map((ele) => ({
            id: ele?.id?.toString(),
            amount: ele?.amount,
            formatAmount: formatAmount(ele?.amount),
            flat_type: ele?.flat_type,
            project_id: ele?.project_id?.toString(),
            project_name: ele?.projectdetails?.project_name,
        }));


        return res.status(200).json({
            status: "success",
            message: "Amenities details retrieved successfully",
            data: amenitiesDetails || [],
            totalAmenities: totalAmenities,
            totalPages: Math.ceil(totalAmenities / limit)
        });
    } catch (error) {
        logger.error(`Get All Amenities Error: ${error.message}, File: settingController-getAllAmenities`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};


exports.getListAmenities = async (req, res) => {
    const { flatType, project_id } = req.query

    try {
        let amenities;
        if (flatType) {
            let whereCondition = {
                flat_type: flatType
            };
            if (project_id) {
                whereCondition.project_id = project_id;
            }

            amenities = await prisma.amenities.findFirst({
                where: whereCondition,
                select: {
                    amount: true
                }
            });
        }
        return res.status(200).json({
            status: 'success',
            amenities: amenities?.amount || '',
        });
    } catch (error) {
        logger.error(`Get List Amenities Error: ${error.message}, File: settingController-getListAmenities`);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

exports.deleteAmenities = async (req, res) => {
    const { amenitiesId } = req.body;
    try {
        if (!amenitiesId) {
            return res.status(200).json({
                status: 'error',
                message: 'Amenities ID is required'
            });
        }

        const existingAmenities = await prisma.amenities.findUnique({
            where: {
                id: amenitiesId
            }
        });

        if (!existingAmenities) {
            return res.status(200).json({
                status: 'error',
                message: 'Amenities not found'
            });
        }

        const deletedAmenities = await prisma.amenities.delete({
            where: {
                id: amenitiesId
            }
        });

        return res.status(200).json({
            status: 'success',
            message: 'Amenities deleted successfully',
        });
    } catch (error) {
        logger.error(`Delete Amenities Error: ${error.message}, File: settingController-deleteAmenities`);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}



exports.uploadParsedGlobal = async (req, res) => {
    const form = new multiparty.Form();

    form.parse(req, async (error, fields, files) => {
        if (error) {
            return res.status(500).json({ status: "error", message: error.message });
        }

        const file = files.bulkfile?.[0];
        const employee_id = fields.employee_id?.[0];

        if (!file) {
            return res.status(200).json({ status: "error", message: "No file uploaded." });
        }

        try {
            const allProjects = await prisma.project.findMany();
            const projectMap = {};
            allProjects.forEach(p => {
                if (p.project_name) {
                    projectMap[p.project_name.toLowerCase().trim()] = p.id;
                }
            });

            const workbook = xlsx.readFile(file.path);


            /** -----------------
             * 1. Process Flats Sheet
             ------------------ */
            let flatResult = { inserted: 0, skipped: 0, skippedRows: [] };

            if (workbook.SheetNames.includes("Flat Template")) {
                const flatSheet = workbook.Sheets["Flat Template"];
                const flatData = xlsx.utils.sheet_to_json(flatSheet, { defval: "" });

                // console.log("Flat_data:", flatData)

                const flatTypeMap = {
                    "2 BHK": "2 BHK",
                    "3 BHK": "3 BHK",
                };

                const googleMapRegex =
                    /^https:\/\/(www\.)?google\.[a-z.]+\/maps|^https:\/\/maps\.app\.goo\.gl\//;

                for (const row of flatData) {
                    try {
                        if (!row["Flat No"] || !row["Floor No"] || !row["Block"] || !row["Project"] || !row["Facing"] || !row["Corner"] || !row["Flat Type"] || !row["Area(Sq.ft.)"]) {
                            flatResult.skipped++;
                            flatResult.skippedRows.push({ row, reason: "Missing Project, Flat No, Floor No, Block, Area(Sq.ft.), Facing, Flat Type and Corner" });
                            continue;
                        }

                        const robustTrim = (val) => {
                            if (!val) return "";
                            return String(val).trim().replace(/\u00A0/g, ' ');
                        };

                        const projectName = robustTrim(row["Project"]);
                        const project_id = projectMap[projectName.toLowerCase()];
                        if (!project_id) {
                            flatResult.skipped++;
                            flatResult.skippedRows.push({ row, reason: `Project not found: ${projectName}` });
                            continue;
                        }

                        let blockName = robustTrim(row["Block"]);
                        let blockRecord = await prisma.block.findFirst({
                            where: { block_name: blockName },
                        });

                        if (!blockRecord && blockName) {
                            flatResult.skipped++;
                            flatResult.skippedRows.push({ row, reason: "Block not found" });
                            continue;
                        }

                        let groupOwnerRecord = null;
                        let groupOwnerName = row["Group/Owner"] ? String(row["Group/Owner"]).trim() : null;
                        if (groupOwnerName) {
                            groupOwnerRecord = await prisma.groupowner.findFirst({
                                where: { name: groupOwnerName },
                            });
                            if (!groupOwnerRecord) {
                                groupOwnerRecord = await prisma.groupowner.create({
                                    data: {
                                        id: uuidv4(),
                                        name: groupOwnerName,
                                    },
                                });
                            }
                        }

                        const parseBoolean = (val) => {
                            if (!val) return null;
                            return val.toString().toLowerCase() === "yes";
                        };

                        const existingFlat = await prisma.flat.findFirst({
                            where: {
                                project_id: project_id,
                                flat_no: row["Flat No"].toString(),
                                floor_no: row["Floor No"].toString(),
                                block_id: blockRecord?.id,
                            },
                        });

                        if (existingFlat) {
                            flatResult.skipped++;
                            flatResult.skippedRows.push({
                                row,
                                reason: `Duplicate flat: ${row["Flat No"]} with Floor No: ${row["Floor No"]} in ${row["Block"]}`,
                            });
                            continue;
                        }

                        let googleMapLink = row["Google Map Link"] ? String(row["Google Map Link"]).trim() : null;
                        if (googleMapLink && !googleMapRegex.test(googleMapLink)) {
                            googleMapLink = null;
                        }

                        let floorNoVal = row["Floor No"];
                        if (floorNoVal !== undefined && floorNoVal !== null) {
                            if (typeof floorNoVal === "object" && floorNoVal.result !== undefined) {
                                floorNoVal = floorNoVal.result;
                            }
                            floorNoVal = String(floorNoVal).trim();
                        } else {
                            floorNoVal = null;
                        }

                        // console.log("Floor_No: ", floorNoVal);

                        const newFlat = await prisma.flat.create({
                            data: {
                                id: uuidv4(),
                                flat_no: row["Flat No"].toString(),
                                floor_no: floorNoVal,
                                block_id: blockRecord?.id,
                                square_feet: row["Area(Sq.ft.)"] ? parseFloat(row["Area(Sq.ft.)"]) : null,
                                udl: row["UDL"]?.toString(),
                                deed_number: row["Deed No"]?.toString(),
                                type: flatTypeMap[row["Flat Type"]] || null,
                                bedrooms: row["Bedrooms"] ? parseInt(row["Bedrooms"]) : null,
                                bathrooms: row["Bathrooms"] ? parseInt(row["Bathrooms"]) : null,
                                balconies: row["Balconies"] ? parseInt(row["Balconies"]) : null,
                                parking: row["Parking Area(Sq.ft.)"] ? parseFloat(row["Parking Area(Sq.ft.)"]) : null,
                                facing: row["Facing"],
                                east_face: row["East Facing View"]?.toString(),
                                west_face: row["West Facing View"]?.toString(),
                                north_face: row["North Facing View"]?.toString(),
                                south_face: row["South Facing View"]?.toString(),
                                furnished_status: row["Furnishing Status"],
                                description: row["Description"]?.toString(),
                                google_map_link: googleMapLink,
                                mortgage: parseBoolean(row["Mortgage"]),
                                corner: parseBoolean(row["Corner"]),
                                // floor_rise: parseBoolean(row["Floor Rise"]),
                                group_owner_id: groupOwnerRecord ? groupOwnerRecord.id : null,
                                project_id: project_id,
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

                        flatResult.inserted++;
                    } catch (err) {
                        flatResult.skipped++;
                        flatResult.skippedRows.push({ row, reason: err.message });
                    }
                }
            }

            /** -----------------
            * 2. Process Customers Sheet
            ------------------ */
            let customerResult = { inserted: 0, skipped: 0, skippedRows: [] };

            if (workbook.SheetNames.includes("Customer Template")) {
                const customerSheet = workbook.Sheets["Customer Template"];
                const customerData = xlsx.utils.sheet_to_json(customerSheet);

                const validPrefixes = ["Mr", "Mrs", "Miss", "Mx"];
                const validGender = ["Male", "Female"];
                const validMaritalStatus = ["Single", "Married"];
                const validPOA = ["Resident", "NRI"];
                const validOwnedAbode = ["Yes", "No"];

                const parseDate = (val) => {
                    if (!val) return null;

                    let date = null;
                    if (!isNaN(val)) {
                        // Excel serial number
                        const excelEpoch = new Date(Date.UTC(1900, 0, 1));
                        date = new Date(excelEpoch.getTime() + (val - 2) * 86400000);
                    } else if (typeof val === "string") {
                        // String formats
                        const parsedDate = dayjs(val, ["DD/MM/YYYY", "D/M/YYYY", "DD-MM-YYYY", "D-M-YYYY", "MM/DD/YYYY", "MM-DD-YYYY", "YYYY-MM-DD"], true);
                        if (parsedDate.isValid()) {
                            date = new Date(Date.UTC(parsedDate.year(), parsedDate.month(), parsedDate.date()));
                        }
                    }
                    return date;
                };

                const resolveLocation = async (countryName, stateName, cityName) => {
                    let countryId = null, stateId = null, cityId = null;

                    if (countryName) {
                        const name = String(countryName).trim();
                        const country = await prisma.country.findFirst({ where: { name: name } });
                        if (!country) return { error: `Country '${name}' not found` };
                        countryId = country.id;
                    }

                    if (stateName) {
                        const name = String(stateName).trim();
                        const state = await prisma.states.findFirst({ where: { name: name } });
                        if (!state) return { error: `State '${name}' not found` };
                        stateId = state.id;
                    }

                    if (cityName) {
                        const name = String(cityName).trim();
                        const city = await prisma.cities.findFirst({ where: { name: name } });
                        if (!city) return { error: `City '${name}' not found` };
                        cityId = city.id;
                    }

                    return { countryId, stateId, cityId };
                };

                const resolveCountry = async (countryName) => {
                    if (!countryName) return null;
                    const name = String(countryName).trim();
                    const country = await prisma.country.findFirst({ where: { name: name } });
                    return country ? country.id : null;
                };

                for (const row of customerData) {
                    try {
                        // ✅ Required fields
                        if (!row["First Name"] || !row["Phone Number"] || !row["Project"]) {
                            customerResult.skipped++;
                            customerResult.skippedRows.push({ row, reason: "Missing required fields (Name, Phone, Project)" });
                            continue;
                        }

                        const robustTrim = (val) => {
                            if (!val) return "";
                            return String(val).trim().replace(/\u00A0/g, ' ');
                        };

                        const projectName = robustTrim(row["Project"]);
                        const project_id = projectMap[projectName.toLowerCase()];
                        if (!project_id) {
                            customerResult.skipped++;
                            customerResult.skippedRows.push({ row, reason: `Project not found: ${projectName}` });
                            continue;
                        }

                        // ✅ Email validation
                        const email = row["Email Address"] ? String(row["Email Address"]).trim().toLowerCase() : "";
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(email)) {
                            customerResult.skipped++;
                            customerResult.skippedRows.push({ row, reason: "Invalid email" });
                            continue;
                        }
                        const existingEmail = await prisma.customers.findFirst({
                            where: {
                                email,
                                project_id: project_id,
                            },
                        });
                        if (existingEmail) {
                            customerResult.skipped++;
                            customerResult.skippedRows.push({ row, reason: "Duplicate email within the same project" });
                            continue;
                        }

                        // ✅ Phone validation
                        const phone = row["Phone Number"] ? String(row["Phone Number"]).trim() : "";
                        if (!/^\d{10}$/.test(phone)) {
                            customerResult.skipped++;
                            customerResult.skippedRows.push({ row, reason: "Invalid phone" });
                            continue;
                        }
                        const existingPhone = await prisma.customers.findFirst({ where: { phone_number: phone, project_id: project_id } });
                        if (existingPhone) {
                            customerResult.skipped++;
                            customerResult.skippedRows.push({ row, reason: "Duplicate phone within the same project" });
                            continue;
                        }

                        // ✅ Dropdown validations
                        if (row["Prefixes"] && !validPrefixes.includes(row["Prefixes"])) {
                            row["Prefixes"] = null;
                        }
                        if (row["Marital Status"] && !validMaritalStatus.includes(row["Marital Status"])) {
                            row["Marital Status"] = null;
                        }
                        if (row["Gender"] && !validGender.includes(row["Gender"])) {
                            row["Gender"] = null;
                        }
                        if (row["Spouse Prefixes"] && !validPrefixes.includes(row["Spouse Prefixes"])) {
                            row["Spouse Prefixes"] = null;
                        }
                        if (row["If POA Holder is Indian, specify status"] && !validPOA.includes(row["If POA Holder is Indian, specify status"])) {
                            row["If POA Holder is Indian, specify status"] = null;
                        }
                        if (row["Have you ever owned a Abode home / property?"] && !validOwnedAbode.includes(row["Have you ever owned a Abode home / property?"])) {
                            row["Have you ever owned a Abode home / property?"] = null;
                            continue;
                        }
                        if (row["Have you ever owned a Abode home / property?"] && String(row["Have you ever owned a Abode home / property?"]).toLowerCase() === "yes" && !row["If Yes, Project Name"]) {
                            row["If Yes, Project Name"] = null;
                        }

                        // ✅ Date validations
                        const dobValue = row["Date of Birth"];
                        const anniversaryValue = row["Wedding Anniversary"];
                        const spouseDobValue = row["Spouse DOB"];

                        const dob = parseDate(dobValue);
                        const anniversary = parseDate(anniversaryValue);
                        const spouseDob = parseDate(spouseDobValue);

                        // Validate DOB (only if value exists)
                        if (dobValue && !dob) {
                            customerResult.skipped++;
                            customerResult.skippedRows.push({
                                row,
                                reason: `Invalid Date of Birth format: ${dobValue}. Allowed formats: DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, D-M-YYYY, MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD`
                            });
                            continue;
                        }

                        // Validate Anniversary (only if value exists)
                        if (anniversaryValue && !anniversary) {
                            customerResult.skipped++;
                            customerResult.skippedRows.push({
                                row,
                                reason: `Invalid Wedding Anniversary format: ${anniversaryValue}. Allowed formats: DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, D-M-YYYY, MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD`
                            });
                            continue;
                        }

                        // Validate Spouse DOB (only if value exists)
                        if (spouseDobValue && !spouseDob) {
                            customerResult.skipped++;
                            customerResult.skippedRows.push({
                                row,
                                reason: `Invalid Spouse DOB format: ${spouseDobValue}. Allowed formats: DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, D-M-YYYY, MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD`
                            });
                            continue;
                        }

                        // ✅ Country mapping
                        const citizenshipId = await resolveCountry(row["Country of Citizenship"]);
                        const residenceId = await resolveCountry(row["Country of Residence"]);

                        if (row["Country of Citizenship"] && !citizenshipId) row["Country of Citizenship"] = null;
                        if (row["Country of Residence"] && !residenceId) row["Country of Residence"] = null;

                        // ✅ Address mapping
                        const corrLocation = await resolveLocation(
                            row["Address of Correspondence, Country"],
                            row["Address of Correspondence, State"],
                            row["Address of Correspondence, City"]
                        );
                        if (corrLocation.error) {
                            row["Address of Correspondence, Country"] = null;
                            row["Address of Correspondence, State"] = null;
                            row["Address of Correspondence, City"] = null;
                        }

                        const permLocation = await resolveLocation(
                            row["Permanent Address, Country"],
                            row["Permanent Address, State"],
                            row["Permanent Address, City"]
                        );
                        if (permLocation.error) {
                            row["Permanent Address, Country"] = null;
                            row["Permanent Address, State"] = null;
                            row["Permanent Address, City"] = null;
                        }

                        // ✅ Generate UUID
                        // REMOVED: // REMOVED: // REMOVED: const uuid = "CUST" + Math.floor(100000 + Math.random() * 900000);

                        // ✅ Insert Customer
                        let customer;
                        try {
                            customer = await prisma.customers.create({
                                data: {
                                    prefixes: row["Prefixes"] || null,
                                    first_name: row["First Name"] ? String(row["First Name"]).trim() : "",
                                    last_name: row["Last Name"] ? String(row["Last Name"]).trim() : "",
                                    email,
                                    email_2: row["Alternate Email Address"] || null,
                                    phone_code: "91",
                                    phone_number: phone,
                                    gender: row["Gender"] || null,
                                    date_of_birth: dob || null,
                                    father_name: row["Father Name"] || null,
                                    spouse_prefixes: row["Spouse Prefixes"] || null,
                                    spouse_name: row["Spouse Name"] || null,
                                    marital_status: row["Marital Status"] || null,
                                    number_of_children: row["Number of Children"] ? parseInt(row["Number of Children"]) : null,
                                    wedding_aniversary: anniversary || null,
                                    spouse_dob: spouseDob || null,
                                    pan_card_no: row["Pan Card No"] ? row["Pan Card No"].toString().toUpperCase() : null,
                                    aadhar_card_no: row["Aadhar Card No"] ? String(row["Aadhar Card No"]) : null,
                                    country_of_citizenship: citizenshipId || null,
                                    country_of_residence: residenceId || null,
                                    mother_tongue: row["Mother Tongue"] || null,
                                    name_of_poa: row["Name of Power of Attorney (POA) Holder"] || null,
                                    holder_poa: row["If POA Holder is Indian, specify status"] || null,
                                    no_of_years_correspondence_address: row["Number of years residing at correspondence address"] ? parseInt(row["Number of years residing at correspondence address"]) : null,
                                    no_of_years_city: row["Number of years residing at city"] ? parseInt(row["Number of years residing at city"]) : null,
                                    have_you_owned_abode: row["Have you ever owned a Abode home / property?"] ? String(row["Have you ever owned a Abode home / property?"]).toLowerCase() === "yes" : false,
                                    if_owned_project_name: row["If Yes, Project Name"] || null,
                                    added_by_employee_id: employee_id,
                                    project_id: project_id,
                                },
                            });
                        } catch (createError) {
                            if (createError.code === "P2002" && createError.meta?.target?.includes("email")) {
                                customerResult.skipped++;
                                customerResult.skippedRows.push({
                                    row,
                                    reason: "Email already exists in another project because the database still enforces global email uniqueness. Remove the global unique constraint on Customers.email and add a per-project unique constraint instead.",
                                });
                                continue;
                            }
                            throw createError;
                        }

                        // ✅ Correspondence Address
                        if (row["Address of Correspondence, Address"]) {
                            await prisma.customeraddress.create({
                                data: {
                                    customer_id: customer.id,
                                    address_type: "Correspondence",
                                    address: row["Address of Correspondence, Address"],
                                    city: corrLocation.cityId,
                                    state: corrLocation.stateId,
                                    country: corrLocation.countryId,
                                    pincode: row["Address of Correspondence, Pincode"] ? String(row["Address of Correspondence, Pincode"]) : null,
                                },
                            });
                        }

                        // ✅ Permanent Address
                        if (row["Permanent Address, Address"]) {
                            await prisma.customeraddress.create({
                                data: {
                                    customer_id: customer.id,
                                    address_type: "Permanent",
                                    address: row["Permanent Address, Address"],
                                    city: permLocation.cityId,
                                    state: permLocation.stateId,
                                    country: permLocation.countryId,
                                    pincode: row["Permanent Address, Pincode"] ? String(row["Permanent Address, Pincode"]) : null,
                                },
                            });
                        }

                        // ✅ Profession
                        if (row["Current Designation"]) {
                            await prisma.profession.create({
                                data: {
                                    customer_id: customer.id,
                                    current_designation: row["Current Designation"] || null,
                                    name_of_current_organization: row["Current Organization"] || null,
                                    address_of_current_organization: row["Organization Address"] || null,
                                    no_of_years_work_experience: row["Work Experience"] ? parseFloat(row["Work Experience"]) : null,
                                    current_annual_income: row["Annual Income"] ? parseFloat(row["Annual Income"]) : null,
                                },
                            });
                        }

                        // ✅ Activity log
                        await prisma.customeractivities.create({
                            data: {
                                customer_id: customer.id,
                                ca_message: "Customer created via bulk upload",
                                employee_id: employee_id,
                            },
                        });

                        customerResult.inserted++;
                    } catch (err) {
                        customerResult.skipped++;
                        customerResult.skippedRows.push({ row, reason: err.message });
                    }
                }
            }

            /** -----------------
           * 3. Process Assign Flat To Customer Sheet
           ------------------ */
            let assignFlatToCustomerResult = { inserted: 0, skipped: 0, skippedRows: [] };

            if (workbook.SheetNames.includes("Assign Flat Template")) {
                const assignSheet = workbook.Sheets["Assign Flat Template"];
                let assignData = xlsx.utils.sheet_to_json(assignSheet, { defval: "" });
                // console.log("ASSIGN ENTERED:", assignData)

                assignData = assignData.filter(
                    row => row["Flat No"] || row["Block"] || row["Customer Phone"]
                );

                const isBlankCell = (value) => {
                    if (value === null || value === undefined) return true;
                    if (typeof value === "string") return value.trim() === "";
                    return false;
                };

                const parseDate = (val) => {
                    if (!val) return null;

                    let date = null;
                    if (!isNaN(val)) {
                        // Excel serial number
                        const excelEpoch = new Date(Date.UTC(1900, 0, 1));
                        date = new Date(excelEpoch.getTime() + (val - 2) * 86400000);
                    } else if (typeof val === "string") {
                        // String formats
                        const parsedDate = dayjs(val, ["DD/MM/YYYY", "D/M/YYYY", "DD-MM-YYYY", "D-M-YYYY", "MM/DD/YYYY", "MM-DD-YYYY", "YYYY-MM-DD"], true);
                        if (parsedDate.isValid()) {
                            date = new Date(Date.UTC(parsedDate.year(), parsedDate.month(), parsedDate.date()));
                        }
                    }
                    return date;
                };



                for (const row of assignData) {
                    try {


                        // ✅ Required fields
                        const requiredFieldLabels = [
                            "Project",
                            "Flat No",
                            "Block",
                            "Customer Phone",
                            "Booking Date",
                            "Saleable Area (sq.ft.)",
                            "Rate Per Sq.ft (₹)",
                            "Amenities (₹)",
                        ];
                        const missingFields = requiredFieldLabels.filter((field) => isBlankCell(row[field]));

                        if (missingFields.length > 0) {
                            assignFlatToCustomerResult.skipped++;
                            assignFlatToCustomerResult.skippedRows.push({
                                row,
                                reason: `Missing required fields - ${missingFields.join(", ")}`,
                            });
                            continue;
                        }

                        const parsedBookingDate = parseDate(row["Booking Date"]);
                        if (!parsedBookingDate) {
                            assignFlatToCustomerResult.skipped++;
                            assignFlatToCustomerResult.skippedRows.push({
                                row,
                                reason: "Invalid Booking Date. Use a valid date format.",
                            });
                            continue;
                        }

                        const robustTrim = (val) => {
                            if (!val) return "";
                            return String(val).trim().replace(/\u00A0/g, ' ');
                        };

                        const projectName = robustTrim(row["Project"]);
                        const project_id = projectMap[projectName.toLowerCase()];
                        if (!project_id) {
                            assignFlatToCustomerResult.skipped++;
                            assignFlatToCustomerResult.skippedRows.push({ row, reason: `Project not found: ${projectName}` });
                            continue;
                        }

                        // Find Block
                        let blockName = robustTrim(row["Block"]);
                        const blockRecord = await prisma.block.findFirst({
                            where: { block_name: blockName },
                        });

                        if (!blockRecord) {
                            assignFlatToCustomerResult.skipped++;
                            assignFlatToCustomerResult.skippedRows.push({ row, reason: "Block not found" });
                            continue;
                        }

                        // Find Flat under this Block
                        const existingFlat = await prisma.flat.findFirst({
                            where: {
                                flat_no: row["Flat No"].toString(),
                                block_id: blockRecord.id,
                            },
                        });

                        if (!existingFlat) {
                            assignFlatToCustomerResult.skipped++;
                            assignFlatToCustomerResult.skippedRows.push({ row, reason: "Flat not found" });
                            continue;
                        }


                        let existingCustomer = await prisma.customers.findFirst({
                            where: {
                                phone_number: row["Customer Phone"] ? String(row["Customer Phone"]).trim() : "",
                                project_id: project_id
                            },
                        });
                        // console.log("Customer:", existingCustomer)

                        if (!existingCustomer) {
                            assignFlatToCustomerResult.skipped++;
                            assignFlatToCustomerResult.skippedRows.push({ row, reason: "Customer not found" });
                            continue;
                        }

                        if (parseFloat(existingFlat?.square_feet) !== row["Saleable Area (sq.ft.)"]) {
                            assignFlatToCustomerResult.skipped++;
                            assignFlatToCustomerResult.skippedRows.push({ row, reason: "Saleable Area (sq.ft.) has not matched with flat Area" });
                            continue;
                        }

                        if (existingFlat?.customer_id) {
                            assignFlatToCustomerResult.skipped++;
                            assignFlatToCustomerResult.skippedRows.push({ row, reason: "Already Assigned Customer to Flat" });
                            continue;
                        }

                        let floorRisePerSqFt = null;
                        let totalFloorRise = null;

                        if (row["Floor Rise Charge Per Sq.ft (₹)"]) {
                            if (Number(existingFlat?.floor_no) >= 6) {
                                floorRisePerSqFt = parseFloat(row["Floor Rise Charge Per Sq.ft (₹)"]) || null;
                                totalFloorRise = parseFloat(row["Total Charge of Floor Rise (₹)"]) || null;
                            } else {
                                assignFlatToCustomerResult.skipped++;
                                assignFlatToCustomerResult.skippedRows.push({ row, reason: "This flat's floor number is less than 6" });
                                continue;
                            }
                        }

                        let eastFacing = null;
                        let totalEastFacing = null;

                        if (row["East Facing Charge Per Sq.ft (₹)"]) {
                            if (existingFlat?.facing === "East") {
                                eastFacing = parseFloat(row["East Facing Charge Per Sq.ft (₹)"]) || null;
                                totalEastFacing = parseFloat(row["Total Charge of East Facing (₹)"]) || null;
                            } else {
                                assignFlatToCustomerResult.skipped++;
                                assignFlatToCustomerResult.skippedRows.push({ row, reason: "Facing is not east in the flat" });
                                continue;
                            }
                        }

                        let corner = null;
                        let totalCorner = null;

                        if (row["Corner Charge Per Sq.ft (₹)"]) {
                            if (existingFlat?.corner === true) {
                                corner = parseFloat(row["Corner Charge Per Sq.ft (₹)"]) || null;
                                totalCorner = parseFloat(row["Total Charge of Corner (₹)"]) || null;
                            } else {
                                assignFlatToCustomerResult.skipped++;
                                assignFlatToCustomerResult.skippedRows.push({ row, reason: "The flat corner - No" });
                                continue;
                            }
                        }

                        // Fetch Amenities configuration for this project and flat type
                        const amenitiesConfig = await prisma.amenities.findFirst({
                            where: {
                                project_id: project_id,
                                flat_type: existingFlat?.type
                            }
                        });


                        let amenitiesAmount = null;

                        const amenitiesValue = row["Amenities (₹)"];

                        if (amenitiesValue !== undefined && amenitiesValue !== null && amenitiesValue !== "") {

                            const enteredAmenities = parseFloat(amenitiesValue);

                            if (enteredAmenities === 0) {
                                assignFlatToCustomerResult.skipped++;
                                assignFlatToCustomerResult.skippedRows.push({
                                    row,
                                    reason: "Amenities amount cannot be 0.",
                                });
                                continue;
                            }

                            if (!amenitiesConfig) {
                                assignFlatToCustomerResult.skipped++;
                                assignFlatToCustomerResult.skippedRows.push({
                                    row,
                                    reason: `Amenities amount for Flat Type '${existingFlat?.type}' in Project '${row["Project"]}' does not exist.`,
                                });
                                continue;
                            }

                            if (enteredAmenities !== amenitiesConfig.amount) {
                                assignFlatToCustomerResult.skipped++;
                                assignFlatToCustomerResult.skippedRows.push({
                                    row,
                                    reason: `Amenities amount must be exactly ${amenitiesConfig.amount}.`,
                                });
                                continue;
                            }

                            amenitiesAmount = enteredAmenities;
                        }



                        // ✅ Date validations
                        const parsedApplicationDate = parsedBookingDate;





                        // ✅ Insert Assign Flat to Customer
                        const customerFlat = await prisma.customerflat.create({
                            data: {
                                flat_id: existingFlat?.id,
                                customer_id: existingCustomer?.id,
                                application_date: parsedApplicationDate,
                                saleable_area_sq_ft: parseInt(row["Saleable Area (sq.ft.)"]),
                                rate_per_sq_ft: parseInt(row["Rate Per Sq.ft (₹)"]),
                                discount: parseFloat(row["Discount Rate Per Sq.ft (₹)"]) || null,
                                base_cost_unit: parseInt(row["Base Cost of the Unit (₹)"]),
                                floor_rise_per_sq_ft: floorRisePerSqFt,
                                total_floor_rise: totalFloorRise,
                                east_facing_per_sq_ft: eastFacing,
                                total_east_facing: totalEastFacing,
                                corner_per_sq_ft: corner,
                                total_corner: totalCorner,
                                amenities: amenitiesAmount,
                                toatlcostofuint: parseFloat(row["Total Cost of Unit (₹)"]) || null,
                                gst: parseFloat(row["GST (₹)"]) || null,
                                costofunitwithtax: parseFloat(row["Cost of Unit with Tax (₹)"]) || null,
                                registrationcharge: parseFloat(row["Registration (₹)"]) || null,
                                maintenancecharge: parseFloat(row["Maintenance (₹)"]) || null,
                                documentaionfee: parseFloat(row["Documentation Fee (₹)"]) || null,
                                corpusfund: parseFloat(row["Corpus Fund (₹)"]) || null,
                                grand_total: parseFloat(row["Grand Total (₹)"]) || null,
                            },
                        });

                        await prisma.ageingrecord.create({
                            data: {
                                project_id: project_id,
                                customer_id: existingCustomer?.id,
                                customer_flat: customerFlat?.id,
                                flat_id: existingFlat?.id,
                                booking_date: parsedApplicationDate,
                                total_amount: 0,
                                ageing_days: parsedApplicationDate
                                    ? Math.floor((new Date() - new Date(parsedApplicationDate)) / (1000 * 60 * 60 * 24))
                                    : 0,
                                loan_Status: "NotApplied",
                                registration_status: "NotRegistered",
                                created_at: new Date(),
                            },
                        });

                        await prisma.flat.update({
                            where: {
                                id: existingFlat?.id,
                            },
                            data: {
                                status: "Sold",
                                customer_id: existingCustomer?.id,
                                totalAmount: parseFloat(row["Total Cost of Unit (₹)"]),
                                updated_at: new Date(),
                            },
                        });

                        // ✅ Activity log
                        await prisma.taskactivities.create({
                            data: {
                                flat_id: existingFlat?.id,
                                ta_message: "Flat assiged to customer created via bulk upload",
                                employee_id: employee_id,
                            },
                        });

                        assignFlatToCustomerResult.inserted++;
                    } catch (err) {
                        assignFlatToCustomerResult.skipped++;
                        assignFlatToCustomerResult.skippedRows.push({ row, reason: err.message });
                    }
                }
            }

            /** -----------------
           * 4. Process Payments Sheet
           ------------------ */
            let paymentResult = { inserted: 0, skipped: 0, skippedRows: [] };

            if (workbook.SheetNames.includes("Payment Template")) {
                const paymentSheet = workbook.Sheets["Payment Template"];
                const paymentData = xlsx.utils.sheet_to_json(paymentSheet);

                const parseDate = (val) => {
                    if (!val) return null;

                    let date = null;
                    if (!isNaN(val)) {
                        // Excel serial number
                        const excelEpoch = new Date(Date.UTC(1900, 0, 1));
                        date = new Date(excelEpoch.getTime() + (val - 2) * 86400000);
                    } else if (typeof val === "string") {
                        // String formats
                        const parsedDate = dayjs(
                            val.trim(),
                            ["DD/MM/YYYY", "D/M/YYYY", "DD-MM-YYYY", "D-M-YYYY", "MM/DD/YYYY", "MM-DD-YYYY", "YYYY-MM-DD"],
                            true
                        );
                        if (parsedDate.isValid()) {
                            date = new Date(Date.UTC(parsedDate.year(), parsedDate.month(), parsedDate.date()));
                        }
                    }
                    return date;
                };





                for (const row of paymentData) {
                    try {
                        // ✅ Required fields
                        if (!row["Amount"] || !row["Payment Type"] || !row["Payment Towards"] || !row["Payment Method"] || !row["Date of Payment"] || !row["Transaction Id"] || !row["Flat"] || !row["Block"] || !row["Project"]) {
                            paymentResult.skipped++;
                            paymentResult.skippedRows.push({ row, reason: "Missing required fields - Project, Flat, Block, Amount, Payment Type, Payment Towards, Payment Method, Date of Payment, Transaction Id" });
                            continue;
                        }

                        const robustTrim = (val) => {
                            if (!val) return "";
                            return String(val).trim().replace(/\u00A0/g, ' ');
                        };

                        const projectName = robustTrim(row["Project"]);
                        const project_id = projectMap[projectName.toLowerCase()];
                        if (!project_id) {
                            paymentResult.skipped++;
                            paymentResult.skippedRows.push({ row, reason: `Project not found: ${projectName}` });
                            continue;
                        }

                        // Find Block
                        let blockName = robustTrim(row["Block"]);
                        const blockRecord = await prisma.block.findFirst({
                            where: { block_name: blockName },
                        });

                        if (!blockRecord) {
                            paymentResult.skipped++;
                            paymentResult.skippedRows.push({ row, reason: `Block not found: ${blockName}` });
                            continue;
                        }

                        // Find Flat under this Block
                        const existingFlat = await prisma.flat.findFirst({
                            where: {
                                flat_no: row["Flat"].toString(),
                                block_id: blockRecord.id,
                            },
                            select: {
                                id: true,
                                customer_id: true,
                                flat_no: true,
                            }
                        });

                        if (!existingFlat) {
                            paymentResult.skipped++;
                            paymentResult.skippedRows.push({ row, reason: "Flat not found" });
                            continue;
                        }

                        const flatCost = await prisma.customerflat.findFirst({
                            where: { flat_id: existingFlat?.id },
                            select: {
                                toatlcostofuint: true,
                                gst: true,
                                registrationcharge: true,
                                maintenancecharge: true,
                                documentaionfee: true,
                                corpusfund: true,
                                manjeera_connection_charge: true,
                                manjeera_meter_charge: true,
                                application_date: true,
                                grand_total: true,
                                flat: { select: { flat_no: true, block: { select: { block_name: true } } } },
                            },
                        });

                        if (!flatCost) {
                            paymentResult.skipped++;
                            paymentResult.skippedRows.push({ row, reason: `Flat ${existingFlat?.flat_no} → Cost not found` });
                            continue;
                        }

                        const totalPayments = await prisma.payments.aggregate({
                            _sum: { amount: true },
                            where: { flat_id: existingFlat?.id },
                        });

                        const existingPayments = totalPayments._sum.amount || 0;

                        const rowAmount = Number(row["Amount"]);

                        const newTotal = existingPayments + rowAmount;


                        if (newTotal > flatCost?.grand_total) {
                            paymentResult.skipped++;
                            paymentResult.skippedRows.push({ row, reason: `Flat: ${flatCost?.flat?.flat_no} (Block: ${flatCost?.flat?.block.block_name}) → Total payments cannot exceed flat cost` });
                            continue;
                        }

                        // ✅ Category-wise validation
                        const paymentTowards = robustTrim(row["Payment Towards"]);
                        const categoryMapping = {
                            "Flat": "toatlcostofuint",
                            "GST": "gst",
                            "Registration": "registrationcharge",
                            "Maintenance": "maintenancecharge",
                            "Documentation Fee": "documentaionfee",
                            "Corpus Fund": "corpusfund",
                            "Manjeera Connection Charge": "manjeera_connection_charge",
                            "Manjeera Meter Connection": "manjeera_meter_charge"
                        };

                        const targetField = categoryMapping[paymentTowards];
                        if (targetField) {
                            const categoryTotal = await prisma.payments.aggregate({
                                _sum: { amount: true },
                                where: {
                                    flat_id: existingFlat?.id,
                                    payment_towards: paymentTowards
                                },
                            });

                            const existingCategoryPayments = categoryTotal._sum.amount || 0;
                            const newCategoryTotal = existingCategoryPayments + rowAmount;
                            const allowedAmount = flatCost[targetField] || 0;

                            if (newCategoryTotal > allowedAmount) {
                                paymentResult.skipped++;
                                paymentResult.skippedRows.push({
                                    row,
                                    reason: `Flat: ${flatCost?.flat?.flat_no} (Block: ${flatCost?.flat?.block.block_name}) → Total payments for '${paymentTowards}' (${newCategoryTotal}) cannot exceed allowed amount (${allowedAmount})`
                                });
                                continue;
                            }
                        }



                        // ✅ Date validations
                        const parsedDateOfPayment = parseDate(row["Date of Payment"]);

                        if (!parsedDateOfPayment) {
                            paymentResult.skipped++;
                            paymentResult.skippedRows.push({
                                row,
                                reason: "Invalid Date of Payment. Supported formats: DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, or Excel date cells.",
                            });
                            continue;
                        }

                        const bookingDate = new Date(flatCost?.application_date);
                        const paymentDate = new Date(parsedDateOfPayment);
                        const presentDate = new Date();

                        // normalize to YYYY-MM-DD
                        const bookingValue = bookingDate.toISOString().slice(0, 10);
                        const paymentValue = paymentDate.toISOString().slice(0, 10);
                        const presentValue = presentDate.toISOString().slice(0, 10);

                        // ❌ error only if outside range
                        if (paymentValue < bookingValue || paymentValue > presentValue) {
                            paymentResult.skipped++;
                            paymentResult.skippedRows.push({
                                row,
                                reason: `Payment date must be between Booking Date (${bookingValue}) and today.`,
                            });
                            continue;
                        }

                        // ✅ Insert payments
                        const customer = await prisma.payments.create({
                            data: {
                                id: uuidv4(),
                                flat_id: existingFlat?.id,
                                customer_id: existingFlat?.customer_id,
                                amount: parseFloat(row["Amount"]) || null,
                                payment_type: row["Payment Type"],
                                payment_towards: row["Payment Towards"],
                                payment_method: row["Payment Method"],
                                bank: row["Bank"],
                                payment_date: parsedDateOfPayment,
                                trasnaction_id: row["Transaction Id"],
                                comment: row["Comment"],
                                added_by_employee_id: employee_id,
                            },
                        });

                        // ✅ Activity log
                        await prisma.taskactivities.create({
                            data: {
                                flat_id: existingFlat?.id,
                                ta_message: "Payment created via bulk upload",
                                employee_id: employee_id,
                            },
                        });


                        paymentResult.inserted++;
                    } catch (err) {
                        paymentResult.skipped++;
                        paymentResult.skippedRows.push({ row, reason: err.message });
                    }
                }
            }

            return res.status(200).json({
                status: "success",
                flats: flatResult,
                customers: customerResult,
                assignFlatToCustomer: assignFlatToCustomerResult,
                payments: paymentResult,
            });

        } catch (error) {
            console.error("Upload Global error:", error);
            return res.status(500).json({
                status: "error",
                message: error.message
            });
        }
    });
};

exports.AddLeadStage = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(200).json({
                status: 'error',
                message: 'Lead stage name is required',
            })
        }

        const maxStage = await prisma.leadstages.findFirst({
            orderBy: { order: "desc" },
        });

        const newOrder = maxStage ? maxStage.order + 1 : 1;

        const newStage = await prisma.leadstages.create({
            data: {
                name,
                order: newOrder,
            }
        });

        return res.status(200).json({
            status: 'success',
            message: "Lead stage added successfully",
            data: {
                id: newStage.id,
                lead_id: newStage.lead_id ? newStage.lead_id.toString() : null,
                name: newStage.name,
                order: newStage.order,
                created_at: newStage.created_at,
                updated_at: newStage.updated_at,
            },
        })
    } catch (error) {
        logger.error(`Add Lead Stage Error: ${error.message}, File: settingController-AddLeadStage`);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

// exports.GetLeadStages = async (req, res) => {
//     try {
//         const stages = await prisma.leadstages.findMany({
//             orderBy: { order: "asc" },
//         });

//         return res.status(200).json({
//             status: "success",
//             message: "Lead stages fetched successfully",
//             data: stages,
//         });
//     } catch (error) {
//         logger.error(`Get Lead Stage Error: ${error.message}, File: settingController-GetLeadStage`);
//         return res.status(500).json({
//             status: 'error',
//             message: 'Internal server error'
//         });
//     }
// }

exports.GetLeadStages = async (req, res) => {
    const { page = 1, limit = 5, searchQuery } = req.query;

    try {
        let offset = 0;
        if (page > 1) {
            offset = limit * (page - 1);
        }

        const searchCondition = {
            ...(searchQuery
                ? {
                    name: {
                        contains: searchQuery,
                        mode: "insensitive",
                    },
                }
                : {}),
        };

        const leadStageData = await prisma.leadstages.findMany({
            where: searchCondition,
            select: {
                id: true,
                name: true,
                order: true,
                created_at: true,
                updated_at: true,
            },
            take: parseInt(limit),
            skip: offset,
            orderBy: {
                order: "asc",
            },
        });

        const totalStages = await prisma.leadstages.count({
            where: searchCondition,
        });

        const stageDetails = leadStageData.map((ele) => ({
            id: ele?.id?.toString(),
            lead_id: ele?.lead_id ? ele.lead_id.toString() : null,
            name: ele?.name,
            order: ele?.order,
            created_at: ele?.created_at,
            updated_at: ele?.updated_at,
        }));

        return res.status(200).json({
            status: "success",
            message: "Lead stages retrieved successfully",
            data: stageDetails,
            totalStages,
            totalPages: Math.ceil(totalStages / limit),
        });
    } catch (error) {
        console.error(`Get Lead Stages Error: ${error.message}, File: LeadStageController-GetLeadStages`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

// exports.UpdateLeadStage = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { name, newOrder } = req.body;

//         console.log("id", id, "name", name, "newOrder", newOrder)

//         const stage = await prisma.leadstages.findUnique({
//             where: { id: id },
//         });

//         if (!stage) {
//             return res.status(200).json({
//                 status: "error",
//                 message: "Lead stage not found"
//             });
//         }

//         // If order is updated, shift other stages
//         if (newOrder && newOrder !== stage.order) {
//             const totalStages = await prisma.leadstages.count();

//             if (newOrder < 1 || newOrder > totalStages) {
//                 return res.status(400).json({
//                     status: "error",
//                     message: `newOrder must be between 1 and ${totalStages}`
//                 });
//             }

//             if (newOrder < stage.order) {
//                 // Moving up → shift down others
//                 await prisma.leadstages.updateMany({
//                     where: {
//                         order: {
//                             gte: newOrder,
//                             lt: stage.order,
//                         },
//                     },
//                     data: {
//                         order: {
//                             increment: 1,
//                         },
//                     },
//                 });
//             } else {
//                 // Moving down → shift up others
//                 await prisma.leadstages.updateMany({
//                     where: {
//                         order: {
//                             lte: newOrder,
//                             gt: stage.order,
//                         },
//                     },
//                     data: {
//                         order: {
//                             decrement: 1,
//                         },
//                     },
//                 });
//             }
//         }

//         // Update the stage
//         const updatedStage = await prisma.leadstages.update({
//             where: { id: id },
//             data: {
//                 name: name || stage.name,
//                 order: newOrder || stage.order,
//                 updated_at: new Date(),
//             },
//         });

//         return res.status(200).json({
//             status: "success",
//             message: "Lead stage updated successfully",
//             data: {
//                 id: updatedStage.id,
//                 lead_id: updatedStage.lead_id ? updatedStage.lead_id.toString() : null,
//                 name: updatedStage.name,
//                 order: updatedStage.order,
//                 created_at: updatedStage.created_at,
//                 updated_at: updatedStage.updated_at,
//             },
//         });
//     } catch (error) {
//         console.error("Error in UpdateLeadStage:", error);
//         return res.status(500).json({
//             status: "error",
//             message: "Internal server error",
//         });
//     }
// }

exports.UpdateLeadStage = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, newOrder } = req.body;

        const stage = await prisma.leadstages.findUnique({
            where: { id: id },
        });

        if (!stage) {
            return res.status(200).json({
                status: "error",
                message: "Lead stage not found"
            });
        }

        if (newOrder && newOrder !== stage.order) {
            const totalStages = await prisma.leadstages.count();

            if (newOrder < 1 || newOrder > totalStages) {
                return res.status(400).json({
                    status: "error",
                    message: `newOrder must be between 1 and ${totalStages}`
                });
            }

            await prisma.$transaction(async (tx) => {
                // Step 1: free the current order
                await tx.leadstages.update({
                    where: { id: id },
                    data: { order: -1 },
                });

                // Step 2: shift others
                if (newOrder < stage.order) {
                    // Moving up → shift down others
                    await tx.leadstages.updateMany({
                        where: {
                            order: {
                                gte: newOrder,
                                lt: stage.order,
                            },
                        },
                        data: {
                            order: { increment: 1 },
                        },
                    });
                } else {
                    // Moving down → shift up others
                    await tx.leadstages.updateMany({
                        where: {
                            order: {
                                lte: newOrder,
                                gt: stage.order,
                            },
                        },
                        data: {
                            order: { decrement: 1 },
                        },
                    });
                }

                // Step 3: put the stage into its new order + update name
                await tx.leadstages.update({
                    where: { id: id },
                    data: {
                        name: name || stage.name,
                        order: newOrder,
                        updated_at: new Date(),
                    },
                });
            });
        } else {
            // just name update
            await prisma.leadstages.update({
                where: { id: id },
                data: {
                    name: name || stage.name,
                    updated_at: new Date(),
                },
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Lead stage updated successfully"
        });
    } catch (error) {
        console.error("Error in UpdateLeadStage:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};


// exports.DeleteLeadStage = async (req, res) => {


//     try {
//         const { id  } = req.params;

//         const stage = await prisma.leadstages.findUnique({
//             where: {
//                 id: id 
//             }
//         });
//         if (!stage) {
//             return res.status(404).json({
//                 status: "error",
//                 message: "Stage not found"
//             });
//         }

//         await prisma.leadstages.delete({ where: { id: id  } });

//         // Reorder remaining
//         await prisma.$executeRawUnsafe(`
//       WITH reordered AS (
//         SELECT id, ROW_NUMBER() OVER (ORDER BY "order") as new_order
//         FROM lead_stages
//       )
//       UPDATE lead_stages
//       SET "order" = reordered.new_order
//       FROM reordered
//       WHERE lead_stages.id = reordered.id;
//     `);

//         return res.status(200).json({
//             status: "success",
//             message: "Lead stage deleted and reordered successfully",
//         });
//     } catch (error) {
//         console.error("Delete Lead Stage Error:", error.message);
//         return res.status(500).json({
//             status: "error",
//             message: "Internal server error"
//         });
//     }
// };

exports.DeleteLeadStage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ status: "error", message: "Lead stage ID is required" });
        }

        const stage = await prisma.leadstages.findUnique({
            where: { id: id },
        });

        if (!stage) {
            return res.status(404).json({ status: "error", message: "Stage not found" });
        }

        await prisma.leadstages.delete({ where: { id: id } });

        // Reorder remaining stages
        const stages = await prisma.leadstages.findMany({
            orderBy: { order: "asc" },
        });

        for (let i = 0; i < stages.length; i++) {
            await prisma.leadstages.update({
                where: { id: stages[i].id },
                data: { order: i + 1 },
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Lead stage deleted and reordered successfully",
        });
    } catch (error) {
        console.error("Delete Lead Stage Error:", error.message);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};
