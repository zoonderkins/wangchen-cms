const express = require('express');
const router = express.Router();
const { isAuthenticated, hasPermission } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const multer = require('multer');
const path = require('path');

// Controllers
const categoryController = require('../controllers/categoryController');
const articleController = require('../controllers/articleController');
const downloadController = require('../controllers/downloadController');
const faqController = require('../controllers/faqController');
const pageController = require('../controllers/pageController');
const userController = require('../controllers/userController');
const mediaController = require('../controllers/mediaController');
const bannerController = require('../controllers/bannerController');
const dashboardController = require('../controllers/dashboardController');

// Apply authentication middleware to all admin routes
router.use(isAuthenticated);

// Dashboard
router.get('/dashboard', hasPermission('dashboard:view'), dashboardController.renderDashboard);

// Categories - Unified Category Management
router.get('/categories', hasPermission('category:view'), categoryController.listCategories);
router.get('/categories/create', hasPermission('category:create'), categoryController.renderCreateCategory);
router.post('/categories', hasPermission('category:create'), categoryController.createCategory);
router.get('/categories/edit/:id', hasPermission('category:edit'), categoryController.renderEditCategory);
router.post('/categories/edit/:id', hasPermission('category:edit'), categoryController.updateCategory);
router.post('/categories/:id/delete', hasPermission('category:delete'), categoryController.deleteCategory);

// Articles
router.get('/articles', hasPermission('article:view'), articleController.listArticles);
router.get('/articles/create', hasPermission('article:create'), articleController.renderCreateForm);
router.post('/articles', hasPermission('article:create'), articleController.createArticle);
router.get('/articles/edit/:id', hasPermission('article:edit'), articleController.renderEditForm);
router.post('/articles/edit/:id', hasPermission('article:edit'), articleController.updateArticle);
router.post('/articles/:id/delete', hasPermission('article:delete'), articleController.deleteArticle);

// Downloads
router.get('/downloads', hasPermission('download:view'), downloadController.listDownloads);
router.get('/downloads/create', hasPermission('download:create'), downloadController.renderCreateDownload);
router.post('/downloads', 
    hasPermission('download:create'),
    multer({ dest: path.join(process.cwd(), 'uploads/downloads/') }).single('file'),
    downloadController.createDownload
);
router.get('/downloads/edit/:id', hasPermission('download:edit'), downloadController.renderEditDownload);
router.post('/downloads/edit/:id', 
    hasPermission('download:edit'),
    multer({ dest: path.join(process.cwd(), 'uploads/downloads/') }).single('file'),
    downloadController.updateDownload
);
router.post('/downloads/:id/delete', hasPermission('download:delete'), downloadController.deleteDownload);

// FAQ Items
router.get('/faq/items', hasPermission('faq:view'), faqController.listItems);
router.get('/faq/items/create', hasPermission('faq:create'), faqController.renderCreateItem);
router.post('/faq/items', hasPermission('faq:create'), faqController.createItem);
router.get('/faq/items/edit/:id', hasPermission('faq:edit'), faqController.renderEditItem);
router.post('/faq/items/edit/:id', hasPermission('faq:edit'), faqController.updateItem);
router.post('/faq/items/:id/delete', hasPermission('faq:delete'), faqController.deleteItem);

// FAQ Categories
router.get('/faq/categories', hasPermission('faq:view'), faqController.listCategories);
router.get('/faq/categories/create', hasPermission('faq:create'), faqController.renderCreateCategory);
router.post('/faq/categories', hasPermission('faq:create'), faqController.createCategory);
router.get('/faq/categories/edit/:id', hasPermission('faq:edit'), faqController.renderEditCategory);
router.post('/faq/categories/edit/:id', hasPermission('faq:edit'), faqController.updateCategory);
router.post('/faq/categories/:id/delete', hasPermission('faq:delete'), faqController.deleteCategory);

// Pages
router.get('/pages', hasPermission('page:view'), pageController.listPages);
router.get('/pages/create', hasPermission('page:create'), pageController.renderCreatePage);
router.post('/pages', hasPermission('page:create'), pageController.createPage);
router.get('/pages/edit/:id', hasPermission('page:edit'), pageController.renderEditPage);
router.post('/pages/:id', hasPermission('page:edit'), pageController.updatePage);
router.post('/pages/:id/delete', hasPermission('page:delete'), pageController.deletePage);

// Media Management
router.get('/media', hasPermission('media:view'), mediaController.listMedia);
router.get('/media/upload', hasPermission('media:create'), mediaController.renderUploadForm);
router.post('/media/upload', 
    hasPermission('media:create'),
    multer({ dest: path.join(process.cwd(), 'uploads/media/') }).single('file'),
    mediaController.uploadMedia
);
router.get('/media/:id', hasPermission('media:view'), mediaController.getMediaDetails);
router.post('/media/:id/delete', hasPermission('media:delete'), mediaController.deleteMedia);

// Banners
router.get('/banners', hasPermission('banner:view'), bannerController.listBanners);
router.get('/banners/create', hasPermission('banner:create'), bannerController.renderCreateBanner);
router.post('/banners',
    hasPermission('banner:create'),
    multer({ dest: path.join(process.cwd(), 'uploads/banners/') }).single('media'),
    bannerController.createBanner
);
router.get('/banners/edit/:id', hasPermission('banner:edit'), bannerController.renderEditBanner);
router.post('/banners/edit/:id',
    hasPermission('banner:edit'),
    multer({ dest: path.join(process.cwd(), 'uploads/banners/') }).single('media'),
    bannerController.updateBanner
);
router.post('/banners/:id/delete', hasPermission('banner:delete'), bannerController.deleteBanner);

// User Management
router.get('/users', hasPermission('user:view'), userController.listUsers);
router.get('/users/create', hasPermission('user:create'), userController.renderCreateUser);
router.post('/users', hasPermission('user:create'), userController.createUser);
router.get('/users/edit/:id', hasPermission('user:edit'), userController.renderEditUser);
router.post('/users/edit/:id', hasPermission('user:edit'), userController.updateUser);
router.post('/users/:id/delete', hasPermission('user:delete'), userController.deleteUser);

module.exports = router;
