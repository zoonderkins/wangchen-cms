const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;

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
            where: {
                parentId: null // Get only top-level categories
            },
            include: {
                children: {
                    include: {
                        _count: {
                            select: {
                                articles: {
                                    where: { status: 'published' }
                                }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        articles: {
                            where: { status: 'published' }
                        }
                    }
                }
            },
            orderBy: {
                order: 'asc'
            }
        });

        // Get navigation pages
        const navigationPages = await prisma.page.findMany({
            where: {
                status: 'published',
                showInNavigation: true,
                deletedAt: null
            },
            select: {
                id: true,
                title: true,
                slug: true,
                navigationOrder: true
            },
            orderBy: {
                navigationOrder: 'asc'
            }
        });

        // Make categories and navigation pages available to all views
        res.locals.categories = categories;
        res.locals.navigationPages = navigationPages;
        next();
    } catch (error) {
        logger.error('Error in frontend middleware:', error);
        next(error);
    }
});

// Home page
router.get('/', async (req, res) => {
    try {
        // Get latest articles and active banners
        const [articles, banners] = await Promise.all([
            prisma.article.findMany({
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
            }),
            prisma.banner.findMany({
                where: {
                    isActive: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 4 // Limit to 4 banners
            })
        ]);

        // Debug banner information
        logger.info(`Banners found: ${banners.length}`);
        if (banners.length > 0) {
            banners.forEach((banner, index) => {
                logger.info(`Banner ${index + 1}: ID=${banner.id}, Title=${banner.title}, Media=${banner.mediaPath}, Active=${banner.isActive}, Type=${banner.mediaType}`);
            });
        } else {
            logger.info('No active banners found');
        }

        // Process articles to create excerpts
        const processedArticles = articles.map(article => ({
            ...article,
            excerpt: article.excerpt || createExcerpt(article.content)
        }));

        res.render('frontend/index', {
            title: 'Home',
            articles: processedArticles,
            banners,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error loading homepage:', error);
        res.render('frontend/index', {
            title: 'Home',
            articles: [],
            banners: [],
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
                message: 'Category not found',
                layout: 'layouts/frontend'
            });
        }

        // Process articles to create excerpts
        const processedArticles = category.articles.map(article => ({
            ...article,
            excerpt: createExcerpt(article.content),
            content: article.content
        }));

        res.render('frontend/category', {
            title: category.name,
            category: {
                ...category,
                articles: processedArticles
            },
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error fetching category:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: 'An error occurred while fetching the category',
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

// Page route
router.get('/page/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Find the page by slug
        const page = await prisma.page.findFirst({
            where: {
                slug,
                status: 'published',
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
            logger.warn(`Page not found: ${slug}`);
            return res.status(404).render('frontend/404', {
                title: 'Page Not Found',
                layout: 'layouts/frontend'
            });
        }
        
        // Process content if it's in Quill Delta format
        try {
            // Check if content is in Quill Delta JSON format
            const contentObj = JSON.parse(page.content);
            if (contentObj.ops) {
                const converter = new QuillDeltaToHtmlConverter(contentObj.ops, {});
                page.content = converter.convert();
            }
        } catch (e) {
            // If not JSON or conversion fails, use content as is (HTML)
            logger.debug(`Content for page ${slug} is not in Quill Delta format or couldn't be converted`);
        }
        
        // Render the page
        res.render('frontend/page', {
            title: page.metaTitle || page.title,
            metaDescription: page.metaDescription,
            metaKeywords: page.metaKeywords,
            page,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error(`Error rendering page ${req.params.slug}:`, error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'An unexpected error occurred',
            error: process.env.NODE_ENV === 'development' ? error : {},
            layout: 'layouts/frontend'
        });
    }
});

// FAQ page
router.get('/faq', async (req, res) => {
    try {
        // Get all published FAQ categories with their published items
        const categories = await prisma.faqCategory.findMany({
            where: {
                deletedAt: null
            },
            include: {
                faqItems: {
                    where: {
                        status: 'published',
                        deletedAt: null
                    },
                    orderBy: {
                        order: 'asc'
                    }
                }
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        // Get article categories for navigation (separate from FAQ categories)
        const articleCategories = await prisma.category.findMany({
            where: {
                parentId: null // Get only top-level categories
            },
            include: {
                children: {
                    include: {
                        _count: {
                            select: {
                                articles: {
                                    where: { status: 'published' }
                                }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        articles: {
                            where: { status: 'published' }
                        }
                    }
                }
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        res.render('frontend/faq', {
            title: 'Frequently Asked Questions',
            categories, // These are FAQ categories
            articleCategories, // Pass article categories separately
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error rendering FAQ page:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: 'Failed to load FAQ page',
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
