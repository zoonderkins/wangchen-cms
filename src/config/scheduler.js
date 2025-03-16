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
            logger.info('Resetting daily visit counter...');
            
            // Get the current counter
            const counter = await prisma.visitCounter.findFirst();
            
            if (counter) {
                // Reset the counter to 0
                await prisma.visitCounter.update({
                    where: { id: counter.id },
                    data: { 
                        count: 0,
                        updatedAt: new Date()
                    }
                });
                
                logger.info(`Visit counter reset to 0.`);
            } else {
                // Create a new counter if it doesn't exist
                await prisma.visitCounter.create({
                    data: {
                        count: 0,
                        updatedAt: new Date()
                    }
                });
                logger.info('Created new visit counter.');
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