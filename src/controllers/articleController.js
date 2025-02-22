const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// List all articles
exports.listArticles = async (req, res) => {
    try {
        const articles = await prisma.article.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { username: true }
                },
                category: {
                    select: { name: true }
                }
            }
        });

        res.render('admin/articles/list', {
            title: 'Articles',
            layout: 'layouts/admin',
            articles
        });
    } catch (error) {
        logger.error('Error listing articles:', error);
        req.flash('error_msg', 'Error loading articles');
        res.redirect('/admin/dashboard');
    }
};

// Render create article form
exports.renderCreateForm = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' }
        });

        const media = await prisma.media.findMany({
            orderBy: { createdAt: 'desc' }
        });

        res.render('admin/articles/create', {
            title: 'Create Article',
            layout: 'layouts/admin',
            categories,
            media
        });
    } catch (error) {
        logger.error('Error rendering create form:', error);
        req.flash('error_msg', 'Error loading form');
        res.redirect('/admin/articles');
    }
};

// Create new article
exports.createArticle = async (req, res) => {
    try {
        const {
            title,
            content,
            excerpt,
            categoryId,
            published
        } = req.body;

        // Log the received data
        logger.info('Creating article with data:', {
            title,
            excerpt,
            categoryId,
            published,
            userId: req.session.user?.id
        });

        if (!req.session.user?.id) {
            throw new Error('User not authenticated');
        }

        const article = await prisma.article.create({
            data: {
                title,
                content,
                excerpt: excerpt || null,
                status: published === 'on' ? 'published' : 'draft',
                categoryId: parseInt(categoryId),
                authorId: req.session.user.id,
                publishedAt: published === 'on' ? new Date() : null
            }
        });

        logger.info('Article created successfully:', article.id);
        req.flash('success_msg', 'Article created successfully');
        res.redirect('/admin/articles');
    } catch (error) {
        logger.error('Error creating article:', error);
        req.flash('error_msg', 'Error creating article: ' + error.message);
        res.redirect('/admin/articles/create');
    }
};

// Render edit article form
exports.renderEditForm = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Log request info
        logger.info('Rendering edit form for article:', {
            articleId: id,
            sessionUser: req.session.user
        });

        const article = await prisma.article.findUnique({
            where: { id: parseInt(id) },
            include: {
                category: true,
                media: true,
                author: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });

        if (!article) {
            logger.error('Article not found:', id);
            req.flash('error_msg', 'Article not found');
            return res.redirect('/admin/articles');
        }

        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' }
        });

        const media = await prisma.media.findMany({
            orderBy: { createdAt: 'desc' }
        });

        logger.info('Rendering edit form with data:', {
            articleId: article.id,
            title: article.title,
            categoryId: article.categoryId
        });

        res.render('admin/articles/edit', {
            title: 'Edit Article',
            layout: 'layouts/admin',
            article,
            categories,
            media
        });
    } catch (error) {
        logger.error('Error rendering edit form:', error);
        req.flash('error_msg', 'Error loading form');
        res.redirect('/admin/articles');
    }
};

// Update article
exports.updateArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            content,
            excerpt,
            categoryId,
            published
        } = req.body;

        logger.info('Updating article:', {
            id,
            title,
            categoryId,
            published,
            userId: req.session.user?.id
        });

        if (!req.session.user?.id) {
            throw new Error('User not authenticated');
        }

        const article = await prisma.article.update({
            where: { id: parseInt(id) },
            data: {
                title,
                content,
                excerpt: excerpt || null,
                status: published === 'on' ? 'published' : 'draft',
                categoryId: categoryId ? parseInt(categoryId) : null,
                publishedAt: published === 'on' ? new Date() : null,
                updatedAt: new Date()
            }
        });

        logger.info('Article updated successfully:', article.id);
        req.flash('success_msg', 'Article updated successfully');
        res.redirect('/admin/articles');
    } catch (error) {
        logger.error('Error updating article:', error);
        req.flash('error_msg', 'Error updating article: ' + error.message);
        res.redirect(`/admin/articles/edit/${req.params.id}`);
    }
};

// Delete article
exports.deleteArticle = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.article.delete({
            where: { id: parseInt(id) }
        });

        req.flash('success_msg', 'Article deleted successfully');
        res.redirect('/admin/articles');
    } catch (error) {
        logger.error('Error deleting article:', error);
        req.flash('error_msg', 'Error deleting article');
        res.redirect('/admin/articles');
    }
};
