const prisma = require("../utils/client");
const multiparty = require("multiparty");
const fs = require("fs");
const path = require("path");
const logger = require("../helper/logger");

function getFileIconType(fileType) {
  switch (fileType) {
    case "folder":
      return "folder_icon";
    case "image/png":
      return "image_icon";
    case "image/jpeg":
      return "image_icon";
    case "application/pdf":
      return "pdf_icon";
    case "application/msword":
      return "word_icon";
    default:
      return "default_icon";
  }
}

const deleteFolderRecursively = async (prismaInstance, folderId) => {
  // Find all direct children of the folder
  const childFolders = await prismaInstance.customerfilemanager.findMany({
    where: { parent_id: parseInt(folderId) },
  });

  // Recursively delete child folders/files
  for (const child of childFolders) {
    // Recursively delete all child folders and their contents
    await deleteFolderRecursively(prismaInstance, child.id);
  }

  // After all child folders/files are deleted, delete the current folder
  await prismaInstance.customerfilemanager.delete({
    where: { id: parseInt(folderId) },
  });
};

exports.createFolder = async (req, res) => {
  const { folderName, customer_uid, user_id, file_type, currentFolderUuid, currentFolderId, employee_id } = req.body;

  // Validate required fields
  if (!folderName || !customer_uid || !employee_id) {
    return res.status(200).json({
      status: "error",
      message: "folderName, customer_uid, and employee_id are required",
    });
  }

  try {
    const customerdetails = await prisma.customers.findFirst({
      where: {
        uuid: customer_uid,
      },
    });

    if (!customerdetails) {
      return res.status(200).json({
        status: "error",
        message: "Customer is not found",
      });
    }

    const uploadsDir = path.join(__dirname, "..", "uploads", `/customers/${customer_uid}`);
    const filemanagerDir = path.join(uploadsDir, "filemanager");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(filemanagerDir)) {
      fs.mkdirSync(filemanagerDir, { recursive: true });
    }

    let parentFolderPath = filemanagerDir;
    let filePath = path.join("filemanager", folderName);

    // Check if either currentFolderUuid or currentFolderId is provided
    let parentFolder = null;

    if (currentFolderUuid) {
      parentFolder = await prisma.customerfilemanager.findUnique({
        where: { uuid: currentFolderUuid }, // Check by UUID first
      });

      if (!parentFolder) {
        return res.status(400).json({
          status: "error",
          message: `Parent folder with UUID "${currentFolderUuid}" not found`,
        });
      }
    } else if (currentFolderId) {
      parentFolder = await prisma.customerfilemanager.findUnique({
        where: { id: currentFolderId }, // Fallback to ID if UUID is not present
      });

      if (!parentFolder) {
        return res.status(400).json({
          status: "error",
          message: `Parent folder with ID "${currentFolderId}" not found`,
        });
      }
    }

    if (parentFolder) {
      parentFolderPath = path.join(uploadsDir, parentFolder.file_path);
      filePath = path.join(parentFolder.file_path, folderName);
    }

    const newFolderPath = path.join(parentFolderPath, folderName);

    if (fs.existsSync(newFolderPath)) {
      return res.status(200).json({
        status: "error",
        message: `Folder with name "${folderName}" already exists`,
      });
    }

    // Create the new folder in the filesystem
    fs.mkdirSync(newFolderPath);

    // Generate a unique ID for the new folder
    const folderUid = "ABDFM" + Math.floor(100000 + Math.random() * 900000);
    const fileIconType = getFileIconType(file_type);

    // Insert the folder into the database
    await prisma.customerfilemanager.create({
      data: {
        uuid: folderUid,
        name: folderName,
        file_icon_type: fileIconType,
        file_type: "folder",
        file_path: filePath,
        file_url: `${process.env.API_URL}/uploads/customers/${customer_uid}/${filePath}`,
        parent_id: currentFolderId || null,
        customer_id: customerdetails?.id,
        added_by: user_id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Track folder creation activity
    await prisma.customeractivities.create({
      data: {
        customer_id: customerdetails.id,
        employee_id: parseInt(employee_id),
        ca_message: `Folder "${folderName}" was created in file manager`,
        employee_short_name: "C", // Consider fetching from employee data
        color_code: "green", // Using green for creation
      },
    });

    return res.status(200).json({
      status: "success",
      message: `Folder "${folderName}" created successfully`,
    });
  } catch (error) {
    logger.error(`Create Folder Error: ${error.message}, File: customerDocumentController-createFolder `);
    return res.status(500).json({
      status: "error",
      message: `Internal server error`,
    });
  }
};

exports.getDocuments = async (req, res) => {
  const { currentFolderId, customer_uid } = req.query;
  try {
    const customerdetails = await prisma.customers.findFirst({
      where: {
        uuid: customer_uid,
      },
    });

    if (!customerdetails) {
      return res.status(200).json({
        status: "error",
        message: "Flat not found",
      });
    }

    const documents = await prisma.customerfilemanager.findMany({
      where: {
        parent_id: currentFolderId ? currentFolderId : null,
        customer_id: customerdetails.id,
      },
      include: {
        customerdetails: true,
        employeedetails: true,
      },
    });

    const documentsdata = documents.map((doc) => ({
      id: doc.id.toString(),
      uuid: doc.uuid,
      name: doc.name,
      file_type: doc.file_type,
      file_icon_type: doc.file_icon_type,
      file_path: doc.file_path,
      file_url: doc.file_url,
      uploadedBy: doc.employeedetails.name,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    }));

    let superparent = null;
    let current_file_path = null;
    if (currentFolderId !== null && currentFolderId !== undefined) {
      // Fetch the current folder's parent ID only if currentFolderId is defined and valid
      const currentFolderdocuments = await prisma.customerfilemanager.findFirst({
        where: {
          id: BigInt(currentFolderId), // Convert to BigInt safely
        },
      });
      superparent = currentFolderdocuments?.parent_id || null;
      current_file_path = currentFolderdocuments?.file_path || "filemanager";
    }

    return res.status(200).json({
      status: "success",
      documentsdata: documentsdata || [],
      parentfolder_id: superparent?.toString(),
      file_path: current_file_path,
    });
  } catch (error) {
    logger.error(`Get Documents Error: ${error.message}, File: customerDocumentController-getDocuments `);
    return res.status(500).json({
      status: "error",
      message: `Internal server error`,
    });
  }
};

exports.deleteFolder = async (req, res) => {
  const { folder_id, customeruid } = req.body;

  try {
    // Find the folder in the database
    const folder = await prisma.customerfilemanager.findUnique({
      where: { id: parseInt(folder_id) },
    });

    if (!folder) {
      return res.status(200).json({
        status: "error",
        message: "Folder not found in the database",
      });
    }

    // Construct the full path of the folder
    const maindir = path.join(__dirname, "..", "uploads", `/customers/${customeruid}`);
    const folderPath = path.join(maindir, folder.file_path);

    // Check if the folder exists and delete it from the filesystem
    fs.access(folderPath, fs.constants.F_OK, async (err) => {
      if (err) {
        console.error(`Folder not found: ${folderPath}`);
        return res.status(404).json({
          status: "error",
          message: "Folder not found on the filesystem",
        });
      }

      // Delete the folder and its contents
      fs.rm(folderPath, { recursive: true, force: true }, async (err) => {
        if (err) {
          logger.error(`Delete Folder Error ${folderPath}: ${err.message}, File: customerDocumentController-deleteFolder `);
          return res.status(500).json({
            status: "error",
            message: `Error deleting folder: ${folderPath}`,
          });
        }
        try {
          // Recursively delete the folder and its child files/folders from the database
          await deleteFolderRecursively(prisma, folder_id);

          return res.status(200).json({
            status: "success",
            message: "Folder and its contents deleted successfully",
          });
        } catch (dbError) {
          console.error(`Database error: ${dbError}`);
          return res.status(500).json({
            status: "error",
            message: "An error occurred while deleting the folder entry in the database",
          });
        }
      });
    });
  } catch (error) {
    logger.error(`Delete Folder Error: ${error.message}, File: customerDocumentController-deleteFolder `);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the folder.",
    });
  }
};

