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
        const { title_en, title_tw, description_en, description_tw, url, isActive, order } = req.body;
        
        if (!req.files || !req.files.media) {
            req.flash('error_msg', 'Please upload a main media file');
            return res.redirect('/admin/banners/create');
        }

        // Get the main media file
        const mainMedia = req.files.media[0];
        
        // Determine if it's an image or video based on mimetype
        const mediaType = mainMedia.mimetype.startsWith('image/') ? 'image' : 'video';
        
        // Store the path relative to the public directory for proper URL generation
        const relativePath = '/uploads/banners/' + path.basename(mainMedia.path);
        
        // Get responsive image paths if they exist
        let mediaPathDesktop = null;
        let mediaPathTablet = null;
        let mediaPathMobile = null;
        
        if (req.files.mediaDesktop) {
            mediaPathDesktop = '/uploads/banners/' + path.basename(req.files.mediaDesktop[0].path);
        }
        
        if (req.files.mediaTablet) {
            mediaPathTablet = '/uploads/banners/' + path.basename(req.files.mediaTablet[0].path);
        }
        
        if (req.files.mediaMobile) {
            mediaPathMobile = '/uploads/banners/' + path.basename(req.files.mediaMobile[0].path);
        }
        
        await prisma.banner.create({
            data: {
                title_en,
                title_tw,
                description_en,
                description_tw,
                url,
                mediaPath: relativePath,
                mediaType,
                mediaPathDesktop,
                mediaPathTablet,
                mediaPathMobile,
                order: order ? parseInt(order) : 0,
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
        const { title_en, title_tw, description_en, description_tw, url, isActive, order } = req.body;

        const banner = await prisma.banner.findUnique({
            where: { id: bannerId }
        });

        if (!banner) {
            req.flash('error_msg', 'Banner not found');
            return res.redirect('/admin/banners');
        }

        const updateData = {
            title_en,
            title_tw,
            description_en,
            description_tw,
            url,
            order: order ? parseInt(order) : 0,
            isActive: isActive === 'true'
        };

        // If a new main file is uploaded, update the media info
        if (req.files && req.files.media) {
            // Delete the old file if it exists
            try {
                // The actual physical path on disk
                const oldFilePath = path.join(process.cwd(), 'public', banner.mediaPath);
                
                logger.info(`Attempting to delete old file at: ${oldFilePath}`);
                
                if (fs.existsSync(oldFilePath)) {
                    await unlinkAsync(oldFilePath);
                    logger.info(`Successfully deleted old file: ${oldFilePath}`);
                } else {
                    logger.warn(`Old file not found for deletion: ${oldFilePath}`);
                }
            } catch (err) {
                logger.error(`Error deleting old banner file: ${banner.mediaPath}`, err);
            }

            // Update with new file info
            const mainMedia = req.files.media[0];
            const relativePath = '/uploads/banners/' + path.basename(mainMedia.path);
            updateData.mediaPath = relativePath;
            updateData.mediaType = mainMedia.mimetype.startsWith('image/') ? 'image' : 'video';
        }
        
        // Update desktop image if provided
        if (req.files && req.files.mediaDesktop) {
            // Delete the old file if it exists
            if (banner.mediaPathDesktop) {
                try {
                    const oldFilePath = path.join(process.cwd(), 'public', banner.mediaPathDesktop);
                    if (fs.existsSync(oldFilePath)) {
                        await unlinkAsync(oldFilePath);
                    }
                } catch (err) {
                    logger.error(`Error deleting old desktop banner file: ${banner.mediaPathDesktop}`, err);
                }
            }
            
            // Update with new file info
            updateData.mediaPathDesktop = '/uploads/banners/' + path.basename(req.files.mediaDesktop[0].path);
        }
        
        // Update tablet image if provided
        if (req.files && req.files.mediaTablet) {
            // Delete the old file if it exists
            if (banner.mediaPathTablet) {
                try {
                    const oldFilePath = path.join(process.cwd(), 'public', banner.mediaPathTablet);
                    if (fs.existsSync(oldFilePath)) {
                        await unlinkAsync(oldFilePath);
                    }
                } catch (err) {
                    logger.error(`Error deleting old tablet banner file: ${banner.mediaPathTablet}`, err);
                }
            }
            
            // Update with new file info
            updateData.mediaPathTablet = '/uploads/banners/' + path.basename(req.files.mediaTablet[0].path);
        }
        
        // Update mobile image if provided
        if (req.files && req.files.mediaMobile) {
            // Delete the old file if it exists
            if (banner.mediaPathMobile) {
                try {
                    const oldFilePath = path.join(process.cwd(), 'public', banner.mediaPathMobile);
                    if (fs.existsSync(oldFilePath)) {
                        await unlinkAsync(oldFilePath);
                    }
                } catch (err) {
                    logger.error(`Error deleting old mobile banner file: ${banner.mediaPathMobile}`, err);
                }
            }
            
            // Update with new file info
            updateData.mediaPathMobile = '/uploads/banners/' + path.basename(req.files.mediaMobile[0].path);
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

        // Delete the main file
        try {
            // The actual physical path on disk
            const filePath = path.join(process.cwd(), 'public', banner.mediaPath);
            
            logger.info(`Attempting to delete file at: ${filePath}`);
            
            if (fs.existsSync(filePath)) {
                await unlinkAsync(filePath);
                logger.info(`Successfully deleted file: ${filePath}`);
            } else {
                logger.warn(`File not found for deletion: ${filePath}`);
            }
        } catch (err) {
            logger.error(`Error deleting banner file: ${banner.mediaPath}`, err);
            // Continue with banner deletion even if file deletion fails
        }
        
        // Delete responsive image files if they exist
        if (banner.mediaPathDesktop) {
            try {
                const filePath = path.join(process.cwd(), 'public', banner.mediaPathDesktop);
                if (fs.existsSync(filePath)) {
                    await unlinkAsync(filePath);
                }
            } catch (err) {
                logger.error(`Error deleting desktop banner file: ${banner.mediaPathDesktop}`, err);
            }
        }
        
        if (banner.mediaPathTablet) {
            try {
                const filePath = path.join(process.cwd(), 'public', banner.mediaPathTablet);
                if (fs.existsSync(filePath)) {
                    await unlinkAsync(filePath);
                }
            } catch (err) {
                logger.error(`Error deleting tablet banner file: ${banner.mediaPathTablet}`, err);
            }
        }
        
        if (banner.mediaPathMobile) {
            try {
                const filePath = path.join(process.cwd(), 'public', banner.mediaPathMobile);
                if (fs.existsSync(filePath)) {
                    await unlinkAsync(filePath);
                }
            } catch (err) {
                logger.error(`Error deleting mobile banner file: ${banner.mediaPathMobile}`, err);
            }
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