const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const path = require('path');
const fs = require('fs').promises;

exports.listMedia = async (req, res) => {
    try {
        const media = await prisma.media.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                uploader: {
                    select: { username: true }
                }
            }
        });

        res.render('admin/media/list', {
            title: 'Media Library',
            layout: 'layouts/admin',
            media
        });
    } catch (error) {
        logger.error('Error listing media:', error);
        req.flash('error_msg', 'Error loading media');
        res.redirect('/admin/dashboard');
    }
};

exports.renderUploadForm = (req, res) => {
    res.render('admin/media/upload', {
        title: 'Upload Media',
        layout: 'layouts/admin'
    });
};

exports.uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'Please select a file to upload');
            return res.redirect('/admin/media/upload');
        }

        const { filename, originalname, mimetype, size } = req.file;
        const uploadPath = `/uploads/media/${filename}`; // Use absolute URL path with correct subfolder

        await prisma.media.create({
            data: {
                filename,
                originalName: originalname,
                mimeType: mimetype,
                size,
                path: uploadPath,
                uploaderId: req.session.user.id
            }
        });

        req.flash('success_msg', 'File uploaded successfully');
        res.redirect('/admin/media');
    } catch (error) {
        logger.error('Error uploading media:', error);
        req.flash('error_msg', 'Error uploading file');
        res.redirect('/admin/media/upload');
    }
};

exports.deleteMedia = async (req, res) => {
    try {
        const { id } = req.params;

        const media = await prisma.media.findUnique({
            where: { id: parseInt(id) }
        });

        if (!media) {
            req.flash('error_msg', 'Media not found');
            return res.redirect('/admin/media');
        }

        // Delete file from filesystem
        const filePath = path.join(process.cwd(), media.path);
        try {
            await fs.unlink(filePath);
        } catch (error) {
            logger.warn(`Could not delete file ${filePath}:`, error);
        }

        // Delete from database
        await prisma.media.delete({
            where: { id: parseInt(id) }
        });

        req.flash('success_msg', 'Media deleted successfully');
        res.redirect('/admin/media');
    } catch (error) {
        logger.error('Error deleting media:', error);
        req.flash('error_msg', 'Error deleting media');
        res.redirect('/admin/media');
    }
};

exports.editMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { alt, caption } = req.body;

        await prisma.media.update({
            where: { id: parseInt(id) },
            data: { alt, caption }
        });

        req.flash('success_msg', 'Media updated successfully');
        res.redirect('/admin/media');
    } catch (error) {
        logger.error('Error updating media:', error);
        req.flash('error_msg', 'Error updating media');
        res.redirect('/admin/media');
    }
};

exports.renderEditForm = async (req, res) => {
    try {
        const { id } = req.params;
        const media = await prisma.media.findUnique({
            where: { id: parseInt(id) }
        });

        if (!media) {
            req.flash('error_msg', 'Media not found');
            return res.redirect('/admin/media');
        }

        res.render('admin/media/edit', {
            title: 'Edit Media',
            layout: 'layouts/admin',
            media
        });
    } catch (error) {
        logger.error('Error loading media:', error);
        req.flash('error_msg', 'Error loading media');
        res.redirect('/admin/media');
    }
};

exports.getMediaDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const media = await prisma.media.findUnique({
            where: { id: parseInt(id) },
            include: {
                uploader: {
                    select: { username: true }
                }
            }
        });

        if (!media) {
            req.flash('error_msg', 'Media not found');
            return res.redirect('/admin/media');
        }

        res.render('admin/media/details', {
            title: 'Media Details',
            layout: 'layouts/admin',
            media
        });
    } catch (error) {
        logger.error('Error getting media details:', error);
        req.flash('error_msg', 'Error loading media details');
        res.redirect('/admin/media');
    }
};
