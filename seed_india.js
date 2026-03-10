const { PrismaClient } = require("./generated/prisma");

const prisma = new PrismaClient();

const COUNTRY_ID = "26bb8003-cbb9-44f2-b87d-96d5d9c19fec";

const statesWithCities = [
    { name: 'Andhra Pradesh', iso2: 'AP', cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore'] },
    { name: 'Telangana', iso2: 'TS', cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'] },
    { name: 'Karnataka', iso2: 'KA', cities: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubli'] },
    { name: 'Tamil Nadu', iso2: 'TN', cities: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli'] },
    { name: 'Maharashtra', iso2: 'MH', cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik'] },
    { name: 'Kerala', iso2: 'KL', cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'] },
    { name: 'Gujarat', iso2: 'GJ', cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'] },
    { name: 'Rajasthan', iso2: 'RJ', cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'] },
    { name: 'Uttar Pradesh', iso2: 'UP', cities: ['Lucknow', 'Kanpur', 'Agra', 'Varanasi'] },
    { name: 'Madhya Pradesh', iso2: 'MP', cities: ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior'] },
    { name: 'West Bengal', iso2: 'WB', cities: ['Kolkata', 'Howrah', 'Darjeeling', 'Siliguri'] },
    { name: 'Punjab', iso2: 'PB', cities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'] },
    { name: 'Haryana', iso2: 'HR', cities: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala'] },
    { name: 'Bihar', iso2: 'BR', cities: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'] },
    { name: 'Odisha', iso2: 'OD', cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri'] }
];

async function main() {
    console.log('Starting seed script...');
    let orderCounter = 1;

    for (const stateData of statesWithCities) {
        // Check if state exists first to avoid duplicates
        let state = await prisma.states.findFirst({
            where: { name: stateData.name, country_id: COUNTRY_ID }
        });

        if (!state) {
            state = await prisma.states.create({
                data: {
                    name: stateData.name,
                    iso2: stateData.iso2,
                    country_id: COUNTRY_ID,
                    status: 'active'
                }
            });
            console.log(`Created state: ${state.name} (${state.id})`);
        } else {
            console.log(`State already exists: ${state.name}`);
        }

        for (const cityName of stateData.cities) {
            const cityExists = await prisma.cities.findFirst({
                where: { name: cityName, state_id: state.id, country_id: COUNTRY_ID }
            });

            if (!cityExists) {
                await prisma.cities.create({
                    data: {
                        name: cityName,
                        state_id: state.id,
                        country_id: COUNTRY_ID,
                        status: 'active',
                        city_meta_tags: '',
                        order_no: orderCounter++
                    }
                });
                console.log(`  Created city: ${cityName}`);
            } else {
                console.log(`  City already exists: ${cityName}`);
            }
        }
    }

    console.log('Seed completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
