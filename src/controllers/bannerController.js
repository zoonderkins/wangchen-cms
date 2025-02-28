const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// List all banners
exports.listBanners = async (req, res) => {
    try {
        const banners = await prisma.banner.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                createdBy: {
                    select: {
                        username: true
                    }
                }
            }
        });

        res.render('admin/banners/list', {
            title: 'Banners',
            layout: 'layouts/admin',
            banners
        });
    } catch (error) {
        logger.error('Error listing banners:', error);
        req.flash('error_msg', 'Error loading banners');
        res.redirect('/admin/dashboard');
    }
};

// Render create banner form
exports.renderCreateBanner = (req, res) => {
    res.render('admin/banners/create', {
        title: 'Create Banner',
        layout: 'layouts/admin'
    });
};

// Create a new banner
exports.createBanner = async (req, res) => {
    try {
        const { title, description, url, isActive } = req.body;
        
        if (!req.file) {
            req.flash('error_msg', 'Please upload a media file');
            return res.redirect('/admin/banners/create');
        }

        // Determine if it's an image or video based on mimetype
        const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
        
        await prisma.banner.create({
            data: {
                title,
                description,
                url,
                mediaPath: req.file.path,
                mediaType,
                isActive: isActive === 'true',
                userId: req.session.user.id
            }
        });

        req.flash('success_msg', 'Banner created successfully');
        res.redirect('/admin/banners');
    } catch (error) {
        logger.error('Error creating banner:', error);
        req.flash('error_msg', 'Error creating banner');
        res.redirect('/admin/banners/create');
    }
};

// Render edit banner form
exports.renderEditBanner = async (req, res) => {
    try {
        const bannerId = parseInt(req.params.id);
        
        const banner = await prisma.banner.findUnique({
            where: { id: bannerId }
        });

        if (!banner) {
            req.flash('error_msg', 'Banner not found');
            return res.redirect('/admin/banners');
        }

        res.render('admin/banners/edit', {
            title: 'Edit Banner',
            layout: 'layouts/admin',
            banner
        });
    } catch (error) {
        logger.error('Error loading banner for edit:', error);
        req.flash('error_msg', 'Error loading banner');
        res.redirect('/admin/banners');
    }
};

// Update a banner
exports.updateBanner = async (req, res) => {
    try {
        const bannerId = parseInt(req.params.id);
        const { title, description, url, isActive } = req.body;

        const banner = await prisma.banner.findUnique({
            where: { id: bannerId }
        });

        if (!banner) {
            req.flash('error_msg', 'Banner not found');
            return res.redirect('/admin/banners');
        }

        const updateData = {
            title,
            description,
            url,
            isActive: isActive === 'true'
        };

        // If a new file is uploaded, update the media info
        if (req.file) {
            // Delete the old file
            try {
                await unlinkAsync(banner.mediaPath);
            } catch (err) {
                logger.error(`Error deleting old banner file: ${banner.mediaPath}`, err);
            }

            // Update with new file info
            updateData.mediaPath = req.file.path;
            updateData.mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
        }

        await prisma.banner.update({
            where: { id: bannerId },
            data: updateData
        });

        req.flash('success_msg', 'Banner updated successfully');
        res.redirect('/admin/banners');
    } catch (error) {
        logger.error('Error updating banner:', error);
        req.flash('error_msg', 'Error updating banner');
        res.redirect(`/admin/banners/edit/${req.params.id}`);
    }
};

// Toggle banner active status
exports.toggleBannerStatus = async (req, res) => {
    try {
        const bannerId = parseInt(req.params.id);
        
        const banner = await prisma.banner.findUnique({
            where: { id: bannerId }
        });

        if (!banner) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }

        await prisma.banner.update({
            where: { id: bannerId },
            data: {
                isActive: !banner.isActive
            }
        });

        return res.json({ 
            success: true, 
            isActive: !banner.isActive,
            message: `Banner ${!banner.isActive ? 'activated' : 'deactivated'} successfully` 
        });
    } catch (error) {
        logger.error('Error toggling banner status:', error);
        return res.status(500).json({ success: false, message: 'Error updating banner status' });
    }
};

// Delete a banner
exports.deleteBanner = async (req, res) => {
    try {
        const bannerId = parseInt(req.params.id);
        
        const banner = await prisma.banner.findUnique({
            where: { id: bannerId }
        });

        if (!banner) {
            req.flash('error_msg', 'Banner not found');
            return res.redirect('/admin/banners');
        }

        // Delete the file
        try {
            await unlinkAsync(banner.mediaPath);
        } catch (err) {
            logger.error(`Error deleting banner file: ${banner.mediaPath}`, err);
        }

        // Delete the banner record
        await prisma.banner.delete({
            where: { id: bannerId }
        });

        req.flash('success_msg', 'Banner deleted successfully');
        res.redirect('/admin/banners');
    } catch (error) {
        logger.error('Error deleting banner:', error);
        req.flash('error_msg', 'Error deleting banner');
        res.redirect('/admin/banners');
    }
};
