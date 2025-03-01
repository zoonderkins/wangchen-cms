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
        req.flash('error_msg', 'Failed to retrieve pages');
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
            title, content, status, showInNavigation, 
            navigationOrder, metaTitle, metaDescription, metaKeywords,
            editorMode
        } = req.body;

        // Process content based on editor mode
        let htmlContent = '';
        if (editorMode === 'editor') {
            // Convert Quill Delta to HTML
            try {
                const delta = JSON.parse(content);
                const converter = new QuillDeltaToHtmlConverter(delta.ops, {});
                htmlContent = converter.convert();
            } catch (e) {
                logger.error('Error converting Quill content:', e);
                req.flash('error_msg', 'Error processing editor content');
                return res.redirect('/admin/pages/create');
            }
        } else {
            // Use raw HTML content
            htmlContent = content;
        }

        // Generate slug from title
        const slug = slugify(title, {
            lower: true,
            strict: true
        });

        // Check if slug already exists
        const existingPage = await prisma.page.findUnique({
            where: { slug }
        });

        if (existingPage) {
            req.flash('error_msg', 'A page with this title already exists. Please choose a different title.');
            return res.redirect('/admin/pages/create');
        }

        // Create page
        const page = await prisma.page.create({
            data: {
                title,
                content: htmlContent,
                editorMode: editorMode || 'editor',
                slug,
                status: status || 'draft',
                showInNavigation: showInNavigation === 'on',
                navigationOrder: navigationOrder ? parseInt(navigationOrder) : null,
                metaTitle: metaTitle || title,
                metaDescription,
                metaKeywords,
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

        req.flash('success_msg', 'Page created successfully');
        res.redirect('/admin/pages');
    } catch (error) {
        logger.error('Error creating page:', error);
        req.flash('error_msg', 'Error creating page');
        res.redirect('/admin/pages/create');
    }
};

// Render edit page form
exports.renderEditPage = async (req, res) => {
    try {
        const pageId = parseInt(req.params.id);
        
        const page = await prisma.page.findUnique({
            where: { id: pageId },
            include: {
                attachments: true
            }
        });
        
        if (!page) {
            req.flash('error_msg', 'Page not found');
            return res.redirect('/admin/pages');
        }
        
        res.render('admin/pages/edit', {
            title: `Edit Page: ${page.title}`,
            page
        });
    } catch (error) {
        logger.error('Error rendering edit page form:', error);
        req.flash('error_msg', 'Failed to load page');
        res.redirect('/admin/pages');
    }
};

// Update a page
exports.updatePage = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, content, status, showInNavigation, 
            navigationOrder, metaTitle, metaDescription, metaKeywords,
            deletedAttachments 
        } = req.body;

        // Convert Quill Delta to HTML
        let htmlContent = '';
        try {
            const delta = JSON.parse(content);
            const converter = new QuillDeltaToHtmlConverter(delta.ops, {});
            htmlContent = converter.convert();
        } catch (e) {
            // If parsing fails, use content as is (might be HTML already)
            htmlContent = content;
            console.error('Error converting Quill content:', e);
        }

        // Generate slug from title
        const slug = slugify(title, {
            lower: true,
            strict: true
        });

        // Check if slug already exists on a different page
        const existingPage = await prisma.page.findFirst({
            where: {
                slug,
                id: {
                    not: parseInt(id)
                }
            }
        });

        if (existingPage) {
            req.flash('error_msg', 'A page with this title already exists. Please choose a different title.');
            return res.redirect(`/admin/pages/edit/${id}`);
        }

        // Get the existing page
        const existingPageData = await prisma.page.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!existingPageData) {
            req.flash('error_msg', 'Page not found');
            return res.redirect('/admin/pages');
        }
        
        // Update the page
        await prisma.page.update({
            where: { id: parseInt(id) },
            data: {
                title,
                content: htmlContent,
                slug,
                status,
                showInNavigation: showInNavigation === 'on',
                navigationOrder: navigationOrder ? parseInt(navigationOrder) : null,
                metaTitle: metaTitle || title,
                metaDescription,
                metaKeywords,
                publishedAt: status === 'published' && !existingPageData.publishedAt ? new Date() : existingPageData.publishedAt,
                updatedAt: new Date()
            }
        });
        
        // Handle deleted attachments
        if (deletedAttachments) {
            const attachmentIds = Array.isArray(deletedAttachments) 
                ? deletedAttachments.map(id => parseInt(id))
                : [parseInt(deletedAttachments)];
            
            // Get attachments to delete
            const attachmentsToDelete = await prisma.pageAttachment.findMany({
                where: {
                    id: { in: attachmentIds },
                    pageId: parseInt(id)
                }
            });
            
            // Delete attachment files
            for (const attachment of attachmentsToDelete) {
                try {
                    await unlinkAsync(path.join(__dirname, '../../public', attachment.path));
                } catch (err) {
                    logger.error(`Error deleting attachment file ${attachment.path}:`, err);
                    // Continue even if file deletion fails
                }
            }
            
            // Delete attachments from database
            await prisma.pageAttachment.deleteMany({
                where: {
                    id: { in: attachmentIds },
                    pageId: parseInt(id)
                }
            });
        }
        
        // Handle new file uploads
        if (req.files && req.files.length > 0) {
            const pageDir = await ensurePageUploadDir(parseInt(id));
            
            for (const file of req.files) {
                // Create attachment record
                await prisma.pageAttachment.create({
                    data: {
                        filename: file.filename,
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                        size: file.size,
                        path: `/uploads/page/${parseInt(id)}/${file.filename}`,
                        page: {
                            connect: { id: parseInt(id) }
                        }
                    }
                });
            }
        }
        
        req.flash('success_msg', 'Page updated successfully');
        res.redirect('/admin/pages');
    } catch (error) {
        logger.error('Error updating page:', error);
        req.flash('error_msg', 'Failed to update page');
        res.redirect(`/admin/pages/edit/${req.params.id}`);
    }
};

// Delete a page
exports.deletePage = async (req, res) => {
    try {
        const pageId = parseInt(req.params.id);
        
        // Delete all attachments first
        await deletePageAttachments(pageId);
        
        // Delete the page
        await prisma.page.delete({
            where: { id: pageId }
        });
        
        req.flash('success_msg', 'Page deleted successfully');
        res.redirect('/admin/pages');
    } catch (error) {
        logger.error('Error deleting page:', error);
        req.flash('error_msg', 'Failed to delete page');
        res.redirect('/admin/pages');
    }
};

// Delete attachment
exports.deleteAttachment = async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.attachmentId);
        
        // Get the attachment
        const attachment = await prisma.pageAttachment.findUnique({
            where: { id: attachmentId },
            include: { page: true }
        });
        
        if (!attachment) {
            return res.status(404).json({ success: false, message: 'Attachment not found' });
        }
        
        // Delete the file
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
        
        return res.json({ success: true, message: 'Attachment deleted successfully' });
    } catch (error) {
        logger.error('Error deleting attachment:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete attachment' });
    }
};
