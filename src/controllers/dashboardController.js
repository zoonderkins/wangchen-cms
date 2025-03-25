const prisma = require('../lib/prisma');
const logger = require('../config/logger');

exports.renderDashboard = async (req, res) => {
    try {
        const language = res.locals.currentLanguage || 'en';
        
        const [
            articleCount,
            mediaCount,
            categoryCount,
            userCount,
            pageCount,
            faqCategoryCount,
            faqItemCount,
            downloadCount,
            frontpageItemCount,
            recentArticles,
            recentPages,
            recentFaqItems,
            recentDownloads,
            recentFrontpageItems,
            visitorCounter,
            visitorHistory
        ] = await Promise.all([
            prisma.article.count(),
            prisma.media.count(),
            prisma.category.count(),
            prisma.user.count(),
            prisma.page.count(),
            prisma.faqCategory.count({
                where: { deletedAt: null }
            }),
            prisma.faqItem.count({
                where: { deletedAt: null }
            }),
            prisma.download.count({
                where: { deletedAt: null }
            }),
            prisma.frontpageItem.count({
                where: { deletedAt: null }
            }),
            prisma.article.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: { username: true }
                    },
                    category: {
                        select: { 
                            name_en: true,
                            name_tw: true,
                            id: true
                        }
                    }
                }
            }),
            prisma.page.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: { username: true }
                    }
                }
            }),
            prisma.faqItem.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                where: { deletedAt: null },
                include: {
                    category: {
                        select: { 
                            name_en: true,
                            name_tw: true,
                            id: true
                        }
                    },
                    author: {
                        select: { username: true }
                    }
                }
            }),
            prisma.download.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                where: { deletedAt: null },
                include: {
                    author: {
                        select: { username: true }
                    },
                    category: {
                        select: { 
                            name_en: true,
                            name_tw: true,
                            id: true
                        }
                    }
                }
            }),
            prisma.frontpageItem.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                where: { deletedAt: null },
                include: {
                    author: {
                        select: { username: true }
                    },
                    category: {
                        select: { 
                            name_tw: true,
                            id: true
                        }
                    }
                }
            }),
            prisma.visitCounter.findFirst(),
            prisma.visitCounterHistory.findFirst({
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Process recent items to handle multilingual content
        const processedRecentArticles = recentArticles.map(article => {
            if (article.category) {
                const nameField = `name_${language}`;
                article.category.name = article.category[nameField] || article.category.name_en;
            }
            return article;
        });

        const processedRecentFaqItems = recentFaqItems.map(faqItem => {
            if (faqItem.category) {
                const nameField = `name_${language}`;
                faqItem.category.name = faqItem.category[nameField] || faqItem.category.name_en;
            }
            return faqItem;
        });

        const processedRecentDownloads = recentDownloads.map(download => {
            if (download.category) {
                const nameField = `name_${language}`;
                download.category.name = download.category[nameField] || download.category.name_en;
            }
            return download;
        });

        res.render('admin/dashboard', {
            title: 'Dashboard',
            layout: 'layouts/admin',
            stats: {
                articles: articleCount,
                media: mediaCount,
                categories: categoryCount,
                users: userCount,
                pages: pageCount,
                faqCategories: faqCategoryCount,
                faqItems: faqItemCount,
                downloads: downloadCount,
                frontpageItems: frontpageItemCount,
                visitors: visitorHistory?.todayCount || 0,
                totalVisitors: visitorCounter?.count || 0
            },
            recentArticles: processedRecentArticles,
            recentPages,
            recentFaqItems: processedRecentFaqItems,
            recentDownloads: processedRecentDownloads,
            recentFrontpageItems
        });
    } catch (error) {
        logger.error('Error loading dashboard:', error);
        res.render('admin/dashboard', {
            title: 'Dashboard',
            error: 'Failed to load dashboard data'
        });
    }
};