exports.uploadFile = async (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    // Handle parsing errors
    if (err) {
      logger.error(`Upload File Error: ${err.message}, File: customerDocumentController-uploadFile `);
      return res.status(500).json({ status: "error", message: err.message });
    }

    // Retrieve the uploaded files and additional fields
    const uploadedFiles = files.uploadfile; // The field name from the FormData
    const folderPath = fields.folderPath[0];
    const customer_uid = fields.customer_uid[0];
    const currentFolderId = fields.currentFolderId[0];
    const fileType = fields.file_type[0];
    const user_id = fields.user_id[0];
    const employee_id = fields.employee_id[0];

    const customerdetails = await prisma.customers.findFirst({
      where: {
        uuid: customer_uid,
      },
    });

    if (!customerdetails) {
      return res.status(200).json({
        status: "error",
        message: "Customer is not found",
      });
    }

    const maindir = path.join(__dirname, "..", "uploads", `/customers/${customer_uid}`);
    // Check if maindir exists; if not, create it
    if (!fs.existsSync(maindir)) {
      fs.mkdirSync(maindir, { recursive: true });
    }

    // folderPath inside maindir
    const folderdir = path.join(maindir, folderPath);
    // Check if folderdir exists; if not, create it
    if (!fs.existsSync(folderdir)) {
      fs.mkdirSync(folderdir, { recursive: true });
    }

    // Upload file to folderdir
    const tempPath = uploadedFiles[0].path;
    const originalFilename = uploadedFiles[0].originalFilename;
    const new_file_type = path.extname(originalFilename).substring(1);
    // Get the file extension
    const ext = path.extname(originalFilename);
    // Generate a timestamp
    const timestamp = Date.now();
    // Create a new filename by appending the timestamp
    const newFilename = `${path.basename(originalFilename, ext)}_${timestamp}${ext}`;
    const targetPath = path.join(folderdir, newFilename);

    // Copy the file to the target directory
    fs.copyFileSync(tempPath, targetPath);
    // Delete the original file in the temp directory
    fs.unlinkSync(tempPath); // Remove the temporary file after copying

    // Insert the file into the database after uploading it to the server filesystem successfully
    try {
      const fileUid = "ABODEF" + Math.floor(100000 + Math.random() * 900000);
      const fileIconType = getFileIconType(fileType);

      // Insert the folder into the database
      await prisma.customerfilemanager.create({
        data: {
          name: originalFilename,
          uuid: fileUid,
          file_type: new_file_type,
          file_url: `${process.env.API_URL}/uploads/customers/${customer_uid}/${folderPath}/${newFilename}`,
          // file_icon_type: fileIconType,
          file_path: `${folderPath}/${newFilename}`,
          parent_id: currentFolderId && !isNaN(currentFolderId) ? BigInt(currentFolderId) : null,
          customer_id: customerdetails?.id,
          added_by: parseInt(user_id),
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await prisma.customeractivities.create({
        data: {
          customer_id: customerdetails.id,
          employee_id: parseInt(employee_id),
          ca_message: `File "${originalFilename}" was uploaded to file manager`,
          employee_short_name: "C", // Consider fetching from employee data
          color_code: "green", // Using green for creation
        },
      });

      return res.status(200).json({
        status: "success",
        message: `file uploaded successfully`,
      });
    } catch (error) {
      logger.error(`Upload File Error: ${error.message}, File: customerDocumentController-uploadFile `);
      return res.status(500).json({
        status: "error",
        message: "Error saving file info to database",
      });
    }
  });
};

exports.deleteFile = async (req, res) => {
  const { file_id, customeruid, employee_id } = req.body;

  // Validate required fields
  if (!file_id || !customeruid || !employee_id) {
    return res.status(200).json({
      status: "error",
      message: "file_id, customeruid, and employee_id are required",
    });
  }

  try {
    // Find the file in the database
    const file = await prisma.customerfilemanager.findUnique({
      where: {
        id: parseInt(file_id),
      },
    });

    if (!file) {
      return res.status(200).json({
        status: "error",
        message: "File not found in the database",
      });
    }

    // Get customer details separately
    const customer = await prisma.customers.findUnique({
      where: {
        id: file.customer_id,
      },
    });

    if (!customer) {
      return res.status(200).json({
        status: "error",
        message: "Customer not found",
      });
    }

    // Store file details for activity tracking
    const fileName = file.name;
    const customerId = file.customer_id;

    // Construct the full path of the file
    const maindir = path.join(__dirname, "..", "uploads", `/customers/${customeruid}`);
    const filePath = path.join(maindir, file.file_path);

    // Check if the file exists and delete it
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.warn(`File not found at path: ${filePath}`);
    }

    // Remove the file entry from the database
    await prisma.customerfilemanager.delete({
      where: {
        id: parseInt(file_id),
      },
    });

    // Track file deletion activity
    await prisma.customeractivities.create({
      data: {
        customer_id: BigInt(customerId),
        employee_id: parseInt(employee_id),
        ca_message: `File "${fileName}" was deleted from file manager`,
        employee_short_name: "C", // Consider fetching from employee data
        color_code: "red", // Using red for deletion
      },
    });

    prisma.$disconnect();
    return res.status(200).json({
      status: "success",
      message: "File deleted successfully",
    });
  } catch (error) {
    logger.error(`Delete File Error: ${error.message}, File: customerDocumentController-deleteFile`);
    return res.status(500).json({
      status: "error",
      message: error.message || "An error occurred while deleting the file",
    });
  }
};

