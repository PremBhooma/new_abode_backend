const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'controllers');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
let totalReplaced = 0;

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Pattern to catch 'serializeresult', 'serializeemployeesData' etc
    // but SKIP 'serializeBigInt' (the function name)
    // and SKIP 'serialized*' (like serializedCustomernotes)
    content = content.replace(/\bserialize(?!d|D|BigInt)([a-zA-Z0-9_]+)\b/g, (match, p1) => {
        console.log(`Matched ${match} -> ${p1} in ${file}`);
        return p1;
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        totalReplaced++;
        console.log(`Updated ${file}`);
    }
});
console.log('Total files updated: ' + totalReplaced);
