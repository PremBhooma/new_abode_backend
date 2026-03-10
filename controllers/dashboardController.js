const prisma = require('../utils/client');
const logger = require('../helper/logger');
const getAllocatedProjectIds = require("../utils/getAllocatedProjectIds");

const serializeBigInt = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

exports.GetAllDashboardData = async (req, res) => {

    try {
        // Get allocated project IDs for the current user
        const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);

        // Build project filter condition for flats/payments (project_id is on flat)
        const flatProjectFilter = allocatedProjectIds !== null
            ? { project_id: { in: allocatedProjectIds } }
            : {};

        // Build project filter for customers (project_id is on customer)
        const customerProjectFilter = allocatedProjectIds !== null
            ? { project_id: { in: allocatedProjectIds } }
            : {};

        // Build project filter for leads (project_id is on lead)
        const leadProjectFilter = allocatedProjectIds !== null
            ? { project_id: { in: allocatedProjectIds } }
            : {};

        // Build project filter for payments (project_id is on payment)
        const paymentProjectFilter = allocatedProjectIds !== null
            ? { project_id: { in: allocatedProjectIds } }
            : {};

        const total_employees = await prisma.employees.count() || 0;

        const active_employees = await prisma.employees.count({
            where: {
                employee_status: 'Active'
            }
        })

        const inactive_employees = await prisma.employees.count({
            where: {
                employee_status: 'Inactive'
            }
        })

        const suspended_employees = await prisma.employees.count({
            where: {
                employee_status: 'Suspended'
            }
        })

        const employees = await prisma.employees.findMany({
            select: {
                id: true,
                id: true,
                name: true,
                email: true,
                phone_code: true,
                phone_number: true,
                gender: true,
                created_at: true,
                updated_at: true
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 5
        }) || [];


        const employeesData = employees.map((employee) => {
            return {
                id: employee.id,
                id: employee.id,
                name: employee.name,
                email: employee.email,
                phone_code: employee.phone_code,
                phone_number: employee.phone_number,
                gender: employee.gender,
                created_at: employee.created_at,
                updated_at: employee.updated_at
            }
        })

        const total_customers = await prisma.customers.count({
            where: {
                soft_delete: 0,
                ...customerProjectFilter,
            }
        }) || 0;

        const active_customers = await prisma.customers.count({
            where: {
                soft_delete: 0,
                status: 'Active',
                ...customerProjectFilter,
            }
        }) || 0;

        const inactive_customers = await prisma.customers.count({
            where: {
                soft_delete: 0,
                status: 'Inactive',
                ...customerProjectFilter,
            }
        }) || 0;

        const suspended_customers = await prisma.customers.count({
            where: {
                soft_delete: 0,
                status: 'Suspended',
                ...customerProjectFilter,
            }
        }) || 0;

        const customers = await prisma.customers.findMany({
            where: {
                soft_delete: 0,
                ...customerProjectFilter,
            },
            select: {
                id: true,
                id: true,
                prefixes: true,
                first_name: true,
                last_name: true,
                email: true,
                phone_code: true,
                phone_number: true,
                created_at: true,
                updated_at: true
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 5
        }) || [];

        const customersData = customers.map((customer) => {
            return {
                id: customer.id,
                id: customer.id,
                prefixes: customer.prefixes,
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
                phone_code: customer.phone_code,
                phone_number: customer.phone_number,
                created_at: customer.created_at,
                updated_at: customer.updated_at
            }
        })

        // -- Start Loan Delay Calculation --
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const loan_delay_count = await prisma.ageingrecord.count({
            where: {
                ...(allocatedProjectIds !== null ? { project_id: { in: allocatedProjectIds } } : {}),
                loan_Status: {
                    not: 'Cancelled'
                },
                OR: [
                    { loan_time_days: true },
                    {
                        loan_Status: 'NotApplied',
                        booking_date: {
                            lt: sevenDaysAgo
                        }
                    }
                ]
            }
        });
        // -- End Loan Delay Calculation --

        const total_flats = await prisma.flat.count({
            where: flatProjectFilter,
        });

        const sold_flats = await prisma.flat.count({
            where: {
                status: 'Sold',
                ...flatProjectFilter,
            }
        });

        const unsold_flats = await prisma.flat.count({
            where: {
                status: 'Unsold',
                ...flatProjectFilter,
            }
        });

        const unsoldFlatsRecent = await prisma.flat.findMany({
            where: {
                status: 'Unsold',
                ...flatProjectFilter,
            },
            select: {
                id: true,
                id: true,
                flat_no: true,
                block_id: true,
                floor_no: true,
                status: true,
                created_at: true,
                updated_at: true,
                block: {
                    select: {
                        block_name: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 5
        }) || [];

        const unsoldFlatsData = unsoldFlatsRecent.map((flat) => {
            return {
                id: flat.id,
                id: flat.id,
                flat_no: flat.flat_no,
                block_id: flat.block_id,
                block_name: flat.block?.block_name,
                floor_no: flat.floor_no,
                status: flat.status,
                created_at: flat.created_at,
                updated_at: flat.updated_at
            }
        })

        const flats = await prisma.flat.findMany({
            where: flatProjectFilter,
            select: {
                id: true,
                id: true,
                flat_no: true,
                block_id: true,
                floor_no: true,
                status: true,
                created_at: true,
                updated_at: true
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 5
        }) || [];

        const flatsData = flats.map((flat) => {
            return {
                id: flat.id,
                id: flat.id,
                flat_no: flat.flat_no,
                block_id: flat.block_id,
                floor_no: flat.floor_no,
                status: flat.status,
                created_at: flat.created_at,
                updated_at: flat.updated_at
            }
        })

        const total_payments = await prisma.payments.count({
            where: {
                customer: {
                    soft_delete: 0,
                },
                ...paymentProjectFilter,
            },
        }) || 0;

        const payments = await prisma.payments.findMany({
            where: paymentProjectFilter,
            select: {
                id: true,
                id: true,
                amount: true,
                payment_method: true,
                flat: {
                    select: {
                        flat_no: true,
                        block: {
                            select: {
                                block_name: true
                            }
                        }
                    }
                },
                customer: {
                    select: {
                        prefixes: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    },
                },
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 5
        })

        const payment_details = payments.map((payment) => {
            return {
                id: payment?.id,
                id: payment?.id,
                amount: payment?.amount,
                payment_method: payment?.payment_method,
                flat_no: payment?.flat?.flat_no,
                block_name: payment?.flat?.block?.block_name,
                customer_prefixes: payment?.customer?.prefixes,
                customer_name: payment?.customer?.first_name,
                customer_email: payment?.customer?.email,
                created_at: payment?.created_at,
                updated_at: payment?.updated_at
            }
        })

        const total_leads = await prisma.leads.count({
            where: leadProjectFilter,
        });

        const assigned_leads = await prisma.leads.count({
            where: {
                assigned_to_employee_id: {
                    not: null,
                },
                ...leadProjectFilter,
            },
        });

        const unassigned_leads = await prisma.leads.count({
            where: {
                assigned_to_employee_id: null,
                ...leadProjectFilter,
            },
        });

        const leadsData = await prisma.leads.findMany({
            where: leadProjectFilter,
            select: {
                id: true,
                id: true,
                prefixes: true,
                full_name: true,
                email: true,
                phone_code: true,
                phone_number: true,
                created_at: true,
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 5
        })

        const leads_details = leadsData.map((ele) => {
            return {
                id: ele?.id,
                id: ele?.id,
                prefixes: ele?.prefixes,
                full_name: ele?.full_name,
                email: ele?.email,
                phone_code: ele?.phone_code,
                phone_number: ele?.phone_number,
                created_at: ele?.created_at,
            }
        })


        return res.status(200).json({
            status: 'success',
            message: 'Data fetched successfully',
            adobe_data: {
                total_employees,
                active_employees,
                inactive_employees,
                suspended_employees,
                employeesData: employeesData,
                total_customers,
                active_customers,
                inactive_customers,
                suspended_customers,
                loan_delay_count, // Added loan delay count
                customersData: customersData,
                total_flats,
                sold_flats,
                unsold_flats,
                flatsData: flatsData,
                unsoldFlatsData: unsoldFlatsData,
                total_payments,
                payment_details: payment_details,
                total_leads,
                assigned_leads,
                unassigned_leads,
                leads_details: leads_details
            }
        });
    } catch (error) {
        logger.error(`Get All Dashboard Data Error: ${error.message}, File: dashboardController-GetAllDashboardData`);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

exports.GetSearchGlobal = async (req, res) => {
    const { searchQuery } = req.query;

    try {

        // Get allocated project IDs for the current user
        const allocatedProjectIds = await getAllocatedProjectIds(req.user.id);
        const projectFilter = allocatedProjectIds !== null
            ? { project_id: { in: allocatedProjectIds } }
            : {};

        const employeeCondition = {
            employee_status: "Active",
            ...(searchQuery && {
                OR: [
                    { name: { contains: searchQuery } },
                    { email: { contains: searchQuery } },
                ]
            })
        }

        const employees = await prisma.employees.findMany({
            where: employeeCondition,
            select: {
                id: true,
                id: true,
                name: true,
                email: true,
                roledetails: {
                    select: {
                        name: true,
                    }
                }
            }
        })

        const totalEmployees = await prisma.employees.count({
            where: employeeCondition
        });

        const employeeDetails = employees.map((employee) => {
            let role_name = null;
            if (employee.roledetails !== null) {
                role_name = employee.roledetails.name;
            }
            return {
                id: employee.id,
                id: employee.id,
                name: employee.name,
                email: employee.email,
                role_name: role_name
            }
        })

        const customerCondition = {
            status: "Active",
            soft_delete: 0,
            ...projectFilter,
            ...(searchQuery && {
                OR: [
                    { first_name: { contains: searchQuery } },
                    { last_name: { contains: searchQuery } },
                    { email: { contains: searchQuery } }
                ]
            })
        };

        const customers = await prisma.customers.findMany({
            where: customerCondition,
            select: {
                id: true,
                id: true,
                first_name: true,
                last_name: true,
                email: true,
            }
        });

        const totalCustomers = await prisma.customers.count({
            where: customerCondition
        })

        const customerDetails = customers.map((customer) => {
            return {
                id: customer.id,
                id: customer.id,
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email
            }
        })


        const flatCondition = {
            ...projectFilter,
            ...(searchQuery && {
                OR: [
                    { flat_no: { contains: searchQuery } },
                    { description: { contains: searchQuery } },
                    { block: { block_name: { contains: searchQuery } } },
                    { customer: { first_name: { contains: searchQuery } } },
                    { customer: { last_name: { contains: searchQuery } } },
                    { customer: { email: { contains: searchQuery } } }
                ],
            }),
        };

        const flats = await prisma.flat.findMany({
            where: flatCondition,
            // take: parsedLimit,
            // skip: offset,
            select: {
                id: true,
                id: true,
                flat_no: true,
                description: true,
                block: {
                    select: {
                        block_name: true
                    }
                },
                customer: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            }
        });

        const totalFlats = await prisma.flat.count({
            where: flatCondition
        })

        const flatDetails = flats.map((flat) => {
            return {
                id: flat.id,
                id: flat.id,
                flat_no: flat.flat_no,
                description: flat.description,
                block_name: flat.block.block_name,
                first_name: flat.customer?.first_name,
                last_name: flat.customer?.last_name,
                customer_email: flat.customer?.email
            }
        })

        const paymentCondition = {
            ...(searchQuery && {
                OR: [
                    // Convert amount to string for search
                    { amount: { equals: parseFloat(searchQuery) } }, // Use equals for numeric fields
                    { trasnaction_id: { contains: searchQuery } },
                    {
                        flat: {
                            flat_no: { contains: searchQuery },
                        },
                    },
                    {
                        customer: {
                            OR: [
                                { first_name: { contains: searchQuery } },
                                { last_name: { contains: searchQuery } },
                                { email: { contains: searchQuery } },
                            ],
                        },
                    },
                ],
            }),
        };

        const payments = await prisma.payments.findMany({
            where: paymentCondition,
            // take: parsedLimit,
            // skip: offset,
            select: {
                id: true,
                id: true,
                amount: true,
                payment_method: true,
                trasnaction_id: true,
                flat: {
                    select: {
                        flat_no: true,
                        block: {
                            select: {
                                block_name: true
                            }
                        }
                    }
                },
                customer: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true
                    },
                },
            }
        })

        const totalPayments = await prisma.payments.count({
            where: paymentCondition
        })

        const paymentDetails = payments.map((payment) => {
            return {
                id: payment?.id,
                id: payment?.id,
                amount: payment?.amount,
                paymentMethod: payment?.payment_method,
                flat_no: payment?.flat?.flat_no,
                block_name: payment?.flat?.block?.block_name,
                customer_name: payment?.customer?.first_name,
                customer_email: payment?.customer?.email,
                transaction_id: payment?.trasnaction_id,
            }
        })

        const totalResults = totalEmployees + totalCustomers + totalFlats + totalPayments;
        return res.status(200).json({
            status: "success",
            message: "Data fetched successfully",
            totalResults,
            employees: employeeDetails,
            customers: customerDetails,
            flats: flatDetails,
            payments: paymentDetails
        })

    } catch (error) {
        logger.error(`Get Search Global Error: ${error.message}, File: dashboardController-GetSearchGlobal`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error"
        })
    }

}

exports.GetPaymentsDashboard = async (req, res) => {
    const { year } = req.query;

    try {

        const currentYear = year || new Date().getFullYear();

        const monthlyPayments = await prisma.payments.groupBy({
            by: ['created_at'],
            where: {
                created_at: {
                    gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
                    lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
                },
            },
            _sum: {
                amount: true,
            },
            orderBy: {
                created_at: 'asc',
            },
        });

        const monthlyData = Array(12).fill(0);
        monthlyPayments.forEach(payment => {
            const month = new Date(payment.created_at).getMonth(); // 0-indexed
            monthlyData[month] += payment._sum.amount || 0;
        });

        return res.status(200).json({
            status: "success",
            message: "Monthly payments data fetched successfully",
            monthlyPayments: monthlyData,
            year: currentYear,
        });

    } catch (error) {
        logger.error(`Get Payments Dashboard Error: ${error.message}, File: dashboardController-GetPaymentsDashboard`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error"
        })

    }

}

exports.GetCustomersDashboard = async (req, res) => {
    const { year } = req.query;

    try {
        const currentYear = year || new Date().getFullYear();
        const monthlyCustomers = await prisma.customers.groupBy({
            by: ['created_at'],
            where: {
                created_at: {
                    gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
                    lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
                },
            },
            _count: {
                id: true,
            },
            orderBy: {
                created_at: 'asc',
            },
        });

        const monthlyData = Array(12).fill(0);
        monthlyCustomers.forEach(customer => {
            const month = new Date(customer.created_at).getMonth(); // 0-indexed
            monthlyData[month] += customer._count.id || 0;
        });

        return res.status(200).json({
            status: "success",
            message: "Monthly customers data fetched successfully",
            monthlyCustomers: monthlyData,
            year: currentYear,
        });
    } catch (error) {
        logger.error(`Get Customers Dashboard Error: ${error.message}, File: dashboardController-GetCustomersDashboard`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error"
        })
    }
}

exports.GetFlatsDashboard = async (req, res) => {
    const { year } = req.query;

    try {
        const currentYear = year || new Date().getFullYear();
        const monthlyUnsoldFlats = await prisma.flat.groupBy({
            by: ['created_at'],
            where: {
                created_at: {
                    gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
                    lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
                },
                status: 'Unsold'
            },
            _count: {
                id: true,
            },
            orderBy: {
                created_at: 'asc',
            },
        });

        const monthlyUnsoldData = Array(12).fill(0);
        monthlyUnsoldFlats.forEach(flat => {
            const month = new Date(flat.created_at).getMonth(); // 0-   
            monthlyUnsoldData[month] += flat._count.id || 0;
        });

        const monthlySoldFlats = await prisma.customerflat.groupBy({
            by: ['application_date'],
            where: {
                created_at: {
                    gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
                    lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
                }
            },
            _count: {
                id: true,
            },
            orderBy: {
                application_date: 'asc',
            },
        })

        const monthlySoldData = Array(12).fill(0);
        monthlySoldFlats.forEach(flat => {
            const month = new Date(flat.application_date).getMonth();
            monthlySoldData[month] += flat._count.id || 0;

        })

        return res.status(200).json({
            status: "success",
            message: "Monthly flats data fetched successfully",
            monthlyUnsoldFlats: monthlyUnsoldData,
            monthlySoldFlats: monthlySoldData,
            year: currentYear,
        });
    } catch (error) {
        logger.error(`Get Flats Dashboard Error: ${error.message}, File: dashboardController-GetFlatsDashboard`);
        return res.status(500).json({
            status: "error",
            message: "Internal server error"
        })
    }
}


