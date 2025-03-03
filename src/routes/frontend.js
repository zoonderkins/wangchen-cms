const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const QuillDeltaToHtmlConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;
const path = require('path');

// Common middleware to load navigation data
router.use(async (req, res, next) => {
    try {
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

        // Make navigation data available to all views
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
        const [latestArticles, featuredDownloads, activeBanners, categories] = await Promise.all([
            prisma.article.findMany({
                where: { status: 'published', deletedAt: null },
                take: 6,
                orderBy: { publishedAt: 'desc' },
                include: {
                    category: true,
                    author: {
                        select: { username: true }
                    }
                }
            }),
            prisma.download.findMany({
                where: { status: 'published', deletedAt: null },
                take: 6,
                orderBy: { createdAt: 'desc' },
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
                }
            }),
            prisma.category.findMany({
                where: { 
                    type: 'article',
                    deletedAt: null
                },
                include: {
                    _count: {
                        select: {
                            articles: {
                                where: { status: 'published', deletedAt: null }
                            }
                        }
                    }
                }
            })
        ]);

        res.render('frontend/index', {
            title: 'Home',
            articles: latestArticles,
            featuredDownloads,
            banners: activeBanners,
            categories
        });
    } catch (error) {
        logger.error('Home page error:', error);
        res.status(500).render('error', { error: 'Failed to load home page' });
    }
});

// Article detail page
router.get('/articles/:id', async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.id);
        if (isNaN(articleId)) {
            return next();
        }

        const article = await prisma.article.findUnique({
            where: {
                id: articleId,
                status: 'published',
                deletedAt: null
            },
            include: {
                category: true,
                author: {
                    select: { username: true }
                }
            }
        });

        if (!article) {
            return next();
        }

        // Convert Quill Delta to HTML if needed
        let contentHtml = article.content;
        if (article.content && article.content.startsWith('{')) {
            try {
                const delta = JSON.parse(article.content);
                if (delta.ops) {
                    const converter = new QuillDeltaToHtmlConverter(delta.ops, {});
                    contentHtml = converter.convert();
                }
            } catch (e) {
                logger.error('Error converting article content:', e);
            }
        }

        res.render('frontend/article', {
            title: article.title,
            article: { ...article, contentHtml }
        });
    } catch (error) {
        logger.error('Article detail page error:', error);
        res.status(500).render('error', { error: 'Failed to load article' });
    }
});

// Articles section
router.get('/articles', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 12;

        const [articles, categories, total] = await Promise.all([
            prisma.article.findMany({
                where: { status: 'published', deletedAt: null },
                skip: (page - 1) * perPage,
                take: perPage,
                orderBy: { publishedAt: 'desc' },
                include: {
                    category: true,
                    author: {
                        select: { username: true }
                    }
                }
            }),
            prisma.category.findMany({
                where: { type: 'article', deletedAt: null },
                include: {
                    _count: {
                        select: {
                            articles: {
                                where: { status: 'published', deletedAt: null }
                            }
                        }
                    }
                }
            }),
            prisma.article.count({
                where: { status: 'published', deletedAt: null }
            })
        ]);

        res.render('frontend/articles', {
            title: 'Articles',
            articles,
            categories,
            pagination: {
                current: page,
                perPage,
                total,
                pages: Math.ceil(total / perPage)
            }
        });
    } catch (error) {
        logger.error('Articles page error:', error);
        res.status(500).render('error', { error: 'Failed to load articles' });
    }
});

// Single article
router.get('/article/:slug', async (req, res, next) => {
    try {
        const article = await prisma.article.findFirst({
            where: {
                slug: req.params.slug,
                status: 'published',
                deletedAt: null
            },
            include: {
                category: true,
                author: {
                    select: { name: true }
                }
            }
        });

        if (!article) {
            return next();
        }

        // Convert Quill Delta to HTML
        const converter = new QuillDeltaToHtmlConverter(JSON.parse(article.content).ops, {});
        const contentHtml = converter.convert();

        res.render('frontend/article', {
            title: article.title,
            article: { ...article, contentHtml }
        });
    } catch (error) {
        logger.error('Article page error:', error);
        res.status(500).render('error', { error: 'Failed to load article' });
    }
});

// Downloads section
router.get('/downloads', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 12;

        const [downloads, categories, total] = await Promise.all([
            prisma.download.findMany({
                where: { status: 'published', deletedAt: null },
                skip: (page - 1) * perPage,
                take: perPage,
                orderBy: { createdAt: 'desc' },
                include: {
                    category: true
                }
            }),
            prisma.category.findMany({
                where: { type: 'download', deletedAt: null },
                include: {
                    _count: {
                        select: {
                            downloads: {
                                where: { status: 'published', deletedAt: null }
                            }
                        }
                    }
                }
            }),
            prisma.download.count({
                where: { status: 'published', deletedAt: null }
            })
        ]);

        res.render('frontend/downloads', {
            title: 'Downloads',
            downloads,
            categories,
            pagination: {
                current: page,
                perPage,
                total,
                pages: Math.ceil(total / perPage)
            }
        });
    } catch (error) {
        logger.error('Downloads page error:', error);
        res.status(500).render('error', { error: 'Failed to load downloads' });
    }
});

