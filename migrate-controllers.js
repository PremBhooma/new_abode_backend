/**
 * migrate-controllers.js
 * 
 * Automatically replaces common BigInt/uuid patterns across all controller files.
 * Run this ONCE after the schema migration.
 * 
 * Usage: node migrate-controllers.js
 */

const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');

const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

let totalReplacements = 0;

for (const file of files) {
    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileReplacements = 0;

    // ── 1. Replace BigInt(...) wrappers ──
    // BigInt(someVar) → someVar
    // BigInt(req.user.id) → req.user.id
    // BigInt(project_id) → project_id
    // etc.
    content = content.replace(/BigInt\(([^)]+)\)/g, (match, inner) => {
        fileReplacements++;
        return inner;
    });

    // ── 2. Replace parseInt(...) for ID fields ──
    // parseInt(req.params.id) → req.params.id
    // parseInt(req.params.uuid) → req.params.id
    // parseInt(req.headers.id) → req.headers.id
    // parseInt(req.body.id) → req.body.id  
    // parseInt(req.query.project_id) → req.query.project_id
    // parseInt(id) → id (when used as a simple variable)
    // But NOT parseInt for non-ID fields like page numbers, counts etc.
    content = content.replace(/parseInt\(req\.params\.id\)/g, () => { fileReplacements++; return 'req.params.id'; });
    content = content.replace(/parseInt\(req\.params\.uuid\)/g, () => { fileReplacements++; return 'req.params.id'; });
    content = content.replace(/parseInt\(req\.headers\.id\)/g, () => { fileReplacements++; return 'req.headers.id'; });
    content = content.replace(/parseInt\(req\.headers\.userid\)/g, () => { fileReplacements++; return 'req.headers.userid'; });
    content = content.replace(/parseInt\(req\.body\.id\)/g, () => { fileReplacements++; return 'req.body.id'; });
    content = content.replace(/parseInt\(req\.body\.role_id\)/g, () => { fileReplacements++; return 'req.body.role_id'; });
    content = content.replace(/parseInt\(req\.body\.project_id\)/g, () => { fileReplacements++; return 'req.body.project_id'; });
    content = content.replace(/parseInt\(req\.body\.flat_id\)/g, () => { fileReplacements++; return 'req.body.flat_id'; });
    content = content.replace(/parseInt\(req\.body\.customer_id\)/g, () => { fileReplacements++; return 'req.body.customer_id'; });
    content = content.replace(/parseInt\(req\.body\.employee_id\)/g, () => { fileReplacements++; return 'req.body.employee_id'; });
    content = content.replace(/parseInt\(req\.body\.lead_id\)/g, () => { fileReplacements++; return 'req.body.lead_id'; });
    content = content.replace(/parseInt\(req\.body\.block_id\)/g, () => { fileReplacements++; return 'req.body.block_id'; });
    content = content.replace(/parseInt\(req\.body\.assigned_to_employee_id\)/g, () => { fileReplacements++; return 'req.body.assigned_to_employee_id'; });
    content = content.replace(/parseInt\(req\.body\.lead_stage_id\)/g, () => { fileReplacements++; return 'req.body.lead_stage_id'; });
    content = content.replace(/parseInt\(req\.body\.reporting_head_id\)/g, () => { fileReplacements++; return 'req.body.reporting_head_id'; });
    content = content.replace(/parseInt\(req\.body\.group_owner_id\)/g, () => { fileReplacements++; return 'req.body.group_owner_id'; });
    content = content.replace(/parseInt\(req\.query\.project_id\)/g, () => { fileReplacements++; return 'req.query.project_id'; });
    content = content.replace(/parseInt\(req\.query\.flat_id\)/g, () => { fileReplacements++; return 'req.query.flat_id'; });
    content = content.replace(/parseInt\(req\.query\.customer_id\)/g, () => { fileReplacements++; return 'req.query.customer_id'; });
    content = content.replace(/parseInt\(req\.query\.employee_id\)/g, () => { fileReplacements++; return 'req.query.employee_id'; });
    content = content.replace(/parseInt\(req\.query\.id\)/g, () => { fileReplacements++; return 'req.query.id'; });

    // ── 3. Replace .uuid with .id in object property access ──
    // But be careful not to replace uuid generation patterns
    // Pattern: someObj.uuid → someObj.id (for read access)
    // Skip: uuid: "ABODE..." (assignment patterns handled separately)

    // Replace where clauses: { uuid: ... } → { id: ... }
    content = content.replace(/where:\s*\{\s*uuid:/g, (match) => { fileReplacements++; return match.replace('uuid:', 'id:'); });
    // Fix multi-line where with uuid
    content = content.replace(/uuid:\s*(req\.params\.uuid|req\.params\.id|uuid)/g, (match, val) => {
        fileReplacements++;
        if (val === 'req.params.uuid') return 'id: req.params.id';
        if (val === 'req.params.id') return 'id: req.params.id';
        return 'id: id';
    });

    // ── 4. Replace select: { uuid: true, ... } ──
    content = content.replace(/uuid:\s*true/g, (match) => { fileReplacements++; return 'id: true'; });

    // ── 5. Replace uuid: "ABODE..." or uuid: "CRMEMP..." etc. in create data ──
    // These are UUID generation patterns — replace with proper uuid
    // uuid: "ABODE" + Math.floor(100000000 + Math.random() * 900000000) → (remove, id is auto-generated)
    // uuid: "CRMEMP" + Math.floor(100000000 + Math.random() * 900000000) → (remove)
    // uuid: "ABD" + ... → (remove)
    // We need to remove these lines entirely since id is now auto-generated by Prisma
    content = content.replace(/\s*uuid:\s*["'][A-Z]+["']\s*\+\s*Math\.floor\([^)]+\)\s*,?\r?\n/g, (match) => {
        fileReplacements++;
        return '\n';
    });
    // Also handle the pattern: uuid: `ABODE${...}`
    content = content.replace(/\s*uuid:\s*`[A-Z]+\$\{[^}]+\}`\s*,?\r?\n/g, (match) => {
        fileReplacements++;
        return '\n';
    });

    // ── 6. Replace .id.toString() → .id ──
    content = content.replace(/\.id\.toString\(\)/g, (match) => { fileReplacements++; return '.id'; });

    // ── 7. Replace response objects that return uuid ──
    // data.uuid → data.id (common pattern in responses)
    content = content.replace(/(\w+)\.uuid\b/g, (match, obj) => {
        // Skip if it's part of an assignment like uuid: or "uuid" key
        fileReplacements++;
        return `${obj}.id`;
    });

    // ── 8. Replace remaining parseInt for simple variable IDs ──
    // parseInt(project_id) → project_id
    // parseInt(flat_id) → flat_id
    // etc.
    content = content.replace(/parseInt\(project_id\)/g, () => { fileReplacements++; return 'project_id'; });
    content = content.replace(/parseInt\(flat_id\)/g, () => { fileReplacements++; return 'flat_id'; });
    content = content.replace(/parseInt\(customer_id\)/g, () => { fileReplacements++; return 'customer_id'; });
    content = content.replace(/parseInt\(employee_id\)/g, () => { fileReplacements++; return 'employee_id'; });
    content = content.replace(/parseInt\(lead_id\)/g, () => { fileReplacements++; return 'lead_id'; });
    content = content.replace(/parseInt\(id\)/g, () => { fileReplacements++; return 'id'; });
    content = content.replace(/parseInt\(role_id\)/g, () => { fileReplacements++; return 'role_id'; });
    content = content.replace(/parseInt\(block_id\)/g, () => { fileReplacements++; return 'block_id'; });

    // ── 9. Remove .toString() on known ID variables ──
    content = content.replace(/role_id\.toString\(\)/g, () => { fileReplacements++; return 'role_id'; });
    content = content.replace(/project_id\.toString\(\)/g, () => { fileReplacements++; return 'project_id'; });
    content = content.replace(/employee_id\.toString\(\)/g, () => { fileReplacements++; return 'employee_id'; });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${file}: ${fileReplacements} replacements`);
        totalReplacements += fileReplacements;
    } else {
        console.log(`⏭️  ${file}: no changes needed`);
    }
}

console.log(`\n🎉 Total replacements across all files: ${totalReplacements}`);
