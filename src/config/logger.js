const winston = require('winston');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure log directory exists
const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Configure logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'wangchen-backend' },
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(logDir, process.env.LOG_FILE_ERROR || 'error.log'),
            level: 'error',
            maxsize: process.env.LOG_MAX_SIZE || 10485760, // 10MB
            maxFiles: process.env.LOG_MAX_FILES || 7,
            tailable: true
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(logDir, process.env.LOG_FILE_COMBINED || 'combined.log'),
            maxsize: process.env.LOG_MAX_SIZE || 10485760, // 10MB
            maxFiles: process.env.LOG_MAX_FILES || 7,
            tailable: true
        })
    ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;
