const envpath = require('dotenv')
const express = require('express')
const path = require("path");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cors = require("cors");
const os = require('os');
const Papa = require('papaparse');

const prisma = require('./utils/client');
const fs = require('fs').promises; // Correct import for asynchronous file operations
const app = express()

// app.use(compression());
envpath.config()

const corsOptions = {
  origin: true,
  credentials: true,
  methods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  exposedHeaders: ['Content-Disposition']
}

app.use(cors(corsOptions));
app.use(helmet());                      // Add security headers
app.use(express.json());               // <-- Parse JSON body
app.use(express.urlencoded({ extended: true })); // <-- Optional: parse URL-encoded data


const authRoute = require("./routes/authRoute");
const generalRoute = require("./routes/generalRoute");
const employeeRoute = require("./routes/employeeRoute");
const settingsRoute = require('./routes/settingsRoute');
const customerRoute = require("./routes/customerRoute");
const projectRoute = require("./routes/projectRoute");
const flatRoute = require("./routes/flatRoute");
const payments = require("./routes/paymentRoute");
const flatdocuments = require("./routes/flatdocumentsRoute");
const customerdocuments = require("./routes/customerdocumentRoute");
const dashboardRoute = require("./routes/dashboardRoute");
const groupOwnerRoute = require("./routes/groupOwnerRoute");
const leadsRoute = require("./routes/leadsRoute");
const ageingRecordsRoute = require("./routes/ageingRecordsRoute");
const leaddocumentRoute = require("./routes/leaddocumentRoute");


// Auth router
app.use("/auth", authRoute);
app.use("/employee", employeeRoute);
app.use("/general", generalRoute);
app.use('/settings', settingsRoute);
app.use('/customer', customerRoute);
app.use('/project', projectRoute);
app.use('/flat', flatRoute);
app.use('/payments', payments);
app.use('/flatdocuments', flatdocuments);
app.use('/customerdocuments', customerdocuments);
app.use('/leaddocument', leaddocumentRoute);
app.use('/dashboard', dashboardRoute);
app.use('/groupowner', groupOwnerRoute);
app.use('/leads', leadsRoute);
app.use('/ageing-records', ageingRecordsRoute);



app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res, path) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
  },
}))

app.get('/', (req, res) => {
  res.send('Welcome to the API')
})

app.use("/auth", authRoute);

// app.get("/impordata", async (res, req) => {
//   const csv_read_data = await fs.readFile(req.file.path, 'utf8');
// });

app.get('/impordata', async (req, res) => {
  try {
    // Read the CSV file
    const csvData = await fs.readFile('countriesnew.csv', 'utf8');

    // Parse CSV data with PapaParse
    const results = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (header) => header.trim().replace(/^"|"$/g, ''),
      transform: (value, header) => {
        let cleaned = value.trim().replace(/^"|"$/g, '');
        if (header === 'latitude' || header === 'longitude') {
          return cleaned === '' || isNaN(cleaned) ? null : parseFloat(cleaned);
        }
        return cleaned === '' ? null : cleaned;
      },
    });


    // Process and clean data
    const cleanedData = results.data.map((row) => ({
      id: parseInt(row['id'], 10) || null,
      name: row['name'] || null,
      iso3: row['iso3'] || null,
      iso2: row['iso2'] || null,
      phone_code: row['phone_code'] || null,
      currency: row['currency'] || null,
      currency_symbol: row['currency_symbol'] || null,
      latitude: row['latitude'],
      longitude: row['longitude'],
      flag: row['flag'] || null,
      timezone_name: row['timezone_name'] || null,
      timezone_utc: row['timezone_utc'] || null,
    }));

    // Filter out invalid rows
    const validData = cleanedData.filter(
      (row) =>
        row.id !== null &&
        !isNaN(row.id) &&
        row.name !== null &&
        row.iso3 !== null &&
        row.iso2 !== null
    );

    // Insert data into the database
    await prisma.country.createMany({
      data: validData,
      skipDuplicates: true,
    });

    // Send success response
    res.status(200).json({
      message: `Successfully imported ${validData.length} countries`,
      importedCount: validData.length,
    });
  } catch (error) {
    // Handle errors
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Resource not found"
  })
})

// Get Local IP Address
const getLocalIP = () => {
  const networkInterfaces = os.networkInterfaces();
  for (let iface in networkInterfaces) {
    for (let i = 0; i < networkInterfaces[iface].length; i++) {
      const address = networkInterfaces[iface][i];
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
};

const IP_ADDRESS = getLocalIP();
console.log('Local IP Address:', IP_ADDRESS);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

