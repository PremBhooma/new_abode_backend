const fs = require('fs');
const path = require('path');

const controllersDir = 'd:/qtis/new_abode/new_abode_backend/controllers';

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace .uuid with .id (property access)
    content = content.replace(/\.uuid\b/g, '.id');

    // Replace .customer_uid, .lead_uid, etc. with .id (if they were used for legacy IDs)
    content = content.replace(/\.customer_uuid\b/g, '.id');
    content = content.replace(/\.flat_uuid\b/g, '.id');
    content = content.replace(/\.lead_uuid\b/g, '.id');
    content = content.replace(/\.employee_uuid\b/g, '.id');
    content = content.replace(/\.payment_uuid\b/g, '.id');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${path.basename(filePath)}`);
    }
}

const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));
files.forEach(f => fixFile(path.join(controllersDir, f)));
console.log('Done.');
