const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const path = require('path');
const fs = require('fs').promises;

// List all page images
exports.listPageImages = async (req, res) => {
    try {
        const pageImages = await prisma.pageImage.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: {
                    select: { username: true }
                }
            }
        });

        res.render('admin/pageImages/list', {
            title: '網頁橫幅列表',
            layout: 'layouts/admin',
            pageImages
        });
    } catch (error) {
        logger.error('Error listing page images:', error);
        req.flash('error_msg', '載入網頁橫幅時出錯');
        res.redirect('/admin/dashboard');
    }
};

// Render create form
exports.renderCreateForm = async (req, res) => {
    try {
        // Get a list of all frontend view files
        const viewsDir = path.join(process.cwd(), 'src', 'views', 'frontend');
        const files = await fs.readdir(viewsDir);
        
        // Only accept about, contact,downloads,faq,news,promotions
        const allowedPages = ['index', 'about', 'contact', 'downloads', 'faq', 'news', 'promotions'];

        // Add Chinese name to the directory
        const chinesePages = ['首頁', '關於我們', '聯絡我們', '下載專區', '常見問題', '最新消息', '推動方案'];

        const filteredPages = allowedPages.map((page, index) => ({
            name: page,
            chineseName: chinesePages[index]
        }));

        const pages = filteredPages.map(page => ({
            name: page.name,
            chineseName: page.chineseName
        }));

        // const filteredPages = files.filter(file => allowedPages.includes(file.replace('.ejs', '')));

        // Filter only .ejs files and remove the .ejs extension
        // const pages = filteredPages.map(file => file.replace('.ejs', ''));

        res.render('admin/pageImages/create', {
            title: '新增網頁橫幅',
            layout: 'layouts/admin',
            pages
        });
    } catch (error) {
        logger.error('Error rendering page image create form:', error);
        req.flash('error_msg', '載入表單時出錯');
        res.redirect('/admin/pageImages');
    }
};

// Create new page image
exports.createPageImage = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', '請選擇一個圖片檔案');
            return res.redirect('/admin/pageImages/create');
        }

        const { targetPage, isActive } = req.body;
        const { filename, originalname } = req.file;
        
        // Check if there's already an image for this page
        const existingImage = await prisma.pageImage.findFirst({
            where: { targetPage }
        });

        if (existingImage) {
            // Delete the old image file
            try {
                await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', existingImage.filename));
            } catch (err) {
                logger.warn(`Could not delete old page image file: ${existingImage.filename}`, err);
            }
            
            // Update the existing record
            await prisma.pageImage.update({
                where: { id: existingImage.id },
                data: {
                    filename,
                    originalName: originalname,
                    path: `/uploads/pageimages/${filename}`,
                    isActive: isActive === 'true',
                    updatedAt: new Date()
                }
            });
            
            req.flash('success_msg', '網頁橫幅已更新');
        } else {
            // Create a new record
            await prisma.pageImage.create({
                data: {
                    filename,
                    originalName: originalname,
                    path: `/uploads/pageimages/${filename}`,
                    targetPage,
                    isActive: isActive === 'true',
                    userId: req.session.user.id
                }
            });
            
            req.flash('success_msg', '網頁橫幅已建立');
        }
        
        res.redirect('/admin/pageImages');
    } catch (error) {
        logger.error('Error creating page image:', error);
        req.flash('error_msg', '建立網頁橫幅時出錯');
        res.redirect('/admin/pageImages/create');
    }
};

