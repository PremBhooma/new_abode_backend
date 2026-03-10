/**
 * seed.js
 * 
 * Re-imports data from seed-data.json into the database AFTER the BigInt→String migration.
 * Every old BigInt id is replaced with a new UUID string.
 * Foreign key references are mapped from old id → new UUID using lookup maps.
 * 
 * Usage: node prisma/seed.js
 */

const { PrismaClient } = require('../generated/prisma/client');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

async function seed() {
    const dataPath = path.join(__dirname, 'seed-data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('❌ seed-data.json not found. Run export-seed.js first.');
        process.exit(1);
    }

    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log('Starting data seed...\n');

    // ── ID mapping: oldId (string) → newUUID ──
    const idMap = {
        roles: {},
        employees: {},
        projects: {},
        blocks: {},
        groupowners: {},
        customers: {},
        flats: {},
        payments: {},
        parsedpayments: {},
        leads: {},
        leadstages: {},
        countries: {},
        companyinfo: {},
        amenities: {},
        customerflats: {},
        columnstore: {},
        backupdata: {},
        backupschedule: {},
        bankslist: {},
        flatfilemanager: {},
        customerfilemanager: {},
        leadsfilemanager: {},
        coupongifts: {},
        employeeProjectPermissions: {},
    };

    // Helper: get mapped ID or null
    const mapId = (mapName, oldId) => {
        if (oldId === null || oldId === undefined) return null;
        return idMap[mapName]?.[oldId.toString()] || null;
    };

    // ── 1. Countries (BigInt → String) ──
    for (const record of (raw.countries || [])) {
        const newId = uuidv4();
        idMap.countries[record.id.toString()] = newId;
        try {
            await prisma.country.create({
                data: {
                    id: newId,
                    name: record.name,
                    iso3: record.iso3,
                    iso2: record.iso2,
                    phone_code: record.phone_code,
                    currency: record.currency,
                    currency_symbol: record.currency_symbol,
                    latitude: record.latitude,
                    longitude: record.longitude,
                    flag: record.flag,
                    timezone_name: record.timezone_name,
                    timezone_utc: record.timezone_utc,
                },
            });
        } catch (e) { console.log(`⚠️  Country ${record.name}: ${e.message}`); }
    }
    console.log(`✅ Countries: ${raw.countries?.length || 0} seeded`);

    // ── 2. Roles ──
    for (const record of (raw.roles || [])) {
        const newId = uuidv4();
        idMap.roles[record.id.toString()] = newId;
        try {
            await prisma.roles.create({
                data: {
                    id: newId,
                    name: record.name,
                    default_role: record.default_role,
                    status: record.status,
                    soft_delete: record.soft_delete,
                },
            });
        } catch (e) { console.log(`⚠️  Role ${record.name}: ${e.message}`); }
    }
    console.log(`✅ Roles: ${raw.roles?.length || 0} seeded`);

    // ── 3. Rolepermissions ──
    for (const record of (raw.rolepermissions || [])) {
        try {
            await prisma.rolepermissions.create({
                data: {
                    id: uuidv4(),
                    role_id: mapId('roles', record.role_id),
                    permissions: record.permissions,
                },
            });
        } catch (e) { console.log(`⚠️  Rolepermission: ${e.message}`); }
    }
    console.log(`✅ Rolepermissions: ${raw.rolepermissions?.length || 0} seeded`);

    // ── 4. Employees ──
    // First pass: create without reporting_head_id (self-referencing)
    for (const record of (raw.employees || [])) {
        const newId = uuidv4();
        idMap.employees[record.id.toString()] = newId;
        try {
            await prisma.employees.create({
                data: {
                    id: newId,
                    name: record.name,
                    email: record.email,
                    password: record.password,
                    phone_code: record.phone_code,
                    phone_number: record.phone_number,
                    gender: record.gender,
                    employee_status: record.employee_status,
                    otp: record.otp,
                    is_verified: record.is_verified,
                    role_id: mapId('roles', record.role_id),
                    otp_expiry: record.otp_expiry ? new Date(record.otp_expiry) : null,
                    profile_pic_url: record.profile_pic_url,
                    profile_pic_path: record.profile_pic_path,
                },
            });
        } catch (e) { console.log(`⚠️  Employee ${record.name}: ${e.message}`); }
    }
    // Second pass: update reporting_head_id
    for (const record of (raw.employees || [])) {
        if (record.reporting_head_id) {
            try {
                await prisma.employees.update({
                    where: { id: idMap.employees[record.id.toString()] },
                    data: { reporting_head_id: mapId('employees', record.reporting_head_id) },
                });
            } catch (e) { /* ignore */ }
        }
    }
    console.log(`✅ Employees: ${raw.employees?.length || 0} seeded`);

    // ── 5. Company Info ──
    for (const record of (raw.companyinfo || [])) {
        const newId = uuidv4();
        idMap.companyinfo[record.id.toString()] = newId;
        try {
            await prisma.companyinfo.create({
                data: {
                    id: newId,
                    companyname: record.companyname,
                    address_one: record.address_one,
                    address_two: record.address_two,
                    city: record.city,
                    state: record.state,
                    country: record.country,
                    zipcode: record.zipcode,
                    phone_code: record.phone_code,
                    phone_number: record.phone_number,
                    email: record.email,
                    white_logo_url: record.white_logo_url,
                    white_logo_path: record.white_logo_path,
                    dark_logo_url: record.dark_logo_url,
                    dark_logo_path: record.dark_logo_path,
                    favicon_url: record.favicon_url,
                    favicon_path: record.favicon_path,
                },
            });
        } catch (e) { console.log(`⚠️  CompanyInfo: ${e.message}`); }
    }
    console.log(`✅ Company Info: ${raw.companyinfo?.length || 0} seeded`);

    // ── 6. Projects ──
    for (const record of (raw.projects || [])) {
        const newId = uuidv4();
        idMap.projects[record.id.toString()] = newId;
        try {
            await prisma.project.create({
                data: {
                    id: newId,
                    project_name: record.project_name,
                    project_address: record.project_address,
                    project_corner_price: record.project_corner_price,
                    project_east_price: record.project_east_price,
                    project_six_floor_onwards_price: record.project_six_floor_onwards_price,
                    gst_percentage: record.gst_percentage,
                    manjeera_connection_charges: record.manjeera_connection_charges,
                    manjeera_meter_charges: record.manjeera_meter_charges,
                    documentation_fee: record.documentation_fee,
                    registration_percentage: record.registration_percentage,
                    registration_base_charge: record.registration_base_charge,
                    maintenance_rate_per_sqft: record.maintenance_rate_per_sqft,
                    maintenance_duration_months: record.maintenance_duration_months,
                    corpus_fund: record.corpus_fund,
                    employee_id: mapId('employees', record.employee_id),
                    project_rewards: record.project_rewards,
                },
            });
        } catch (e) { console.log(`⚠️  Project ${record.project_name}: ${e.message}`); }
    }
    console.log(`✅ Projects: ${raw.projects?.length || 0} seeded`);

    // ── 7. Employee Project Permissions ──
    for (const record of (raw.employeeProjectPermissions || [])) {
        const newId = uuidv4();
        idMap.employeeProjectPermissions[record.id.toString()] = newId;
        try {
            await prisma.employeeProjectPermission.create({
                data: {
                    id: newId,
                    employee_id: mapId('employees', record.employee_id),
                    project_id: mapId('projects', record.project_id),
                },
            });
        } catch (e) { console.log(`⚠️  EmployeeProjectPermission: ${e.message}`); }
    }
    console.log(`✅ Employee Project Permissions: ${raw.employeeProjectPermissions?.length || 0} seeded`);

    // ── 8. Blocks ──
    for (const record of (raw.blocks || [])) {
        const newId = uuidv4();
        idMap.blocks[record.id.toString()] = newId;
        try {
            await prisma.block.create({
                data: {
                    id: newId,
                    block_name: record.block_name,
                    project_id: mapId('projects', record.project_id),
                },
            });
        } catch (e) { console.log(`⚠️  Block ${record.block_name}: ${e.message}`); }
    }
    console.log(`✅ Blocks: ${raw.blocks?.length || 0} seeded`);

    // ── 9. Group Owners ──
    for (const record of (raw.groupowners || [])) {
        const newId = uuidv4();
        idMap.groupowners[record.id.toString()] = newId;
        try {
            await prisma.groupowner.create({
                data: {
                    id: newId,
                    name: record.name,
                    isDefault: record.isDefault,
                },
            });
        } catch (e) { console.log(`⚠️  GroupOwner ${record.name}: ${e.message}`); }
    }
    console.log(`✅ Group Owners: ${raw.groupowners?.length || 0} seeded`);

    // ── 10. Amenities ──
    for (const record of (raw.amenities || [])) {
        const newId = uuidv4();
        idMap.amenities[record.id.toString()] = newId;
        try {
            await prisma.amenities.create({
                data: {
                    id: newId,
                    project_id: mapId('projects', record.project_id),
                    amount: record.amount,
                    flat_type: record.flat_type,
                },
            });
        } catch (e) { console.log(`⚠️  Amenity: ${e.message}`); }
    }
    console.log(`✅ Amenities: ${raw.amenities?.length || 0} seeded`);

    // ── 11. Lead Stages ──
    for (const record of (raw.leadstages || [])) {
        const newId = uuidv4();
        idMap.leadstages[record.id.toString()] = newId;
        try {
            await prisma.leadstages.create({
                data: {
                    id: newId,
                    name: record.name,
                    order: record.order,
                },
            });
        } catch (e) { console.log(`⚠️  LeadStage ${record.name}: ${e.message}`); }
    }
    console.log(`✅ Lead Stages: ${raw.leadstages?.length || 0} seeded`);

    // ── 12. Customers ──
    for (const record of (raw.customers || [])) {
        const newId = uuidv4();
        idMap.customers[record.id.toString()] = newId;
        try {
            await prisma.customers.create({
                data: {
                    id: newId,
                    project_id: mapId('projects', record.project_id),
                    profile_pic_url: record.profile_pic_url,
                    profile_pic_path: record.profile_pic_path,
                    prefixes: record.prefixes,
                    first_name: record.first_name,
                    last_name: record.last_name,
                    email: record.email,
                    email_2: record.email_2,
                    phone_code: record.phone_code,
                    phone_number: record.phone_number,
                    gender: record.gender,
                    landline_country_code: record.landline_country_code,
                    landline_city_code: record.landline_city_code,
                    landline_number: record.landline_number,
                    date_of_birth: record.date_of_birth ? new Date(record.date_of_birth) : null,
                    father_name: record.father_name,
                    spouse_prefixes: record.spouse_prefixes,
                    spouse_name: record.spouse_name,
                    marital_status: record.marital_status,
                    number_of_children: record.number_of_children,
                    wedding_aniversary: record.wedding_aniversary ? new Date(record.wedding_aniversary) : null,
                    spouse_dob: record.spouse_dob ? new Date(record.spouse_dob) : null,
                    pan_card_no: record.pan_card_no,
                    aadhar_card_no: record.aadhar_card_no,
                    country_of_citizenship: mapId('countries', record.country_of_citizenship),
                    country_of_residence: mapId('countries', record.country_of_residence),
                    mother_tongue: record.mother_tongue,
                    name_of_poa: record.name_of_poa,
                    holder_poa: record.holder_poa,
                    no_of_years_correspondence_address: record.no_of_years_correspondence_address,
                    no_of_years_city: record.no_of_years_city,
                    have_you_owned_abode: record.have_you_owned_abode,
                    if_owned_project_name: record.if_owned_project_name,
                    source_of_lead: record.source_of_lead,
                    status: record.status,
                    soft_delete: record.soft_delete,
                    added_by_employee_id: mapId('employees', record.added_by_employee_id),
                    loan_rejected: record.loan_rejected,
                },
            });
        } catch (e) { console.log(`⚠️  Customer ${record.first_name}: ${e.message}`); }
    }
    console.log(`✅ Customers: ${raw.customers?.length || 0} seeded`);

    // ── 13. Flats ──
    for (const record of (raw.flats || [])) {
        const newId = uuidv4();
        idMap.flats[record.id.toString()] = newId;
        try {
            await prisma.flat.create({
                data: {
                    id: newId,
                    project_id: mapId('projects', record.project_id),
                    flat_reward: record.flat_reward,
                    flat_no: record.flat_no,
                    block_id: mapId('blocks', record.block_id),
                    floor_no: record.floor_no,
                    square_feet: record.square_feet,
                    type: record.type,
                    facing: record.facing,
                    east_face: record.east_face,
                    west_face: record.west_face,
                    north_face: record.north_face,
                    south_face: record.south_face,
                    bedrooms: record.bedrooms,
                    bathrooms: record.bathrooms,
                    balconies: record.balconies,
                    parking: record.parking,
                    furnished_status: record.furnished_status,
                    description: record.description,
                    udl: record.udl,
                    group_owner_id: mapId('groupowners', record.group_owner_id),
                    corner: record.corner,
                    mortgage: record.mortgage,
                    floor_rise: record.floor_rise,
                    deed_number: record.deed_number,
                    google_map_link: record.google_map_link,
                    status: record.status,
                    flat_img_url: record.flat_img_url,
                    flat_img_path: record.flat_img_path,
                    totalAmount: record.totalAmount,
                    paidAmount: record.paidAmount,
                    customer_id: mapId('customers', record.customer_id),
                    added_by_employee_id: mapId('employees', record.added_by_employee_id),
                    word_agreement_template_path: record.word_agreement_template_path,
                    word_agreement_template_url: record.word_agreement_template_url,
                    pdf_agreement_template_path: record.pdf_agreement_template_path,
                    pdf_agreement_template_url: record.pdf_agreement_template_url,
                    word_sale_deed_template_path: record.word_sale_deed_template_path,
                    word_sale_deed_template_url: record.word_sale_deed_template_url,
                    pdf_sale_deed_template_path: record.pdf_sale_deed_template_path,
                    pdf_sale_deed_template_url: record.pdf_sale_deed_template_url,
                    advance_payment: record.advance_payment,
                },
            });
        } catch (e) { console.log(`⚠️  Flat ${record.flat_no}: ${e.message}`); }
    }
    console.log(`✅ Flats: ${raw.flats?.length || 0} seeded`);

    // ── 14. Customer Flats ──
    for (const record of (raw.customerflats || [])) {
        const newId = uuidv4();
        idMap.customerflats[record.id.toString()] = newId;
        try {
            await prisma.customerflat.create({
                data: {
                    id: newId,
                    flat_id: mapId('flats', record.flat_id),
                    customer_id: mapId('customers', record.customer_id),
                    saleable_area_sq_ft: record.saleable_area_sq_ft,
                    rate_per_sq_ft: record.rate_per_sq_ft,
                    discount: record.discount,
                    base_cost_unit: record.base_cost_unit,
                    application_date: record.application_date ? new Date(record.application_date) : null,
                    amenities: record.amenities,
                    toatlcostofuint: record.toatlcostofuint,
                    gst: record.gst,
                    costofunitwithtax: record.costofunitwithtax,
                    registrationcharge: record.registrationcharge,
                    manjeera_connection_charge: record.manjeera_connection_charge,
                    manjeera_meter_charge: record.manjeera_meter_charge,
                    maintenancecharge: record.maintenancecharge,
                    documentaionfee: record.documentaionfee,
                    corpusfund: record.corpusfund,
                    floor_rise_per_sq_ft: record.floor_rise_per_sq_ft,
                    total_floor_rise: record.total_floor_rise,
                    east_facing_per_sq_ft: record.east_facing_per_sq_ft,
                    total_east_facing: record.total_east_facing,
                    corner_per_sq_ft: record.corner_per_sq_ft,
                    total_corner: record.total_corner,
                    grand_total: record.grand_total,
                    custom_note: record.custom_note,
                    cost_sheet_url: record.cost_sheet_url,
                    cost_sheet_path: record.cost_sheet_path,
                },
            });
        } catch (e) { console.log(`⚠️  CustomerFlat: ${e.message}`); }
    }
    console.log(`✅ Customer Flats: ${raw.customerflats?.length || 0} seeded`);

    // ── 15. Payments ──
    for (const record of (raw.payments || [])) {
        const newId = uuidv4();
        idMap.payments[record.id.toString()] = newId;
        try {
            await prisma.payments.create({
                data: {
                    id: newId,
                    project_id: mapId('projects', record.project_id),
                    flat_id: mapId('flats', record.flat_id),
                    customer_id: mapId('customers', record.customer_id),
                    amount: record.amount,
                    payment_type: record.payment_type,
                    payment_towards: record.payment_towards,
                    payment_method: record.payment_method,
                    bank: record.bank,
                    payment_date: record.payment_date ? new Date(record.payment_date) : null,
                    trasnaction_id: record.trasnaction_id,
                    receipt_path: record.receipt_path,
                    receipt_url: record.receipt_url,
                    comment: record.comment,
                    added_by_employee_id: mapId('employees', record.added_by_employee_id),
                },
            });
        } catch (e) { console.log(`⚠️  Payment: ${e.message}`); }
    }
    console.log(`✅ Payments: ${raw.payments?.length || 0} seeded`);

    // ── 16. Leads ──
    for (const record of (raw.leads || [])) {
        const newId = uuidv4();
        idMap.leads[record.id.toString()] = newId;
        try {
            await prisma.leads.create({
                data: {
                    id: newId,
                    project_id: mapId('projects', record.project_id),
                    profile_pic_url: record.profile_pic_url,
                    profile_pic_path: record.profile_pic_path,
                    prefixes: record.prefixes,
                    full_name: record.full_name,
                    email: record.email,
                    email_2: record.email_2,
                    phone_code: record.phone_code,
                    phone_number: record.phone_number,
                    gender: record.gender,
                    landline_country_code: record.landline_country_code,
                    landline_city_code: record.landline_city_code,
                    landline_number: record.landline_number,
                    date_of_birth: record.date_of_birth ? new Date(record.date_of_birth) : null,
                    father_name: record.father_name,
                    spouse_prefixes: record.spouse_prefixes,
                    spouse_name: record.spouse_name,
                    marital_status: record.marital_status,
                    number_of_children: record.number_of_children,
                    wedding_aniversary: record.wedding_aniversary ? new Date(record.wedding_aniversary) : null,
                    spouse_dob: record.spouse_dob ? new Date(record.spouse_dob) : null,
                    pan_card_no: record.pan_card_no,
                    aadhar_card_no: record.aadhar_card_no,
                    country_of_citizenship: mapId('countries', record.country_of_citizenship),
                    country_of_residence: mapId('countries', record.country_of_residence),
                    mother_tongue: record.mother_tongue,
                    name_of_poa: record.name_of_poa,
                    holder_poa: record.holder_poa,
                    no_of_years_correspondence_address: record.no_of_years_correspondence_address,
                    no_of_years_city: record.no_of_years_city,
                    have_you_owned_abode: record.have_you_owned_abode,
                    if_owned_project_name: record.if_owned_project_name,
                    assigned_to_employee_id: mapId('employees', record.assigned_to_employee_id),
                    source_of_lead: record.source_of_lead,
                    lead_stage_id: mapId('leadstages', record.lead_stage_id),
                    status: record.status,
                    added_by_employee_id: mapId('employees', record.added_by_employee_id),
                    lead_assigned_date: record.lead_assigned_date ? new Date(record.lead_assigned_date) : null,
                    lead_status: record.lead_status,
                    min_budget: record.min_budget,
                    max_budget: record.max_budget,
                    bedroom: record.bedroom,
                    purpose: record.purpose,
                    funding: record.funding,
                    lead_age: record.lead_age,
                },
            });
        } catch (e) { console.log(`⚠️  Lead ${record.full_name}: ${e.message}`); }
    }
    console.log(`✅ Leads: ${raw.leads?.length || 0} seeded`);

    // ── 17. Banks List ──
    for (const record of (raw.bankslist || [])) {
        const newId = uuidv4();
        idMap.bankslist[record.id.toString()] = newId;
        try {
            await prisma.banksList.create({
                data: { id: newId, name: record.name },
            });
        } catch (e) { console.log(`⚠️  Bank: ${e.message}`); }
    }
    console.log(`✅ Banks List: ${raw.bankslist?.length || 0} seeded`);

    // ── 18-25. Activity / Note / File Manager tables (no FK maps needed for children) ──
    const simpleChildTables = [
        { key: 'flatnotes', model: 'flatnotes', mapFields: { flat_id: 'flats', user_id: 'employees' } },
        { key: 'taskactivities', model: 'taskactivities', mapFields: { flat_id: 'flats', employee_id: 'employees' } },
        { key: 'customernotes', model: 'customernotes', mapFields: { customer_id: 'customers', user_id: 'employees' } },
        { key: 'customeractivities', model: 'customeractivities', mapFields: { customer_id: 'customers', employee_id: 'employees' } },
        { key: 'customerflatupdateactivities', model: 'customerflatupdateactivities', mapFields: { employee_id: 'employees', customerflat_id: 'customerflats' } },
        { key: 'leadsnotes', model: 'leadsnotes', mapFields: { lead_id: 'leads', employee_id: 'employees' } },
        { key: 'leadsactivities', model: 'leadsactivities', mapFields: { lead_id: 'leads', employee_id: 'employees' } },
        { key: 'bookingstages', model: 'bookingStages', mapFields: { flat_id: 'flats', customer_id: 'customers' } },
        { key: 'professions', model: 'profession', mapFields: { customer_id: 'customers' } },
        { key: 'leadsprofessions', model: 'leadsprofession', mapFields: { lead_id: 'leads' } },
    ];

    for (const table of simpleChildTables) {
        let count = 0;
        for (const record of (raw[table.key] || [])) {
            const data = { id: uuidv4() };
            // Copy non-FK fields
            for (const [k, v] of Object.entries(record)) {
                if (k === 'id') continue;
                if (table.mapFields[k]) {
                    data[k] = mapId(table.mapFields[k], v);
                } else if (k === 'created_at' || k === 'updated_at') {
                    data[k] = v ? new Date(v) : null;
                } else {
                    data[k] = v;
                }
            }
            try {
                await prisma[table.model].create({ data });
                count++;
            } catch (e) { /* skip */ }
        }
        console.log(`✅ ${table.key}: ${count} seeded`);
    }

    // ── File managers (have parent_id self-reference) ──
    const fileManagerTables = [
        { key: 'flatfilemanager', model: 'flatfilemanager', ownerKey: 'flat_id', ownerMap: 'flats' },
        { key: 'customerfilemanager', model: 'customerfilemanager', ownerKey: 'customer_id', ownerMap: 'customers' },
        { key: 'leadsfilemanager', model: 'leadsfilemanager', ownerKey: 'lead_id', ownerMap: 'leads' },
    ];

    for (const table of fileManagerTables) {
        const fmIdMap = {};
        // First pass: create without parent_id
        for (const record of (raw[table.key] || [])) {
            const newId = uuidv4();
            fmIdMap[record.id.toString()] = newId;
            try {
                await prisma[table.model].create({
                    data: {
                        id: newId,
                        name: record.name,
                        file_icon_type: record.file_icon_type,
                        file_type: record.file_type,
                        file_size: record.file_size,
                        file_path: record.file_path,
                        file_url: record.file_url,
                        [table.ownerKey]: mapId(table.ownerMap, record[table.ownerKey]),
                        added_by: mapId('employees', record.added_by),
                        updated_at: record.updated_at ? new Date(record.updated_at) : new Date(),
                    },
                });
            } catch (e) { /* skip */ }
        }
        // Second pass: update parent_id
        for (const record of (raw[table.key] || [])) {
            if (record.parent_id) {
                try {
                    await prisma[table.model].update({
                        where: { id: fmIdMap[record.id.toString()] },
                        data: { parent_id: fmIdMap[record.parent_id.toString()] || null },
                    });
                } catch (e) { /* skip */ }
            }
        }
        console.log(`✅ ${table.key}: ${raw[table.key]?.length || 0} seeded`);
    }

    // ── Customer/Lead Addresses ──
    for (const record of (raw.customeraddresses || [])) {
        try {
            await prisma.customeraddress.create({
                data: {
                    id: uuidv4(),
                    customer_id: mapId('customers', record.customer_id),
                    address_type: record.address_type,
                    address: record.address,
                    city: record.city,
                    state: record.state,
                    country: mapId('countries', record.country),
                    pincode: record.pincode,
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Customer Addresses: ${raw.customeraddresses?.length || 0} seeded`);

    for (const record of (raw.leadsaddresses || [])) {
        try {
            await prisma.leadsaddress.create({
                data: {
                    id: uuidv4(),
                    lead_id: mapId('leads', record.lead_id),
                    address_type: record.address_type,
                    address: record.address,
                    city: record.city,
                    state: record.state,
                    country: mapId('countries', record.country),
                    pincode: record.pincode,
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Lead Addresses: ${raw.leadsaddresses?.length || 0} seeded`);

    // ── Lead Transfers ──
    for (const record of (raw.leadtransfers || [])) {
        try {
            await prisma.leadtransfer.create({
                data: {
                    id: uuidv4(),
                    from_employee_id: mapId('employees', record.from_employee_id),
                    to_employee_id: mapId('employees', record.to_employee_id),
                    lead_id: mapId('leads', record.lead_id),
                    transfered_by: mapId('employees', record.transfered_by),
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Lead Transfers: ${raw.leadtransfers?.length || 0} seeded`);

    // ── Ageing Records ──
    for (const record of (raw.ageingrecords || [])) {
        try {
            await prisma.ageingrecord.create({
                data: {
                    id: uuidv4(),
                    project_id: mapId('projects', record.project_id),
                    flat_id: mapId('flats', record.flat_id),
                    customer_id: mapId('customers', record.customer_id),
                    customer_flat: mapId('customerflats', record.customer_flat),
                    booking_date: record.booking_date ? new Date(record.booking_date) : null,
                    total_amount: record.total_amount,
                    ageing_days: record.ageing_days,
                    loan_Status: record.loan_Status,
                    registration_status: record.registration_status,
                    loan_time_days: record.loan_time_days,
                    bank_name: record.bank_name,
                    agent_name: record.agent_name,
                    agent_contact: record.agent_contact,
                    agent_number: record.agent_number,
                    loan_amount: record.loan_amount,
                    loan_approved_amount: record.loan_approved_amount,
                    advance_payment: record.advance_payment,
                    bank_agreement: record.bank_agreement,
                    disbursement: record.disbursement,
                    customer_balance_payment: record.customer_balance_payment,
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Ageing Records: ${raw.ageingrecords?.length || 0} seeded`);

    // ── Refund Ageing Records ──
    for (const record of (raw.refundageingrecords || [])) {
        try {
            await prisma.refundageingrecord.create({
                data: {
                    id: uuidv4(),
                    project_id: mapId('projects', record.project_id),
                    flat_id: mapId('flats', record.flat_id),
                    customer_id: mapId('customers', record.customer_id),
                    refund_amount: record.refund_amount,
                    refund_date: record.refund_date ? new Date(record.refund_date) : null,
                    refund_transactionid: record.refund_transactionid,
                    refund_status: record.refund_status,
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Refund Ageing Records: ${raw.refundageingrecords?.length || 0} seeded`);

    // ── Coupon Gifts ──
    for (const record of (raw.coupongifts || [])) {
        const newId = uuidv4();
        idMap.coupongifts[record.id.toString()] = newId;
        try {
            await prisma.coupongifts.create({
                data: {
                    id: newId,
                    project_id: mapId('projects', record.project_id),
                    name: record.name,
                    coupon_gift_pic_url: record.coupon_gift_pic_url,
                    coupon_gift_pic_path: record.coupon_gift_pic_path,
                    coupon_gift_id: record.coupon_gift_id,
                    coupon_gift_status: record.coupon_gift_status,
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Coupon Gifts: ${raw.coupongifts?.length || 0} seeded`);

    // ── Rewards ──
    for (const record of (raw.rewards || [])) {
        try {
            await prisma.rewards.create({
                data: {
                    id: uuidv4(),
                    project_id: mapId('projects', record.project_id),
                    employee_id: mapId('employees', record.employee_id),
                    customer_id: mapId('customers', record.customer_id),
                    flat_id: mapId('flats', record.flat_id),
                    employee_otp: record.employee_otp,
                    customer_otp: record.customer_otp,
                    employee_otp_verified: record.employee_otp_verified,
                    customer_otp_verified: record.customer_otp_verified,
                    coupon_name: record.coupon_name,
                    coupon_gift_id: record.coupon_gift_id,
                    coupon_gift_pic_url: record.coupon_gift_pic_url,
                    coupon_gift_pic_path: record.coupon_gift_pic_path,
                    rewards_step: record.rewards_step,
                    received_reward: record.received_reward,
                    received_reward_date: record.received_reward_date ? new Date(record.received_reward_date) : null,
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Rewards: ${raw.rewards?.length || 0} seeded`);

    // ── Parsed Payments ──
    for (const record of (raw.parsedpayments || [])) {
        try {
            await prisma.parsedpayments.create({
                data: {
                    id: uuidv4(),
                    amount: record.amount,
                    payment_type: record.payment_type,
                    payment_towards: record.payment_towards,
                    payment_method: record.payment_method,
                    bank: record.bank,
                    payment_date: record.payment_date ? new Date(record.payment_date) : null,
                    transaction_id: record.transaction_id,
                    flat: record.flat,
                    block: record.block,
                    project_id: mapId('projects', record.project_id),
                    comment: record.comment,
                    added_by_employee_id: mapId('employees', record.added_by_employee_id),
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Parsed Payments: ${raw.parsedpayments?.length || 0} seeded`);

    // ── Column Store ──
    for (const record of (raw.columnstore || [])) {
        try {
            await prisma.columnstore.create({
                data: {
                    id: uuidv4(),
                    employee_id: mapId('employees', record.employee_id),
                    page_name: record.page_name,
                    columns: record.columns,
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Column Store: ${raw.columnstore?.length || 0} seeded`);

    // ── Backup Data ──
    for (const record of (raw.backupdata || [])) {
        try {
            await prisma.backupdata.create({
                data: {
                    id: uuidv4(),
                    backup_name: record.backup_name,
                    backup_path: record.backup_path,
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Backup Data: ${raw.backupdata?.length || 0} seeded`);

    // ── Backup Schedule ──
    for (const record of (raw.backupschedule || [])) {
        try {
            await prisma.backupschedule.create({
                data: {
                    id: uuidv4(),
                    schedule: record.schedule,
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Backup Schedule: ${raw.backupschedule?.length || 0} seeded`);

    // ── Sale Deed Templates ──
    for (const record of (raw.saledeedtemplates || [])) {
        try {
            await prisma.saledeedtemplates.create({
                data: {
                    id: uuidv4(),
                    path: record.path,
                    file_url: record.file_url,
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Sale Deed Templates: ${raw.saledeedtemplates?.length || 0} seeded`);

    // ── Agreement Templates ──
    for (const record of (raw.agreementtemplates || [])) {
        try {
            await prisma.agreementtemplates.create({
                data: {
                    id: uuidv4(),
                    path: record.path,
                    file_url: record.file_url,
                },
            });
        } catch (e) { /* skip */ }
    }
    console.log(`✅ Agreement Templates: ${raw.agreementtemplates?.length || 0} seeded`);

    console.log('\n🎉 Seed complete!');
    await prisma.$disconnect();
}

seed().catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
});
