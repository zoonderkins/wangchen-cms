const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Get allowed file types from environment variables or use defaults
const ALLOWED_PROMOTION_IMAGE_TYPES = process.env.ALLOWED_PROMOTION_IMAGE_TYPES || 'jpg,jpeg,png,gif,webp';
const MAX_PROMOTION_IMAGE_SIZE = parseInt(process.env.MAX_PROMOTION_IMAGE_SIZE) || 5 * 1024 * 1024; // 5MB default

// Parse allowed types
const allowedExtensions = ALLOWED_PROMOTION_IMAGE_TYPES.split(',').map(ext => `.${ext.trim().toLowerCase()}`);

// Map of common file extensions to MIME types
const mimeTypeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
};

// Generate allowed MIME types based on allowed extensions
const allowedMimeTypes = allowedExtensions
    .map(ext => mimeTypeMap[ext])
    .filter(Boolean);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../public/uploads/promotions');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Created directory: ${uploadDir}`);
}

// Define the URL path for serving the images (without 'public' prefix)
const urlPath = 'uploads/promotions';

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create year/month folder structure
        const now = new Date();
        const yearMonth = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const uploadPath = `${uploadDir}/${yearMonth}`;
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `promotion-${uniqueSuffix}${ext}`);
    }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(ext);
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    
    if (isValidExtension && isValidMimeType) {
        cb(null, true);
    } else {
        cb(new Error(`Only image files (${ALLOWED_PROMOTION_IMAGE_TYPES.toUpperCase()}) are allowed!`), false);
    }
};

// Create multer upload instance
const upload = multer({
    storage,
    limits: {
        fileSize: MAX_PROMOTION_IMAGE_SIZE
    },
    fileFilter
});

// Middleware function
const promotionImageUpload = (req, res, next) => {
    logger.info('Promotion image upload middleware started');
    
    // Log the request content type to debug multipart/form-data issues
    logger.info(`Request Content-Type: ${req.headers['content-type']}`);
    
    const uploadHandler = upload.single('image');
    
    uploadHandler(req, res, (err) => {
        if (err) {
            logger.error(`Error uploading promotion image: ${err.message}`, err);
            req.flash('error_msg', `Error uploading image: ${err.message}`);
            
            // Determine where to redirect based on the route
            const redirectPath = req.path.includes('/edit/') 
                ? `/admin/promotions/items/edit/${req.params.id}` 
                : '/admin/promotions/items/create';
            
            return res.redirect(redirectPath);
        }
        
        // Log success information
        if (req.file) {
            // Store the URL path (not the filesystem path) in req.file.url for easy access
            // This is what should be used for displaying the image in HTML
            const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '/');
            req.file.url = `/${urlPath}/${yearMonth}/${req.file.filename}`;
            
            // Store the relative path (without 'public') for database storage
            req.file.relativePath = `${urlPath}/${yearMonth}/${req.file.filename}`;
            
            logger.info(`File uploaded successfully: ${JSON.stringify({
                filename: req.file.filename,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.path,
                url: req.file.url,
                relativePath: req.file.relativePath
            })}`);
        } else {
            logger.info('No file was uploaded (this is normal if no image field was provided)');
        }
        
        next();
    });
};

module.exports = promotionImageUpload;
