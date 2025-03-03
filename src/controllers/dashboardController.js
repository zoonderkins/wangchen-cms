const prisma = require('../lib/prisma');
const logger = require('../config/logger');

exports.renderDashboard = async (req, res) => {
    try {
        const [
            articleCount,
            mediaCount,
            categoryCount,
            userCount,
            pageCount,
            faqCategoryCount,
            faqItemCount,
            downloadCount,
            recentArticles,
            recentPages,
            recentFaqItems,
            recentDownloads
        ] = await Promise.all([
            prisma.article.count({
                where: { deletedAt: null }
            }),
            prisma.media.count({
                where: { deletedAt: null }
            }),
            prisma.category.count({
                where: { deletedAt: null }
            }),
            prisma.user.count({
                where: { isActive: true }
            }),
            prisma.page.count({
                where: { deletedAt: null }
            }),
            prisma.category.count({
                where: { 
                    type: 'faq',
                    deletedAt: null 
                }
            }),
            prisma.faqItem.count({
                where: { deletedAt: null }
            }),
            prisma.download.count({
                where: { deletedAt: null }
            }),
            prisma.article.findMany({
                take: 5,
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: { username: true }
                    },
                    category: {
                        select: { name: true }
                    }
                }
            }),
            prisma.page.findMany({
                take: 5,
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: { username: true }
                    }
                }
            }),
            prisma.faqItem.findMany({
                take: 5,
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' },
                include: {
                    category: {
                        select: { name: true }
                    },
                    author: {
                        select: { username: true }
                    }
                }
            }),
            prisma.download.findMany({
                take: 5,
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: { username: true }
                    },
                    category: {
                        select: { name: true }
                    }
                }
            })
        ]);

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
                downloads: downloadCount
            },
            recentArticles,
            recentPages,
            recentFaqItems,
            recentDownloads
        });
    } catch (error) {
        logger.error('Error loading dashboard:', error);
        req.flash('error_msg', 'Error loading dashboard data');
        res.redirect('/admin');
    }
};
