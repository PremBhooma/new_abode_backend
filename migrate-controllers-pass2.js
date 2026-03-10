/**
 * migrate-controllers-pass2.js
 * 
 * Second pass: cleans up remaining uuid patterns that the first pass missed.
 * - uuid as response object keys (uuid: something → id: something)
 * - Standalone uuid variable declarations
 * - const { uuid } = req.params → const { id } = req.params
 * - uuid: "PREFIX" + ... generation patterns
 * - Route files: :uuid → :id
 * 
 * Usage: node migrate-controllers-pass2.js
 */

const fs = require('fs');
const path = require('path');

function processFiles(dir, extensions) {
    const results = [];
    const files = fs.readdirSync(dir).filter(f => extensions.some(ext => f.endsWith(ext)));
    for (const file of files) {
        results.push(path.join(dir, file));
    }
    return results;
}

const controllerFiles = processFiles(path.join(__dirname, 'controllers'), ['.js']);
const routeFiles = processFiles(path.join(__dirname, 'routes'), ['.js']);
const allFiles = [...controllerFiles, ...routeFiles];

let totalReplacements = 0;

for (const filePath of allFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileReplacements = 0;
    const fileName = path.basename(filePath);

    // ── 1. Replace response object key patterns ──
    // uuid: record?.flat?.uuid → id: record?.flat?.id  (already .uuid→.id by pass1)
    // uuid: record?.customer?.uuid → id: record?.customer?.id
    // But uuid: someObj.id → id: someObj.id (pass1 already changed .uuid to .id)
    // So we need: uuid: X → id: X (where uuid is an object key)

    // Pattern: key-value in object literal where key is "uuid"
    // Match: uuid: <value> at start of line or after comma/newline, within object context
    content = content.replace(/(\s+)uuid:\s*([^,\n}]+)/g, (match, leading, value) => {
        if (value.trim() === 'uuid') {
            // Let pass1 or lower steps handle `id: id`, if it's `{ id: uuid }` we keep the variable for now.
            // Actually, if it's `uuid: uuid`, we just want `id: uuid`
            fileReplacements++;
            return `${leading}id: uuid`;
        }
        fileReplacements++;
        return `${leading}id: ${value}`;
    });

    // ── 2. Replace const uuid = "PREFIX" + ... declarations ──
    // These generate random UUIDs - they should be removed since Prisma auto-generates
    // But some controllers use uuid variable later in create(), so we need to handle carefully
    // const uuid = "CUST" + ... → (keep but comment out, or remove and adjust create call)
    // Actually for create operations, since id is @default(uuid()), we don't need to set id at all
    // But if the code later references the uuid variable, we need to return the created record's id

    // For now, let's handle: const uuid = "..." + Math... → remove line and also uuid, from create data
    // This is too dangerous to automate fully, so let's just rename the variable
    content = content.replace(/const uuid = ["'][A-Z]+["'] \+ Math\.floor/g, (match) => {
        fileReplacements++;
        return '// REMOVED: ' + match;
    });

    // ── 3. Replace const { uuid } = req.params ──
    content = content.replace(/const\s*\{\s*uuid\s*\}\s*=\s*req\.params/g, (match) => {
        fileReplacements++;
        return 'const { id } = req.params';
    });

    // ── 4. Replace where: { uuid: uuid } patterns ──
    // Already mostly handled but ensure any remaining
    content = content.replace(/where:\s*\{\s*id:\s*id\s*\}/g, (match) => {
        // This is already correct, skip
        return match;
    });

    // ── 5. Replace route :uuid with :id ──
    content = content.replace(/:uuid\b/g, () => { fileReplacements++; return ':id'; });

    // ── 6. Remove uuid, from object data (where it's in create/update data) ──
    // Pattern: uuid, (standalone on its own line or after comma)
    // This handles the shorthand property: { uuid, other_field, ... }
    content = content.replace(/(\s+)uuid,/g, (match, leading) => {
        fileReplacements++;
        return `${leading}id,`;
    });

    // ── 7. Replace UUID function name patterns ──
    // GetFlatByUUID → GetFlatById (function names)
    content = content.replace(/ByUUID/g, (match) => { fileReplacements++; return 'ById'; });
    content = content.replace(/byUUID/g, (match) => { fileReplacements++; return 'byId'; });

    // ── 8. Replace "Customer uuid is required" messages ──
    content = content.replace(/uuid is required/g, (match) => { fileReplacements++; return 'id is required'; });

    // ── 9. Replace { uuid: { not: ... }} patterns ──
    // These are Prisma "not" queries  
    // Already handled by the uuid: → id: replacement above

    // ── 10. customer_uid: customer?.uuid → customer_uid: customer?.id ──
    // Already handled since .uuid → .id by pass 1
    // But customer_uid field name might need changing too
    // Actually customer_uid is just a response field name, let's rename to customer_id for clarity
    content = content.replace(/customer_uid/g, (match) => { fileReplacements++; return 'customer_id_ref'; });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${fileName}: ${fileReplacements} replacements`);
        totalReplacements += fileReplacements;
    } else {
        console.log(`⏭️  ${fileName}: no changes`);
    }
}

console.log(`\n🎉 Total pass 2 replacements: ${totalReplacements}`);
