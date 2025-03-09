const logger = require('../config/logger');
const prisma = require('../lib/prisma');

// Ensure user is authenticated
const isAuthenticated = async (req, res, next) => {
    // Skip auth check for public routes
    const publicRoutes = ['/login', '/logout'];
    if (publicRoutes.includes(req.path)) {
        return next();
    }

    if (!req.session.user) {
        req.flash('error_msg', 'Please log in to access this resource');
        return res.redirect('/admin/login');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.session.user.id },
            include: {
                role: true
            }
        });

        if (!user) {
            req.session.destroy();
            req.flash('error_msg', 'Please log in to access this resource');
            return res.redirect('/admin/login');
        }

        // Update session with fresh user data
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role.name,
            permissions: user.role.permissions
        };
        
        // Add user to locals for views
        res.locals.user = req.session.user;
        next();
    } catch (error) {
        logger.error('Error authenticating user:', error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        return res.redirect('/admin/login');
    }
};

// Ensure user has required role
const hasRole = (roles) => {
    return (req, res, next) => {
        if (!req.session.user) {
            req.flash('error_msg', 'Please log in to access this resource');
            return res.redirect('/admin/login');
        }

        const userRole = req.session.user.role;
        
        // Convert roles to array if it's a single string
        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!requiredRoles.includes(userRole)) {
            req.flash('error_msg', 'You do not have permission to access this resource');
            return res.redirect('/admin/dashboard');
        }
        
        next();
    };
};

// Check if user has specific permission
const hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.session.user) {
            req.flash('error_msg', 'Please log in to access this resource');
            return res.redirect('/admin/login');
        }

        const userRole = req.session.user.role;
        const userPermissions = req.session.user.permissions || [];
        
        // Super admin has all permissions
        if (userRole === 'super_admin') {
            return next();
        }

        if (!userPermissions.includes(permission)) {
            req.flash('error_msg', 'You do not have permission to access this resource');
            
            // Avoid redirect loop - if we're already on dashboard, redirect to a different page
            if (req.path === '/dashboard' && permission === 'access:dashboard') {
                return res.render('admin/access-denied', {
                    title: 'Access Denied',
                    layout: 'layouts/admin',
                    user: req.session.user
                });
            }
            
            return res.redirect('/admin');
        }
        
        next();
    };
};

// Check if user owns the resource or has sufficient permissions
const isOwnerOrHasPermission = (permission, getResourceOwnerId) => {
    return async (req, res, next) => {
        if (!req.session.user) {
            req.flash('error_msg', 'Please log in to access this resource');
            return res.redirect('/admin/login');
        }

        const userRole = req.session.user.role;
        const userPermissions = req.session.user.permissions || [];
        
        // Super admin has all permissions
        if (userRole === 'super_admin') {
            return next();
        }

        try {
            // Get the resource owner's ID using the provided function
            const ownerId = await getResourceOwnerId(req);
            
            // Check if user is the owner
            if (ownerId === req.session.user.id) {
                return next();
            }

            // If not owner, check if they have the required permission
            if (!userPermissions.includes(permission)) {
                req.flash('error_msg', 'You do not have permission to access this resource');
                return res.redirect('/admin/dashboard');
            }

            next();
        } catch (error) {
            logger.error('Error checking resource ownership:', error);
            req.flash('error_msg', 'An error occurred while checking permissions');
            return res.redirect('/admin/dashboard');
        }
    };
};

module.exports = {
    isAuthenticated,
    hasRole,
    hasPermission,
    isOwnerOrHasPermission
};
