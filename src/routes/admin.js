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
const downloadCategoryController = require('../controllers/downloadCategoryController');
const newsController = require('../controllers/newsController');
const aboutController = require('../controllers/aboutController');

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

// Download Category Routes
router.get('/downloads/categories', hasRole(['super_admin', 'admin', 'editor']), downloadCategoryController.listCategories);
router.get('/downloads/categories/create', hasRole(['super_admin', 'admin', 'editor']), downloadCategoryController.renderCreateCategory);
router.post('/downloads/categories/create', hasRole(['super_admin', 'admin', 'editor']), downloadCategoryController.createCategory);
router.get('/downloads/categories/:id/edit', hasRole(['super_admin', 'admin', 'editor']), downloadCategoryController.renderEditCategory);
router.post('/downloads/categories/:id/edit', hasRole(['super_admin', 'admin', 'editor']), downloadCategoryController.updateCategory);
router.post('/downloads/categories/:id/delete', hasRole(['super_admin', 'admin', 'editor']), downloadCategoryController.deleteCategory);

// News Dashboard
router.get('/news', hasRole(['super_admin', 'admin', 'editor']), (req, res) => {
    res.render('admin/news/index', {
        title: 'News Management',
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

// News Category Routes
router.get('/news/categories', hasRole(['super_admin', 'admin', 'editor']), newsController.listCategories);
router.get('/news/categories/create', hasRole(['super_admin', 'admin', 'editor']), newsController.renderCreateCategory);
router.post('/news/categories', hasRole(['super_admin', 'admin', 'editor']), newsController.createCategory);
router.get('/news/categories/edit/:id', hasRole(['super_admin', 'admin', 'editor']), newsController.renderEditCategory);
router.post('/news/categories/:id', hasRole(['super_admin', 'admin', 'editor']), newsController.updateCategory);
router.post('/news/categories/:id/delete', hasRole(['super_admin', 'admin', 'editor']), newsController.deleteCategory);

// News Item Routes
const newsImageUpload = require('../middleware/newsImageUpload');

router.get('/news/items', hasRole(['super_admin', 'admin', 'editor']), newsController.listItems);
router.get('/news/items/create', hasRole(['super_admin', 'admin', 'editor']), newsController.renderCreateItem);
router.post('/news/items', hasRole(['super_admin', 'admin', 'editor']), newsImageUpload, newsController.createItem);
router.get('/news/items/edit/:id', hasRole(['super_admin', 'admin', 'editor']), newsController.renderEditItem);
router.post('/news/items/:id', hasRole(['super_admin', 'admin', 'editor']), newsImageUpload, newsController.updateItem);
router.post('/news/items/:id/delete', hasRole(['super_admin', 'admin', 'editor']), newsController.deleteItem);

// Promotions Dashboard
const promotionController = require('../controllers/promotionController');
const promotionImageUpload = require('../middleware/promotionImageUpload');

router.get('/promotions', hasRole(['super_admin', 'admin', 'editor']), (req, res) => {
    res.render('admin/promotions/index', {
        title: 'Promotion Management',
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

// Promotion Category Routes
router.get('/promotions/categories', hasRole(['super_admin', 'admin', 'editor']), promotionController.listCategories);
router.get('/promotions/categories/create', hasRole(['super_admin', 'admin', 'editor']), promotionController.renderCreateCategory);
router.post('/promotions/categories', hasRole(['super_admin', 'admin', 'editor']), promotionController.createCategory);
router.get('/promotions/categories/edit/:id', hasRole(['super_admin', 'admin', 'editor']), promotionController.renderEditCategory);
router.post('/promotions/categories/:id', hasRole(['super_admin', 'admin', 'editor']), promotionController.updateCategory);
router.post('/promotions/categories/:id/delete', hasRole(['super_admin', 'admin', 'editor']), promotionController.deleteCategory);

// Promotion Item Routes
router.get('/promotions/items', hasRole(['super_admin', 'admin', 'editor']), promotionController.listItems);
router.get('/promotions/items/create', hasRole(['super_admin', 'admin', 'editor']), promotionController.renderCreateItem);
router.post('/promotions/items', hasRole(['super_admin', 'admin', 'editor']), promotionImageUpload, promotionController.createItem);
router.get('/promotions/items/edit/:id', hasRole(['super_admin', 'admin', 'editor']), promotionController.renderEditItem);
router.post('/promotions/items/:id', hasRole(['super_admin', 'admin', 'editor']), promotionImageUpload, promotionController.updateItem);
router.post('/promotions/items/:id/delete', hasRole(['super_admin', 'admin', 'editor']), promotionController.deleteItem);

// About page routes
router.get('/about', hasRole(['super_admin', 'admin', 'editor']), aboutController.listItems);
router.get('/about/create', hasRole(['super_admin', 'admin', 'editor']), aboutController.renderCreateItem);
router.post('/about/create', hasRole(['super_admin', 'admin', 'editor']), aboutController.upload, aboutController.createItem);
router.get('/about/edit/:id', hasRole(['super_admin', 'admin', 'editor']), aboutController.renderEditItem);
router.post('/about/edit/:id', hasRole(['super_admin', 'admin', 'editor']), aboutController.upload, aboutController.updateItem);
router.post('/about/delete/:id', hasRole(['super_admin', 'admin']), aboutController.deleteItem);

module.exports = router;
