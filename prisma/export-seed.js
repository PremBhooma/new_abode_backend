/**
 * export-seed.js
 * 
 * Exports all existing data from the database into a JSON file (seed-data.json).
 * Run BEFORE the migration to preserve data.
 * 
 * Usage: node prisma/export-seed.js
 */

const { PrismaClient } = require('../generated/prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

// Helper: convert BigInt fields to strings in JSON
function bigIntReplacer(key, value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
}

async function exportData() {
    console.log('Starting data export...\n');
    const seedData = {};

    // ── Reference tables (these keep Int IDs) ──
    try {
        seedData.cities = await prisma.cities.findMany();
        console.log(`✅ Cities: ${seedData.cities.length} records`);
    } catch (e) { console.log('⚠️  Cities: skipped -', e.message); seedData.cities = []; }

    try {
        seedData.states = await prisma.states.findMany();
        console.log(`✅ States: ${seedData.states.length} records`);
    } catch (e) { console.log('⚠️  States: skipped -', e.message); seedData.states = []; }

    try {
        seedData.countries = await prisma.country.findMany();
        console.log(`✅ Countries: ${seedData.countries.length} records`);
    } catch (e) { console.log('⚠️  Countries: skipped -', e.message); seedData.countries = []; }

    // ── Core tables ──
    try {
        seedData.roles = await prisma.roles.findMany();
        console.log(`✅ Roles: ${seedData.roles.length} records`);
    } catch (e) { console.log('⚠️  Roles: skipped -', e.message); seedData.roles = []; }

    try {
        seedData.rolepermissions = await prisma.rolepermissions.findMany();
        console.log(`✅ Rolepermissions: ${seedData.rolepermissions.length} records`);
    } catch (e) { console.log('⚠️  Rolepermissions: skipped -', e.message); seedData.rolepermissions = []; }

    try {
        seedData.employees = await prisma.employees.findMany();
        console.log(`✅ Employees: ${seedData.employees.length} records`);
    } catch (e) { console.log('⚠️  Employees: skipped -', e.message); seedData.employees = []; }

    try {
        seedData.companyinfo = await prisma.companyinfo.findMany();
        console.log(`✅ Company Info: ${seedData.companyinfo.length} records`);
    } catch (e) { console.log('⚠️  CompanyInfo: skipped -', e.message); seedData.companyinfo = []; }

    try {
        seedData.projects = await prisma.project.findMany();
        console.log(`✅ Projects: ${seedData.projects.length} records`);
    } catch (e) { console.log('⚠️  Projects: skipped -', e.message); seedData.projects = []; }

    try {
        seedData.employeeProjectPermissions = await prisma.employeeProjectPermission.findMany();
        console.log(`✅ EmployeeProjectPermissions: ${seedData.employeeProjectPermissions.length} records`);
    } catch (e) { console.log('⚠️  EmployeeProjectPermissions: skipped -', e.message); seedData.employeeProjectPermissions = []; }

    try {
        seedData.blocks = await prisma.block.findMany();
        console.log(`✅ Blocks: ${seedData.blocks.length} records`);
    } catch (e) { console.log('⚠️  Blocks: skipped -', e.message); seedData.blocks = []; }

    try {
        seedData.groupowners = await prisma.groupowner.findMany();
        console.log(`✅ Group Owners: ${seedData.groupowners.length} records`);
    } catch (e) { console.log('⚠️  GroupOwners: skipped -', e.message); seedData.groupowners = []; }

    try {
        seedData.amenities = await prisma.amenities.findMany();
        console.log(`✅ Amenities: ${seedData.amenities.length} records`);
    } catch (e) { console.log('⚠️  Amenities: skipped -', e.message); seedData.amenities = []; }

    try {
        seedData.customers = await prisma.customers.findMany();
        console.log(`✅ Customers: ${seedData.customers.length} records`);
    } catch (e) { console.log('⚠️  Customers: skipped -', e.message); seedData.customers = []; }

    try {
        seedData.customeraddresses = await prisma.customeraddress.findMany();
        console.log(`✅ Customer Addresses: ${seedData.customeraddresses.length} records`);
    } catch (e) { console.log('⚠️  CustomerAddresses: skipped -', e.message); seedData.customeraddresses = []; }

    try {
        seedData.professions = await prisma.profession.findMany();
        console.log(`✅ Professions: ${seedData.professions.length} records`);
    } catch (e) { console.log('⚠️  Professions: skipped -', e.message); seedData.professions = []; }

    try {
        seedData.flats = await prisma.flat.findMany();
        console.log(`✅ Flats: ${seedData.flats.length} records`);
    } catch (e) { console.log('⚠️  Flats: skipped -', e.message); seedData.flats = []; }

    try {
        seedData.customerflats = await prisma.customerflat.findMany();
        console.log(`✅ Customer Flats: ${seedData.customerflats.length} records`);
    } catch (e) { console.log('⚠️  CustomerFlats: skipped -', e.message); seedData.customerflats = []; }

    try {
        seedData.payments = await prisma.payments.findMany();
        console.log(`✅ Payments: ${seedData.payments.length} records`);
    } catch (e) { console.log('⚠️  Payments: skipped -', e.message); seedData.payments = []; }

    try {
        seedData.parsedpayments = await prisma.parsedpayments.findMany();
        console.log(`✅ Parsed Payments: ${seedData.parsedpayments.length} records`);
    } catch (e) { console.log('⚠️  ParsedPayments: skipped -', e.message); seedData.parsedpayments = []; }

    try {
        seedData.flatnotes = await prisma.flatnotes.findMany();
        console.log(`✅ Flat Notes: ${seedData.flatnotes.length} records`);
    } catch (e) { console.log('⚠️  FlatNotes: skipped -', e.message); seedData.flatnotes = []; }

    try {
        seedData.taskactivities = await prisma.taskactivities.findMany();
        console.log(`✅ Task Activities: ${seedData.taskactivities.length} records`);
    } catch (e) { console.log('⚠️  TaskActivities: skipped -', e.message); seedData.taskactivities = []; }

    try {
        seedData.flatfilemanager = await prisma.flatfilemanager.findMany();
        console.log(`✅ Flat File Manager: ${seedData.flatfilemanager.length} records`);
    } catch (e) { console.log('⚠️  FlatFileManager: skipped -', e.message); seedData.flatfilemanager = []; }

    try {
        seedData.customerfilemanager = await prisma.customerfilemanager.findMany();
        console.log(`✅ Customer File Manager: ${seedData.customerfilemanager.length} records`);
    } catch (e) { console.log('⚠️  CustomerFileManager: skipped -', e.message); seedData.customerfilemanager = []; }

    try {
        seedData.customernotes = await prisma.customernotes.findMany();
        console.log(`✅ Customer Notes: ${seedData.customernotes.length} records`);
    } catch (e) { console.log('⚠️  CustomerNotes: skipped -', e.message); seedData.customernotes = []; }

    try {
        seedData.customeractivities = await prisma.customeractivities.findMany();
        console.log(`✅ Customer Activities: ${seedData.customeractivities.length} records`);
    } catch (e) { console.log('⚠️  CustomerActivities: skipped -', e.message); seedData.customeractivities = []; }

    try {
        seedData.customerflatupdateactivities = await prisma.customerflatupdateactivities.findMany();
        console.log(`✅ Customer Flat Update Activities: ${seedData.customerflatupdateactivities.length} records`);
    } catch (e) { console.log('⚠️  CustomerFlatUpdateActivities: skipped -', e.message); seedData.customerflatupdateactivities = []; }

    try {
        seedData.columnstore = await prisma.columnstore.findMany();
        console.log(`✅ Column Store: ${seedData.columnstore.length} records`);
    } catch (e) { console.log('⚠️  ColumnStore: skipped -', e.message); seedData.columnstore = []; }

    try {
        seedData.backupdata = await prisma.backupdata.findMany();
        console.log(`✅ Backup Data: ${seedData.backupdata.length} records`);
    } catch (e) { console.log('⚠️  BackupData: skipped -', e.message); seedData.backupdata = []; }

    try {
        seedData.backupschedule = await prisma.backupschedule.findMany();
        console.log(`✅ Backup Schedule: ${seedData.backupschedule.length} records`);
    } catch (e) { console.log('⚠️  BackupSchedule: skipped -', e.message); seedData.backupschedule = []; }

    try {
        seedData.bookingstages = await prisma.bookingStages.findMany();
        console.log(`✅ Booking Stages: ${seedData.bookingstages.length} records`);
    } catch (e) { console.log('⚠️  BookingStages: skipped -', e.message); seedData.bookingstages = []; }

    try {
        seedData.leads = await prisma.leads.findMany();
        console.log(`✅ Leads: ${seedData.leads.length} records`);
    } catch (e) { console.log('⚠️  Leads: skipped -', e.message); seedData.leads = []; }

    try {
        seedData.leadsprofessions = await prisma.leadsprofession.findMany();
        console.log(`✅ Leads Professions: ${seedData.leadsprofessions.length} records`);
    } catch (e) { console.log('⚠️  LeadsProfessions: skipped -', e.message); seedData.leadsprofessions = []; }

    try {
        seedData.leadsaddresses = await prisma.leadsaddress.findMany();
        console.log(`✅ Leads Addresses: ${seedData.leadsaddresses.length} records`);
    } catch (e) { console.log('⚠️  LeadsAddresses: skipped -', e.message); seedData.leadsaddresses = []; }

    try {
        seedData.leadsactivities = await prisma.leadsactivities.findMany();
        console.log(`✅ Leads Activities: ${seedData.leadsactivities.length} records`);
    } catch (e) { console.log('⚠️  LeadsActivities: skipped -', e.message); seedData.leadsactivities = []; }

    try {
        seedData.leadsnotes = await prisma.leadsnotes.findMany();
        console.log(`✅ Leads Notes: ${seedData.leadsnotes.length} records`);
    } catch (e) { console.log('⚠️  LeadsNotes: skipped -', e.message); seedData.leadsnotes = []; }

    try {
        seedData.leadsfilemanager = await prisma.leadsfilemanager.findMany();
        console.log(`✅ Leads File Manager: ${seedData.leadsfilemanager.length} records`);
    } catch (e) { console.log('⚠️  LeadsFileManager: skipped -', e.message); seedData.leadsfilemanager = []; }

    try {
        seedData.leadstages = await prisma.leadstages.findMany();
        console.log(`✅ Lead Stages: ${seedData.leadstages.length} records`);
    } catch (e) { console.log('⚠️  LeadStages: skipped -', e.message); seedData.leadstages = []; }

    try {
        seedData.leadtransfers = await prisma.leadtransfer.findMany();
        console.log(`✅ Lead Transfers: ${seedData.leadtransfers.length} records`);
    } catch (e) { console.log('⚠️  LeadTransfers: skipped -', e.message); seedData.leadtransfers = []; }

    try {
        seedData.ageingrecords = await prisma.ageingrecord.findMany();
        console.log(`✅ Ageing Records: ${seedData.ageingrecords.length} records`);
    } catch (e) { console.log('⚠️  AgeingRecords: skipped -', e.message); seedData.ageingrecords = []; }

    try {
        seedData.bankslist = await prisma.banksList.findMany();
        console.log(`✅ Banks List: ${seedData.bankslist.length} records`);
    } catch (e) { console.log('⚠️  BanksList: skipped -', e.message); seedData.bankslist = []; }

    try {
        seedData.refundageingrecords = await prisma.refundageingrecord.findMany();
        console.log(`✅ Refund Ageing Records: ${seedData.refundageingrecords.length} records`);
    } catch (e) { console.log('⚠️  RefundAgeingRecords: skipped -', e.message); seedData.refundageingrecords = []; }

    try {
        seedData.saledeedtemplates = await prisma.saledeedtemplates.findMany();
        console.log(`✅ Sale Deed Templates: ${seedData.saledeedtemplates.length} records`);
    } catch (e) { console.log('⚠️  SaleDeedTemplates: skipped -', e.message); seedData.saledeedtemplates = []; }

    try {
        seedData.agreementtemplates = await prisma.agreementtemplates.findMany();
        console.log(`✅ Agreement Templates: ${seedData.agreementtemplates.length} records`);
    } catch (e) { console.log('⚠️  AgreementTemplates: skipped -', e.message); seedData.agreementtemplates = []; }

    try {
        seedData.coupongifts = await prisma.coupongifts.findMany();
        console.log(`✅ Coupon Gifts: ${seedData.coupongifts.length} records`);
    } catch (e) { console.log('⚠️  CouponGifts: skipped -', e.message); seedData.coupongifts = []; }

    try {
        seedData.rewards = await prisma.rewards.findMany();
        console.log(`✅ Rewards: ${seedData.rewards.length} records`);
    } catch (e) { console.log('⚠️  Rewards: skipped -', e.message); seedData.rewards = []; }

    // ── Write to file ──
    const outputPath = path.join(__dirname, 'seed-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(seedData, bigIntReplacer, 2));
    console.log(`\n✅ Data exported successfully to: ${outputPath}`);
    console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

    await prisma.$disconnect();
}

exportData().catch(async (e) => {
    console.error('❌ Export failed:', e);
    await prisma.$disconnect();
    process.exit(1);
});
