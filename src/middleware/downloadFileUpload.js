const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);
const logger = require('../config/logger');

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
    // Allowed file types
    const allowedTypes = [
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        // Archives
        'application/zip',
        'application/x-rar-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed types: PDF, Word, Excel, JPG, PNG, ZIP, RAR'));
    }
};

// Create the multer upload instance
const upload = multer({
    storage,
    limits: {
        fileSize: process.env.MAX_DOWNLOAD_SIZE || 50 * 1024 * 1024 // 50MB default
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
        if (req.params.id) {
            return res.redirect(`/admin/downloads/edit/${req.params.id}`);
        } else {
            return res.redirect('/admin/downloads/create');
        }
    } else if (err) {
        // An unknown error occurred
        logger.error('Unknown error during download file upload:', err);
        req.flash('error_msg', `Upload error: ${err.message}`);
        
        // Redirect based on whether it's a create or edit operation
        if (req.params.id) {
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
