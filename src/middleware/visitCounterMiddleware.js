const prisma = require('../lib/prisma');
const logger = require('../config/logger');

/**
 * Middleware to track and increment website visits
 * This will increment the counter for each unique session
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
                        count: 1
                    }
                });
                // logger.info(`Visit counter created with initial count: ${counter.count}`);
            } else {
                // Increment the counter
                counter = await prisma.visitCounter.update({
                    where: { id: counter.id },
                    data: {
                        count: { increment: 1 }
                    }
                });
                // logger.info(`Visit counter incremented to: ${counter.count}`);
            }
            
            // Mark this session as counted
            req.session.counted = true;
        }

        // Get the current count for display
        const counter = await prisma.visitCounter.findFirst();
        if (counter) {
            res.locals.visitCount = counter.count;
        } else {
            res.locals.visitCount = 0;
        }
        
        next();
    } catch (error) {
        logger.error('Error tracking visits:', error);
        // Continue even if there's an error
        next();
    }
};

module.exports = { trackVisits };
