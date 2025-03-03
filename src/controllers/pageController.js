const prisma = require('../lib/prisma');
const slugify = require('slugify');

// Helper function to ensure page upload directory exists
async function ensurePageUploadDir(pageId) {
    const dir = path.join(__dirname, '../../public/uploads/page', pageId.toString());
    try {
        await mkdirAsync(dir, { recursive: true });
        return dir;
    } catch (error) {
        console.error(`Error creating directory for page ${pageId}:`, error);
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
                console.error(`Error deleting attachment file ${attachment.path}:`, err);
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
            console.info(`Could not delete page directory for page ${pageId}:`, err);
        }
    } catch (error) {
        console.error(`Error deleting attachments for page ${pageId}:`, error);
        throw new Error('Failed to delete page attachments');
    }
}

// List all pages
exports.listPages = async (req, res) => {
    try {
        const pages = await prisma.page.findMany({
            include: {
                category: true,
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
            },
            where: {
                deletedAt: null
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.render('admin/pages/index', { pages, title: 'Manage Pages' });
    } catch (error) {
        console.error('Error listing pages:', error);
        req.flash('error_msg', 'Failed to retrieve pages');
        res.redirect('/admin/dashboard');
    }
};

// Render create page form
exports.renderCreatePage = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { type: 'page' },
            orderBy: {
                name: 'asc'
            }
        });
        res.render('admin/pages/create', { categories, title: 'Create Page' });
    } catch (error) {
        console.error('Error rendering create page:', error);
        req.flash('error_msg', 'Error loading page creation form');
        res.redirect('/admin/pages');
    }
};

// Create new page
exports.createPage = async (req, res) => {
    try {
        const { 
            title, content, contentType, status, categoryId,
            showInNavigation, navigationOrder,
            metaTitle, metaDescription, metaKeywords 
        } = req.body;

        if (!title) {
            req.flash('error_msg', 'Title is required');
            return res.redirect('/admin/pages/create');
        }

        if (!categoryId) {
            req.flash('error_msg', 'Category is required');
            return res.redirect('/admin/pages/create');
        }

        // Check if user is logged in
        if (!req.session.user || !req.session.user.id) {
            req.flash('error_msg', 'You must be logged in to create a page');
            return res.redirect('/admin/login');
        }

        const slug = slugify(title, { lower: true });

        // Check if slug already exists
        const existingPage = await prisma.page.findUnique({
            where: { slug }
        });

        if (existingPage) {
            req.flash('error_msg', 'A page with this title already exists');
            return res.redirect('/admin/pages/create');
        }

        // Ensure content is a string
        const contentValue = Array.isArray(content) ? content.join('') : content || '';

        await prisma.page.create({
            data: {
                title,
                slug,
                content: contentValue,
                contentType: contentType === 'raw' ? 'raw' : 'quill',
                status,
                showInNavigation: showInNavigation === 'on',
                navigationOrder: parseInt(navigationOrder || '0'),
                metaTitle: metaTitle || title,
                metaDescription,
                metaKeywords,
                author: {
                    connect: { id: req.session.user.id }
                },
                category: {
                    connect: { id: parseInt(categoryId) }
                }
            }
        });

        req.flash('success_msg', 'Page created successfully');
        res.redirect('/admin/pages');
    } catch (error) {
        console.error('Error creating page:', error);
        req.flash('error_msg', 'Error creating page: ' + error.message);
        res.redirect('/admin/pages/create');
    }
};

// Render edit page form
exports.renderEditPage = async (req, res) => {
    try {
        const [page, categories] = await Promise.all([
            prisma.page.findUnique({
                where: { id: parseInt(req.params.id) },
                include: {
                    category: true
                }
            }),
            prisma.category.findMany({
                where: { type: 'page' },
                orderBy: {
                    name: 'asc'
                }
            })
        ]);

        if (!page) {
            req.flash('error_msg', 'Page not found');
            return res.redirect('/admin/pages');
        }

        res.render('admin/pages/edit', { 
            page, 
            categories,
            title: `Edit Page: ${page.title}` 
        });
    } catch (error) {
        console.error('Error rendering edit page:', error);
        req.flash('error_msg', 'Error loading page edit form');
        res.redirect('/admin/pages');
    }
};

// Update page
exports.updatePage = async (req, res) => {
    try {
        const { 
            title, content, contentType, status, categoryId,
            showInNavigation, navigationOrder,
            metaTitle, metaDescription, metaKeywords 
        } = req.body;

        if (!title) {
            req.flash('error_msg', 'Title is required');
            return res.redirect(`/admin/pages/edit/${req.params.id}`);
        }

        if (!categoryId) {
            req.flash('error_msg', 'Category is required');
            return res.redirect(`/admin/pages/edit/${req.params.id}`);
        }

        const pageId = parseInt(req.params.id);
        if (isNaN(pageId)) {
            req.flash('error_msg', 'Invalid page ID');
            return res.redirect('/admin/pages');
        }

        const slug = slugify(title, { lower: true });

        // Check if slug already exists for other pages
        const existingPage = await prisma.page.findFirst({
            where: {
                slug,
                id: {
                    not: pageId
                }
            }
        });

        if (existingPage) {
            req.flash('error_msg', 'A page with this title already exists');
            return res.redirect(`/admin/pages/edit/${pageId}`);
        }

        // Ensure content is a string
        const contentValue = Array.isArray(content) ? content.join('') : content || '';

        await prisma.page.update({
            where: { 
                id: pageId
            },
            data: {
                title,
                slug,
                content: contentValue,
                contentType: contentType === 'raw' ? 'raw' : 'quill',
                status,
                showInNavigation: showInNavigation === 'on',
                navigationOrder: parseInt(navigationOrder || '0'),
                metaTitle: metaTitle || title,
                metaDescription,
                metaKeywords,
                updatedAt: new Date(),
                category: {
                    connect: { id: parseInt(categoryId) }
                }
            }
        });

        req.flash('success_msg', 'Page updated successfully');
        res.redirect('/admin/pages');
    } catch (error) {
        console.error('Error updating page:', error);
        req.flash('error_msg', `Error updating page: ${error.message}`);
        res.redirect(`/admin/pages/edit/${req.params.id}`);
    }
};

// Delete page
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
        console.error('Error deleting page:', error);
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
            console.error(`Error deleting attachment file ${attachment.path}:`, err);
            // Continue even if file deletion fails
        }
        
        // Delete from database
        await prisma.pageAttachment.delete({
            where: { id: attachmentId }
        });
        
        return res.json({ success: true, message: 'Attachment deleted successfully' });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete attachment' });
    }
};
