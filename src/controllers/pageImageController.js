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
        // Get all published pages from the database
        const dbPages = await prisma.page.findMany({
            where: {
                status: 'published',
                deletedAt: null
            },
            orderBy: {
                title_tw: 'asc'
            },
            select: {
                id: true,
                title_tw: true,
                title_en: true,
                slug: true
            }
        });

        // Hardcoded pages
        const allowedPages = ['index', 'about', 'contact', 'downloads', 'faq', 'news', 'promotions'];
        const chinesePages = ['首頁', '關於我們', '聯絡我們', '下載專區', '常見問題', '最新消息', '推動方案'];

        // Create hardcoded pages array
        const hardcodedPages = allowedPages.map((page, index) => ({
            name: page,
            chineseName: chinesePages[index],
            englishName: '', // Hardcoded pages don't have English names
            isHardcoded: true
        }));

        // Transform database pages
        const dbFormattedPages = dbPages.map(page => ({
            name: page.slug,
            chineseName: page.title_tw,
            englishName: page.title_en,
            isHardcoded: false
        }));

        // Combine both arrays and sort by Chinese name
        const allPages = [...hardcodedPages, ...dbFormattedPages].sort((a, b) => 
            a.chineseName.localeCompare(b.chineseName, 'zh-TW')
        );

        res.render('admin/pageImages/create', {
            title: '新增網頁橫幅',
            layout: 'layouts/admin',
            pages: allPages
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
        logger.info('Starting page image creation process');
        logger.info(`Request body: ${JSON.stringify(req.body)}`);
        logger.info(`Files received: ${req.files ? Object.keys(req.files).join(', ') : 'None'}`);
        
        if (!req.files || !req.files.imageDesktop || !req.files.imageTablet || !req.files.imageMobile) {
            logger.error('Missing required image files', { 
                files: req.files ? Object.keys(req.files) : 'No files',
                body: req.body
            });
            req.flash('error_msg', '請選擇所有必要的圖片檔案 (桌面版、平板版和手機版)');
            return res.redirect('/admin/pageImages/create');
        }

        const { targetPage, isActive } = req.body;
        logger.info(`Processing upload for target page: ${targetPage}, isActive: ${isActive}`);
        
        // Get file information for each image type
        const desktopImage = req.files.imageDesktop[0];
        const tabletImage = req.files.imageTablet[0];
        const mobileImage = req.files.imageMobile[0];
        
        logger.info('Image files received:', {
            desktop: `${desktopImage.originalname} (${desktopImage.size} bytes)`,
            tablet: `${tabletImage.originalname} (${tabletImage.size} bytes)`,
            mobile: `${mobileImage.originalname} (${mobileImage.size} bytes)`
        });
        
        // Verify files were actually saved
        const desktopFilePath = path.join(process.cwd(), 'public', 'uploads', 'pageimages', desktopImage.filename);
        const tabletFilePath = path.join(process.cwd(), 'public', 'uploads', 'pageimages', tabletImage.filename);
        const mobileFilePath = path.join(process.cwd(), 'public', 'uploads', 'pageimages', mobileImage.filename);
        
        try {
            // Check if files exist
            await fs.access(desktopFilePath);
            await fs.access(tabletFilePath);
            await fs.access(mobileFilePath);
            logger.info('All image files were successfully saved to disk');
        } catch (err) {
            logger.error(`File access error: ${err.message}`, err);
            req.flash('error_msg', '圖片上傳失敗，請重試');
            return res.redirect('/admin/pageImages/create');
        }
        
        // Check if there's already an image for this page
        logger.info(`Checking for existing image for page: ${targetPage}`);
        const existingImage = await prisma.pageImage.findFirst({
            where: { targetPage }
        });

        if (existingImage) {
            logger.info(`Found existing image for page ${targetPage}, updating record`);
            // Delete the old image files
            try {
                logger.info('Attempting to delete old image files');
                if (existingImage.filename) {
                    await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', existingImage.filename));
                }
                if (existingImage.filenameDesktop) {
                    await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', existingImage.filenameDesktop));
                }
                if (existingImage.filenameTablet) {
                    await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', existingImage.filenameTablet));
                }
                if (existingImage.filenameMobile) {
                    await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'pageimages', existingImage.filenameMobile));
                }
                logger.info('Old image files deleted successfully');
            } catch (err) {
                logger.warn(`Could not delete old page image files: ${err.message}`, err);
            }
            
            // Update the existing record
            logger.info('Updating database record with new image information');
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
            logger.info('Database record updated successfully');
            
            req.flash('success_msg', '網頁橫幅已更新');
        } else {
            logger.info(`No existing image found for page ${targetPage}, creating new record`);
            // Create a new record
            logger.info('Creating new database record');
            try {
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
                logger.info('New database record created successfully');
            } catch (dbError) {
                logger.error('Database error when creating page image:', dbError);
                logger.error('Database error details:', {
                    message: dbError.message,
                    code: dbError.code,
                    meta: dbError.meta
                });
                
                // Try creating with minimal required fields
                try {
                    logger.info('Attempting to create record with minimal fields');
                    await prisma.pageImage.create({
                        data: {
                            targetPage,
                            isActive: isActive === 'true',
                            userId: req.session.user.id,
                            // Only include responsive fields which are optional
                            filenameDesktop: desktopImage.filename,
                            originalNameDesktop: desktopImage.originalname,
                            pathDesktop: `/uploads/pageimages/${desktopImage.filename}`,
                            filenameTablet: tabletImage.filename,
                            originalNameTablet: tabletImage.originalname,
                            pathTablet: `/uploads/pageimages/${tabletImage.filename}`,
                            filenameMobile: mobileImage.filename,
                            originalNameMobile: mobileImage.originalname,
                            pathMobile: `/uploads/pageimages/${mobileImage.filename}`
                        }
                    });
                    logger.info('New database record created successfully with minimal fields');
                } catch (fallbackError) {
                    logger.error('Fallback database creation also failed:', fallbackError);
                    throw fallbackError; // Re-throw to be caught by the outer catch
                }
            }
            
            req.flash('success_msg', '網頁橫幅已建立');
        }
        
        logger.info('Page image creation process completed successfully, redirecting to list page');
        res.redirect('/admin/pageImages');
    } catch (error) {
        logger.error('Error creating page image:', error);
        logger.error('Stack trace:', error.stack);
        logger.error('Request body:', req.body);
        logger.error('Files:', req.files ? JSON.stringify(Object.keys(req.files)) : 'No files');
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
        
        // Get all published pages from the database
        const dbPages = await prisma.page.findMany({
            where: {
                status: 'published',
                deletedAt: null
            },
            orderBy: {
                title_tw: 'asc'
            },
            select: {
                id: true,
                title_tw: true,
                title_en: true,
                slug: true
            }
        });

        // Hardcoded pages
        const allowedPages = ['index', 'about', 'contact', 'downloads', 'faq', 'news', 'promotions'];
        const chinesePages = ['首頁', '關於我們', '聯絡我們', '下載專區', '常見問題', '最新消息', '推動方案'];

        // Create hardcoded pages array
        const hardcodedPages = allowedPages.map((page, index) => ({
            name: page,
            chineseName: chinesePages[index],
            englishName: '', // Hardcoded pages don't have English names
            isHardcoded: true
        }));

        // Transform database pages
        const dbFormattedPages = dbPages.map(page => ({
            name: page.slug,
            chineseName: page.title_tw,
            englishName: page.title_en,
            isHardcoded: false
        }));

        // Combine both arrays and sort by Chinese name
        const allPages = [...hardcodedPages, ...dbFormattedPages].sort((a, b) => 
            a.chineseName.localeCompare(b.chineseName, 'zh-TW')
        );
        
        res.render('admin/pageImages/edit', {
            title: '編輯網頁橫幅',
            layout: 'layouts/admin',
            pageImage,
            pages: allPages
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