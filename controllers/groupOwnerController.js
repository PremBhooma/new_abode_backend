const prisma = require("../utils/client");
const logger = require("../helper/logger");


exports.getGroupOwner = async (req, res) => {
    const { page, limit = 5, searchQuery } = req.query;
    try {

        let offset = 0;
        if (page > 1) {
            offset = limit * (page - 1);
        }

        const searchCondition = {
            ...(searchQuery ? {
                name: {
                    contains: searchQuery,
                    mode: "insensitive",
                },
            } : {}),
        };

        const groupOwnerData = await prisma.groupowner.findMany({
            where: searchCondition,
            select: {
                id: true,
                name: true,
                isDefault: true,
            },
            take: parseInt(limit),
            skip: offset,
            orderBy: {
                created_at: "desc",
            }
        });

        const totalGroupOwner = await prisma.groupowner.count({
            where: searchCondition
        });


        const groupOwnerDetails = groupOwnerData.map((ele) => ({
            id: ele?.id,
            name: ele?.name,
            isDefault: ele?.isDefault,
        }));


        return res.status(200).json({
            status: "success",
            message: "Group/Owner details retrieved successfully",
            data: groupOwnerDetails || [],
            totalGroupOwner: totalGroupOwner,
            totalPages: Math.ceil(totalGroupOwner / limit)
        });
    } catch (error) {
        logger.error(`Get retrieving group/owner Error: ${error.message}, File: groupOwnerController-getGroupOwner`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.addGroupOwner = async (req, res) => {
    const { group_owner, isDefault } = req.body;

    try {
        const existingGroupOwner = await prisma.groupowner.findFirst({
            where: {
                name: group_owner,
            },
        });

        if (existingGroupOwner) {
            return res.status(200).json({
                status: "error",
                message: "Group/Owner name already exists",
            });
        }

        // REMOVED: // REMOVED: // REMOVED: const uuid = "ABDGO" + Math.floor(100000000 + Math.random() * 900000000).toString();

        await prisma.groupowner.create({
            data: {
                name: group_owner,
                isDefault: isDefault === true ? true : false,
            },
        });

        return res.status(200).json({
            status: "success",
            message: "Group/Owner details created successfully",
        });
    } catch (error) {
        logger.error(`Add group/owner Error: ${error.message}, File: groupOwnerController-addGroupOwner`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.getListGroupOwners = async (req, res) => {
    try {
        const groupOwners = await prisma.groupowner.findMany();
        let data = [];

        if (groupOwners !== null) {
            data = groupOwners.map((owner) => ({
                value: owner?.id?.toString(),
                label: owner?.name
            }));
        }

        return res.status(200).json({
            status: 'success',
            groupOwners: data
        });

    } catch (error) {
        logger.error(`Get List group/owner Error: ${error.message}, File: groupOwnerController-getListGroupOwners`);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

exports.updateGroupOwner = async (req, res) => {
    const { group_owner, isDefault, id } = req.body;

    try {
        const existingGroupOwner = await prisma.groupowner.findFirst({
            where: { id },
        });

        if (!existingGroupOwner) {
            return res.status(200).json({
                status: "error",
                message: "Group/Owner not found",
            });
        }

        if (group_owner) {
            const duplicateGroupOwner = await prisma.groupowner.findFirst({
                where: {
                    name: {
                        equals: group_owner,
                    },
                    NOT: {
                        id: existingGroupOwner.id,
                    },
                },
            });

            if (duplicateGroupOwner) {
                return res.status(200).json({
                    status: "error",
                    message: "Group/Owner name already exists",
                });
            }
        }

        await prisma.groupowner.update({
            where: { id },
            data: {
                name: group_owner ? group_owner : existingGroupOwner.name,
                isDefault: isDefault === true ? true : false,
                updated_at: new Date(),
            },
        });

        return res.status(200).json({
            status: "success",
            message: "Group/Owner details updated successfully",
        });
    } catch (error) {
        logger.error(`Update group/owner Error: ${error.message}, File: groupOwnerController-updateGroupOwner`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};

exports.deleteGroupOwner = async (req, res) => {
    const { groupOwnerId } = req.body;
    try {
        if (!groupOwnerId) {
            return res.status(200).json({
                status: 'error',
                message: 'Group/Owner ID is required'
            });
        }

        const existingGroupOwner = await prisma.groupowner.findUnique({
            where: {
                id: groupOwnerId
            }
        });

        if (!existingGroupOwner) {
            return res.status(200).json({
                status: 'error',
                message: 'Group/Owner not found'
            });
        }

        const deletedGroupOwner = await prisma.groupowner.delete({
            where: {
                id: groupOwnerId
            }
        });

        return res.status(200).json({
            status: 'success',
            message: 'Group/Owner deleted successfully',
        });
    } catch (error) {
        logger.error(`Delete group/owner Error: ${error.message}, File: groupOwnerController-deleteGroupOwner`);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

exports.getAllGroupOwnersNames = async (req, res) => {
    try {
        const groupList = await prisma.groupowner.findMany({
            where: {
                isDefault: true,
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                created_at: "asc",
            }
        });


        const groupOwnersNames = groupList.map(ele => ({
            name: ele.name,
            id: ele.id,
        }));

        return res.status(200).json({
            status: "success",
            message: "Group/Owers names retrieved successfully",
            data: groupOwnersNames,
        });
    } catch (error) {
        logger.error(`Get Group/Owers Names Error: ${error.message}, File: groupOwnerController-getAllGroupOwnersNames`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
};