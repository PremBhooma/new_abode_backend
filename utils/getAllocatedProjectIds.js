const prisma = require("./client");

/**
 * Get the allocated project IDs for a given employee.
 * - Returns `null` if the employee is Super Admin or Admin (no filtering needed, show all).
 * - Returns an array of BigInt project IDs for regular employees.
 * - Returns an empty array if the employee has no project allocations.
 * 
 * @param {number|string} userId - The employee ID
 * @returns {Promise<BigInt[]|null>} Array of project IDs or null for admins
 */
async function getAllocatedProjectIds(userId) {
    const employee = await prisma.employees.findUnique({
        where: { id: BigInt(userId) },
        include: {
            roledetails: true,
            project_permissions: {
                select: {
                    project_id: true,
                },
            },
        },
    });

    if (!employee) return [];

    const roleName = employee.roledetails?.name;
    if (roleName === "Super Admin" || roleName === "Admin") {
        return null; // null means "no filter, show all"
    }

    return employee.project_permissions
        .filter((p) => p.project_id !== null)
        .map((p) => p.project_id);
}

module.exports = getAllocatedProjectIds;