// Download file
router.get('/download/:slug', async (req, res, next) => {
    try {
        const download = await prisma.download.findFirst({
            where: {
                slug: req.params.slug,
                status: 'published',
                deletedAt: null
            }
        });

        if (!download) {
            return next();
        }

        // Update download count
        await prisma.download.update({
            where: { id: download.id },
            data: { downloadCount: { increment: 1 } }
        });

        // Send file
        res.download(download.filePath, download.fileName, (err) => {
            if (err) {
                logger.error('Download error:', err);
                res.status(500).render('error', { error: 'Failed to download file' });
            }
        });
    } catch (error) {
        logger.error('Download error:', error);
        res.status(500).render('error', { error: 'Failed to process download' });
    }
});

// FAQ section
router.get('/faqs', async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { 
                type: 'faq', 
                deletedAt: null 
            },
            include: {
                faqItems: {
                    where: { 
                        status: 'published', 
                        deletedAt: null 
                    },
                    orderBy: [
                        { order: 'asc' },
                        { createdAt: 'desc' }
                    ]
                }
            }
        });

        // Convert Quill Delta to HTML for each FAQ
        categories.forEach(category => {
            category.faqItems.forEach(faq => {
                const converter = new QuillDeltaToHtmlConverter(JSON.parse(faq.answer).ops, {});
                faq.answerHtml = converter.convert();
            });
        });

        res.render('frontend/faq', {
            title: 'FAQs',
            categories
        });
    } catch (error) {
        logger.error('FAQ page error:', error);
        res.status(500).render('error', { error: 'Failed to load FAQs' });
    }
});

// Category pages
router.get('/category/:id', async (req, res, next) => {
    try {
        const categoryId = parseInt(req.params.id);
        if (isNaN(categoryId)) {
            return next();
        }

        const category = await prisma.category.findUnique({
            where: {
                id: categoryId,
                deletedAt: null
            },
            include: {
                parent: true,
                children: {
                    where: { deletedAt: null },
                    include: {
                        _count: {
                            select: {
                                articles: {
                                    where: { status: 'published', deletedAt: null }
                                },
                                downloads: {
                                    where: { status: 'published', deletedAt: null }
                                },
                                faqItems: {
                                    where: { status: 'published', deletedAt: null }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!category) {
            return next();
        }

        const page = parseInt(req.query.page) || 1;
        const perPage = 12;

        // Get content based on category type
        let content = [];
        let total = 0;

        switch (category.type) {
            case 'article':
                [content, total] = await Promise.all([
                    prisma.article.findMany({
                        where: {
                            categoryId: category.id,
                            status: 'published',
                            deletedAt: null
                        },
                        skip: (page - 1) * perPage,
                        take: perPage,
                        orderBy: { publishedAt: 'desc' },
                        include: {
                            author: {
                                select: { username: true }
                            }
                        }
                    }),
                    prisma.article.count({
                        where: {
                            categoryId: category.id,
                            status: 'published',
                            deletedAt: null
                        }
                    })
                ]);
                break;

            case 'download':
                [content, total] = await Promise.all([
                    prisma.download.findMany({
                        where: {
                            categoryId: category.id,
                            status: 'published',
                            deletedAt: null
                        },
                        skip: (page - 1) * perPage,
                        take: perPage,
                        orderBy: { createdAt: 'desc' }
                    }),
                    prisma.download.count({
                        where: {
                            categoryId: category.id,
                            status: 'published',
                            deletedAt: null
                        }
                    })
                ]);
                break;

            case 'faq':
                [content, total] = await Promise.all([
                    prisma.faqItem.findMany({
                        where: {
                            categoryId: category.id,
                            status: 'published',
                            deletedAt: null
                        },
                        skip: (page - 1) * perPage,
                        take: perPage,
                        orderBy: [
                            { order: 'asc' },
                            { createdAt: 'desc' }
                        ]
                    }),
                    prisma.faqItem.count({
                        where: {
                            categoryId: category.id,
                            status: 'published',
                            deletedAt: null
                        }
                    })
                ]);

                // Convert Quill Delta to HTML for FAQs
                content.forEach(faq => {
                    const converter = new QuillDeltaToHtmlConverter(JSON.parse(faq.answer).ops, {});
                    faq.answerHtml = converter.convert();
                });
                break;
        }

        // Helper function for date formatting
        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        res.render('frontend/category', {
            title: category.name,
            category,
            [category.type === 'article' ? 'articles' : 
              category.type === 'download' ? 'downloads' : 'faqs']: content,
            pagination: {
                current: page,
                perPage,
                total,
                pages: Math.ceil(total / perPage)
            },
            formatDate
        });
    } catch (error) {
        logger.error('Category page error:', error);
        res.status(500).render('error', { error: 'Failed to load category' });
    }
});

// Pages
router.get('/:slug', async (req, res, next) => {
    try {
        const page = await prisma.page.findFirst({
            where: {
                slug: req.params.slug,
                status: 'published',
                deletedAt: null
            },
            include: {
                attachments: true
            }
        });

        if (!page) {
            return next();
        }

        // Convert Quill Delta to HTML
        const converter = new QuillDeltaToHtmlConverter(JSON.parse(page.content).ops, {});
        const contentHtml = converter.convert();

        res.render('frontend/page', {
            title: page.title,
            page: { ...page, contentHtml }
        });
    } catch (error) {
        logger.error('Page error:', error);
        res.status(500).render('error', { error: 'Failed to load page' });
    }
});

module.exports = router;
