const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');

exports.renderLoginForm = (req, res) => {
    if (req.session.user) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', {
        title: 'Login',
        layout: 'layouts/auth'
    });
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email: username }
                ]
            },
            include: {
                role: true
            }
        });

        if (!user || !user.isActive) {
            req.flash('error_msg', 'Invalid username or password');
            return res.redirect('/admin/login');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error_msg', 'Invalid username or password');
            return res.redirect('/admin/login');
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        // Set session data
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role.name,
            permissions: user.role.permissions
        };

        logger.info(`User logged in: ${user.username}`);
        res.redirect('/admin/dashboard');
    } catch (error) {
        logger.error('Login error:', error);
        req.flash('error_msg', 'Error during login');
        res.redirect('/admin/login');
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            logger.error('Logout error:', err);
        }
        res.redirect('/admin/login');
    });
};
