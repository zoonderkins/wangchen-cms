const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const logger = require('../src/config/logger');

const prisma = new PrismaClient();

async function main() {
    try {
        // Create super admin role with all permissions
        const superAdminRole = await prisma.role.upsert({
            where: { name: 'super_admin' },
            update: {
                description: 'Super Administrator',
                permissions: ['*']
            },
            create: {
                name: 'super_admin',
                description: 'Super Administrator',
                permissions: ['*']
            }
        });

        // Create admin role with standard permissions
        const adminRole = await prisma.role.upsert({
            where: { name: 'admin' },
            update: {
                description: 'Administrator',
                permissions: [
                    'manage_articles',
                    'manage_categories',
                    'manage_media',
                    'view_dashboard'
                ]
            },
            create: {
                name: 'admin',
                description: 'Administrator',
                permissions: [
                    'manage_articles',
                    'manage_categories',
                    'manage_media',
                    'view_dashboard'
                ]
            }
        });

        // Create editor role
        const editorRole = await prisma.role.upsert({
            where: { name: 'editor' },
            update: {
                description: 'Content Editor',
                permissions: [
                    'manage_articles',
                    'manage_media',
                    'view_dashboard'
                ]
            },
            create: {
                name: 'editor',
                description: 'Content Editor',
                permissions: [
                    'manage_articles',
                    'manage_media',
                    'view_dashboard'
                ]
            }
        });

        // Create super admin user
        const hashedPassword = await bcrypt.hash('admin', 10);
        const superAdminUser = await prisma.user.upsert({
            where: { email: 'admin@example.com' },
            update: {
                roleId: superAdminRole.id
            },
            create: {
                username: 'admin',
                email: 'admin@example.com',
                password: hashedPassword,
                roleId: superAdminRole.id,
                isActive: true
            }
        });

        // Create default category
        // First check if the category exists
        let defaultCategory = await prisma.category.findFirst({
            where: { name_en: 'Uncategorized' }
        });
        
        // If it doesn't exist, create it
        if (!defaultCategory) {
            defaultCategory = await prisma.category.create({
                data: {
                    name_en: 'Uncategorized',
                    name_tw: '未分類',
                    description_en: 'Default category for uncategorized content',
                    description_tw: '未分類內容的預設類別',
                    order: 0
                }
            });
        }

        logger.info('Database seeded successfully');
        console.log({ superAdminRole, adminRole, editorRole, superAdminUser, defaultCategory });
    } catch (error) {
        logger.error('Error seeding database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
