const logger = require('../config/logger');

/**
 * Middleware to load site settings for all views
 */
module.exports = async (req, res, next) => {
  try {
    // Get the current site settings
    const siteSettings = await prisma.siteSettings.findFirst();
    
    // Add to res.locals so it's available in all views
    res.locals.siteSettings = siteSettings || null;
    
    next();
  } catch (error) {
    logger.error(`Error loading site settings: ${error.message}`, { error });
    // Continue without settings in case of error
    res.locals.siteSettings = null;
    next();
  }
}; 
