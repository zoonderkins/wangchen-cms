exports.setLocals = (req, res, next) => {
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
