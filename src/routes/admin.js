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
const promotionController = require('../controllers/promotionController');
const aboutController = require('../controllers/aboutController');
const contactCategoryController = require('../controllers/contactCategoryController');
const contactController = require('../controllers/contactController');
const linksController = require('../controllers/linksController');
const platformController = require('../controllers/platformController');

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

// Default admin route - accessible to all authenticated users
router.get('/', isAuthenticated, (req, res) => {
    // Redirect super_admin, admin, and editor to dashboard if they have access
    if (req.session.user.role === 'super_admin' || 
        (req.session.user.permissions && req.session.user.permissions.includes('access:dashboard'))) {
        return res.redirect('/admin/dashboard');
    }
    
    // Otherwise show a simple welcome page
    res.render('admin/welcome', {
        title: 'Admin Panel',
        layout: 'layouts/admin',
        user: req.session.user
    });
});

// Dashboard
router.get('/dashboard', hasPermission('access:dashboard'), dashboardController.renderDashboard);

// Article routes
router.get('/articles', hasRole(['super_admin', 'admin']), articleController.listArticles);
router.get('/articles/create', hasRole(['super_admin', 'admin']), articleController.renderCreateForm);
router.post('/articles', hasRole(['super_admin', 'admin']), articleController.createArticle);
router.get('/articles/edit/:id', hasRole(['super_admin', 'admin']), articleController.renderEditForm);
router.post('/articles/:id', hasRole(['super_admin', 'admin']), articleController.updateArticle);
router.post('/articles/:id/delete', hasRole(['super_admin', 'admin']), articleController.deleteArticle);

// Category routes
router.get('/categories', hasRole(['super_admin', 'admin']), categoryController.listCategories);
router.get('/categories/create', hasRole(['super_admin', 'admin']), categoryController.renderCreateCategory);
router.post('/categories', hasRole(['super_admin', 'admin']), categoryController.createCategory);
router.get('/categories/edit/:id', hasRole(['super_admin', 'admin']), categoryController.renderEditCategory);
router.post('/categories/:id', hasRole(['super_admin', 'admin']), categoryController.updateCategory);
router.post('/categories/:id/delete', hasRole(['super_admin', 'admin']), categoryController.deleteCategory);

// Media routes
router.get('/media', hasRole(['super_admin', 'admin']), mediaController.listMedia);
router.post('/media/upload', hasRole(['super_admin', 'admin']), upload.single('file'), handleUploadError, mediaController.uploadMedia);
router.get('/media/:id', hasRole(['super_admin', 'admin']), mediaController.getMediaDetails);
router.post('/media/:id/delete', hasRole(['super_admin', 'admin']), mediaController.deleteMedia);

// Banner routes
const bannerUpload = require('../middleware/bannerUpload');

router.get('/banners', hasRole(['super_admin', 'admin']), bannerController.listBanners);
router.get('/banners/create', hasRole(['super_admin', 'admin']), bannerController.renderCreateBanner);
router.post('/banners', hasRole(['super_admin', 'admin']), bannerUpload, bannerController.createBanner);
router.get('/banners/edit/:id', hasRole(['super_admin', 'admin']), bannerController.renderEditBanner);
router.post('/banners/:id', hasRole(['super_admin', 'admin']), bannerUpload, bannerController.updateBanner);
router.post('/banners/:id/delete', hasRole(['super_admin', 'admin']), bannerController.deleteBanner);

// Page routes
const pageAttachmentUpload = require('../middleware/pageAttachmentUpload');

router.get('/pages', hasRole(['super_admin', 'admin']), pageController.listPages);
router.get('/pages/create', hasRole(['super_admin', 'admin']), pageController.renderCreatePage);
router.post('/pages', hasRole(['super_admin', 'admin']), pageAttachmentUpload, pageController.createPage);
router.get('/pages/edit/:id', hasRole(['super_admin', 'admin']), pageController.renderEditPage);
router.post('/pages/:id', hasRole(['super_admin', 'admin']), pageAttachmentUpload, pageController.updatePage);
router.put('/pages/:id', hasRole(['super_admin', 'admin']), pageAttachmentUpload, pageController.updatePage);
router.post('/pages/:id/delete', hasRole(['super_admin', 'admin']), pageController.deletePage);
router.delete('/pages/attachment/:attachmentId', hasRole(['super_admin', 'admin']), pageController.deleteAttachment);

// FAQ Category Routes
router.get('/faq/categories', hasRole(['super_admin', 'admin']), faqController.listCategories);
router.get('/faq/categories/create', hasRole(['super_admin', 'admin']), faqController.renderCreateCategory);
router.post('/faq/categories', hasRole(['super_admin', 'admin']), faqController.createCategory);
router.get('/faq/categories/edit/:id', hasRole(['super_admin', 'admin']), faqController.renderEditCategory);
router.post('/faq/categories/:id', hasRole(['super_admin', 'admin']), faqController.updateCategory);
router.post('/faq/categories/:id/delete', hasRole(['super_admin', 'admin']), faqController.deleteCategory);

