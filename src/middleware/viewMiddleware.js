// Define setLocals as a variable first
const setLocals = (req, res, next) => {
    // Set common locals for all views
    res.locals.user = req.session.user || null;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.currentPath = req.path;
    
    // Make environment variables available in templates
    res.locals.env = process.env;
    
    next();
};

/**
 * Ensures that visitCount is defined for all views
 * This is used as a fallback when the visitCounterMiddleware hasn't run
 */
const ensureVisitCount = (req, res, next) => {
    // Set a default value for visitCount if it's not already defined
    if (res.locals.visitCount === undefined) {
        res.locals.visitCount = 0;
    }
    next();
};

module.exports = {
    setLocals,
    ensureVisitCount
};