exports.syncFileSystemWithDB = async (req, res) => {
  const { customer_uid, employee_id } = req.body;

  // Validate required fields
  if (!customer_uid || !employee_id) {
    return res.status(200).json({
      status: "error",
      message: "customer_uid and employee_id are required",
    });
  }
  try {
    // Get customer details
    const customer = await prisma.customers.findFirst({
      where: { uuid: customer_uid },
    });

    if (!customer) {
      return res.status(200).json({
        status: "error",
        message: "Customer not found",
      });
    }

    // Get all files/folders from database for this customer
    const dbEntries = await prisma.customerfilemanager.findMany({
      where: { customer_id: customer.id },
      select: {
        id: true,
        uuid: true,
        name: true,
        file_path: true,
        file_type: true,
        parent_id: true,
      },
    });

    // Create a map of file paths to database entries for quick lookup
    const dbPathMap = new Map();
    dbEntries.forEach((entry) => {
      dbPathMap.set(entry.file_path, entry);
    });

    // Path to customer's file manager directory
    const customerDir = path.join(__dirname, "..", "uploads", "customers", customer_uid, "filemanager");

    // Recursive function to scan directory and compare with DB
    const scanDirectory = async (dirPath, parentPath = "filemanager", parentId = null) => {
      let files;
      try {
        files = await fs.promises.readdir(dirPath, { withFileTypes: true });
      } catch (err) {
        if (err.code === "ENOENT") {
          // Directory doesn't exist - nothing to sync
          return [];
        }
        throw err;
      }

      const results = [];

      for (const file of files) {
        const relativePath = path.join(parentPath, file.name);
        const fullPath = path.join(dirPath, file.name);

        // Check if this path exists in DB
        const dbEntry = dbPathMap.get(relativePath);

        if (!dbEntry) {
          // Entry doesn't exist in DB - need to create it
          const isDirectory = file.isDirectory();
          const fileType = isDirectory ? "folder" : path.extname(file.name).substring(1) || "file";

          // Generate UUID
          const fileUid = isDirectory ? "ABDFM" + Math.floor(100000 + Math.random() * 900000) : "ABODEF" + Math.floor(100000 + Math.random() * 900000);

          // Create new DB entry
          const newEntry = await prisma.customerfilemanager.create({
            data: {
              uuid: fileUid,
              name: file.name,
              file_icon_type: getFileIconType(fileType),
              file_type: isDirectory ? "folder" : fileType,
              file_size: isDirectory ? null : (await fs.promises.stat(fullPath)).size,
              file_path: relativePath,
              file_url: `${process.env.API_URL}/uploads/customers/${customer_uid}/${relativePath}`,
              parent_id: parentId,
              customer_id: customer.id,
              added_by: parseInt(employee_id),
              created_at: new Date(),
              updated_at: new Date(),
            },
          });

          results.push({
            action: "created",
            type: isDirectory ? "folder" : "file",
            path: relativePath,
            entry: newEntry,
          });

          // Log activity
          await prisma.customeractivities.create({
            data: {
              customer_id: customer.id,
              employee_id: parseInt(employee_id),
              ca_message: `File system sync: ${isDirectory ? "Folder" : "File"} "${file.name}" was added to database`,
              employee_short_name: "S", // 'S' for System
              color_code: "blue", // Using blue for sync operations
            },
          });

          // If this is a directory, recursively scan it
          if (isDirectory) {
            const subResults = await scanDirectory(fullPath, relativePath, newEntry.id);
            results.push(...subResults);
          }
        } else if (file.isDirectory()) {
          // If it's a directory that exists in DB, scan its contents
          const subResults = await scanDirectory(fullPath, relativePath, dbEntry.id);
          results.push(...subResults);
        }
      }

      return results;
    };

    // Start scanning from the root filemanager directory
    const syncResults = await scanDirectory(customerDir);

    return res.status(200).json({
      status: "success",
      message: "File system synchronized with database",
      results: {
        total_scanned: syncResults.length,
      },
    });
  } catch (error) {
    logger.error(`Sync File System With DB Error: ${error.message}, File: customerDocumentController-syncFileSystemWithDB`);
    return res.status(500).json({
      status: "error",
      message: "Failed to synchronize file system with database",
      error: error.message,
    });
  }
};