// FAQ Item Routes - Accessible to editors
router.get('/faq/items', hasRole(['super_admin', 'admin', 'editor']), faqController.listItems);
router.get('/faq/items/create', hasRole(['super_admin', 'admin', 'editor']), faqController.renderCreateItem);
router.post('/faq/items', hasRole(['super_admin', 'admin', 'editor']), faqController.createItem);
router.get('/faq/items/edit/:id', hasRole(['super_admin', 'admin', 'editor']), faqController.renderEditItem);
router.post('/faq/items/:id', hasRole(['super_admin', 'admin', 'editor']), faqController.updateItem);
router.post('/faq/items/:id/delete', hasRole(['super_admin', 'admin', 'editor']), faqController.deleteItem);

// Download Routes
const downloadFileUpload = require('../middleware/downloadFileUpload');

// Download Category Routes
router.get('/downloads/categories', hasRole(['super_admin', 'admin']), downloadCategoryController.listCategories);
router.get('/downloads/categories/create', hasRole(['super_admin', 'admin']), downloadCategoryController.renderCreateCategory);
router.post('/downloads/categories', hasRole(['super_admin', 'admin']), downloadCategoryController.createCategory);
router.get('/downloads/categories/edit/:id', hasRole(['super_admin', 'admin']), downloadCategoryController.renderEditCategory);
router.post('/downloads/categories/:id', hasRole(['super_admin', 'admin']), downloadCategoryController.updateCategory);
router.post('/downloads/categories/:id/delete', hasRole(['super_admin', 'admin']), downloadCategoryController.deleteCategory);

// Download Item Routes
router.get('/downloads', hasRole(['super_admin', 'admin']), downloadController.listDownloads);
router.get('/downloads/create', hasRole(['super_admin', 'admin']), downloadController.renderCreateDownload);
router.post('/downloads', hasRole(['super_admin', 'admin']), downloadFileUpload, downloadController.createDownload);
router.get('/downloads/edit/:id', hasRole(['super_admin', 'admin']), downloadController.renderEditDownload);
router.post('/downloads/:id', hasRole(['super_admin', 'admin']), downloadFileUpload, downloadController.updateDownload);
router.post('/downloads/:id/delete', hasRole(['super_admin', 'admin']), downloadController.deleteDownload);

