require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const logger = require('./config/logger');
const prisma = require('./lib/prisma');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const { setLocals, ensureVisitCount } = require('./middleware/viewMiddleware');
const { languageMiddleware } = require('./middleware/languageMiddleware');
const { languageRouteMiddleware, addLanguageHelpers } = require('./middleware/languageRouteMiddleware');
const { attachPageImage } = require('./middleware/pageImageMiddleware');
const { trackVisits } = require('./middleware/visitCounterMiddleware');
const siteSettingsMiddleware = require('./middleware/siteSettings');

// Import routes
const frontendRoutes = require('./routes/frontend');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Express layouts setup
app.use(expressLayouts);
app.set('layout', 'layouts/admin');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middleware
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(cookieParser());

// Serve static files - keep only one static file serving configuration
app.use(express.static(path.join(__dirname, '../public')));

// Method override middleware - must be before route handlers
app.use(methodOverride('_method'));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secure_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Flash messages
app.use(flash());

// Pass user and flash messages to all views
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;  
    next();
});

// Language route middleware - must be after session middleware and before language middleware
app.use(languageRouteMiddleware);

// Language middleware - must be after session middleware
app.use(languageMiddleware);

// Add language helper functions to res.locals
app.use(addLanguageHelpers);

// Load site settings for all views
app.use(siteSettingsMiddleware);

// Attach page image to frontend routes
app.use(attachPageImage);

// Track website visits
app.use(trackVisits);

// Ensure visitCount is defined for all views
app.use(ensureVisitCount);

// Global variables
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
});

// Layout middleware - Set different layouts for admin and frontend
app.use((req, res, next) => {
    // Set admin layout for admin routes
    if (req.path.startsWith('/admin')) {
        res.locals.layout = 'layouts/admin';
    } else {
        // Set frontend layout for all other routes
        res.locals.layout = 'layouts/frontend';
    }
    next();
});

// Routes
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/', frontendRoutes);

// 404 handler
app.use((req, res) => {
    // Set the layout based on the route
    const layout = req.path.startsWith('/admin') ? 'layouts/admin' : 'layouts/frontend';
    res.locals.layout = layout;
    
    res.status(404).render('frontend/404', {
        title: '404 Not Found',
        layout: layout
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    
    // Set the layout based on the route
    const layout = req.path.startsWith('/admin') ? 'layouts/admin' : 'layouts/frontend';
    res.locals.layout = layout;
    
    res.status(500).render('error', {
        title: 'Error',
        message: 'An unexpected error occurred',
        error: process.env.NODE_ENV === 'development' ? err : {},
        layout: layout
    });
});

// Start server
const startApp = async () => {
    try {
        // Test database connection
        await prisma.$connect();
        logger.info('Database connection established successfully');

        // Initialize scheduler for cron jobs
        const { initScheduler } = require('./config/scheduler');
        initScheduler();

        // Start server
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            logger.info(`Server is running on port ${port}`);
        });
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

if (require.main === module) {
    startApp();
}

module.exports = app;