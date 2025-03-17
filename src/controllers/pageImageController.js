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
        if (!req.files || !req.files.imageDesktop || !req.files.imageTablet || !req.files.imageMobile) {
            req.flash('error_msg', '請選擇所有必要的圖片檔案 (桌面版、平板版和手機版)');
            return res.redirect('/admin/pageImages/create');
        }

        const { targetPage, isActive } = req.body;
        
        // Get file information for each image type
        const desktopImage = req.files.imageDesktop[0];
        const tabletImage = req.files.imageTablet[0];
        const mobileImage = req.files.imageMobile[0];
        
        // Check if there's already an image for this page
        const existingImage = await prisma.pageImage.findFirst({
            where: { targetPage }
        });

        if (existingImage) {
            // Delete the old image files
            try {
                await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', existingImage.filename));
                if (existingImage.filenameDesktop) {
                    await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', existingImage.filenameDesktop));
                }
                if (existingImage.filenameTablet) {
                    await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', existingImage.filenameTablet));
                }
                if (existingImage.filenameMobile) {
                    await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', existingImage.filenameMobile));
                }
            } catch (err) {
                logger.warn(`Could not delete old page image files: ${err.message}`, err);
            }
            
            // Update the existing record
            await prisma.pageImage.update({
                where: { id: existingImage.id },
                data: {
                    // Main image (desktop as default)
                    filename: desktopImage.filename,
                    originalName: desktopImage.originalname,
                    path: `/uploads/pageimages/${desktopImage.filename}`,
                    // Desktop specific
                    filenameDesktop: desktopImage.filename,
                    originalNameDesktop: desktopImage.originalname,
                    pathDesktop: `/uploads/pageimages/${desktopImage.filename}`,
                    // Tablet specific
                    filenameTablet: tabletImage.filename,
                    originalNameTablet: tabletImage.originalname,
                    pathTablet: `/uploads/pageimages/${tabletImage.filename}`,
                    // Mobile specific
                    filenameMobile: mobileImage.filename,
                    originalNameMobile: mobileImage.originalname,
                    pathMobile: `/uploads/pageimages/${mobileImage.filename}`,
                    isActive: isActive === 'true',
                    updatedAt: new Date()
                }
            });
            
            req.flash('success_msg', '網頁橫幅已更新');
        } else {
            // Create a new record
            await prisma.pageImage.create({
                data: {
                    // Main image (desktop as default)
                    filename: desktopImage.filename,
                    originalName: desktopImage.originalname,
                    path: `/uploads/pageimages/${desktopImage.filename}`,
                    // Desktop specific
                    filenameDesktop: desktopImage.filename,
                    originalNameDesktop: desktopImage.originalname,
                    pathDesktop: `/uploads/pageimages/${desktopImage.filename}`,
                    // Tablet specific
                    filenameTablet: tabletImage.filename,
                    originalNameTablet: tabletImage.originalname,
                    pathTablet: `/uploads/pageimages/${tabletImage.filename}`,
                    // Mobile specific
                    filenameMobile: mobileImage.filename,
                    originalNameMobile: mobileImage.originalname,
                    pathMobile: `/uploads/pageimages/${mobileImage.filename}`,
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
        
        // If new files are uploaded
        if (req.files) {
            // Update desktop image if provided
            if (req.files.imageDesktop) {
                const desktopImage = req.files.imageDesktop[0];
                // Delete the old image file
                try {
                    if (pageImage.filenameDesktop) {
                        await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', pageImage.filenameDesktop));
                    }
                } catch (err) {
                    logger.warn(`Could not delete old desktop image file: ${pageImage.filenameDesktop}`, err);
                }
                
                // Update with new file info
                updateData.filenameDesktop = desktopImage.filename;
                updateData.originalNameDesktop = desktopImage.originalname;
                updateData.pathDesktop = `/uploads/pageimages/${desktopImage.filename}`;
                
                // Also update the main image if it's the desktop one
                updateData.filename = desktopImage.filename;
                updateData.originalName = desktopImage.originalname;
                updateData.path = `/uploads/pageimages/${desktopImage.filename}`;
            }
            
            // Update tablet image if provided
            if (req.files.imageTablet) {
                const tabletImage = req.files.imageTablet[0];
                // Delete the old image file
                try {
                    if (pageImage.filenameTablet) {
                        await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', pageImage.filenameTablet));
                    }
                } catch (err) {
                    logger.warn(`Could not delete old tablet image file: ${pageImage.filenameTablet}`, err);
                }
                
                // Update with new file info
                updateData.filenameTablet = tabletImage.filename;
                updateData.originalNameTablet = tabletImage.originalname;
                updateData.pathTablet = `/uploads/pageimages/${tabletImage.filename}`;
            }
            
            // Update mobile image if provided
            if (req.files.imageMobile) {
                const mobileImage = req.files.imageMobile[0];
                // Delete the old image file
                try {
                    if (pageImage.filenameMobile) {
                        await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', pageImage.filenameMobile));
                    }
                } catch (err) {
                    logger.warn(`Could not delete old mobile image file: ${pageImage.filenameMobile}`, err);
                }
                
                // Update with new file info
                updateData.filenameMobile = mobileImage.filename;
                updateData.originalNameMobile = mobileImage.originalname;
                updateData.pathMobile = `/uploads/pageimages/${mobileImage.filename}`;
            }
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