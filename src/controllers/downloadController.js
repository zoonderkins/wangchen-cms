const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const path = require('path');
const fs = require('fs').promises;

// Admin: List all downloads
exports.listDownloads = async (req, res) => {
    try {
        const { search, category, status, dateFrom, dateTo } = req.query;
        
        // Build filter conditions
        const whereConditions = {
            deletedAt: null,
            ...(search ? {
                OR: [
                    { title: { contains: search } },
                    { description: { contains: search } },
                    { keywords: { contains: search } },
                    { originalName: { contains: search } }
                ]
            } : {}),
            ...(category ? { category } : {}),
            ...(status ? { status } : {})
        };
        
        // Add date range filter if provided
        if (dateFrom || dateTo) {
            whereConditions.createdAt = {};
            
            if (dateFrom) {
                whereConditions.createdAt.gte = new Date(dateFrom);
            }
            
            if (dateTo) {
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                whereConditions.createdAt.lte = endDate;
            }
        }

        // Get all downloads with filters
        const downloads = await prisma.download.findMany({
            where: whereConditions,
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { username: true }
                }
            }
        });

        // Get unique categories for filter dropdown
        const categories = await prisma.download.findMany({
            where: {
                deletedAt: null,
                category: { not: null }
            },
            select: { category: true },
            distinct: ['category']
        });

        res.render('admin/downloads/list', {
            title: 'Downloads',
            layout: 'layouts/admin',
            downloads,
            categories: categories.map(c => c.category).filter(Boolean),
            filters: {
                search: search || '',
                category: category || '',
                status: status || '',
                dateFrom: dateFrom || '',
                dateTo: dateTo || ''
            }
        });
    } catch (error) {
        logger.error('Error listing downloads:', error);
        req.flash('error_msg', 'Error loading downloads');
        res.redirect('/admin/dashboard');
    }
};

// Admin: Render create download form
exports.renderCreateDownload = (req, res) => {
    res.render('admin/downloads/create', {
        title: 'Create Download',
        layout: 'layouts/admin'
    });
};

// Admin: Create a new download
exports.createDownload = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'Please select a file to upload');
            return res.redirect('/admin/downloads/create');
        }

        const { title, description, status, keywords, category } = req.body;
        const { filename, originalname, mimetype, size } = req.file;
        const filePath = `/uploads/downloads/${filename}`;

        await prisma.download.create({
            data: {
                title,
                description,
                status: status || 'draft',
                keywords,
                category,
                filename,
                originalName: originalname,
                mimeType: mimetype,
                size,
                path: filePath,
                authorId: req.session.user.id
            }
        });

        req.flash('success_msg', 'Download created successfully');
        res.redirect('/admin/downloads');
    } catch (error) {
        logger.error('Error creating download:', error);
        req.flash('error_msg', 'Error creating download');
        res.redirect('/admin/downloads/create');
    }
};

// Admin: Render edit download form
exports.renderEditDownload = async (req, res) => {
    try {
        const { id } = req.params;
        const download = await prisma.download.findUnique({
            where: { id: parseInt(id) }
        });

        if (!download) {
            req.flash('error_msg', 'Download not found');
            return res.redirect('/admin/downloads');
        }

        res.render('admin/downloads/edit', {
            title: 'Edit Download',
            layout: 'layouts/admin',
            download
        });
    } catch (error) {
        logger.error('Error loading download:', error);
        req.flash('error_msg', 'Error loading download');
        res.redirect('/admin/downloads');
    }
};

// Admin: Update a download
exports.updateDownload = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, keywords, category } = req.body;
        
        // Find the download to update
        const download = await prisma.download.findUnique({
            where: { id: parseInt(id) }
        });

        if (!download) {
            req.flash('error_msg', 'Download not found');
            return res.redirect('/admin/downloads');
        }

        // Prepare update data
        const updateData = {
            title,
            description,
            status,
            keywords,
            category,
            updatedAt: new Date()
        };

        // If a new file is uploaded, update file information
        if (req.file) {
            const { filename, originalname, mimetype, size } = req.file;
            const filePath = `/uploads/downloads/${filename}`;
            
            // Delete the old file
            try {
                const oldFilePath = path.join(process.cwd(), 'public', download.path);
                await fs.unlink(oldFilePath);
                logger.info(`Deleted old file: ${oldFilePath}`);
            } catch (error) {
                logger.warn(`Could not delete old file: ${error.message}`);
            }
            
            // Update with new file information
            Object.assign(updateData, {
                filename,
                originalName: originalname,
                mimeType: mimetype,
                size,
                path: filePath
            });
        }

        // Update the download in the database
        await prisma.download.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        req.flash('success_msg', 'Download updated successfully');
        res.redirect('/admin/downloads');
    } catch (error) {
        logger.error('Error updating download:', error);
        req.flash('error_msg', 'Error updating download');
        res.redirect(`/admin/downloads/edit/${req.params.id}`);
    }
};

