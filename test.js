const prisma = require('./utils/client');

async function main() {
    const cust = await prisma.customers.findFirst();
    console.log(cust);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
