/**
 * Language middleware for handling language selection
 * Supports English (en) and Traditional Chinese (tw)
 */
const logger = require('../config/logger');

// Available languages
const AVAILABLE_LANGUAGES = ['en', 'tw'];
const DEFAULT_LANGUAGE = 'en';

/**
 * Middleware to handle language selection
 * Language can be set via:
 * 1. URL parameter (?lang=en or ?lang=tw)
 * 2. Session (req.session.language)
 * 3. Cookie (req.cookies.language)
 * 4. Browser preference (Accept-Language header)
 */
exports.languageMiddleware = (req, res, next) => {
    let language = DEFAULT_LANGUAGE;

    // Check URL parameter first
    if (req.query.lang && AVAILABLE_LANGUAGES.includes(req.query.lang)) {
        language = req.query.lang;
        // Save to session for future requests
        req.session.language = language;
    } 
    // Check session
    else if (req.session.language && AVAILABLE_LANGUAGES.includes(req.session.language)) {
        language = req.session.language;
    }
    // Check cookie
    else if (req.cookies && req.cookies.language && AVAILABLE_LANGUAGES.includes(req.cookies.language)) {
        language = req.cookies.language;
        // Save to session for future requests
        req.session.language = language;
    }
    // Check browser preference
    else if (req.headers['accept-language']) {
        const browserLangs = req.headers['accept-language'].split(',').map(lang => lang.split(';')[0].trim());
        
        // Check if browser prefers Chinese
        if (browserLangs.some(lang => lang.startsWith('zh'))) {
            language = 'tw'; // Default to Traditional Chinese for Chinese browsers
        }
    }

    // Set language in res.locals for use in templates
    res.locals.currentLanguage = language;
    res.locals.isEnglish = language === 'en';
    res.locals.isChinese = language === 'tw';
    
    // Helper function to get content based on language
    res.locals.getContent = (obj, field) => {
        if (!obj) return '';
        
        const langField = `${field}_${language}`;
        const defaultLangField = `${field}_${DEFAULT_LANGUAGE}`;
        
        // Return the content in the current language if available
        // Otherwise, fall back to the default language
        return obj[langField] || obj[defaultLangField] || '';
    };

    // Set cookie for language persistence
    res.cookie('language', language, { 
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true 
    });

    logger.debug(`Language set to: ${language}`);
    next();
};

// Export available languages for use in other modules
exports.AVAILABLE_LANGUAGES = AVAILABLE_LANGUAGES;
exports.DEFAULT_LANGUAGE = DEFAULT_LANGUAGE;
