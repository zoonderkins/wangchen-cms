const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Get allowed file types from environment variables or use defaults
const ALLOWED_LINK_IMAGE_TYPES = process.env.ALLOWED_LINK_IMAGE_TYPES || 'jpg,jpeg,png,gif,webp';
const MAX_LINK_IMAGE_SIZE = parseInt(process.env.MAX_LINK_IMAGE_SIZE) || 5 * 1024 * 1024; // 5MB default

// Parse allowed types
const allowedExtensions = ALLOWED_LINK_IMAGE_TYPES.split(',').map(ext => `.${ext.trim().toLowerCase()}`);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../public/uploads/links');
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
        cb(null, 'link-' + uniqueSuffix + ext);
    }
});

// Check file type
const fileFilter = (req, file, cb) => {
    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(ext);
    
    // Check mime type
    const isValidMimeType = file.mimetype.startsWith('image/') && 
        ALLOWED_LINK_IMAGE_TYPES.split(',').some(type => 
            file.mimetype === `image/${type}` || 
            (type === 'jpg' && file.mimetype === 'image/jpeg')
        );

    if (isValidMimeType && isValidExtension) {
        return cb(null, true);
    } else {
        cb(new Error(`Error: Images Only! (${ALLOWED_LINK_IMAGE_TYPES.toUpperCase()})`));
    }
};

// Initialize upload
const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_LINK_IMAGE_SIZE },
    fileFilter: fileFilter
});

// Middleware to handle single image upload
const uploadLinkImage = (req, res, next) => {
    const uploadSingle = upload.single('image');

    uploadSingle(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    req.flash('error_msg', `File size is too large. Maximum size is ${MAX_LINK_IMAGE_SIZE / (1024 * 1024)}MB.`);
                } else {
                    req.flash('error_msg', `Multer upload error: ${err.message}`);
                }
            } else {
                req.flash('error_msg', err.message);
            }
            
            // Determine where to redirect based on the route
            if (req.path.includes('/links/')) {
                const id = req.params.id;
                if (id) {
                    return res.redirect(`/admin/links/edit/${id}`);
                }
            }
            return res.redirect('/admin/links/create');
        }
        
        next();
    });
};

module.exports = {
    uploadLinkImage
}; 