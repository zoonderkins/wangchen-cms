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
            recentArticles,
            recentPages,
            recentFaqItems
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
            prisma.article.findMany({
                take: 5,
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
                        select: { name: true }
                    },
                    author: {
                        select: { username: true }
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
                faqItems: faqItemCount
            },
            recentArticles,
            recentPages,
            recentFaqItems
        });
    } catch (error) {
        logger.error('Error loading dashboard:', error);
        req.flash('error_msg', 'Error loading dashboard data');
        res.redirect('/admin');
    }
};
