const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);
const logger = require('../config/logger');

// Get allowed file types from environment variables or use defaults
const ALLOWED_DOWNLOAD_TYPES = process.env.ALLOWED_DOWNLOAD_TYPES || 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,zip,rar';
const MAX_DOWNLOAD_SIZE = parseInt(process.env.MAX_DOWNLOAD_SIZE) || 50 * 1024 * 1024; // 50MB default

// Parse allowed types
const allowedExtensions = ALLOWED_DOWNLOAD_TYPES.split(',').map(ext => `.${ext.trim().toLowerCase()}`);

// Map of common file extensions to MIME types
const mimeTypeMap = {
    // Document types
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    // Archives
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed'
};

// Generate allowed MIME types based on allowed extensions
const allowedMimeTypes = allowedExtensions
    .map(ext => mimeTypeMap[ext])
    .filter(Boolean);

// Configure multer storage for downloads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            // Create uploads/downloads directory if it doesn't exist
            const uploadDir = path.join(__dirname, '../../public/uploads/downloads');
            await mkdirAsync(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            logger.error('Error creating download upload directory:', error);
            cb(new Error('Failed to create upload directory'));
        }
    },
    filename: (req, file, cb) => {
        // Generate a unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// File filter to only allow certain file types
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(ext);
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    
    if (isValidExtension && isValidMimeType) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_DOWNLOAD_TYPES.toUpperCase()}`));
    }
};

// Create the multer upload instance
const upload = multer({
    storage,
    limits: {
        fileSize: MAX_DOWNLOAD_SIZE
    },
    fileFilter
});

// Middleware to handle file uploads
const downloadFileUpload = upload.single('file');

// Error handling middleware
const handleDownloadFileUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        logger.error('Multer error during download file upload:', err);
        req.flash('error_msg', `Upload error: ${err.message}`);
        
        // Redirect based on whether it's a create or edit operation
        if (req.params.id && req.params.id.trim() !== '') {
            return res.redirect(`/admin/downloads/edit/${req.params.id}`);
        } else {
            return res.redirect('/admin/downloads/create');
        }
    } else if (err) {
        // An unknown error occurred
        logger.error('Unknown error during download file upload:', err);
        req.flash('error_msg', `Upload error: ${err.message}`);
        
        // Redirect based on whether it's a create or edit operation
        if (req.params.id && req.params.id.trim() !== '') {
            return res.redirect(`/admin/downloads/edit/${req.params.id}`);
        } else {
            return res.redirect('/admin/downloads/create');
        }
    }
    
    // If no error, proceed to the next middleware
    next();
};

// Export both the upload middleware and error handler
module.exports = [downloadFileUpload, handleDownloadFileUploadError];
