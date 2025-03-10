exports.setLocals = (req, res, next) => {
    // Pass user to all views
    res.locals.user = req.session.user || null;
    
    // Pass flash messages to all views
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    
    next();
};
