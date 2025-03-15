const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);
const logger = require('../config/logger');

// Get allowed file types from environment variables or use defaults
const ALLOWED_PAGE_ATTACHMENT_TYPES = process.env.ALLOWED_PAGE_ATTACHMENT_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,mp4';
const MAX_PAGE_ATTACHMENT_SIZE = parseInt(process.env.MAX_PAGE_ATTACHMENT_SIZE) || 50 * 1024 * 1024; // 50MB default

// Parse allowed types
const allowedExtensions = ALLOWED_PAGE_ATTACHMENT_TYPES.split(',').map(ext => `.${ext.trim().toLowerCase()}`);

// Map of common file extensions to MIME types
const mimeTypeMap = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Videos
    '.mp4': 'video/mp4'
};

// Generate allowed MIME types based on allowed extensions
const allowedMimeTypes = allowedExtensions
    .map(ext => mimeTypeMap[ext])
    .filter(Boolean);

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
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(ext);
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    
    if (isValidExtension && isValidMimeType) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_PAGE_ATTACHMENT_TYPES.toUpperCase()}`));
    }
};

// Create the multer upload instance
const upload = multer({
    storage,
    limits: {
        fileSize: MAX_PAGE_ATTACHMENT_SIZE,
        fieldSize: 200 * 1024 * 1024 // 200MB limit for form fields (for Quill editor content)
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
        
        let errorMessage = `Upload error: ${err.message}`;
        
        // Provide more specific error messages
        if (err.code === 'LIMIT_FILE_SIZE') {
            errorMessage = `File size too large. Maximum size is ${MAX_PAGE_ATTACHMENT_SIZE / (1024 * 1024)}MB`;
        } else if (err.code === 'LIMIT_FIELD_VALUE') {
            errorMessage = `Content size too large. Please reduce the size of your content or split it into multiple pages.`;
        }
        
        req.flash('error_msg', errorMessage);
        
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
