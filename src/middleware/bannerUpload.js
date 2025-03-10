const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../public/uploads/banners');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'banner-' + uniqueSuffix + ext);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || 
        file.mimetype === 'video/mp4') {
        cb(null, true);
    } else {
        cb(new Error('Only images and MP4 videos are allowed!'), false);
    }
};

// Create the multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB max file size
    },
    fileFilter: fileFilter
});

// Middleware to handle file upload errors
const handleUploadErrors = (req, res, next) => {
    const bannerUpload = upload.single('media');

    bannerUpload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            if (err.code === 'LIMIT_FILE_SIZE') {
                req.flash('error_msg', 'File too large. Maximum size is 20MB.');
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
