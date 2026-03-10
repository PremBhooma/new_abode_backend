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
  // Find all direct children of the folde
  const childFolders = await prismaInstance.flatfilemanager.findMany({
    where: { parent_id: folderId },
  });

  // Recursively delete child folders/files
  for (const child of childFolders) {
    // Recursively delete all child folders and their contents
    await deleteFolderRecursively(prismaInstance, child.id);
  }

  // After all child folders/files are deleted, delete the current folder
  await prismaInstance.flatfilemanager.delete({
    where: { id: folderId },
  });
};

exports.createFolder = async (req, res) => {
  const { folderName, flat_uid, user_id, file_type, currentFolderUuid, currentFolderId, employee_id } = req.body;

  // Validate required fields
  if (!folderName || !flat_uid || !employee_id) {
    return res.status(200).json({
      status: "error",
      message: "folderName, flat_uid, and employee_id are required",
    });
  }

  try {
    const flatdetails = await prisma.flat.findFirst({
      where: {
        id: flat_uid,
      },
      include: {
        customer: true, // Include customer relation if available
      },
    });

    if (!flatdetails) {
      return res.status(200).json({
        status: "error",
        message: "Flat is not found",
      });
    }

    const uploadsDir = path.join(__dirname, "..", "uploads", `/flats/${flat_uid}`);
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
      parentFolder = await prisma.flatfilemanager.findUnique({
        where: { id: currentFolderUuid }, // Check by UUID first
      });

      if (!parentFolder) {
        return res.status(200).json({
          status: "error",
          message: `Parent folder with UUID "${currentFolderUuid}" not found`,
        });
      }
    } else if (currentFolderId) {
      parentFolder = await prisma.flatfilemanager.findUnique({
        where: { id: currentFolderId }, // Fallback to ID if UUID is not present
      });

      if (!parentFolder) {
        return res.status(200).json({
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
    await prisma.flatfilemanager.create({
      data: {
        id: folderUid,
        name: folderName,
        file_icon_type: fileIconType,
        file_type: "folder",
        file_path: filePath,
        file_url: `${process.env.API_URL}/uploads/flats/${flat_uid}/${filePath}`,
        parent_id: currentFolderId || null,
        flat_id: flatdetails?.id,
        added_by: user_id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Create activity records
    await Promise.all([
      // Flat activity (similar to UpdateFlat API)
      prisma.taskactivities.create({
        data: {
          employee_id: employee_id,
          flat_id: flatdetails.id,
          ta_message: `Folder "${folderName}" created`,
          employee_short_name: "F",
          color_code: "blue",
          created_at: new Date(),
        },
      }),
    ]);

    return res.status(201).json({
      status: "success",
      message: `Folder "${folderName}" created successfully`,
    });
  } catch (error) {
    logger.error(`Create Folder Error: ${error.message}, File: flatDocumentController-createFolder`);
    return res.status(500).json({
      status: "error",
      message: `Internal server error`,
    });
  }
};

exports.getDocuments = async (req, res) => {
  const { currentFolderId, flat_uid, flat_id, flatId } = req.query;
  const target_flat_id = flat_uid || flat_id || flatId;
  try {
    const flatdetails = await prisma.flat.findFirst({
      where: {
        id: target_flat_id,
      },
    });

    if (!flatdetails) {
      return res.status(200).json({
        status: "error",
        message: "Flat not found",
      });
    }

    const documents = await prisma.flatfilemanager.findMany({
      where: {
        parent_id: currentFolderId ? currentFolderId : null,
        flat_id: flatdetails.id,
      },
      include: {
        flatdetails: true,
        employeedetails: true,
      },
    });

    const documentsdata = documents.map((doc) => ({
      id: doc.id,
      id: doc.id,
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
      const currentFolderdocuments = await prisma.flatfilemanager.findFirst({
        where: {
          id: currentFolderId, // Convert to BigInt safely
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
    logger.error(`Get Documents Error: ${error.message}, File: flatDocumentController-getDocuments`);
    return res.status(500).json({
      status: "error",
      message: `Internal server error`,
    });
  }
};

exports.deleteFolder = async (req, res) => {
  const { folder_id, flatuid, employee_id } = req.body;

  // Validate required fields
  if (!folder_id || !flatuid || !employee_id) {
    return res.status(200).json({
      status: "error",
      message: "folder_id, flatuid, and employee_id are required",
    });
  }

  try {
    // Get folder details with flat and customer info
    const folder = await prisma.flatfilemanager.findUnique({
      where: { id: folder_id },
    });

    if (!folder) {
      return res.status(200).json({
        status: "error",
        message: "Folder not found in database",
      });
    }

    // Store details for activity tracking
    const folderName = folder.name;
    const flatId = folder.flat_id;
    const customerId = folder.flat?.customer_id;

    // Filesystem operations
    const folderPath = path.join(__dirname, "..", "uploads/flats", flatuid, folder.file_path);

    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }

    // Database operations
    await deleteFolderRecursively(prisma, folder_id);

    // Activity tracking (both flat and customer activities)
    const activityPromises = [
      prisma.taskactivities.create({
        data: {
          employee_id: employee_id,
          flat_id: flatId,
          ta_message: `Deleted folder "${folderName}"`,
          employee_short_name: "F",
          color_code: "red",
          created_at: new Date(),
        },
      }),
    ];

    if (customerId) {
      activityPromises.push(
        prisma.customeractivities.create({
          data: {
            customer_id: customerId,
            employee_id: employee_id,
            ca_message: `Folder "${folderName}" deleted from file manager`,
            employee_short_name: "F",
            color_code: "red",
            created_at: new Date(),
          },
        })
      );
    }

    await Promise.all(activityPromises);

    return res.status(200).json({
      status: "success",
      message: "Folder and contents deleted successfully",
      data: {
        folderName,
        flatUuid: flatuid,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(`Delete Folder Error: ${error.message}, File: flatDocumentController-deleteFolder`);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to delete folder",
    });
  }
};

exports.uploadFile = async (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    // Handle parsing errors
    if (err) {
      logger.error(`Upload File Error: ${err.message}, File: flatDocumentController-uploadFile`);
      return res.status(500).json({ status: "error", message: err.message });
    }

    // Validate required fields
    if (!fields.flat_uid?.[0] || !fields.employee_id?.[0] || !files.uploadfile?.[0]) {
      return res.status(400).json({
        status: "error",
        message: "Missing Fields are required",
      });
    }

    // Retrieve the uploaded files and additional fields
    const uploadedFiles = files.uploadfile; // The field name from the FormData
    const folderPath = fields.folderPath[0];
    const flat_uid = fields.flat_uid[0];
    const currentFolderId = fields.currentFolderId[0];
    const fileType = fields.file_type[0];
    const user_id = fields.user_id[0];
    const employee_id = fields.employee_id[0];

    const flatdetails = await prisma.flat.findFirst({
      where: {
        id: flat_uid,
      },
    });

    if (!flatdetails) {
      return res.status(200).json({
        status: "error",
        message: "Flat is not found",
      });
    }

    const maindir = path.join(__dirname, "..", "uploads", `/flats/${flat_uid}`);
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
      await prisma.flatfilemanager.create({
        data: {
          name: originalFilename,
          id: fileUid,
          file_type: new_file_type,
          file_url: `${process.env.API_URL}/uploads/flats/${flat_uid}/${folderPath}/${newFilename}`,
          // file_icon_type: fileIconType,
          file_path: `${folderPath}/${newFilename}`,
          parent_id: currentFolderId ? currentFolderId : null,
          flat_id: flatdetails?.id,
          added_by: user_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create activity records
      await Promise.all([
        // Flat activity
        prisma.taskactivities.create({
          data: {
            employee_id: employee_id,
            flat_id: flatdetails.id,
            ta_message: `File "${originalFilename}" uploaded`,
            employee_short_name: "F",
            color_code: "blue",
            created_at: new Date(),
          },
        }),
      ]);
      return res.status(201).json({
        status: "success",
        message: `file uploaded successfully`,
      });
    } catch (error) {
      logger.error(`Upload File Error: ${error.message}, File: flatDocumentController-uploadFile`);
      return res.status(500).json({
        status: "error",
        message: "Error saving file info to database",
      });
    }
  });
};

exports.deleteFile = async (req, res) => {
  const { file_id, flatuid, employee_id } = req.body;

  // Validate required fields
  if (!file_id || !flatuid || !employee_id) {
    return res.status(200).json({
      status: "error",
      message: "file_id, flatuid, and employee_id are required",
    });
  }

  try {
    // Get file details with flat and customer info
    const file = await prisma.flatfilemanager.findUnique({
      where: { id: file_id },
    });

    if (!file) {
      return res.status(200).json({
        status: "error",
        message: "File not found in database",
      });
    }

    // Store details for activity tracking
    const fileName = file.name;
    const flatId = file.flat_id;
    const customerId = file.flat?.customer_id;

    // Filesystem operations
    const filePath = path.join(__dirname, "..", "uploads/flats", flatuid, file.file_path);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.warn(`File not found at path: ${filePath}`);
    }

    // Database operations
    await prisma.flatfilemanager.delete({
      where: { id: file_id },
    });

    // Check and clear cost sheet reference in customerflat if this file was a cost sheet
    if (file.file_path && file.file_path.startsWith('cost_sheets/')) {
      await prisma.customerflat.updateMany({
        where: {
          cost_sheet_path: file.file_path,
        },
        data: {
          cost_sheet_path: null,
          cost_sheet_url: null,
        },
      });
    }

    // Activity tracking (both flat and customer activities)
    const activityPromises = [
      prisma.taskactivities.create({
        data: {
          employee_id: employee_id,
          flat_id: flatId,
          ta_message: `Deleted file "${fileName}"`,
          employee_short_name: "F",
          color_code: "red",
          created_at: new Date(),
        },
      }),
    ];

    if (customerId) {
      activityPromises.push(
        prisma.customeractivities.create({
          data: {
            customer_id: customerId,
            employee_id: employee_id,
            ca_message: `File "${fileName}" deleted from file manager`,
            employee_short_name: "F",
            color_code: "red",
            created_at: new Date(),
          },
        })
      );
    }

    await Promise.all(activityPromises);
    return res.status(200).json({
      status: "success",
      message: "File deleted successfully",
      data: {
        fileName,
        flatUuid: flatuid,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(`Delete File Error: ${error.message}, File: flatDocumentController-deleteFile`);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to delete file",
    });
  }
};

exports.flatsSyncFileSystemWithDB = async (req, res) => {
  const { flat_uid, employee_id } = req.body;

  // Validate required fields
  if (!flat_uid || !employee_id) {
    return res.status(200).json({
      status: "error",
      message: "flat_uid and employee_id are required",
    });
  }
  try {
    // Get flat details
    const flatdetails = await prisma.flat.findFirst({
      where: { id: flat_uid },
    });

    if (!flatdetails) {
      return res.status(200).json({
        status: "error",
        message: "Flat not found",
      });
    }

    // Get all files/folders from database for this flat
    const dbEntries = await prisma.flatfilemanager.findMany({
      where: { flat_id: flatdetails.id },
      select: {
        id: true,
        id: true,
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

    // Path to flat_uid's file manager directory
    const customerDir = path.join(__dirname, "..", "uploads", "flats", flat_uid, "filemanager");

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
          const newEntry = await prisma.flatfilemanager.create({
            data: {
              id: fileUid,
              name: file.name,
              file_icon_type: getFileIconType(fileType),
              file_type: isDirectory ? "folder" : fileType,
              file_size: isDirectory ? null : (await fs.promises.stat(fullPath)).size,
              file_path: relativePath,
              file_url: `${process.env.API_URL}/uploads/flats/${flat_uid}/${relativePath}`,
              parent_id: parentId,
              flat_id: flatdetails.id,
              added_by: employee_id,
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

          // // Log activity
          // await prisma.customeractivities.create({
          //   data: {
          //     customer_id: flat_uid.id,
          //     employee_id: employee_id,
          //     ca_message: `File system sync: ${isDirectory ? 'Folder' : 'File'} "${file.name}" was added to database`,
          //     employee_short_name: "S", // 'S' for System
          //     color_code: "blue", // Using blue for sync operations
          //   },
          // });

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
        // created: syncResults.filter(r => r.action === 'created').length,
        // details: syncResults,
      },
    });
  } catch (error) {
    logger.error(`flats Sync File System With DB Error: ${error.message}, File: flatDocumentController-flatsSyncFileSystemWithDB`);
    return res.status(500).json({
      status: "error",
      message: "Failed to synchronize file system with database",
      error: error.message,
    });
  }
};
