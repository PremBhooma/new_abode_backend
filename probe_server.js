
const https = require('https');

const urls = [
    'https://econestcrmapi.techdino.in/',
    'https://econestcrmapi.techdino.in/settings/get-all-banks',
    'https://econestcrmapi.techdino.in/settings/get-all-banks-list',
    'https://econestcrmapi.techdino.in/employee/get-current-user-permissions',
    'https://econestcrmapi.techdino.in/employee/get-current-users-permissions'
];

urls.forEach(url => {
    https.get(url, (res) => {
        console.log(`URL: ${url} - Status: ${res.statusCode}`);
        res.resume();
    }).on('error', (e) => {
        console.error(`URL: ${url} - Error: ${e.message}`);
    });
});
