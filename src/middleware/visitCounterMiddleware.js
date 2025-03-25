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
            let history = await prisma.visitCounterHistory.findFirst({
                orderBy: { createdAt: 'desc' }
            });
            
            const now = new Date();
            
            if (!counter) {
                // Create a new counter if it doesn't exist
                counter = await prisma.visitCounter.create({
                    data: {
                        count: 1,
                        updatedAt: now
                    }
                });
                logger.info(`Visit counter created with initial count: ${counter.count}`);
            } else {
                // Increment the main counter
                counter = await prisma.visitCounter.update({
                    where: { id: counter.id },
                    data: {
                        count: { increment: 1 }
                    }
                });
                logger.debug(`Total visits incremented to: ${counter.count}`);
            }
            
            // Check if we need to create or update today's history
            if (!history || shouldResetDaily(history.lastReset)) {
                // Create new history entry for today
                history = await prisma.visitCounterHistory.create({
                    data: {
                        count: counter.count,
                        todayCount: 1,
                        lastReset: now
                    }
                });
                logger.info(`Visit counter history created for new day with today's count: 1`);
            } else {
                // Increment today's count
                history = await prisma.visitCounterHistory.update({
                    where: { id: history.id },
                    data: {
                        count: counter.count,
                        todayCount: { increment: 1 }
                    }
                });
                logger.debug(`Today's visits incremented to: ${history.todayCount}`);
            }
            
            // Mark this session as counted
            req.session.counted = true;
        }

        // Get the current counts for display
        const [counter, history] = await Promise.all([
            prisma.visitCounter.findFirst(),
            prisma.visitCounterHistory.findFirst({
                orderBy: { createdAt: 'desc' }
            })
        ]);
        
        if (counter) {
            res.locals.totalVisitCount = counter.count;
        } else {
            res.locals.totalVisitCount = 0;
        }
        
        if (history) {
            res.locals.todayVisitCount = history.todayCount;
        } else {
            res.locals.todayVisitCount = 0;
        }
        
        next();
    } catch (error) {
        logger.error('Error tracking visits:', error);
        // Continue even if there's an error
        next();
    }
};

/**
 * Check if we need to reset the daily counter
 * @param {Date} lastReset - Last time the counter was reset
 * @returns {boolean}
 */
function shouldResetDaily(lastReset) {
    const now = new Date();
    const last = new Date(lastReset);
    return (
        now.getDate() !== last.getDate() || 
        now.getMonth() !== last.getMonth() || 
        now.getFullYear() !== last.getFullYear()
    );
}

module.exports = { trackVisits };