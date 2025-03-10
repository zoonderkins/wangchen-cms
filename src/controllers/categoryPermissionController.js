const prisma = require('../lib/prisma');
const logger = require('../config/logger');

/**
 * Assign category permissions to a user
 */
exports.assignCategoryPermissions = async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions } = req.body;

        // Validate user exists
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: { role: true }
        });

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/users');
        }

        // Only assign category permissions to editors
        if (user.role.name !== 'editor') {
            req.flash('error_msg', 'Category permissions can only be assigned to editors');
            return res.redirect(`/admin/users/edit/${userId}`);
        }

        // Validate permissions format
        if (!Array.isArray(permissions)) {
            req.flash('error_msg', 'Invalid permissions format');
            return res.redirect(`/admin/users/edit/${userId}`);
        }

        // Begin transaction
        await prisma.$transaction(async (tx) => {
            // Delete existing permissions
            await tx.categoryPermission.deleteMany({
                where: { userId: parseInt(userId) }
            });

            // Create new permissions
            for (const perm of permissions) {
                await tx.categoryPermission.create({
                    data: {
                        userId: parseInt(userId),
                        categoryId: parseInt(perm.categoryId),
                        canView: perm.canView || false,
                        canCreate: perm.canCreate || false,
                        canEdit: perm.canEdit || false,
                        canDelete: perm.canDelete || false
                    }
                });
            }
        });

        req.flash('success_msg', 'Category permissions updated successfully');
        res.redirect(`/admin/users/edit/${userId}`);
    } catch (error) {
        logger.error('Error assigning category permissions:', error);
        req.flash('error_msg', 'Error updating category permissions');
        res.redirect(`/admin/users/edit/${userId}`);
    }
};

/**
 * Get category permissions for a user
 */
exports.getCategoryPermissions = async (req, res) => {
    try {
        const { userId } = req.params;

        const permissions = await prisma.categoryPermission.findMany({
            where: { userId: parseInt(userId) },
            include: { category: true }
        });

        res.json(permissions);
    } catch (error) {
        logger.error('Error getting category permissions:', error);
        res.status(500).json({ error: 'Error getting category permissions' });
    }
};

/**
 * Check if user has permission for a specific category action
 */
exports.checkCategoryPermission = async (userId, categoryId, action) => {
    try {
        const permission = await prisma.categoryPermission.findUnique({
            where: {
                userId_categoryId: {
                    userId: parseInt(userId),
                    categoryId: parseInt(categoryId)
                }
            }
        });

        if (!permission) {
            return false;
        }

        switch (action) {
            case 'view':
                return permission.canView;
            case 'create':
                return permission.canCreate;
            case 'edit':
                return permission.canEdit;
            case 'delete':
                return permission.canDelete;
            default:
                return false;
        }
    } catch (error) {
        logger.error('Error checking category permission:', error);
        return false;
    }
};
