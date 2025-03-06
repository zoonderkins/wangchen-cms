/**
 * Language route middleware for handling language-specific URLs
 * Supports URLs like /en/articles and /tw/articles
 */
const logger = require('../config/logger');
const { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } = require('./languageMiddleware');

/**
 * Middleware to handle language-specific URLs
 * This middleware should be applied before the route handlers
 */
exports.languageRouteMiddleware = (req, res, next) => {
    // Skip processing for the root URL to avoid redirect loops
    if (req.path === '/' && req.originalUrl === '/') {
        return next();
    }
    
    // Check if the URL starts with a language code
    const urlParts = req.path.split('/').filter(Boolean);
    
    if (urlParts.length > 0 && AVAILABLE_LANGUAGES.includes(urlParts[0])) {
        // Extract the language from the URL
        const language = urlParts[0];
        
        // Set the language in the session and locals
        req.session.language = language;
        res.locals.currentLanguage = language;
        res.locals.isEnglish = language === 'en';
        res.locals.isChinese = language === 'tw';
        
        logger.debug(`Language from URL: ${language}, URL: ${req.url}`);
    }
    
    next();
};

/**
 * Helper function to generate language-specific URLs
 * This function will be available in all templates
 */
exports.addLanguageHelpers = (req, res, next) => {
    // Function to generate a URL with the current language
    res.locals.languageUrl = (path) => {
        const language = res.locals.currentLanguage || DEFAULT_LANGUAGE;
        
        // If path already starts with a language code, replace it
        if (AVAILABLE_LANGUAGES.some(lang => path.startsWith(`/${lang}/`))) {
            return path.replace(/^\/[^\/]+/, `/${language}`);
        }
        
        // Otherwise, add the language code to the beginning
        return `/${language}${path.startsWith('/') ? path : `/${path}`}`;
    };
    
    // Function to generate a URL for a specific language
    res.locals.switchLanguageUrl = (language) => {
        if (!AVAILABLE_LANGUAGES.includes(language)) {
            language = DEFAULT_LANGUAGE;
        }
        
        // Get the current path without any language prefix
        let path = req.path;
        const urlParts = path.split('/').filter(Boolean);
        
        if (urlParts.length > 0 && AVAILABLE_LANGUAGES.includes(urlParts[0])) {
            path = path.replace(`/${urlParts[0]}`, '');
            if (path === '') path = '/';
        }
        
        // Add query parameters if any (except lang)
        const query = Object.entries(req.query)
            .filter(([key]) => key !== 'lang')
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        
        return `/${language}${path}${query ? `?${query}` : ''}`;
    };
    
    next();
};
