const logger = require("../helper/logger");
const prisma = require("../utils/client");
const { v4: uuidv4 } = require('uuid');

// ============================================== Project Start ====================================== //

// ============================================== Project Start ====================================== //

exports.getProject = async (req, res) => {
    try {
        const userId = req.user.id;

        const employee = await prisma.employees.findUnique({
            where: { id: userId },
            include: {
                roledetails: true,
                project_permissions: {
                    include: {
                        project: true
                    }
                }
            }
        });

        const isSuperAdmin = employee?.roledetails?.name === "Super Admin" || employee?.roledetails?.name === "Admin";
        let projectData = null;

        if (isSuperAdmin) {
            projectData = await prisma.project.findFirst({
                select: {
                    id: true,
                    project_name: true,
                    project_address: true,
                    project_rewards: true,
                },
                orderBy: {
                    created_at: 'desc'
                }
            });
        } else if (employee?.project_permissions && employee.project_permissions.length > 0) {
            // Find the most recent project they have access to
            projectData = employee.project_permissions[0].project;
        }

        const projectDetails = projectData
            ? {
                id: projectData?.id,
                project_name: projectData?.project_name,
                project_address: projectData?.project_address,
                project_corner_price: projectData?.project_corner_price,
                project_east_price: projectData?.project_east_price,
                project_six_floor_onwards_price: projectData?.project_six_floor_onwards_price,
                gst_percentage: projectData?.gst_percentage,
                manjeera_connection_charges: projectData?.manjeera_connection_charges,
                manjeera_meter_charges: projectData?.manjeera_meter_charges,
                documentation_fee: projectData?.documentation_fee,
                registration_percentage: projectData?.registration_percentage,
                registration_base_charge: projectData?.registration_base_charge,
                maintenance_rate_per_sqft: projectData?.maintenance_rate_per_sqft,
                maintenance_duration_months: projectData?.maintenance_duration_months,
                corpus_fund: projectData?.corpus_fund,
                project_rewards: projectData?.project_rewards,
            }
            : {};

        return res.status(200).json({
            status: "success",
            message: "Project details retrieved successfully",
            data: projectDetails,
        });
    } catch (error) {
        logger.error(`Get Project Error: ${error.message}, File: projectController-getProject`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getAllProjects = async (req, res) => {
    try {
        const userId = req.user.id;

        const employee = await prisma.employees.findUnique({
            where: { id: userId },
            include: {
                roledetails: true,
                project_permissions: {
                    include: {
                        project: true
                    }
                }
            }
        });

        const isSuperAdmin = employee?.roledetails?.name === "Super Admin" || employee?.roledetails?.name === "Admin";
        let projects = [];

        if (isSuperAdmin) {
            projects = await prisma.project.findMany({
                orderBy: {
                    created_at: 'desc'
                }
            });
        } else {
            projects = employee?.project_permissions
                ?.filter(p => p.project)
                ?.map(p => p.project) || [];
        }

        const projectList = projects.map(p => ({
            id: p.id,
            project_name: p.project_name,
            project_address: p.project_address,
            project_corner_price: p.project_corner_price,
            project_east_price: p.project_east_price,
            project_six_floor_onwards_price: p.project_six_floor_onwards_price,
            gst_percentage: p.gst_percentage,
            manjeera_connection_charges: p.manjeera_connection_charges,
            manjeera_meter_charges: p.manjeera_meter_charges,
            documentation_fee: p.documentation_fee,
            registration_percentage: p.registration_percentage,
            registration_base_charge: p.registration_base_charge,
            maintenance_rate_per_sqft: p.maintenance_rate_per_sqft,
            maintenance_duration_months: p.maintenance_duration_months,
            corpus_fund: p.corpus_fund,
            project_rewards: p.project_rewards
        }));

        return res.status(200).json({
            status: "success",
            message: "Projects retrieved successfully",
            data: projectList,
        });
    } catch (error) {
        logger.error(`Get All Projects Error: ${error.message}, File: projectController-getAllProjects`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.addProject = async (req, res) => {
    const {
        project_name, project_address, project_corner_price, project_east_price, project_six_floor_onwards_price, project_rewards,
        gst_percentage, manjeera_connection_charges, manjeera_meter_charges, documentation_fee, registration_percentage,
        registration_base_charge, maintenance_rate_per_sqft, maintenance_duration_months, corpus_fund
    } = req.body;

    try {
        const newUuid = uuidv4();

        await prisma.project.create({
            data: {
                id: newUuid,
                project_name,
                project_address,
                project_corner_price: parseInt(project_corner_price) || 0,
                project_east_price: parseInt(project_east_price) || 0,
                project_six_floor_onwards_price: parseInt(project_six_floor_onwards_price) || 0,
                gst_percentage: parseFloat(gst_percentage) || 0,
                manjeera_connection_charges: parseFloat(manjeera_connection_charges) || 0,
                manjeera_meter_charges: parseFloat(manjeera_meter_charges) || 0,
                documentation_fee: parseFloat(documentation_fee) || 0,
                registration_percentage: parseFloat(registration_percentage) || 0,
                registration_base_charge: parseFloat(registration_base_charge) || 0,
                maintenance_rate_per_sqft: parseFloat(maintenance_rate_per_sqft) || 0,
                maintenance_duration_months: parseFloat(maintenance_duration_months) || 0,
                corpus_fund: parseFloat(corpus_fund) || 0,
                project_rewards: project_rewards || false,
                created_at: new Date()
            },
        });

        return res.status(201).json({
            status: "success",
            message: "Project created successfully",
        });
    } catch (error) {
        logger.error(`Add Project Error: ${error.message}, File: projectController-addProject`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.updateProject = async (req, res) => {
    const {
        id, project_name, project_address, project_corner_price, project_east_price, project_six_floor_onwards_price, project_rewards,
        gst_percentage, manjeera_connection_charges, manjeera_meter_charges, documentation_fee, registration_percentage,
        registration_base_charge, maintenance_rate_per_sqft, maintenance_duration_months, corpus_fund
    } = req.body;

    try {
        if (!id) {
            const newUuid = uuidv4();

            await prisma.project.create({
                data: {
                    id: newUuid,
                    project_name,
                    project_address,
                    project_corner_price: parseInt(project_corner_price) || 0,
                    project_east_price: parseInt(project_east_price) || 0,
                    project_six_floor_onwards_price: parseInt(project_six_floor_onwards_price) || 0,
                    gst_percentage: parseFloat(gst_percentage) || 0,
                    manjeera_connection_charges: parseFloat(manjeera_connection_charges) || 0,
                    manjeera_meter_charges: parseFloat(manjeera_meter_charges) || 0,
                    documentation_fee: parseFloat(documentation_fee) || 0,
                    registration_percentage: parseFloat(registration_percentage) || 0,
                    registration_base_charge: parseFloat(registration_base_charge) || 0,
                    maintenance_rate_per_sqft: parseFloat(maintenance_rate_per_sqft) || 0,
                    maintenance_duration_months: parseFloat(maintenance_duration_months) || 0,
                    corpus_fund: parseFloat(corpus_fund) || 0,
                    project_rewards: project_rewards || false,
                    created_at: new Date()
                },
            });

            return res.status(200).json({
                status: "success",
                message: "Project created successfully",
            });
        }

        const existingProject = await prisma.project.findUnique({
            where: { id },
        });

        if (!existingProject) {
            return res.status(404).json({
                status: "error",
                message: "Project not found",
            });
        }

        await prisma.project.update({
            where: { id },
            data: {
                project_name,
                project_address,
                project_corner_price: parseInt(project_corner_price) || 0,
                project_east_price: parseInt(project_east_price) || 0,
                project_six_floor_onwards_price: parseInt(project_six_floor_onwards_price) || 0,
                gst_percentage: parseFloat(gst_percentage) || 0,
                manjeera_connection_charges: parseFloat(manjeera_connection_charges) || 0,
                manjeera_meter_charges: parseFloat(manjeera_meter_charges) || 0,
                documentation_fee: parseFloat(documentation_fee) || 0,
                registration_percentage: parseFloat(registration_percentage) || 0,
                registration_base_charge: parseFloat(registration_base_charge) || 0,
                maintenance_rate_per_sqft: parseFloat(maintenance_rate_per_sqft) || 0,
                maintenance_duration_months: parseFloat(maintenance_duration_months) || 0,
                corpus_fund: parseFloat(corpus_fund) || 0,
                project_rewards: project_rewards ?? existingProject.project_rewards,
                updated_at: new Date()
            },
        });

        return res.status(200).json({
            status: "success",
            message: "Project updated successfully",
        });
    } catch (error) {
        logger.error(`Update Project Error: ${error.message}, File: projectController-updateProject`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.deleteProject = async (req, res) => {
    const { id } = req.body;

    try {
        if (!id) {
            return res.status(400).json({
                status: "error",
                message: "Project ID is required",
            });
        }

        // Check if project has related data (like blocks/flats) which might prevent deletion
        // For now, we will just attempt delete and let Prisma constraints handle it if foreign keys exist
        // Or specific check:
        const hasBlocks = await prisma.block.findFirst({
            where: { project: { id: id } }
        });

        if (hasBlocks) {
            return res.status(400).json({
                status: "error",
                message: "Cannot delete project with assigned blocks.",
            });
        }

        await prisma.project.delete({
            where: { id },
        });

        return res.status(200).json({
            status: "success",
            message: "Project deleted successfully",
        });
    } catch (error) {
        logger.error(`Delete Project Error: ${error.message}, File: projectController-deleteProject`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getMyAllocatedProjects = async (req, res) => {
    try {
        const userId = req.user.id; // From authenticateToken middleware

        // Find employee and their allocated projects
        const employee = await prisma.employees.findUnique({
            where: { id: userId },
            include: {
                project_permissions: {
                    include: {
                        project: {
                            select: {
                                id: true,
                                project_name: true,
                                project_address: true,
                                project_rewards: true,
                            }
                        }
                    }
                },
                roledetails: true
            }
        });

        if (!employee) {
            return res.status(404).json({
                status: "error",
                message: "Employee not found",
            });
        }

        // Check if the user is a super admin
        const isSuperAdmin = employee.roledetails?.name === "Super Admin";

        let projectList = [];

        if (isSuperAdmin) {
            // Super admins see all projects
            const allProjects = await prisma.project.findMany({
                orderBy: {
                    created_at: 'desc'
                },
                select: {
                    id: true,
                    project_name: true,
                    project_address: true,
                    project_rewards: true,
                }
            });
            projectList = allProjects.map(p => ({
                id: p.id,
                project_name: p.project_name,
                project_address: p.project_address,
                project_rewards: p.project_rewards
            }));
        } else {
            // Normal employees see only allocated projects
            projectList = employee.project_permissions
                .filter(p => p.project) // Guard against null projects
                .map(p => ({
                    id: p.project.id,
                    project_name: p.project.project_name,
                    project_address: p.project.project_address,
                    project_rewards: p.project.project_rewards
                }));
        }

        return res.status(200).json({
            status: "success",
            message: "Allocated projects retrieved successfully",
            data: projectList,
        });

    } catch (error) {
        logger.error(`Get My Allocated Projects Error: ${error.message}, File: projectController-getMyAllocatedProjects`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};



// ============================================== Block Start ====================================== //

exports.getBlock = async (req, res) => {
    const { page, limit = 5, searchQuery } = req.query;
    try {

        let offset = 0;
        if (page > 1) {
            offset = limit * (page - 1);
        }

        const searchCondition = {
            ...(searchQuery ? {
                block_name: {
                    contains: searchQuery,
                    mode: "insensitive",
                },
            } : {}),
        };

        const blockData = await prisma.block.findMany({
            where: searchCondition,
            select: {
                id: true,
                block_name: true,
                project_id: true,
            },
            take: parseInt(limit),
            skip: offset,
            orderBy: {
                created_at: "desc",
            }
        });

        const totalBlocks = await prisma.block.count({
            where: searchCondition
        });


        const blockDetails = blockData.map((ele) => ({
            id: ele?.id,
            block_name: ele?.block_name,
            project_id: ele?.project_id,
        }));

        return res.status(200).json({
            status: "success",
            message: "Block details retrieved successfully",
            data: blockDetails,
            totalBlocks: totalBlocks,
            totalPages: Math.ceil(totalBlocks / limit)
        });
    } catch (error) {
        logger.error(`Get Block Error: ${error.message}, File: projectController-getBlock`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.addBlock = async (req, res) => {
    const { block_name } = req.body;

    try {
        const existingBlock = await prisma.block.findFirst({
            where: {
                block_name: block_name,
            },
        });

        if (existingBlock) {
            return res.status(200).json({
                status: "error",
                message: "Block name already exists",
            });
        }

        const getProjectId = await prisma.project.findFirst({
            select: {
                id: true,
            },
        });

        if (!getProjectId) {
            return res.status(200).json({
                status: "error",
                message: "Project not found",
            });
        }

        const newUuid = uuidv4();

        await prisma.block.create({
            data: {
                id: newUuid,
                block_name: block_name,
                project_id: getProjectId.id,
            },
        });

        return res.status(200).json({
            status: "success",
            message: "Block details created successfully",
        });
    } catch (error) {
        logger.error(`Add Block Error: ${error.message}, File: projectController-addBlock`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.updateBlock = async (req, res) => {
    const { block_name, id } = req.body;

    try {
        const existingBlock = await prisma.block.findFirst({
            where: { id },
        });

        if (!existingBlock) {
            return res.status(200).json({
                status: "error",
                message: "Block not found",
            });
        }

        if (block_name) {
            const duplicateBlock = await prisma.block.findFirst({
                where: {
                    block_name: {
                        equals: block_name,
                    },
                    NOT: {
                        id: existingBlock.id,
                    },
                },
            });

            if (duplicateBlock) {
                return res.status(200).json({
                    status: "error",
                    message: "Block name already exists",
                });
            }
        }

        await prisma.block.update({
            where: { id },
            data: {
                block_name: block_name || existingBlock.block_name,
                project_id: existingBlock.project_id,
                updated_at: new Date(),
            },
        });

        return res.status(200).json({
            status: "success",
            message: "Block details updated successfully",
        });
    } catch (error) {
        logger.error(`Update Block Error: ${error.message}, File: projectController-updateBlock`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.deleteBlock = async (req, res) => {
    const { block_id } = req.body;
    try {
        if (!block_id) {
            return res.status(200).json({
                status: 'error',
                message: 'Block ID is required'
            });
        }

        const existingBlock = await prisma.block.findUnique({
            where: {
                id: block_id
            }
        });

        if (!existingBlock) {
            return res.status(200).json({
                status: 'error',
                message: 'Block not found'
            });
        }

        const deletedBlock = await prisma.block.delete({
            where: {
                id: block_id
            }
        });


        return res.status(200).json({
            status: 'success',
            message: 'Block deleted successfully',
        });
    } catch (error) {
        logger.error(`Delete Block Error: ${error.message}, File: projectController-deleteBlock`);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

exports.getBlocksLabel = async (req, res) => {
    try {
        const blocks = await prisma.block.findMany({
            select: {
                id: true,
                block_name: true,
            },
            orderBy: {
                block_name: "asc",
            }
        });


        const blockLabels = blocks.map(block => ({
            label: block.block_name,
            value: block.id,
            id: block.id,
        }));

        return res.status(200).json({
            status: "success",
            message: "Block labels retrieved successfully",
            blocks: blockLabels,
        });
    } catch (error) {
        logger.error(`Get Block Label Error: ${error.message}, File: projectController-getBlocksLabel`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getAllBlocksNames = async (req, res) => {
    try {
        const blocks = await prisma.block.findMany({
            select: {
                id: true,
                block_name: true,
            },
            orderBy: {
                block_name: "asc",
            }
        });


        const blockNames = blocks.map(block => ({
            name: block.block_name,
            id: block.id,
        }));

        return res.status(200).json({
            status: "success",
            message: "Block names retrieved successfully",
            blocks: blockNames,
        });
    } catch (error) {
        logger.error(`Get Block Names Error: ${error.message}, File: projectController-getAllBlocksNames`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};