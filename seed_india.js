const prisma = require('./utils/client');

async function main() {
    // First, let's find India
    const india = await prisma.country.findFirst({
        where: { name: 'India' }
    });

    if (!india) {
        console.log("India not found in country table!");
        return;
    }

    console.log("Found India with ID:", india.id);

    const statesInput = [
        { name: 'Andhra Pradesh', cities: ['Visakhapatnam', 'Vijayawada', 'Guntur'] },
        { name: 'Telangana', cities: ['Hyderabad', 'Warangal', 'Nizamabad'] },
        { name: 'Karnataka', cities: ['Bengaluru', 'Mysuru', 'Hubballi'] },
        { name: 'Tamil Nadu', cities: ['Chennai', 'Coimbatore', 'Madurai'] },
        { name: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur'] },
        { name: 'Kerala', cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode'] },
        { name: 'Gujarat', cities: ['Ahmedabad', 'Surat', 'Vadodara'] },
        { name: 'Rajasthan', cities: ['Jaipur', 'Jodhpur', 'Udaipur'] },
        { name: 'Uttar Pradesh', cities: ['Lucknow', 'Kanpur', 'Agra'] },
        { name: 'Madhya Pradesh', cities: ['Bhopal', 'Indore', 'Gwalior'] },
        { name: 'West Bengal', cities: ['Kolkata', 'Darjeeling', 'Howrah'] },
        { name: 'Bihar', cities: ['Patna', 'Gaya', 'Bhagalpur'] },
        { name: 'Punjab', cities: ['Ludhiana', 'Amritsar', 'Jalandhar'] },
        { name: 'Haryana', cities: ['Gurugram', 'Faridabad', 'Panipat'] },
        { name: 'Delhi', cities: ['New Delhi'] }
    ];

    for (const s of statesInput) {
        // Upsert state
        let stateRecord = await prisma.states.findFirst({
            where: { name: s.name, country_id: india.id }
        });

        if (!stateRecord) {
            stateRecord = await prisma.states.create({
                data: {
                    name: s.name,
                    country_id: india.id,
                    status: 'active'
                }
            });
            console.log(`Created state: ${s.name}`);
        } else {
            console.log(`State exists: ${s.name}`);
        }

        // Insert cities
        for (const cityName of s.cities) {
            let cityRecord = await prisma.cities.findFirst({
                where: { name: cityName, state_id: stateRecord.id }
            });
            if (!cityRecord) {
                await prisma.cities.create({
                    data: {
                        name: cityName,
                        state_id: stateRecord.id,
                        status: 'active',
                        city_meta_tags: '',
                        order_no: 1
                    }
                });
                console.log(`  Created city: ${cityName}`);
            }
        }
    }

    console.log("Seeding complete.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
