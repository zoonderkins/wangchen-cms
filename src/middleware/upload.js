const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Get allowed file types from environment variables or use defaults
const ALLOWED_UPLOAD_TYPES = process.env.ALLOWED_UPLOAD_TYPES || 'jpg,jpeg,png,gif,mp4,mov,avi,pdf,docx,xlsx,xml,zip';
const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE) || 50 * 1024 * 1024; // 50MB default

// Parse allowed types
const allowedExtensions = ALLOWED_UPLOAD_TYPES.split(',').map(ext => `.${ext.trim().toLowerCase()}`);

// Map of common file extensions to MIME types
const mimeTypeMap = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    // Videos
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    // Documents
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xml': 'application/xml',
    // Archives
    '.zip': 'application/zip'
};

// Generate allowed MIME types based on allowed extensions
const allowedMimeTypes = allowedExtensions
    .map(ext => mimeTypeMap[ext])
    .filter(Boolean);

// Create upload directory if it doesn't exist
const uploadDir = path.join(process.cwd(), process.env.UPLOAD_PATH || 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Created directory: ${uploadDir}`);
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        const uploadPath = path.join(uploadDir, `${year}/${month}`);
        
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(ext);
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    
    if (isValidExtension && isValidMimeType) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_UPLOAD_TYPES.toUpperCase()}`), false);
    }
};

// Create multer upload instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_UPLOAD_SIZE
    }
});

// Error handler middleware
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: `File size too large. Maximum size is ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB`
            });
        }
        logger.error('Multer error:', err);
        return res.status(400).json({ error: err.message });
    }
    
    if (err) {
        logger.error('Upload error:', err);
        return res.status(400).json({ error: err.message });
    }
    next();
};

module.exports = {
    upload,
    handleUploadError
};
