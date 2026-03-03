const { PrismaClient } = require('../generated/prisma/client');

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

module.exports = prisma;
