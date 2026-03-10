const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const fs = require('fs');

async function test() {
    // 1. Generate WB just like Excelbulktemplate.jsx
    const workbook = new ExcelJS.Workbook();
    const flatSheet = workbook.addWorksheet('Flat Template');

    flatSheet.addRow([
        'Project', 'Flat No', 'Floor No', 'Block', 'Area(Sq.ft.)',
        'Flat Type', 'Facing',
        'East Facing View', 'West Facing View', 'North Facing View', 'South Facing View',
        'Corner', 'Flat Reward',
    ]);

    flatSheet.addRow([
        'KKP Heights', '101', '1',
        'Block 1', '1200', '2 BHK', 'East',
        'Park View', 'City View', 'Garden View', 'Road View', 'Yes', 'Yes',
    ]);

    // Add FloorNoList
    const floorNoSheet = workbook.addWorksheet('FloorNoList');
    for (let i = 1; i <= 100; i++) {
        floorNoSheet.getCell(`A${i}`).value = i;
    }

    // Add Data Validation
    for (let i = 2; i <= 5; i++) {
        flatSheet.getCell(`C${i}`).dataValidation = {
            type: 'list', allowBlank: false, formulae: [`FloorNoList!$A$1:$A$100`],
            showErrorMessage: true, errorTitle: 'Invalid Floor No', error: 'Please select a valid Floor No (1-100).',
        };
    }

    await workbook.xlsx.writeFile('frontend_output.xlsx');

    // 2. Read WB just like settingsController.js
    const readWb = xlsx.readFile('frontend_output.xlsx');
    const readFlatSheet = readWb.Sheets['Flat Template'];
    const readData = xlsx.utils.sheet_to_json(readFlatSheet, { defval: "" });
    fs.writeFileSync('output.json', JSON.stringify(readData, null, 2));
}

test().catch(console.error);
