const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);
const slugify = require('slugify');
const QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;

// Helper function to ensure page upload directory exists
async function ensurePageUploadDir(pageId) {
    const dir = path.join(__dirname, '../../public/uploads/page', pageId.toString());
    try {
        await mkdirAsync(dir, { recursive: true });
        return dir;
    } catch (error) {
        logger.error(`Error creating directory for page ${pageId}:`, error);
        throw new Error('Failed to create upload directory');
    }
}

// Helper function to delete page attachments
async function deletePageAttachments(pageId) {
    try {
        // Get all attachments for the page
        const attachments = await prisma.pageAttachment.findMany({
            where: { pageId }
        });

        // Delete each attachment file
        for (const attachment of attachments) {
            try {
                await unlinkAsync(path.join(__dirname, '../../public', attachment.path));
            } catch (err) {
                logger.error(`Error deleting attachment file ${attachment.path}:`, err);
                // Continue even if file deletion fails
            }
        }

        // Delete all attachments from database
        await prisma.pageAttachment.deleteMany({
            where: { pageId }
        });

        // Try to remove the directory
        try {
            const dir = path.join(__dirname, '../../public/uploads/page', pageId.toString());
            await unlinkAsync(dir);
        } catch (err) {
            // Ignore directory deletion errors
            logger.info(`Could not delete page directory for page ${pageId}:`, err);
        }
    } catch (error) {
        logger.error(`Error deleting attachments for page ${pageId}:`, error);
        throw new Error('Failed to delete page attachments');
    }
}

// List all pages
exports.listPages = async (req, res) => {
    try {
        const pages = await prisma.page.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                author: {
                    select: {
                        username: true
                    }
                },
                _count: {
                    select: {
                        attachments: true
                    }
                }
            }
        });

        res.render('admin/pages/index', {
            title: 'Manage Pages',
            pages
        });
    } catch (error) {
        logger.error('Error listing pages:', error);
        req.flash('error_msg', '無法取得頁面列表');
        res.redirect('/admin/dashboard');
    }
};

// Render create page form
exports.renderCreatePage = async (req, res) => {
    res.render('admin/pages/create', {
        title: 'Create New Page'
    });
};

// Create a new page
exports.createPage = async (req, res) => {
    try {
        const { 
            title_en, title_tw, 
            content_en, content_tw, 
            status,
            showInNavigation,
            navigationOrder
        } = req.body;

        // Process content - convert Quill Delta to HTML
        let htmlContent_en = '';
        let htmlContent_tw = '';
        
        // Check content length and truncate if necessary
        const MAX_CONTENT_LENGTH = 100 * 1024 * 1024; // 100MB limit
        
        try {
            if (content_en) {
                const delta_en = JSON.parse(content_en);
                const converter_en = new QuillDeltaToHtmlConverter(delta_en.ops, {});
                htmlContent_en = converter_en.convert();
                
                if (htmlContent_en.length > MAX_CONTENT_LENGTH) {
                    logger.warn(`Content_en for "${title_en}" was truncated from ${htmlContent_en.length} to ${MAX_CONTENT_LENGTH} bytes`);
                    htmlContent_en = htmlContent_en.substring(0, MAX_CONTENT_LENGTH);
                }
            }
            
            if (content_tw) {
                const delta_tw = JSON.parse(content_tw);
                const converter_tw = new QuillDeltaToHtmlConverter(delta_tw.ops, {});
                htmlContent_tw = converter_tw.convert();
                
                if (htmlContent_tw.length > MAX_CONTENT_LENGTH) {
                    logger.warn(`Content_tw for "${title_tw}" was truncated from ${htmlContent_tw.length} to ${MAX_CONTENT_LENGTH} bytes`);
                    htmlContent_tw = htmlContent_tw.substring(0, MAX_CONTENT_LENGTH);
                }
            }
        } catch (e) {
            logger.error('Error converting Quill content:', e);
            req.flash('error_msg', '處理編輯器內容時發生錯誤');
            return res.redirect('/admin/pages/create');
        }

        // Generate slug from English title
        const slug = slugify(title_en, {
            lower: true,
            strict: true
        });

        // Check if slug already exists
        const existingPage = await prisma.page.findUnique({
            where: { slug }
        });

        if (existingPage) {
            req.flash('error_msg', '已存在相同標題的頁面。請選擇其他標題。');
            return res.redirect('/admin/pages/create');
        }

        // Create page
        const page = await prisma.page.create({
            data: {
                title_en,
                title_tw,
                content_en: htmlContent_en,
                content_tw: htmlContent_tw,
                editorMode: 'editor',
                slug,
                status: status || 'draft',
                showInNavigation: false, // Set default value
                navigationOrder: null, // Set default value
                author: {
                    connect: { id: req.session.user.id }
                }
            }
        });

        // Handle file uploads if any
        if (req.files && req.files.length > 0) {
            const pageDir = await ensurePageUploadDir(page.id);
            
            for (const file of req.files) {
                // Create attachment record
                await prisma.pageAttachment.create({
                    data: {
                        filename: file.filename,
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                        size: file.size,
                        path: `/uploads/page/${page.id}/${file.filename}`,
                        page: {
                            connect: { id: page.id }
                        }
                    }
                });
            }
        }

        req.flash('success_msg', '頁面建立成功');
        res.redirect('/admin/pages');
    } catch (error) {
        logger.error('Error creating page:', error);
        req.flash('error_msg', '建立頁面時發生錯誤');
        res.redirect('/admin/pages/create');
    }
};

