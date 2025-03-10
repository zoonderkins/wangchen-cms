const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../public/uploads/links');
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
        cb(null, 'link-' + uniqueSuffix + ext);
    }
});

// Check file type
const fileFilter = (req, file, cb) => {
    // Allowed file extensions
    const filetypes = /jpeg|jpg|png|gif|webp/;
    // Check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime type
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images Only! (jpeg, jpg, png, gif, webp)'));
    }
};

// Initialize upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB max file size
    fileFilter: fileFilter
});

// Middleware to handle single image upload
const uploadLinkImage = (req, res, next) => {
    const uploadSingle = upload.single('image');

    uploadSingle(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    req.flash('error_msg', 'File size is too large. Maximum size is 5MB.');
                } else {
                    req.flash('error_msg', `Multer upload error: ${err.message}`);
                }
            } else {
                req.flash('error_msg', err.message);
            }
            
            // Determine where to redirect based on the route
            if (req.path.includes('/edit/')) {
                const id = req.path.split('/').pop();
                return res.redirect(`/admin/links/edit/${id}`);
            } else {
                return res.redirect('/admin/links/create');
            }
        }
        
        next();
    });
};

module.exports = {
    uploadLinkImage
}; 