const express = require('express');
const router = express.Router();
const pageImageController = require('../controllers/pageImageController');
const { isAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'public', 'images');
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
});

// Routes
router.get('/', isAuthenticated, pageImageController.listPageImages);
router.get('/create', isAuthenticated, pageImageController.renderCreateForm);
router.post('/', isAuthenticated, upload.single('image'), pageImageController.createPageImage);
router.get('/edit/:id', isAuthenticated, pageImageController.renderEditForm);
router.post('/edit/:id', isAuthenticated, upload.single('image'), pageImageController.updatePageImage);
router.get('/delete/:id', isAuthenticated, pageImageController.deletePageImage);
router.get('/toggle/:id', isAuthenticated, pageImageController.toggleStatus);

module.exports = router;
