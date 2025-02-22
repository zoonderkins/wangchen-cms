const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// Helper function to create clean excerpts
function createExcerpt(content, maxLength = 200) {
    // First try to parse as JSON (Quill format)
    try {
        const contentObj = JSON.parse(content);
        if (contentObj.ops) {
            content = contentObj.ops.map(op => {
                if (typeof op.insert === 'string') {
                    return op.insert;
                }
                return '';
            }).join('');
        }
    } catch (e) {
        // If not JSON, assume it's HTML
        // Remove HTML tags
        content = content.replace(/<[^>]*>/g, ' ');
    }

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();
    
    // Truncate to maxLength
    if (content.length > maxLength) {
        // Try to cut at a word boundary
        content = content.substr(0, maxLength);
        const lastSpace = content.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) { // Only cut at space if it's not too far back
            content = content.substr(0, lastSpace);
        }
        content += '...';
    }
    
    return content;
}

// Common middleware for frontend routes
router.use(async (req, res, next) => {
    try {
        // Get categories for navigation
        // Get article only if status is 'published'
        const categories = await prisma.category.findMany({
            include: {
                _count: {
                    select: {
                        articles: {
                            where: {
                                status: 'published'
                            }
                        }
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });
        res.locals.categories = categories;
        next();
    } catch (error) {
        logger.error('Error loading common data:', error);
        res.locals.categories = [];
        next();
    }
});

// Home page
router.get('/', async (req, res) => {
    try {
        // Get latest articles
        const articles = await prisma.article.findMany({
            where: {
                status: 'published'
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10,
            include: {
                category: true
            }
        });

        // Process articles to create clean excerpts
        const processedArticles = articles.map(article => ({
            ...article,
            excerpt: article.excerpt || createExcerpt(article.content)
        }));

        res.render('frontend/index', {
            title: 'Home',
            articles: processedArticles,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error loading home page:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: 'Error loading home page',
            layout: 'layouts/frontend'
        });
    }
});

// Articles list page with pagination
router.get('/articles', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 12;
        const skip = (page - 1) * perPage;

        const [articles, total] = await Promise.all([
            prisma.article.findMany({
                where: {
                    status: 'published'
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: perPage,
                include: {
                    category: true,
                    author: {
                        select: { username: true }
                    }
                }
            }),
            prisma.article.count({
                where: {
                    status: 'published'
                }
            })
        ]);

        const totalPages = Math.ceil(total / perPage);

        res.render('frontend/articles', {
            title: 'Articles',
            articles,
            currentPage: page,
            totalPages,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error fetching articles:', error);
        res.render('frontend/articles', {
            title: 'Articles',
            articles: [],
            currentPage: 1,
            totalPages: 1,
            layout: 'layouts/frontend'
        });
    }
});

// Category page
router.get('/category/:id', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        
        if (isNaN(categoryId)) {
            return res.status(404).render('frontend/error', {
                title: 'Category Not Found',
                message: 'Invalid category ID',
                layout: 'layouts/frontend'
            });
        }

        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                articles: {
                    where: {
                        status: 'published'
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!category) {
            return res.status(404).render('frontend/error', {
                title: 'Category Not Found',
                message: 'The requested category could not be found',
                layout: 'layouts/frontend'
            });
        }

        res.render('frontend/category', {
            title: category.name,
            category,
            articles: category.articles,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error loading category page:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: 'Error loading category page',
            layout: 'layouts/frontend'
        });
    }
});

// Add single article route
router.get('/article/:id', async (req, res) => {
    try {
        const articleId = parseInt(req.params.id);
        logger.info(`Looking for article with id: ${articleId}`);
        
        if (isNaN(articleId)) {
            logger.warn(`Invalid article ID: ${req.params.id}`);
            return res.status(404).render('frontend/error', {
                title: 'Article Not Found',
                message: 'Invalid article ID',
                layout: 'layouts/frontend'
            });
        }

        const article = await prisma.article.findFirst({
            where: { 
                id: articleId,
                status: 'published'
            },
            include: {
                author: {
                    select: { username: true }
                },
                category: true,
                featured: true,
                media: true
            }
        });

        logger.info('Found article:', article ? { id: article.id, title: article.title, status: article.status } : 'null');

        if (!article) {
            return res.status(404).render('frontend/error', {
                title: 'Article Not Found',
                message: 'The requested article could not be found',
                layout: 'layouts/frontend'
            });
        }

        // Process the content - handle both Quill.js JSON and HTML formats
        if (article.content) {
            try {
                // Try to parse as JSON (Quill.js format)
                const contentObj = JSON.parse(article.content);
                if (contentObj.ops) {
                    // Convert Quill.js delta to HTML
                    article.content = contentObj.ops.map(op => {
                        if (typeof op.insert === 'string') {
                            let text = op.insert;
                            
                            // Apply basic formatting based on attributes
                            if (op.attributes) {
                                if (op.attributes.bold) text = `<strong>${text}</strong>`;
                                if (op.attributes.italic) text = `<em>${text}</em>`;
                                if (op.attributes.underline) text = `<u>${text}</u>`;
                                if (op.attributes.link) text = `<a href="${op.attributes.link}">${text}</a>`;
                                if (op.attributes.header) text = `<h${op.attributes.header}>${text}</h${op.attributes.header}>`;
                            }
                            
                            return text;
                        } else if (op.insert && op.insert.image) {
                            return `<img src="${op.insert.image}" alt="Article image">`;
                        }
                        return '';
                    }).join('');
                }
            } catch (e) {
                logger.info('Content appears to be HTML, skipping JSON parsing');
                // If parsing fails, assume it's already HTML content
                // No need to modify the content
            }
        }

        logger.info('Rendering article template');
        res.render('frontend/article', {
            title: article.title,
            article,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error loading article page:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: 'Error loading article page',
            layout: 'layouts/frontend'
        });
    }
});

// Handle article routes
router.get('/articles/:id', async (req, res) => {
    try {
        const articleId = parseInt(req.params.id);
        logger.info(`Looking for article with id: ${articleId}`);
        
        if (isNaN(articleId)) {
            logger.warn(`Invalid article ID: ${req.params.id}`);
            return res.status(404).render('frontend/error', {
                title: 'Article Not Found',
                message: 'Invalid article ID',
                layout: 'layouts/frontend'
            });
        }

        const article = await prisma.article.findFirst({
            where: { 
                id: articleId,
                status: 'published'
            },
            include: {
                author: {
                    select: { username: true }
                },
                category: true,
                featured: true,
                media: true
            }
        });

        logger.info('Found article:', article ? { id: article.id, title: article.title, status: article.status } : 'null');

        if (!article) {
            return res.status(404).render('frontend/error', {
                title: 'Article Not Found',
                message: 'The requested article could not be found',
                layout: 'layouts/frontend'
            });
        }

        // Process the content - handle both Quill.js JSON and HTML formats
        if (article.content) {
            try {
                // Try to parse as JSON (Quill.js format)
                const contentObj = JSON.parse(article.content);
                if (contentObj.ops) {
                    // Convert Quill.js delta to HTML
                    article.content = contentObj.ops.map(op => {
                        if (typeof op.insert === 'string') {
                            let text = op.insert;
                            
                            // Apply basic formatting based on attributes
                            if (op.attributes) {
                                if (op.attributes.bold) text = `<strong>${text}</strong>`;
                                if (op.attributes.italic) text = `<em>${text}</em>`;
                                if (op.attributes.underline) text = `<u>${text}</u>`;
                                if (op.attributes.link) text = `<a href="${op.attributes.link}">${text}</a>`;
                                if (op.attributes.header) text = `<h${op.attributes.header}>${text}</h${op.attributes.header}>`;
                            }
                            
                            return text;
                        } else if (op.insert && op.insert.image) {
                            return `<img src="${op.insert.image}" alt="Article image">`;
                        }
                        return '';
                    }).join('');
                }
            } catch (e) {
                logger.info('Content appears to be HTML, skipping JSON parsing');
                // If parsing fails, assume it's already HTML content
                // No need to modify the content
            }
        }

        logger.info('Rendering article template');
        res.render('frontend/article', {
            title: article.title,
            article,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error loading article page:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: 'Error loading article page',
            layout: 'layouts/frontend'
        });
    }
});

// Handle custom URL paths
router.get('/:path(*)', async (req, res, next) => {
    try {
        // Skip admin routes
        if (req.params.path.startsWith('admin/')) {
            return next();
        }

        // Since we don't have custom paths for articles yet,
        // just pass to the next handler which will show 404
        next();
    } catch (error) {
        logger.error('Error handling custom path:', error);
        next(error);
    }
});

// 404 handler
router.use((req, res) => {
    res.status(404).render('frontend/error', {
        title: 'Page Not Found',
        message: 'The page you are looking for could not be found.',
        layout: 'layouts/frontend'
    });
});

module.exports = router;