// Render edit page form
exports.renderEditPage = async (req, res) => {
    try {
        const { slug } = req.params;
        
        const page = await prisma.page.findFirst({
            where: { 
                slug,
                deletedAt: null
            },
            include: {
                author: {
                    select: {
                        username: true
                    }
                },
                attachments: true
            }
        });

        if (!page) {
            req.flash('error_msg', '找不到頁面');
            return res.redirect('/admin/pages');
        }

        res.render('admin/pages/edit', {
            title: 'Edit Page',
            page
        });
    } catch (error) {
        logger.error('Error rendering edit page:', error);
        req.flash('error_msg', '載入頁面時發生錯誤');
        res.redirect('/admin/pages');
    }
};

// Update a page
exports.updatePage = async (req, res) => {
    try {
        const { slug } = req.params;
        logger.info(`Updating page with slug: ${slug}`);
        logger.info('Request body:', JSON.stringify(req.body, null, 2));

        const {
            title_en,
            title_tw,
            content_en,
            content_tw,
            metaTitle_en,
            metaTitle_tw,
            metaDescription_en,
            metaDescription_tw,
            metaKeywords_en,
            metaKeywords_tw,
            status,
            showInNavigation,
            navigationOrder
        } = req.body;

        // Find the page by slug
        const page = await prisma.page.findFirst({
            where: { 
                slug,
                deletedAt: null
            }
        });

        if (!page) {
            logger.error(`Page not found with slug: ${slug}`);
            req.flash('error_msg', '找不到頁面');
            return res.redirect('/admin/pages');
        }

        logger.info(`Found page with ID: ${page.id}`);

        // Process content - convert Quill Delta to HTML
        let htmlContent_en = '';
        let htmlContent_tw = '';
        
        // Check content length and truncate if necessary
        const MAX_CONTENT_LENGTH = 100 * 1024 * 1024; // 100MB limit
        
        try {
            if (content_en) {
                logger.info('Processing English content');
                const delta_en = JSON.parse(content_en);
                const converter_en = new QuillDeltaToHtmlConverter(delta_en.ops, {});
                htmlContent_en = converter_en.convert();
                
                if (htmlContent_en.length > MAX_CONTENT_LENGTH) {
                    logger.warn(`Content_en for "${title_en}" was truncated from ${htmlContent_en.length} to ${MAX_CONTENT_LENGTH} bytes`);
                    htmlContent_en = htmlContent_en.substring(0, MAX_CONTENT_LENGTH);
                }
            }
            
            if (content_tw) {
                logger.info('Processing Traditional Chinese content');
                const delta_tw = JSON.parse(content_tw);
                const converter_tw = new QuillDeltaToHtmlConverter(delta_tw.ops, {});
                htmlContent_tw = converter_tw.convert();
                
                if (htmlContent_tw.length > MAX_CONTENT_LENGTH) {
                    logger.warn(`Content_tw for "${title_tw}" was truncated from ${htmlContent_tw.length} to ${MAX_CONTENT_LENGTH} bytes`);
                    htmlContent_tw = htmlContent_tw.substring(0, MAX_CONTENT_LENGTH);
                }
            }
        } catch (e) {
            logger.error('Error converting Quill content:', e);
            logger.error('Content_en:', content_en);
            logger.error('Content_tw:', content_tw);
            req.flash('error_msg', '處理編輯器內容時發生錯誤');
            return res.redirect(`/admin/pages/edit/${slug}`);
        }

        // Update the page
        logger.info('Updating page in database');
        const updatedPage = await prisma.page.update({
            where: { id: page.id },
            data: {
                title_en,
                title_tw,
                content_en: htmlContent_en,
                content_tw: htmlContent_tw,
                metaTitle_en: metaTitle_en || null,
                metaTitle_tw: metaTitle_tw || null,
                metaDescription_en: metaDescription_en || null,
                metaDescription_tw: metaDescription_tw || null,
                metaKeywords_en: metaKeywords_en || null,
                metaKeywords_tw: metaKeywords_tw || null,
                status,
                showInNavigation: false, // Keep default value
                navigationOrder: null, // Keep default value
                updatedAt: new Date()
            }
        });

        logger.info('Page updated successfully');
        req.flash('success_msg', '頁面更新成功');
        res.redirect('/admin/pages');
    } catch (error) {
        logger.error('Error updating page:', error);
        logger.error('Stack trace:', error.stack);
        req.flash('error_msg', '更新頁面時發生錯誤');
        res.redirect('/admin/pages');
    }
};

// Delete a page
exports.deletePage = async (req, res) => {
    try {
        const pageId = parseInt(req.params.id);
        
        // Delete attachments first
        await deletePageAttachments(pageId);
        
        // Delete the page
        await prisma.page.delete({
            where: { id: pageId }
        });
        
        req.flash('success_msg', '頁面刪除成功');
        res.redirect('/admin/pages');
    } catch (error) {
        logger.error('Error deleting page:', error);
        req.flash('error_msg', '刪除頁面時發生錯誤');
        res.redirect('/admin/pages');
    }
};

// Delete attachment
exports.deleteAttachment = async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        
        // Get attachment
        const attachment = await prisma.pageAttachment.findUnique({
            where: { id: attachmentId }
        });
        
        if (!attachment) {
            return res.status(404).json({ success: false, message: 'Attachment not found' });
        }
        
        // Delete file
        try {
            await unlinkAsync(path.join(__dirname, '../../public', attachment.path));
        } catch (err) {
            logger.error(`Error deleting attachment file ${attachment.path}:`, err);
            // Continue even if file deletion fails
        }
        
        // Delete from database
        await prisma.pageAttachment.delete({
            where: { id: attachmentId }
        });
        
        return res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting attachment:', error);
        return res.status(500).json({ success: false, message: 'Error deleting attachment' });
    }
};
