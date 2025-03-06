const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;
const downloadController = require('../controllers/downloadController');
const newsController = require('../controllers/newsController');
const { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } = require('../middleware/languageMiddleware');

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

// Redirect root to Traditional Chinese (tw) by default
router.get('/', (req, res, next) => {
    // Only redirect if this is a direct request to the root URL
    if (req.originalUrl === '/') {
        // Redirect to the default language
        return res.redirect(`/${DEFAULT_LANGUAGE}`);
    }
    
    // If we get here, it means we're already processing a language route
    // or some other middleware has modified the URL
    next();
});

// Prevent redirect loops for language routes
router.get('/:language', async (req, res, next) => {
    try {
        const language = req.params.language;
        
        // Skip processing if not a valid language code
        if (!AVAILABLE_LANGUAGES.includes(language)) {
            return next();
        }
        
        // Skip processing if the original URL contains a path after the language
        // This allows routes like /:language/promotions to be handled by their specific handlers
        const originalPath = req.originalUrl;
        const pathParts = originalPath.split('/').filter(Boolean);
        if (pathParts.length > 1) {
            return next();
        }
        
        // Get active banners and navigation pages
        const currentLanguage = req.params.language || 'en';
        const [banners, navigationPages] = await Promise.all([
            prisma.banner.findMany({
                where: {
                    isActive: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 4 // Limit to 4 banners
            }),
            prisma.page.findMany({
                where: {
                    status: 'published',
                    showInNavigation: true
                },
                orderBy: {
                    navigationOrder: 'asc'
                }
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

        // Process banners for multilingual content
        const processedBanners = banners.map(banner => {
            const titleField = `title_${currentLanguage}`;
            const descriptionField = `description_${currentLanguage}`;
            
            return {
                ...banner,
                title: banner[titleField] || banner.title_en,
                description: banner[descriptionField] || banner.description_en
            };
        });

        // Add helper function for getting content in the current language
        const getContent = (item, field) => {
            const langField = `${field}_${currentLanguage}`;
            return item[langField] || item[`${field}_en`] || '';
        };

        res.render('frontend/index', {
            title: 'Home',
            banners: processedBanners,
            navigationPages: navigationPages,
            currentLanguage: currentLanguage,
            getContent: getContent,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error loading homepage:', error);
        // Store the language from params to avoid reference error
        const currentLanguage = req.params.language || 'en';
        
        res.render('frontend/index', {
            title: 'Home',
            banners: [],
            navigationPages: [],
            currentLanguage: currentLanguage,
            getContent: (item, field) => '',
            layout: 'layouts/frontend'
        });
    }
});

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
                title_en: true,
                title_tw: true,
                slug: true,
                navigationOrder: true
            },
            orderBy: {
                navigationOrder: 'asc'
            }
        });

        // Make navigation pages available to all views
        res.locals.navigationPages = navigationPages;
        next();
    } catch (error) {
        logger.error('Error in frontend middleware:', error);
        next(error);
    }
});

// Home page
router.get('/:language', async (req, res) => {
    try {
        const language = req.params.language;
        
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

        // Process articles to create excerpts and handle multilingual content
        const processedArticles = articles.map(article => {
            const titleField = `title_${language}`;
            const contentField = `content_${language}`;
            const excerptField = `excerpt_${language}`;
            
            return {
                ...article,
                title: article[titleField] || article.title_en, // Fallback to English
                content: article[contentField] || article.content_en,
                excerpt: article[excerptField] || createExcerpt(article[contentField] || article.content_en)
            };
        });
        
        // Process banners for multilingual content
        const processedBanners = banners.map(banner => {
            const titleField = `title_${language}`;
            const descriptionField = `description_${language}`;
            
            return {
                ...banner,
                title: banner[titleField] || banner.title_en,
                description: banner[descriptionField] || banner.description_en
            };
        });

        res.render('frontend/index', {
            title: 'Home',
            articles: processedArticles,
            banners: processedBanners,
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
router.get('/:language/articles', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 12;
        const skip = (page - 1) * perPage;
        const language = req.params.language;
        logger.info(`Loading articles for language: ${language}`);

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
        
        // Process articles for multilingual content
        const processedArticles = articles.map(article => {
            const titleField = `title_${language}`;
            const excerptField = `excerpt_${language}`;
            const contentField = `content_${language}`;
            
            return {
                ...article,
                title: article[titleField] || article.title_en, // Fallback to English
                excerpt: article[excerptField] || createExcerpt(article[contentField] || article.content_en)
            };
        });

        res.render('frontend/articles', {
            title: language === 'en' ? 'Articles' : '文章',
            articles: processedArticles,
            currentPage: page,
            totalPages,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error loading articles page:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: language === 'en' ? 'Error loading articles page' : '載入文章頁面時出錯',
            layout: 'layouts/frontend'
        });
    }
});

// Category page
router.get('/:language/category/:id', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const language = req.params.language;
        
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
            excerpt: article.excerpt || createExcerpt(article.content),
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

// Article detail page
router.get('/:language/articles/:id', async (req, res) => {
    try {
        const articleId = parseInt(req.params.id);
        const language = req.params.language;
        logger.info(`Looking for article with id: ${articleId}`);
        
        // Find the article by ID
        const article = await prisma.article.findFirst({
            where: {
                id: articleId,
                status: 'published'
            },
            include: {
                category: true,
                author: {
                    select: { username: true }
                },
                featured: true,
                media: true
            }
        });
        
        if (!article) {
            logger.warn(`Article not found: ${articleId}`);
            return res.status(404).render('frontend/404', {
                title: language === 'en' ? 'Article Not Found' : '找不到文章',
                layout: 'layouts/frontend'
            });
        }
        
        logger.info(`Found article: ${article.title_en}`);
        
        // Get content based on language
        const titleField = `title_${language}`;
        const contentField = `content_${language}`;
        const excerptField = `excerpt_${language}`;
        const metaTitleField = `metaTitle_${language}`;
        const metaDescriptionField = `metaDescription_${language}`;
        const metaKeywordsField = `metaKeywords_${language}`;
        
        // Process content if it's in Quill Delta format
        let processedContent = '';
        try {
            // Check if content is in Quill Delta JSON format
            const contentObj = JSON.parse(article[contentField] || article.content_en);
            if (contentObj.ops) {
                const converter = new QuillDeltaToHtmlConverter(contentObj.ops, {});
                processedContent = converter.convert();
            }
        } catch (e) {
            // If not JSON or conversion fails, use content as is (HTML)
            logger.debug(`Content for article ${articleId} is not in Quill Delta format or couldn't be converted`);
            processedContent = article[contentField] || article.content_en;
        }
        
        // Create a processed article with the correct language content
        const processedArticle = {
            ...article,
            title: article[titleField] || article.title_en,
            content: processedContent,
            excerpt: article[excerptField] || article.excerpt_en,
            metaTitle: article[metaTitleField] || article[titleField] || article.title_en,
            metaDescription: article[metaDescriptionField] || article.metaDescription_en,
            metaKeywords: article[metaKeywordsField] || article.metaKeywords_en
        };
        
        // Get related articles from the same category
        let relatedArticles = [];
        if (article.categoryId) {
            relatedArticles = await prisma.article.findMany({
                where: {
                    categoryId: article.categoryId,
                    id: { not: article.id },
                    status: 'published'
                },
                take: 4,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    category: true
                }
            });
            
            // Process related articles for multilingual content
            relatedArticles = relatedArticles.map(relatedArticle => ({
                ...relatedArticle,
                title: relatedArticle[titleField] || relatedArticle.title_en,
                excerpt: relatedArticle[excerptField] || createExcerpt(relatedArticle[contentField] || relatedArticle.content_en)
            }));
        }
        
        // Render the article page
        res.render('frontend/article', {
            title: processedArticle.metaTitle || processedArticle.title,
            metaDescription: processedArticle.metaDescription,
            metaKeywords: processedArticle.metaKeywords,
            article: processedArticle,
            relatedArticles,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error(`Error rendering article ${req.params.id}:`, error);
        const language = req.params.language;
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: language === 'en' ? 'Error loading article page' : '載入文章頁面時出錯',
            layout: 'layouts/frontend'
        });
    }
});

// Page route
router.get('/:language/page/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const language = req.params.language;
        
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
        
        // Get content based on language
        const contentField = `content_${language}`;
        const titleField = `title_${language}`;
        const metaTitleField = `metaTitle_${language}`;
        const metaDescriptionField = `metaDescription_${language}`;
        const metaKeywordsField = `metaKeywords_${language}`;
        
        // Process content if it's in Quill Delta format
        let processedContent = '';
        try {
            // Check if content is in Quill Delta JSON format
            const contentObj = JSON.parse(page[contentField]);
            if (contentObj.ops) {
                const converter = new QuillDeltaToHtmlConverter(contentObj.ops, {});
                processedContent = converter.convert();
            }
        } catch (e) {
            // If not JSON or conversion fails, use content as is (HTML)
            logger.debug(`Content for page ${slug} is not in Quill Delta format or couldn't be converted`);
            processedContent = page[contentField];
        }
        
        // Create a new page object with processed content
        const processedPage = {
            ...page,
            content: processedContent,
            title: page[titleField] || page.title_en, // Fallback to English if current language not available
            metaTitle: page[metaTitleField] || page[titleField] || page.title_en,
            metaDescription: page[metaDescriptionField] || '',
            metaKeywords: page[metaKeywordsField] || ''
        };
        
        // Render the page
        res.render('frontend/page', {
            title: processedPage.metaTitle || processedPage.title,
            metaDescription: processedPage.metaDescription,
            metaKeywords: processedPage.metaKeywords,
            page: processedPage,
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
router.get('/:language/faq', async (req, res) => {
    try {
        const language = req.params.language;
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
            title: language === 'en' ? 'Frequently Asked Questions' : '常見問題',
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

// Downloads list page
router.get('/:language/downloads', downloadController.listDownloadsForFrontend);

// Download file
router.get('/:language/downloads/:id', downloadController.downloadFile);

// News routes
router.get('/:language/news', newsController.listNewsForFrontend);
router.get('/:language/news/:id', newsController.getNewsItemForFrontend);

// Promotion routes
const promotionController = require('../controllers/promotionController');
router.get('/:language/promotions', promotionController.listPromotionsForFrontend);
router.get('/:language/promotions/:id', promotionController.getPromotionItemForFrontend);

// Handle custom URL paths
router.get('/:language/:path(*)', async (req, res, next) => {
    try {
        // Skip admin routes
        if (req.params.path.startsWith('admin/')) {
            return next();
        }

        // Since we don't have custom paths for articles yet,
        // just pass to the next handler which will show 404
        next();
    } catch (error) {
        logger.error('Error in custom path handler:', error);
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
