const prisma = require('../lib/prisma');
const logger = require('../config/logger');

exports.renderDashboard = async (req, res) => {
    try {
        const [
            articleCount,
            mediaCount,
            categoryCount,
            userCount,
            recentArticles
        ] = await Promise.all([
            prisma.article.count(),
            prisma.media.count(),
            prisma.category.count(),
            prisma.user.count(),
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
            })
        ]);

        res.render('admin/dashboard', {
            title: 'Dashboard',
            layout: 'layouts/admin',
            stats: {
                articles: articleCount,
                media: mediaCount,
                categories: categoryCount,
                users: userCount
            },
            recentArticles
        });
    } catch (error) {
        logger.error('Error loading dashboard:', error);
        req.flash('error_msg', 'Error loading dashboard data');
        res.redirect('/admin');
    }
};
