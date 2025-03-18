const prisma = require('../lib/prisma');
const logger = require('../config/logger');

/**
 * Middleware to track and increment website visits
 * This will increment both total and daily counters for each unique session
 * The daily counter resets at midnight every day
 */
const trackVisits = async (req, res, next) => {
    try {
        // Skip counting for admin routes, API routes, and static file requests
        if (req.path.startsWith('/admin') || 
            req.path.startsWith('/api') || 
            req.path.includes('.') ||
            req.xhr) {
            return next();
        }

        // Skip counting for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Check if this is a new session
        if (!req.session.counted) {
            // Find or create the counter
            let counter = await prisma.visitCounter.findFirst();
            
            if (!counter) {
                // Create a new counter if it doesn't exist
                counter = await prisma.visitCounter.create({
                    data: {
                        count: 1,
                        todayCount: 1,
                        lastReset: new Date()
                    }
                });
                logger.info(`Visit counter created with initial count: ${counter.count}`);
            } else {
                // Check if we need to reset the daily counter
                const now = new Date();
                const lastReset = new Date(counter.lastReset);
                const shouldReset = 
                    now.getDate() !== lastReset.getDate() || 
                    now.getMonth() !== lastReset.getMonth() || 
                    now.getFullYear() !== lastReset.getFullYear();
                
                // Increment the counters
                counter = await prisma.visitCounter.update({
                    where: { id: counter.id },
                    data: {
                        count: { increment: 1 },
                        todayCount: shouldReset ? 1 : { increment: 1 },
                        lastReset: shouldReset ? now : undefined
                    }
                });
                
                if (shouldReset) {
                    logger.info(`Daily visit counter reset to 1`);
                }
                
                logger.debug(`Total visits: ${counter.count}, Today's visits: ${counter.todayCount}`);
            }
            
            // Mark this session as counted
            req.session.counted = true;
        }

        // Get the current counts for display
        const counter = await prisma.visitCounter.findFirst();
        if (counter) {
            res.locals.totalVisitCount = counter.count;
            res.locals.todayVisitCount = counter.todayCount;
        } else {
            res.locals.totalVisitCount = 0;
            res.locals.todayVisitCount = 0;
        }
        
        next();
    } catch (error) {
        logger.error('Error tracking visits:', error);
        // Continue even if there's an error
        next();
    }
};

module.exports = { trackVisits };