// News Dashboard
router.get('/news', hasRole(['super_admin', 'admin', 'editor']), (req, res) => {
    res.render('admin/news/index', {
        title: 'News Management',
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

// News Category Routes
router.get('/news/categories', hasRole(['super_admin', 'admin']), newsController.listCategories);
router.get('/news/categories/create', hasRole(['super_admin', 'admin']), newsController.renderCreateCategory);
router.post('/news/categories', hasRole(['super_admin', 'admin']), newsController.createCategory);
router.get('/news/categories/edit/:id', hasRole(['super_admin', 'admin']), newsController.renderEditCategory);
router.post('/news/categories/:id', hasRole(['super_admin', 'admin']), newsController.updateCategory);
router.post('/news/categories/:id/delete', hasRole(['super_admin', 'admin']), newsController.deleteCategory);

// News Item Routes - Accessible to editors
const newsImageUpload = require('../middleware/newsImageUpload');

router.get('/news/items', hasRole(['super_admin', 'admin', 'editor']), newsController.listItems);
router.get('/news/items/create', hasRole(['super_admin', 'admin', 'editor']), newsController.renderCreateItem);
router.post('/news/items', hasRole(['super_admin', 'admin', 'editor']), newsImageUpload, newsController.createItem);
router.get('/news/items/edit/:id', hasRole(['super_admin', 'admin', 'editor']), newsController.renderEditItem);
router.post('/news/items/:id', hasRole(['super_admin', 'admin', 'editor']), newsImageUpload, newsController.updateItem);
router.post('/news/items/:id/delete', hasRole(['super_admin', 'admin', 'editor']), newsController.deleteItem);

// Promotions Dashboard
const promotionImageUpload = require('../middleware/promotionImageUpload');

router.get('/promotions', hasRole(['super_admin', 'admin']), (req, res) => {
    res.render('admin/promotions/index', {
        title: 'Promotion Management',
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

// Promotion Category Routes
router.get('/promotions/categories', hasRole(['super_admin', 'admin']), promotionController.listCategories);
router.get('/promotions/categories/create', hasRole(['super_admin', 'admin']), promotionController.renderCreateCategory);
router.post('/promotions/categories', hasRole(['super_admin', 'admin']), promotionController.createCategory);
router.get('/promotions/categories/edit/:id', hasRole(['super_admin', 'admin']), promotionController.renderEditCategory);
router.post('/promotions/categories/:id', hasRole(['super_admin', 'admin']), promotionController.updateCategory);
router.post('/promotions/categories/:id/delete', hasRole(['super_admin', 'admin']), promotionController.deleteCategory);

// Promotion Item Routes
router.get('/promotions/items', hasRole(['super_admin', 'admin']), promotionController.listItems);
router.get('/promotions/items/create', hasRole(['super_admin', 'admin']), promotionController.renderCreateItem);
router.post('/promotions/items', hasRole(['super_admin', 'admin']), promotionImageUpload, promotionController.createItem);
router.get('/promotions/items/edit/:id', hasRole(['super_admin', 'admin']), promotionController.renderEditItem);
router.post('/promotions/items/:id', hasRole(['super_admin', 'admin']), promotionImageUpload, promotionController.updateItem);
router.post('/promotions/items/:id/delete', hasRole(['super_admin', 'admin']), promotionController.deleteItem);

// About Routes
router.get('/about', hasRole(['super_admin', 'admin']), aboutController.listItems);
router.get('/about/create', hasRole(['super_admin', 'admin']), aboutController.renderCreateItem);
router.post('/about', hasRole(['super_admin', 'admin']), aboutController.createItem);
router.get('/about/edit/:id', hasRole(['super_admin', 'admin']), aboutController.renderEditItem);
router.post('/about/:id', hasRole(['super_admin', 'admin']), aboutController.updateItem);
router.post('/about/:id/delete', hasRole(['super_admin', 'admin']), aboutController.deleteItem);

// Contact Category Routes
router.get('/contact/categories', hasRole(['super_admin', 'admin']), contactCategoryController.listCategories);
router.get('/contact/categories/create', hasRole(['super_admin', 'admin']), contactCategoryController.renderCreateCategory);
router.post('/contact/categories', hasRole(['super_admin', 'admin']), contactCategoryController.createCategory);
router.get('/contact/categories/edit/:id', hasRole(['super_admin', 'admin']), contactCategoryController.renderEditCategory);
router.post('/contact/categories/:id', hasRole(['super_admin', 'admin']), contactCategoryController.updateCategory);
router.post('/contact/categories/:id/delete', hasRole(['super_admin', 'admin']), contactCategoryController.deleteCategory);

// Contact Routes
router.get('/contact', hasRole(['super_admin', 'admin']), contactController.listContacts);
router.get('/contact/view/:id', hasRole(['super_admin', 'admin']), contactController.viewContact);
router.post('/contact/:id/delete', hasRole(['super_admin', 'admin']), contactController.deleteContact);

// Platform Routes
router.get('/platforms', hasRole(['super_admin', 'admin']), platformController.listItems);
router.get('/platforms/create', hasRole(['super_admin', 'admin']), platformController.renderCreateItem);
router.post('/platforms', hasRole(['super_admin', 'admin']), platformController.createItem);
router.get('/platforms/categories', hasRole(['super_admin', 'admin']), platformController.listCategories);
router.get('/platforms/categories/create', hasRole(['super_admin', 'admin']), platformController.renderCreateCategory);
router.post('/platforms/categories', hasRole(['super_admin', 'admin']), platformController.createCategory);
router.get('/platforms/categories/edit/:id', hasRole(['super_admin', 'admin']), platformController.renderEditCategory);
router.post('/platforms/categories/:id', hasRole(['super_admin', 'admin']), platformController.updateCategory);
router.post('/platforms/categories/:id/delete', hasRole(['super_admin', 'admin']), platformController.deleteCategory);
router.post('/platforms/attachments', hasRole(['super_admin', 'admin']), platformController.uploadAttachment);
router.get('/platforms/edit/:id', hasRole(['super_admin', 'admin']), platformController.renderEditItem);
router.post('/platforms/:id', hasRole(['super_admin', 'admin']), platformController.updateItem);
router.post('/platforms/:id/delete', hasRole(['super_admin', 'admin']), platformController.deleteItem);

// Links Routes
router.get('/links', isAuthenticated, hasRole(['super_admin', 'admin']), linksController.index);
router.get('/links/create', isAuthenticated, hasRole(['super_admin', 'admin']), linksController.createForm);
router.post('/links', isAuthenticated, hasRole(['super_admin', 'admin']), linksController.create);
router.get('/links/edit/:id', isAuthenticated, hasRole(['super_admin', 'admin']), linksController.editForm);
router.post('/links/:id', isAuthenticated, hasRole(['super_admin', 'admin']), linksController.update);
router.get('/links/delete/:id', isAuthenticated, hasRole(['super_admin', 'admin']), linksController.delete);
router.get('/links/toggle/:id', isAuthenticated, hasRole(['super_admin', 'admin']), linksController.toggleActive);

// User Routes
router.get('/users', hasRole(['super_admin', 'admin']), userController.listUsers);
router.get('/users/new', hasRole(['super_admin', 'admin']), userController.renderCreateUser);
router.post('/users', hasRole(['super_admin', 'admin']), userController.createUser);
router.get('/users/edit/:id', hasRole(['super_admin', 'admin']), userController.renderEditUser);
router.post('/users/:id', hasRole(['super_admin', 'admin']), userController.updateUser);
router.post('/users/:id/delete', hasRole(['super_admin', 'admin']), userController.deleteUser);

module.exports = router;
