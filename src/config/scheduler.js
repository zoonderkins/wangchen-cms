const cron = require('node-cron');
const prisma = require('../lib/prisma');
const logger = require('./logger');

/**
 * Initialize scheduled tasks
 */
const initScheduler = () => {
    // Reset visit counter at midnight (00:00) every day
    cron.schedule('0 0 * * *', async () => {
        try {
            logger.info('Creating new daily visit counter...');
            
            // Get the current counter
            const counter = await prisma.visitCounter.findFirst();
            
            if (counter) {
                // Create a new history entry for today with 0 today's count
                await prisma.visitCounterHistory.create({
                    data: {
                        count: counter.count,
                        todayCount: 0,
                        lastReset: new Date()
                    }
                });
                
                logger.info(`Created new daily visit counter with today's count: 0`);
            } else {
                // Create a new counter if it doesn't exist
                await prisma.visitCounter.create({
                    data: {
                        count: 0,
                        updatedAt: new Date()
                    }
                });
                
                // Create a new history entry
                await prisma.visitCounterHistory.create({
                    data: {
                        count: 0,
                        todayCount: 0,
                        lastReset: new Date()
                    }
                });
                
                logger.info('Created new visit counter and history.');
            }
        } catch (error) {
            logger.error('Error resetting visit counter:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Taipei" // Set to Taiwan timezone
    });
    
    logger.info('Scheduler initialized');
};

module.exports = { initScheduler }; 