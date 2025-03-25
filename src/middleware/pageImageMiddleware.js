const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * Middleware to fetch and attach page banner images to the response locals
 * This will make the page image available to all views
 */
const attachPageImage = async (req, res, next) => {
    try {
        // Get the current route/page
        // Remove leading slash and extract the base route (before any parameters)
        let currentPage = req.path.substring(1).split('/')[0];
        
        // Handle language prefixes in the URL (e.g., /en/about or /tw/about)
        if (currentPage === 'en' || currentPage === 'tw') {
            const secondPart = req.path.substring(1).split('/')[1] || '';
            currentPage = secondPart || 'index';
        }
        
        // If it's the root path, use 'index'
        if (currentPage === '') {
            currentPage = 'index';
        }

        // Handle dynamic pages (e.g., /tw/page/slug)
        if (currentPage === 'page') {
            const slug = req.path.split('/').pop();
            // Find the page by slug
            const page = await prisma.page.findFirst({
                where: {
                    slug: slug,
                    status: 'published',
                    deletedAt: null
                }
            });
            if (page) {
                currentPage = page.slug;
            }
        }
        
        // Log for debugging
        logger.info(`Current page: ${currentPage}, full path: ${req.path}, looking for page image`);
        
        // Find the page image for this page
        const pageImage = await prisma.pageImage.findFirst({
            where: {
                targetPage: currentPage,
                isActive: true
            }
        });
        
        // Log whether we found an image
        if (pageImage) {
            logger.info(`Found page image for ${currentPage}: ${pageImage.path}`);
            
            // Add device detection for responsive images
            const userAgent = req.headers['user-agent'] || '';
            
            // Determine which image to use based on user agent
            if (pageImage.pathMobile && /mobile|android|iphone|ipod|blackberry|opera mini/i.test(userAgent)) {
                pageImage.responsivePath = pageImage.pathMobile;
                logger.info(`Using mobile image for ${currentPage}: ${pageImage.pathMobile}`);
            } else if (pageImage.pathTablet && /ipad|tablet|playbook|silk/i.test(userAgent)) {
                pageImage.responsivePath = pageImage.pathTablet;
                logger.info(`Using tablet image for ${currentPage}: ${pageImage.pathTablet}`);
            } else if (pageImage.pathDesktop) {
                pageImage.responsivePath = pageImage.pathDesktop;
                logger.info(`Using desktop image for ${currentPage}: ${pageImage.pathDesktop}`);
            } else {
                pageImage.responsivePath = pageImage.path;
                logger.info(`Using default image for ${currentPage}: ${pageImage.path}`);
            }
        } else {
            logger.info(`No page image found for ${currentPage}`);
        }
        
        // Attach to res.locals so it's available in all views
        res.locals.pageImage = pageImage;
        
        next();
    } catch (error) {
        logger.error('Error fetching page image:', error);
        // Continue even if there's an error
        next();
    }
};

module.exports = { attachPageImage };