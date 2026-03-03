const prisma = require('./utils/client');
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fixing invalid lead_status values...');

        // Update empty strings OR NULL (if preferred, or just empty strings) to 'Hot'
        // User requested: "which ever record is empty fill with Hot"
        // We target '' specifically as that causes the Prisma Enum error.
        const countEmpty = await prisma.$executeRawUnsafe(`UPDATE leads SET lead_status = 'Hot' WHERE lead_status = '' OR lead_status IS NULL`);
        console.log(`Updated ${countEmpty} leads with empty/null status to 'Hot'`);

        // Update 'Warm' to 'Hot' (compatibility)
        const countWarm = await prisma.$executeRawUnsafe(`UPDATE leads SET lead_status = 'Hot' WHERE lead_status = 'Warm'`);
        console.log(`Updated ${countWarm} leads with 'Warm' status to 'Hot'`);

        // Fix Funding Enum Issues
        console.log('Fixing invalid funding values...');

        // 1. Convert any remaining empty strings to 'Selfloan' (if any left/new ones)
        const countFundingEmpty = await prisma.$executeRawUnsafe(`UPDATE leads SET funding = 'Selfloan' WHERE funding = ''`);
        console.log(`Updated ${countFundingEmpty} leads with empty funding to 'Selfloan'`);

        // 2. Convert NULL to 'Selfloan' (Since we previously converted empty -> NULL, and user likely wants to recover those)
        // WARNING: This assumes ALL nulls should be Selfloan. Based on user context "Change Homeloan value to Selfloan" and previous data state.
        const countFundingNull = await prisma.$executeRawUnsafe(`UPDATE leads SET funding = 'Selfloan' WHERE funding IS NULL`);
        console.log(`Updated ${countFundingNull} leads with NULL funding to 'Selfloan'`);

        // 3. Convert 'Homeloan' to 'Selfloan' (Explicit check)
        const countHomeloan = await prisma.$executeRawUnsafe(`UPDATE leads SET funding = 'Selfloan' WHERE funding = 'Homeloan'`);
        console.log(`Updated ${countHomeloan} leads with 'Homeloan' funding to 'Selfloan'`);

        console.log('Data fix complete.');
    } catch (e) {
        console.error('Error fixing data:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
