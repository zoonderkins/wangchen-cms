const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Get allowed file types from environment variables or use defaults
const ALLOWED_BANNER_TYPES = process.env.ALLOWED_BANNER_TYPES || 'jpg,jpeg,png,gif,webp,mp4';
const MAX_BANNER_SIZE = parseInt(process.env.MAX_BANNER_SIZE) || 20 * 1024 * 1024; // 20MB default

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../public/uploads/banners');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Created directory: ${uploadDir}`);
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        
        // Add suffix based on field name
        let suffix = '';
        if (file.fieldname === 'mediaDesktop') {
            suffix = '-desktop';
        } else if (file.fieldname === 'mediaTablet') {
            suffix = '-tablet';
        } else if (file.fieldname === 'mediaMobile') {
            suffix = '-mobile';
        }
        
        cb(null, 'banner-' + uniqueSuffix + suffix + ext);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Parse allowed types
    const allowedTypes = ALLOWED_BANNER_TYPES.split(',').map(type => type.trim().toLowerCase());
    
    // Accept images and videos based on environment variable
    if ((file.mimetype.startsWith('image/') && allowedTypes.some(type => ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type))) || 
        (file.mimetype === 'video/mp4' && allowedTypes.includes('mp4'))) {
        cb(null, true);
    } else {
        cb(new Error(`Only ${ALLOWED_BANNER_TYPES.toUpperCase()} files are allowed!`), false);
    }
};

// Create the multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_BANNER_SIZE
    },
    fileFilter: fileFilter
});

// Middleware to handle file upload errors
const handleUploadErrors = (req, res, next) => {
    const bannerUpload = upload.fields([
        { name: 'media', maxCount: 1 },
        { name: 'mediaDesktop', maxCount: 1 },
        { name: 'mediaTablet', maxCount: 1 },
        { name: 'mediaMobile', maxCount: 1 }
    ]);

    bannerUpload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            if (err.code === 'LIMIT_FILE_SIZE') {
                req.flash('error_msg', `File too large. Maximum size is ${MAX_BANNER_SIZE / (1024 * 1024)}MB.`);
            } else {
                req.flash('error_msg', `Upload error: ${err.message}`);
            }
            return res.redirect('back');
        } else if (err) {
            // An unknown error occurred
            req.flash('error_msg', err.message);
            return res.redirect('back');
        }
        
        // Everything went fine
        next();
    });
};

module.exports = handleUploadErrors;