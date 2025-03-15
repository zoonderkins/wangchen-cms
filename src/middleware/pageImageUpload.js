const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pageimages');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'page-image-' + uniqueSuffix + ext);
    }
});

// Create upload middleware
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允許上傳圖片檔案'), false);
        }
    }
}).single('image');

// Export middleware
module.exports = (req, res, next) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            req.flash('error_msg', `上傳錯誤: ${err.message}`);
            if (req.params.id) {
                return res.redirect(`/admin/pageImages/edit/${req.params.id}`);
            }
            return res.redirect('/admin/pageImages/create');
        } else if (err) {
            // An unknown error occurred
            req.flash('error_msg', `上傳錯誤: ${err.message}`);
            if (req.params.id) {
                return res.redirect(`/admin/pageImages/edit/${req.params.id}`);
            }
            return res.redirect('/admin/pageImages/create');
        }
        // Everything went fine
        next();
    });
};
