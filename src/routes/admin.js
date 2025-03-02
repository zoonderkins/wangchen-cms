const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const { isAuthenticated, hasRole, hasPermission, isOwnerOrHasPermission } = require('../middleware/auth');
const { handleUploadError } = require('../middleware/uploadMiddleware');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// Controllers
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const articleController = require('../controllers/articleController');
const mediaController = require('../controllers/mediaController');
const dashboardController = require('../controllers/dashboardController');
const categoryController = require('../controllers/categoryController');
const categoryPermissionController = require('../controllers/categoryPermissionController');
const bannerController = require('../controllers/bannerController');
const pageController = require('../controllers/pageController');
const faqController = require('../controllers/faqController');
const downloadController = require('../controllers/downloadController');

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024 // 5MB default
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Public routes (no auth required)
router.get('/login', authController.renderLoginForm);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Protected routes
router.use(isAuthenticated);

// Add path to res.locals for active menu highlighting
router.use((req, res, next) => {
    res.locals.path = req.path;
    next();
});

// Root admin route - redirect to dashboard
router.get('/', (req, res) => {
    res.redirect('/admin/dashboard');
});

// Dashboard
router.get('/dashboard', hasPermission('access:dashboard'), dashboardController.renderDashboard);

// Article routes
router.get('/articles', hasPermission('article:list'), articleController.listArticles);
router.get('/articles/create', hasPermission('article:create'), articleController.renderCreateForm);
router.post('/articles', hasPermission('article:create'), articleController.createArticle);

// Article edit routes with ownership check
router.get('/articles/edit/:id', 
    isOwnerOrHasPermission('article:edit_all', async (req) => {
        const article = await prisma.article.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        return article ? article.authorId : null;
    }), 
    articleController.renderEditForm
);

router.post('/articles/edit/:id', 
    isOwnerOrHasPermission('article:edit_all', async (req) => {
        const article = await prisma.article.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        return article ? article.authorId : null;
    }), 
    articleController.updateArticle
);

router.post('/articles/delete/:id', 
    isOwnerOrHasPermission('article:delete_all', async (req) => {
        const article = await prisma.article.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        return article ? article.authorId : null;
    }), 
    articleController.deleteArticle
);

// Category management routes
router.get('/categories', hasPermission('category:list'), categoryController.listCategories);
router.get('/categories/create', hasPermission('category:create'), categoryController.renderCreateCategory);
router.post('/categories', hasPermission('category:create'), categoryController.createCategory);
router.get('/categories/edit/:id', hasPermission('category:edit'), categoryController.renderEditCategory);
router.post('/categories/edit/:id', hasPermission('category:edit'), categoryController.updateCategory);
router.post('/categories/:id/delete', hasPermission('category:delete'), categoryController.deleteCategory);

// User management routes
router.get('/users', hasRole(['super_admin']), userController.listUsers);
router.get('/users/create', hasRole(['super_admin']), userController.renderCreateUser);
router.post('/users', 
    hasRole(['super_admin']),
    [
        body('username').trim().isLength({ min: 3 }).escape(),
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 })
    ],
    userController.createUser
);
router.get('/users/edit/:id', hasRole(['super_admin']), userController.renderEditUser);
router.post('/users/edit/:id', 
    hasRole(['super_admin']),
    userController.updateUser
);
router.post('/users/delete/:id', hasRole(['super_admin']), userController.deleteUser);

// Category permission routes
router.get('/users/:userId/category-permissions', 
    hasPermission('category:manage_permissions'),
    categoryPermissionController.getCategoryPermissions
);

router.post('/users/:userId/category-permissions',
    hasPermission('category:manage_permissions'),
    categoryPermissionController.assignCategoryPermissions
);

// Media routes
router.get('/media', hasPermission('manage_media'), mediaController.listMedia);

router.post('/media/upload',
    hasPermission('manage_media'),
    upload.single('file'),
    handleUploadError,
    mediaController.uploadMedia
);

router.post('/media/:id/delete',
    hasPermission('manage_media'),
    mediaController.deleteMedia
);

router.get('/media/:id',
    hasPermission('manage_media'),
    mediaController.getMediaDetails
);

// Banner routes
const bannerUpload = require('../middleware/bannerUpload');

