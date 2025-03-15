const prisma = require('../lib/prisma');
const path = require('path');
const logger = require('../config/logger');

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
