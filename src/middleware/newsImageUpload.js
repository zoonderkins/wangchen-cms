const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../public/uploads/news');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Define the URL path for serving the images (without 'public' prefix)
const urlPath = '/uploads/news';

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use the main uploads/news directory directly
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `news-${uniqueSuffix}${ext}`);
    }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Create multer upload instance
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter
});

// Middleware function
const newsImageUpload = (req, res, next) => {
    logger.info('News image upload middleware started');
    
    // Log the request content type to debug multipart/form-data issues
    logger.info(`Request Content-Type: ${req.headers['content-type']}`);
    
    const uploadHandler = upload.single('image');
    
    uploadHandler(req, res, (err) => {
        if (err) {
            logger.error(`Error uploading news image: ${err.message}`, err);
            req.flash('error_msg', `Error uploading image: ${err.message}`);
            
            // Determine where to redirect based on the route
            const redirectPath = req.path.includes('/edit/') 
                ? `/admin/news/items/edit/${req.params.id}` 
                : '/admin/news/items/create';
            
            return res.redirect(redirectPath);
        }
        
        // Log success information
        if (req.file) {
            // Store the URL path (not the filesystem path) in req.file.url for easy access
            // This is what should be used for displaying the image in HTML
            req.file.url = `${urlPath}/${req.file.filename}`;
            
            // Store the relative path for database storage
            req.file.relativePath = `${urlPath}/${req.file.filename}`;
            
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

module.exports = newsImageUpload;
