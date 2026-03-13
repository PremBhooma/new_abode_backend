const prisma = require("../utils/client");
const multiparty = require("multiparty");
const fs = require("fs");
const path = require("path");
const logger = require("../helper/logger");
const { v4: uuidv4 } = require("uuid");

const normalizeFolderId = (folderId) => {
  if (folderId === null || folderId === undefined) return null;
  if (typeof folderId === "string") {
    const trimmed = folderId.trim();
    if (trimmed === "" || trimmed === "null" || trimmed === "undefined") {
      return null;
    }
    return trimmed;
  }
  return folderId;
};

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
  const childFolders = await prismaInstance.leadsfilemanager.findMany({
    where: { parent_id: folderId },
  });

  // Recursively delete child folders/files
  for (const child of childFolders) {
    // Recursively delete all child folders and their contents
    await deleteFolderRecursively(prismaInstance, child.id);
  }

  // After all child folders/files are deleted, delete the current folder
  await prismaInstance.leadsfilemanager.delete({
    where: { id: folderId },
  });
};

exports.createFolder = async (req, res) => {
  const { folderName, currentFolderId, currentFolderUuid, lead_uuid, leadId, employee_id, user_id, file_type } = req.body;
  const final_lead_uuid = lead_uuid || leadId;
  const sanitizedFolderId = normalizeFolderId(currentFolderId);

  // Validate required fields
  if (!folderName || !final_lead_uuid || !employee_id) {
    return res.status(200).json({
      status: "error",
      message: "folderName, lead_uuid, and employee_id are required",
    });
  }

  try {
    const leaddetails = await prisma.leads.findFirst({
      where: {
        id: final_lead_uuid,
      },
    });

    if (!leaddetails) {
      return res.status(200).json({
        status: "error",
        message: "Lead is not found",
      });
    }

    const uploadsDir = path.join(__dirname, "..", "uploads", "leads", final_lead_uuid).replace(/\\/g, '/');
    const filemanagerDir = path.join(uploadsDir, "filemanager");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(filemanagerDir)) {
      fs.mkdirSync(filemanagerDir, { recursive: true });
    }

    let parentFolderPath = filemanagerDir;
    let filePath = path.join("filemanager", folderName).replace(/\\/g, '/');

    // Check if either currentFolderUuid or currentFolderId is provided
    let parentFolder = null;

    if (currentFolderUuid) {
      parentFolder = await prisma.leadsfilemanager.findUnique({
        where: { id: currentFolderUuid }, // Check by UUID first
      });

      if (!parentFolder) {
        return res.status(400).json({
          status: "error",
          message: `Parent folder with UUID "${currentFolderUuid}" not found`,
        });
      }
    } else if (currentFolderId) {
      parentFolder = await prisma.leadsfilemanager.findUnique({
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
      parentFolderPath = path.join(uploadsDir, parentFolder.file_path).replace(/\\/g, '/');
      filePath = path.join(parentFolder.file_path, folderName).replace(/\\/g, '/');
    }

    const newFolderPath = path.join(parentFolderPath, folderName).replace(/\\/g, '/');

    if (fs.existsSync(newFolderPath)) {
      return res.status(200).json({
        status: "error",
        message: `Folder with name "${folderName}" already exists`,
      });
    }

    // Create the new folder in the filesystem
    fs.mkdirSync(newFolderPath);

    // Generate a unique ID for the new folder
    const folderUid = uuidv4();
    const fileIconType = getFileIconType(file_type);

    // Insert the folder into the database
    await prisma.leadsfilemanager.create({
      data: {
        id: folderUid,
        name: folderName,
        file_icon_type: fileIconType,
        file_type: "folder",
        file_path: filePath,
        file_url: `${process.env.API_URL}/uploads/leads/${final_lead_uuid}/${filePath}`,
        parent_id: sanitizedFolderId,
        lead_id: leaddetails?.id,
        added_by: user_id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Track folder creation activity
    await prisma.leadsactivities.create({
      data: {
        lead_id: leaddetails.id,
        employee_id: employee_id,
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
    logger.error(`Create Folder Error: ${error.message}, File: leadDocumentController-createFolder `);
    return res.status(500).json({
      status: "error",
      message: `Internal server error`,
    });
  }
};

exports.getDocuments = async (req, res) => {
  const { currentFolderId, lead_uuid, leadId } = req.query;
  const final_lead_uuid = lead_uuid || leadId;
  const sanitizedFolderId = normalizeFolderId(currentFolderId);
  try {
    const leaddetails = await prisma.leads.findFirst({
      where: {
        id: final_lead_uuid,
      },
    });

    if (!leaddetails) {
      return res.status(200).json({
        status: "error",
        message: "Lead not found",
      });
    }

    const documents = await prisma.leadsfilemanager.findMany({
      where: {
        parent_id: sanitizedFolderId,
        lead_id: leaddetails.id,
      },
      include: {
        lead_details: true,
        employee_details: true,
      },
    });

    const documentsdata = documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      parent_id: doc.parent_id,
      file_type: doc.file_type,
      file_icon_type: doc.file_icon_type,
      file_path: doc.file_path,
      file_url: doc.file_url,
      uploadedBy: doc.employee_details?.name || "System",
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    }));

    let superparent = null;
    let current_file_path = null;
    if (sanitizedFolderId !== null && sanitizedFolderId !== undefined) {
      // Fetch the current folder's parent ID only if currentFolderId is defined and valid
      const currentFolderdocuments = await prisma.leadsfilemanager.findFirst({
        where: {
          id: sanitizedFolderId, // Convert to BigInt safely
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
    logger.error(`Get Documents Error: ${error.message}, File: leadDocumentController-getDocuments `);
    return res.status(500).json({
      status: "error",
      message: `Internal server error`,
    });
  }
};

exports.deleteFolder = async (req, res) => {
  const { folder_id, lead_uuid, leadId } = req.body;
  const final_lead_uuid = lead_uuid || leadId;

  try {
    // Find the folder in the database
    const folder = await prisma.leadsfilemanager.findUnique({
      where: { id: folder_id },
    });

    if (!folder) {
      return res.status(200).json({
        status: "error",
        message: "Folder not found in the database",
      });
    }

    // Construct the full path of the folder
    const maindir = path.join(__dirname, "..", "uploads", `/leads/${final_lead_uuid}`);
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
          logger.error(`Delete Folder Error ${folderPath}: ${err.message}, File: leadDocumentController-deleteFolder `);
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
    logger.error(`Delete Folder Error: ${error.message}, File: leadDocumentController-deleteFolder `);
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
      logger.error(`Upload File Error: ${err.message}, File: leadDocumentController-uploadFile `);
      return res.status(500).json({ status: "error", message: err.message });
    }

    // Retrieve the uploaded files and additional fields
    const uploadedFiles = files.uploadfile; // The field name from the FormData
    const folderPath = fields.folderPath?.[0];
    const lead_uuid = fields.id?.[0] || fields.lead_uuid?.[0] || fields.leadId?.[0];
    const currentFolderId = fields.currentFolderId?.[0];
    const sanitizedFolderId = normalizeFolderId(currentFolderId);
    const fileType = fields.file_type?.[0];
    const user_id = fields.user_id?.[0];
    const employee_id = fields.employee_id?.[0];

    if (!uploadedFiles || !lead_uuid) {
      return res.status(200).json({
        status: "error",
        message: "File or Lead ID missing",
      });
    }

    const leaddetails = await prisma.leads.findFirst({
      where: {
        id: lead_uuid,
      },
    });

    if (!leaddetails) {
      return res.status(200).json({
        status: "error",
        message: "Lead is not found",
      });
    }

    const maindir = path.join(__dirname, "..", "uploads", "leads", lead_uuid).replace(/\\/g, '/');
    // Check if maindir exists; if not, create it
    if (!fs.existsSync(maindir)) {
      fs.mkdirSync(maindir, { recursive: true });
    }

    // folderPath inside maindir
    const folderdir = path.join(maindir, folderPath).replace(/\\/g, '/');
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
    const targetPath = path.join(folderdir, newFilename).replace(/\\/g, '/');

    // Copy the file to the target directory
    fs.copyFileSync(tempPath, targetPath);
    // Delete the original file in the temp directory
    fs.unlinkSync(tempPath); // Remove the temporary file after copying

    // Insert the file into the database after uploading it to the server filesystem successfully
    try {
      const fileUid = uuidv4();
      const fileIconType = getFileIconType(fileType);

      // Insert the folder into the database
      await prisma.leadsfilemanager.create({
        data: {
          name: originalFilename,
          id: fileUid,
          file_type: new_file_type,
          file_url: `${process.env.API_URL}/uploads/leads/${lead_uuid}/${folderPath}/${newFilename}`,
        // file_icon_type: fileIconType,
        file_path: `${folderPath}/${newFilename}`.replace(/\\/g, '/'),
        parent_id: sanitizedFolderId,
        lead_id: leaddetails?.id,
          added_by: user_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await prisma.leadsactivities.create({
        data: {
          lead_id: leaddetails.id,
          employee_id: employee_id,
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
      logger.error(`Upload File Error: ${error.message}, File: leadDocumentController-uploadFile `);
      return res.status(500).json({
        status: "error",
        message: "Error saving file info to database",
      });
    }
  });
};

exports.deleteFile = async (req, res) => {
  const { file_id, lead_uuid, leadId, employee_id } = req.body;
  const final_lead_uuid = lead_uuid || leadId;

  // Validate required fields
  if (!file_id || !final_lead_uuid || !employee_id) {
    return res.status(200).json({
      status: "error",
      message: "file_id, lead_uuid, and employee_id are required",
    });
  }

  try {
    // Find the file in the database
    const file = await prisma.leadsfilemanager.findUnique({
      where: {
        id: file_id,
      },
    });

    if (!file) {
      return res.status(200).json({
        status: "error",
        message: "File not found in the database",
      });
    }

    // Get lead details separately
    const lead = await prisma.leads.findUnique({
      where: {
        id: file.lead_id,
      },
    });

    if (!lead) {
      return res.status(200).json({
        status: "error",
        message: "Lead not found",
      });
    }

    // Store file details for activity tracking
    const fileName = file.name;
    const leadId = file.lead_id;

    // Construct the full path of the file
    const maindir = path.join(__dirname, "..", "uploads", "leads", final_lead_uuid).replace(/\\/g, '/');
    const filePath = path.join(maindir, file.file_path).replace(/\\/g, '/');

    // Check if the file exists and delete it
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.warn(`File not found at path: ${filePath}`);
    }

    // Remove the file entry from the database
    await prisma.leadsfilemanager.delete({
      where: {
        id: file_id,
      },
    });

    // Track file deletion activity
    await prisma.leadsactivities.create({
      data: {
        lead_id: leadId,
        employee_id: employee_id,
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
    logger.error(`Delete File Error: ${error.message}, File: leadDocumentController-deleteFile`);
    return res.status(500).json({
      status: "error",
      message: error.message || "An error occurred while deleting the file",
    });
  }
};

exports.syncFileSystemWithDB = async (req, res) => {
  const { lead_uuid, leadId, employee_id } = req.body;
  const final_lead_uuid = lead_uuid || leadId;

  // Validate required fields
  if (!final_lead_uuid || !employee_id) {
    return res.status(200).json({
      status: "error",
      message: "lead_uuid and employee_id are required",
    });
  }
  try {
    // Get lead details
    const lead = await prisma.leads.findFirst({
      where: { id: final_lead_uuid },
    });

    if (!lead) {
      return res.status(200).json({
        status: "error",
        message: "Lead not found",
      });
    }

    // Get all files/folders from database for this lead
    const dbEntries = await prisma.leadsfilemanager.findMany({
      where: { lead_id: lead.id },
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

    // Path to lead's file manager directory
    const leadDir = path.join(__dirname, "..", "uploads", "leads", final_lead_uuid, "filemanager").replace(/\\/g, '/');

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
        const relativePath = path.join(parentPath, file.name).replace(/\\/g, '/');
        const fullPath = path.join(dirPath, file.name).replace(/\\/g, '/');

        // Check if this path exists in DB
        const dbEntry = dbPathMap.get(relativePath);

        if (!dbEntry) {
          // Entry doesn't exist in DB - need to create it
          const isDirectory = file.isDirectory();
          const fileType = isDirectory ? "folder" : path.extname(file.name).substring(1) || "file";

          // Generate UUID
          const fileUid = uuidv4();

          // Create new DB entry
          const newEntry = await prisma.leadsfilemanager.create({
            data: {
              id: fileUid,
              name: file.name,
              file_icon_type: getFileIconType(fileType),
              file_type: isDirectory ? "folder" : fileType,
              file_size: isDirectory ? null : (await fs.promises.stat(fullPath)).size,
              file_path: relativePath,
              file_url: `${process.env.API_URL}/uploads/leads/${final_lead_uuid}/${relativePath}`,
              parent_id: parentId,
              lead_id: lead.id,
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

          // Log activity
          await prisma.leadsactivities.create({
            data: {
              lead_id: lead.id,
              employee_id: employee_id,
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
    const syncResults = await scanDirectory(leadDir);

    return res.status(200).json({
      status: "success",
      message: "File system synchronized with database",
      results: {
        total_scanned: syncResults.length,
      },
    });
  } catch (error) {
    logger.error(`Sync File System With DB Error: ${error.message}, File: leadDocumentController-syncFileSystemWithDB`);
    return res.status(500).json({
      status: "error",
      message: "Failed to synchronize file system with database",
      error: error.message,
    });
  }
};
