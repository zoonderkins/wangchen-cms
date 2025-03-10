const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);
const logger = require('../config/logger');

// Configure multer storage for page attachments
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            // For new pages, use a temporary directory
            let uploadDir = path.join(__dirname, '../../public/uploads/page/temp');
            
            // For existing pages, use the page's directory
            if (req.params.id) {
                uploadDir = path.join(__dirname, '../../public/uploads/page', req.params.id);
            }
            
            // Ensure the directory exists
            await mkdirAsync(uploadDir, { recursive: true });
            
            cb(null, uploadDir);
        } catch (error) {
            logger.error('Error creating page upload directory:', error);
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
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // Videos
        'video/mp4'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed types: JPG, PNG, PDF, Word, Excel, MP4'));
    }
};

// Create the multer upload instance
const upload = multer({
    storage,
    limits: {
        fileSize: process.env.MAX_FILE_SIZE || 50 * 1024 * 1024 // 50MB default
    },
    fileFilter
});

// Middleware to handle file uploads
const pageAttachmentUpload = upload.array('attachments', 10); // Allow up to 10 files

// Error handling middleware
const handlePageAttachmentUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        logger.error('Multer error during page attachment upload:', err);
        req.flash('error_msg', `Upload error: ${err.message}`);
        
        // Redirect based on whether it's a create or edit operation
        if (req.params.id) {
            return res.redirect(`/admin/pages/edit/${req.params.id}`);
        } else {
            return res.redirect('/admin/pages/create');
        }
    } else if (err) {
        // An unknown error occurred
        logger.error('Unknown error during page attachment upload:', err);
        req.flash('error_msg', `Upload error: ${err.message}`);
        
        // Redirect based on whether it's a create or edit operation
        if (req.params.id) {
            return res.redirect(`/admin/pages/edit/${req.params.id}`);
        } else {
            return res.redirect('/admin/pages/create');
        }
    }
    
    // If no error, proceed to the next middleware
    next();
};

// Export both the upload middleware and error handler
module.exports = [pageAttachmentUpload, handlePageAttachmentUploadError];