// Render edit form
exports.renderEditForm = async (req, res) => {
    try {
        const { id } = req.params;
        
        const pageImage = await prisma.pageImage.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!pageImage) {
            req.flash('error_msg', '找不到網頁橫幅');
            return res.redirect('/admin/pageImages');
        }
        
        // Get a list of all frontend view files
        const viewsDir = path.join(process.cwd(), 'src', 'views', 'frontend');
        const files = await fs.readdir(viewsDir);

                // Only accept about, contact,downloads,faq,news,promotions
        const allowedPages = ['index', 'about', 'contact', 'downloads', 'faq', 'news', 'promotions'];

        // Add Chinese name to the directory
        const chinesePages = ['首頁', '關於我們', '聯絡我們', '下載專區', '常見問題', '最新消息', '推動方案'];

        const filteredPages = allowedPages.map((page, index) => ({
            name: page,
            chineseName: chinesePages[index]
        }));

        const pages = filteredPages.map(page => ({
            name: page.name,
            chineseName: page.chineseName
        }));
        
        // // Filter only .ejs files and remove the .ejs extension
        // const pages = files
        //     .filter(file => file.endsWith('.ejs'))
        //     .map(file => file.replace('.ejs', ''));
        
        res.render('admin/pageImages/edit', {
            title: '編輯網頁橫幅',
            layout: 'layouts/admin',
            pageImage,
            pages
        });
    } catch (error) {
        logger.error('Error rendering page image edit form:', error);
        req.flash('error_msg', '載入編輯表單時出錯');
        res.redirect('/admin/pageImages');
    }
};

// Update page image
exports.updatePageImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { targetPage, isActive } = req.body;
        
        const pageImage = await prisma.pageImage.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!pageImage) {
            req.flash('error_msg', '找不到網頁橫幅');
            return res.redirect('/admin/pageImages');
        }
        
        const updateData = {
            targetPage,
            isActive: isActive === 'true',
            updatedAt: new Date()
        };
        
        // If a new file is uploaded
        if (req.file) {
            // Delete the old image file
            try {
                await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', pageImage.filename));
            } catch (err) {
                logger.warn(`Could not delete old page image file: ${pageImage.filename}`, err);
            }
            
            // Update with new file info
            const { filename, originalname } = req.file;
            updateData.filename = filename;
            updateData.originalName = originalname;
            updateData.path = `/uploads/pageimages/${filename}`;
        }
        
        // Update the record
        await prisma.pageImage.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        
        req.flash('success_msg', '網頁橫幅已更新');
        res.redirect('/admin/pageImages');
    } catch (error) {
        logger.error('Error updating page image:', error);
        req.flash('error_msg', '更新網頁橫幅時出錯');
        res.redirect(`/admin/pageImages/edit/${req.params.id}`);
    }
};

// Delete page image
exports.deletePageImage = async (req, res) => {
    try {
        const { id } = req.params;
        
        const pageImage = await prisma.pageImage.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!pageImage) {
            req.flash('error_msg', '找不到網頁橫幅');
            return res.redirect('/admin/pageImages');
        }
        
        // Delete the image file
        try {
            await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', pageImage.filename));
        } catch (err) {
            logger.warn(`Could not delete page image file: ${pageImage.filename}`, err);
        }
        
        // Delete the record
        await prisma.pageImage.delete({
            where: { id: parseInt(id) }
        });
        
        req.flash('success_msg', '網頁橫幅已刪除');
        res.redirect('/admin/pageImages');
    } catch (error) {
        logger.error('Error deleting page image:', error);
        req.flash('error_msg', '刪除網頁橫幅時出錯');
        res.redirect('/admin/pageImages');
    }
};

// Toggle page image active status
exports.toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        const pageImage = await prisma.pageImage.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!pageImage) {
            req.flash('error_msg', '找不到網頁橫幅');
            return res.redirect('/admin/pageImages');
        }
        
        await prisma.pageImage.update({
            where: { id: parseInt(id) },
            data: { isActive: !pageImage.isActive }
        });
        
        req.flash('success_msg', `網頁橫幅已${pageImage.isActive ? '停用' : '啟用'}`);
        res.redirect('/admin/pageImages');
    } catch (error) {
        logger.error('Error toggling page image status:', error);
        req.flash('error_msg', '更改網頁橫幅狀態時出錯');
        res.redirect('/admin/pageImages');
    }
};