router.get('/banners', hasRole(['super_admin', 'admin', 'editor']), bannerController.listBanners);
router.get('/banners/create', hasRole(['super_admin', 'admin', 'editor']), bannerController.renderCreateBanner);
router.post('/banners', hasRole(['super_admin', 'admin', 'editor']), bannerUpload, bannerController.createBanner);
router.get('/banners/edit/:id', hasRole(['super_admin', 'admin', 'editor']), bannerController.renderEditBanner);
router.post('/banners/edit/:id', hasRole(['super_admin', 'admin', 'editor']), bannerUpload, bannerController.updateBanner);
router.post('/banners/toggle/:id', hasRole(['super_admin', 'admin', 'editor']), bannerController.toggleBannerStatus);
router.delete('/banners/:id', hasRole(['super_admin', 'admin', 'editor']), bannerController.deleteBanner);

// Page routes
const pageAttachmentUpload = require('../middleware/pageAttachmentUpload');

router.get('/pages', hasRole(['super_admin', 'admin', 'editor']), pageController.listPages);
router.get('/pages/create', hasRole(['super_admin', 'admin', 'editor']), pageController.renderCreatePage);
router.post('/pages', hasRole(['super_admin', 'admin', 'editor']), pageAttachmentUpload, pageController.createPage);
router.get('/pages/edit/:id', hasRole(['super_admin', 'admin', 'editor']), pageController.renderEditPage);
router.post('/pages/:id', hasRole(['super_admin', 'admin', 'editor']), pageAttachmentUpload, pageController.updatePage);
router.put('/pages/:id', hasRole(['super_admin', 'admin', 'editor']), pageAttachmentUpload, pageController.updatePage);
router.post('/pages/:id/delete', hasRole(['super_admin', 'admin', 'editor']), pageController.deletePage);
router.delete('/pages/attachment/:attachmentId', hasRole(['super_admin', 'admin', 'editor']), pageController.deleteAttachment);

// FAQ Category Routes
router.get('/faq/categories', hasRole(['super_admin', 'admin', 'editor']), faqController.listCategories);
router.get('/faq/categories/create', hasRole(['super_admin', 'admin', 'editor']), faqController.renderCreateCategory);
router.post('/faq/categories', hasRole(['super_admin', 'admin', 'editor']), faqController.createCategory);
router.get('/faq/categories/edit/:id', hasRole(['super_admin', 'admin', 'editor']), faqController.renderEditCategory);
router.post('/faq/categories/:id', hasRole(['super_admin', 'admin', 'editor']), faqController.updateCategory);
router.post('/faq/categories/:id/delete', hasRole(['super_admin', 'admin', 'editor']), faqController.deleteCategory);

// FAQ Item Routes
router.get('/faq/items', hasRole(['super_admin', 'admin', 'editor']), faqController.listItems);
router.get('/faq/items/create', hasRole(['super_admin', 'admin', 'editor']), faqController.renderCreateItem);
router.post('/faq/items', hasRole(['super_admin', 'admin', 'editor']), faqController.createItem);
router.get('/faq/items/edit/:id', hasRole(['super_admin', 'admin', 'editor']), faqController.renderEditItem);
router.post('/faq/items/:id', hasRole(['super_admin', 'admin', 'editor']), faqController.updateItem);
router.post('/faq/items/:id/delete', hasRole(['super_admin', 'admin', 'editor']), faqController.deleteItem);

// Download Routes
const downloadFileUpload = require('../middleware/downloadFileUpload');

router.get('/downloads', hasRole(['super_admin', 'admin', 'editor']), downloadController.listDownloads);
router.get('/downloads/create', hasRole(['super_admin', 'admin', 'editor']), downloadController.renderCreateDownload);
router.post('/downloads', hasRole(['super_admin', 'admin', 'editor']), downloadFileUpload, downloadController.createDownload);
router.get('/downloads/edit/:id', hasRole(['super_admin', 'admin', 'editor']), downloadController.renderEditDownload);
router.post('/downloads/:id', hasRole(['super_admin', 'admin', 'editor']), downloadFileUpload, downloadController.updateDownload);
router.post('/downloads/:id/delete', hasRole(['super_admin', 'admin', 'editor']), downloadController.deleteDownload);

module.exports = router;
