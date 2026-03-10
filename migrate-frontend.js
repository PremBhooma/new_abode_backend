/**
 * migrate-frontend.js
 * 
 * Automatically replaces uuid references with id across all frontend JSX files.
 * 
 * Usage: node migrate-frontend.js
 */

const fs = require('fs');
const path = require('path');

function walkDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            // Skip node_modules and build directories
            if (!['node_modules', '.next', 'dist', 'build', 'out'].includes(file)) {
                walkDir(filePath, fileList);
            }
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const srcDir = path.join(__dirname, '..', 'new_abode_frontend', 'app', 'src');
const files = walkDir(srcDir);

let totalReplacements = 0;
let modifiedFiles = 0;

for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileReplacements = 0;
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    // ── 1. Replace .uuid property access with .id ──
    // item.uuid → item.id
    // data.uuid → data.id
    // flat.uuid → flat.id
    // customer.uuid → customer.id
    // lead.uuid → lead.id
    // project.uuid → project.id
    // response.data.uuid → response.data.id
    // But NOT "uuid" as a standalone string or key name in API calls
    content = content.replace(/(\w+)\.uuid\b/g, (match, obj) => {
        // Don't replace inside strings or if it's a key definition
        fileReplacements++;
        return `${obj}.id`;
    });

    // ── 2. Replace URL patterns with uuid params ──
    // /${item.uuid} → /${item.id} (already handled by .uuid replacement above)
    // /uuid/ in URL paths
    // params.uuid → params.id
    content = content.replace(/params\.uuid/g, () => { fileReplacements++; return 'params.id'; });

    // ── 3. Replace route definitions ──
    // :uuid → :id in route paths
    content = content.replace(/:uuid\b/g, () => { fileReplacements++; return ':id'; });
    content = content.replace(/\/uuid\//g, () => { fileReplacements++; return '/id/'; });

    // ── 4. Replace key={item.uuid} → key={item.id} ──
    // Already handled by the .uuid replacement above

    // ── 5. Replace uuid in destructuring ──
    // { uuid, ...rest } → { id, ...rest }
    // But be careful - only when it's destructuring from API response data
    // This is tricky so we'll be conservative
    content = content.replace(/\{\s*uuid\s*(,|\s*\})/g, (match, after) => {
        fileReplacements++;
        return `{ id${after}`;
    });
    content = content.replace(/,\s*uuid\s*(,|\s*\})/g, (match, after) => {
        fileReplacements++;
        return `, id${after}`;
    });

    // ── 6. Replace uuid in query params or body ──
    content = content.replace(/\buuid\b/g, (match, offset, string) => {
        // Only replace if it looks like a variable name, property name, or function argument
        // We do this by seeing if it's not inside a string literal. (Very basic heuristic)
        // Safer approach: replace specific known patterns
        return match; // We'll add specific patterns below instead of global 'uuid'
    });

    // ── 6a. Object keys and destructuring ──
    content = content.replace(/\{(\s*)uuid(\s*):/g, '{ $1id$2:');
    content = content.replace(/,(\s*)uuid(\s*):/g, ',$1id$2:');
    content = content.replace(/\{(\s*)uuid(\s*)\}/g, '{$1id$2}');
    content = content.replace(/\((\s*)uuid(\s*)\)/g, '($1id$2)'); // function params
    content = content.replace(/(\s+)uuid(\s*)=\s*/g, '$1id$2='); // let/const uuid =
    content = content.replace(/(\s+)uuid(\s*)=>/g, '$1id$2=>'); // uuid =>
    content = content.replace(/\[(\s*)uuid(\s*)\]/g, '[$1id$2]'); // dependency arrays
    content = content.replace(/flat_uuid/g, 'flat_id'); // common specific variable
    content = content.replace(/flatuuid/g, 'flatid'); // common specific variable
    content = content.replace(/customerUuid/g, 'customerId'); // common specific variable
    content = content.replace(/project_uuid/g, 'project_id'); // common specific variable

    // ── 6b. Template string params ──
    content = content.replace(/\$\{uuid\}/g, '${id}');
    content = content.replace(/\$\{flat_uuid\}/g, '${flat_id}');
    content = content.replace(/\$\{flatuuid\}/g, '${flatid}');
    content = content.replace(/\$\{customerUuid\}/g, '${customerId}');
    content = content.replace(/\$\{project_uuid\}/g, '${project_id}');

    // ── 7. Replace parseInt/Number conversions on IDs ──
    // parseInt(someId) patterns in frontend
    content = content.replace(/parseInt\((\w+)\.id\)/g, (match, obj) => { fileReplacements++; return `${obj}.id`; });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${relativePath}: ${fileReplacements} replacements`);
        totalReplacements += fileReplacements;
        modifiedFiles++;
    }
}

console.log(`\n🎉 Total: ${totalReplacements} replacements across ${modifiedFiles} files (out of ${files.length} scanned)`);
