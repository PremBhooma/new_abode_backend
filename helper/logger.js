const winston = require('winston');
require('winston-daily-rotate-file');
const moment = require('moment-timezone');

// Define a daily rotating file transport
const transport = new winston.transports.DailyRotateFile({
    filename: 'logs/app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,        // compress old logs
    maxSize: '20m',
    maxFiles: '14d',
});

const logger = winston.createLogger({
    level: 'info',  // can be 'error', 'warn', 'debug', etc.
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), // IST timezone
        }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        transport,
        new winston.transports.Console(), // also log to console
    ],
});

module.exports = logger;
