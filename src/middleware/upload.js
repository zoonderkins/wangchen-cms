const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Create upload directory if it doesn't exist
const uploadDir = path.join(process.cwd(), process.env.UPLOAD_PATH || 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
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
    const allowedMimes = [
        // Images
        'image/jpeg', 'image/png', 'image/gif',
        // Videos
        'video/mp4', 'video/quicktime', 'video/x-msvideo',
        // Documents
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/xml',
        // Archives
        'application/zip'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};

// Create multer upload instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 // Default 50MB
    }
});

// Error handler middleware
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File size too large. Maximum size is ' + 
                    (parseInt(process.env.MAX_FILE_SIZE) / (1024 * 1024)) + 'MB'
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
