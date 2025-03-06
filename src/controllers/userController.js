const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');

exports.listUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                role: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.render('admin/users/list', {
            title: 'Users',
            layout: 'layouts/admin',
            users
        });
    } catch (error) {
        logger.error('Error listing users:', error);
        req.flash('error_msg', 'Error loading users');
        res.redirect('/admin/dashboard');
    }
};

exports.renderCreateUser = async (req, res) => {
    try {
        const roles = await prisma.role.findMany();
        res.render('admin/users/create', {
            title: 'Create User',
            layout: 'layouts/admin',
            roles
        });
    } catch (error) {
        logger.error('Error rendering create user form:', error);
        req.flash('error_msg', 'Error loading roles');
        res.redirect('/admin/users');
    }
};

exports.createUser = async (req, res) => {
    try {
        const { username, email, password, roleId } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });

        if (existingUser) {
            req.flash('error_msg', 'Username or email already exists');
            return res.redirect('/admin/users/new');
        }

        // Get role details to validate
        const role = await prisma.role.findUnique({
            where: { id: parseInt(roleId) }
        });

        if (!role) {
            req.flash('error_msg', 'Invalid role selected');
            return res.redirect('/admin/users/new');
        }

        // Prevent creating super_admin if current user is not super_admin
        if (role.name === 'super_admin' && req.session.user.role !== 'super_admin') {
            req.flash('error_msg', 'You do not have permission to create super admin users');
            return res.redirect('/admin/users/new');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                roleId: parseInt(roleId),
                isActive: true
            }
        });

        req.flash('success_msg', 'User created successfully');
        res.redirect('/admin/users');
    } catch (error) {
        logger.error('Error creating user:', error);
        req.flash('error_msg', 'Error creating user');
        res.redirect('/admin/users/new');
    }
};

exports.renderEditUser = async (req, res) => {
    try {
        const { id } = req.params;
        const [user, roles, categories, categoryPermissions] = await Promise.all([
            prisma.user.findUnique({
                where: { id: parseInt(id) },
                include: { role: true }
            }),
            prisma.role.findMany(),
            prisma.category.findMany({
                where: { deletedAt: null },
                orderBy: { name_en: 'asc' }
            }),
            prisma.categoryPermission.findMany({
                where: { userId: parseInt(id) },
                include: { category: true }
            })
        ]);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/users');
        }

        res.render('admin/users/edit', {
            title: 'Edit User',
            layout: 'layouts/admin',
            user,
            roles,
            categories,
            categoryPermissions
        });
    } catch (error) {
        logger.error('Error rendering edit user form:', error);
        req.flash('error_msg', 'Error loading user data');
        res.redirect('/admin/users');
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password, roleId } = req.body;

        // Get current user data
        const currentUser = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: { role: true }
        });

        if (!currentUser) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/users');
        }

        // Get new role details
        const newRole = await prisma.role.findUnique({
            where: { id: parseInt(roleId) }
        });

        if (!newRole) {
            req.flash('error_msg', 'Invalid role selected');
            return res.redirect(`/admin/users/edit/${id}`);
        }

        // Special checks for super_admin role changes
        if (currentUser.role.name === 'super_admin' || newRole.name === 'super_admin') {
            // Only super_admin can modify super_admin users
            if (req.session.user.role !== 'super_admin') {
                req.flash('error_msg', 'You do not have permission to modify super admin users');
                return res.redirect('/admin/users');
            }
        }

        // Prepare update data
        const updateData = {
            username,
            email,
            roleId: parseInt(roleId),
            isActive: true // Always keep isActive true when updating
        };

        // Only update password if provided
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Update user
        await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        req.flash('success_msg', 'User updated successfully');
        res.redirect('/admin/users');
    } catch (error) {
        logger.error('Error updating user:', error);
        req.flash('error_msg', 'Error updating user');
        res.redirect(`/admin/users/edit/${req.params.id}`);
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/users');
        }

        // Don't allow deleting the last super admin
        const isSuperAdmin = await prisma.user.findFirst({
            where: {
                id: parseInt(id),
                role: {
                    name: 'super_admin'
                }
            }
        });

        if (isSuperAdmin) {
            const superAdminCount = await prisma.user.count({
                where: {
                    role: {
                        name: 'super_admin'
                    }
                }
            });

            if (superAdminCount <= 1) {
                req.flash('error_msg', 'Cannot delete the last super admin');
                return res.redirect('/admin/users');
            }
        }

        // Delete user
        await prisma.user.delete({
            where: { id: parseInt(id) }
        });

        req.flash('success_msg', 'User deleted successfully');
        res.redirect('/admin/users');
    } catch (error) {
        logger.error('Error deleting user:', error);
        req.flash('error_msg', 'Error deleting user');
        res.redirect('/admin/users');
    }
};
