const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');

async function initializeDatabase() {
    try {
        // Check if super admin role exists
        const superAdminRole = await prisma.role.findUnique({
            where: { name: 'super_admin' }
        });

        if (!superAdminRole) {
            // Create default roles
            const roles = await prisma.role.createMany({
                data: [
                    {
                        name: 'super_admin',
                        description: 'Super Administrator',
                        permissions: [
                            // User permissions
                            'user:list',
                            'user:create',
                            'user:edit',
                            'user:delete',
                            // Category permissions
                            'category:list',
                            'category:create',
                            'category:edit',
                            'category:delete',
                            // Article permissions
                            'article:list',
                            'article:create',
                            'article:edit',
                            'article:delete',
                            // Media permissions
                            'manage_media',
                            // Dashboard access
                            'access:dashboard',
                            // Super admin specific
                            'manage_roles',
                            'manage_permissions',
                            'system_settings'
                        ]
                    },
                    {
                        name: 'admin',
                        description: 'Administrator',
                        permissions: [
                            // Category permissions
                            'category:list',
                            'category:create',
                            'category:edit',
                            'category:delete',
                            // Article permissions
                            'article:list',
                            'article:create',
                            'article:edit',
                            'article:delete',
                            // Media permissions
                            'manage_media',
                            // Dashboard access
                            'access:dashboard'
                        ]
                    },
                    {
                        name: 'editor',
                        description: 'Content Editor',
                        permissions: [
                            'article:list',
                            'article:create',
                            'article:edit',
                            'manage_media',
                            'access:dashboard'
                        ]
                    }
                ]
            });

            // Get the super admin role ID
            const superAdmin = await prisma.role.findUnique({
                where: { name: 'super_admin' }
            });

            // Create default super admin user
            const hashedPassword = await bcrypt.hash('admin', 10);
            await prisma.user.create({
                data: {
                    username: 'admin',
                    email: 'admin@example.com',
                    password: hashedPassword,
                    roleId: superAdmin.id,
                    isActive: true
                }
            });

            // Create default category
            await prisma.category.create({
                data: {
                    name: 'Uncategorized',
                    slug: 'uncategorized',
                    description: 'Default category for uncategorized content'
                }
            });

            logger.info('Created default roles, super admin user, and default category');
        }

        logger.info('Database initialized successfully');
    } catch (error) {
        logger.error('Unable to initialize database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase()
        .catch(console.error)
        .finally(() => process.exit());
}

module.exports = initializeDatabase;