// Admin: Delete a download
exports.deleteDownload = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the download to delete
        const download = await prisma.download.findUnique({
            where: { id: parseInt(id) }
        });

        if (!download) {
            req.flash('error_msg', 'Download not found');
            return res.redirect('/admin/downloads');
        }

        // Delete the file from the filesystem
        try {
            const filePath = path.join(process.cwd(), 'public', download.path);
            await fs.unlink(filePath);
            logger.info(`Deleted file: ${filePath}`);
        } catch (error) {
            logger.warn(`Could not delete file: ${error.message}`);
        }

        // Delete from database (soft delete)
        await prisma.download.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });

        req.flash('success_msg', 'Download deleted successfully');
        res.redirect('/admin/downloads');
    } catch (error) {
        logger.error('Error deleting download:', error);
        req.flash('error_msg', 'Error deleting download');
        res.redirect('/admin/downloads');
    }
};

// Frontend: List all downloads
exports.listDownloadsForFrontend = async (req, res) => {
    try {
        const query = req.query.search || '';
        const categoryFilter = req.query.category || '';
        const sortBy = req.query.sort || 'newest';
        
        // Build where conditions
        const whereConditions = {
            status: 'published',
            deletedAt: null,
            ...(categoryFilter ? { category: categoryFilter } : {}),
            ...(query ? {
                OR: [
                    { title: { contains: query } },
                    { description: { contains: query } },
                    { keywords: { contains: query } },
                    { originalName: { contains: query } }
                ]
            } : {})
        };
        
        // Determine sort order
        let orderBy = {};
        switch (sortBy) {
            case 'oldest':
                orderBy = { createdAt: 'asc' };
                break;
            case 'a-z':
                orderBy = { title: 'asc' };
                break;
            case 'z-a':
                orderBy = { title: 'desc' };
                break;
            case 'most-downloaded':
                orderBy = { downloadCount: 'desc' };
                break;
            case 'newest':
            default:
                orderBy = { createdAt: 'desc' };
                break;
        }
        
        // Find all published downloads with filters
        const downloads = await prisma.download.findMany({
            where: whereConditions,
            orderBy,
            include: {
                author: {
                    select: { username: true }
                }
            }
        });

        // Get unique categories for filter dropdown
        const categories = await prisma.download.findMany({
            where: {
                status: 'published',
                deletedAt: null,
                category: { not: null }
            },
            select: { category: true },
            distinct: ['category']
        });

        // Get total downloads count for stats
        const totalDownloads = await prisma.download.aggregate({
            _sum: {
                downloadCount: true
            },
            where: {
                status: 'published',
                deletedAt: null
            }
        });

        res.render('frontend/downloads', {
            title: 'Downloads',
            layout: 'layouts/frontend',
            downloads,
            categories: categories.map(c => c.category).filter(Boolean),
            selectedCategory: categoryFilter,
            searchQuery: query,
            sortBy,
            totalDownloadsCount: totalDownloads._sum.downloadCount || 0
        });
    } catch (error) {
        logger.error('Error listing frontend downloads:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: 'Failed to load downloads',
            layout: 'layouts/frontend'
        });
    }
};

// Frontend: Download a file
exports.downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the download
        const download = await prisma.download.findFirst({
            where: {
                id: parseInt(id),
                status: 'published',
                deletedAt: null
            }
        });

        if (!download) {
            return res.status(404).render('frontend/error', {
                title: 'Not Found',
                message: 'The requested file was not found',
                layout: 'layouts/frontend'
            });
        }

        // Increment download count
        await prisma.download.update({
            where: { id: parseInt(id) },
            data: { downloadCount: { increment: 1 } }
        });

        // Get the file path
        const filePath = path.join(process.cwd(), 'public', download.path);
        
        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${download.originalName}"`);
        res.setHeader('Content-Type', download.mimeType);
        
        // Send the file
        res.download(filePath, download.originalName, (err) => {
            if (err) {
                logger.error(`Error downloading file ${download.id}:`, err);
                return res.status(500).render('frontend/error', {
                    title: 'Error',
                    message: 'Failed to download file',
                    layout: 'layouts/frontend'
                });
            }
        });
    } catch (error) {
        logger.error('Error downloading file:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: 'Failed to download file',
            layout: 'layouts/frontend'
        });
    }
};
