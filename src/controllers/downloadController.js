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
            ...(category ? { categoryId: parseInt(category) } : {}),
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
                },
                category: true
            }
        });

        // Get categories for filter dropdown
        const categories = await prisma.category.findMany({
            where: { 
                deletedAt: null,
                type: 'download'
            },
            orderBy: { order: 'asc' }
        });

        res.render('admin/downloads/list', {
            title: 'Downloads',
            layout: 'layouts/admin',
            downloads,
            categories,
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
exports.renderCreateDownload = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { 
                deletedAt: null,
                type: 'download'
            },
            orderBy: { order: 'asc' }
        });

        res.render('admin/downloads/create', {
            title: 'Create Download',
            layout: 'layouts/admin',
            categories
        });
    } catch (error) {
        logger.error('Error loading categories:', error);
        req.flash('error_msg', 'Error loading categories');
        res.redirect('/admin/downloads');
    }
};

// Admin: Create a new download
exports.createDownload = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'Please select a file to upload');
            return res.redirect('/admin/downloads/create');
        }

        const { title, description, status, keywords, categoryId } = req.body;
        const { filename, originalname, mimetype, size } = req.file;
        // Store the path relative to the public directory
        const filePath = `/uploads/downloads/${filename}`;

        await prisma.download.create({
            data: {
                title,
                description,
                status: status || 'draft',
                keywords,
                categoryId: categoryId ? parseInt(categoryId) : null,
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
        const [download, categories] = await Promise.all([
            prisma.download.findUnique({
                where: { id: parseInt(id) },
                include: { category: true }
            }),
            prisma.category.findMany({
                where: { 
                    deletedAt: null,
                    type: 'download'
                },
                orderBy: { order: 'asc' }
            })
        ]);

        if (!download) {
            req.flash('error_msg', 'Download not found');
            return res.redirect('/admin/downloads');
        }

        res.render('admin/downloads/edit', {
            title: 'Edit Download',
            layout: 'layouts/admin',
            download,
            categories
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
        const { title, description, status, keywords, categoryId } = req.body;
        
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
            categoryId: categoryId ? parseInt(categoryId) : null,
            updatedAt: new Date()
        };

        // If a new file is uploaded, update file information
        if (req.file) {
            const { filename, originalname, mimetype, size } = req.file;
            const filePath = `/uploads/downloads/${filename}`;
            
            // Delete the old file
            try {
                await fs.unlink(path.join(__dirname, '../../public', download.path));
            } catch (error) {
                logger.error('Error deleting old file:', error);
                // Continue even if old file deletion fails
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

        // Update the download
        await prisma.download.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        req.flash('success_msg', 'Download updated successfully');
        return res.redirect('/admin/downloads');
    } catch (error) {
        logger.error('Error updating download:', error);
        req.flash('error_msg', 'Error updating download');
        return res.redirect(`/admin/downloads/edit/${req.params.id}`);
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
        const { search, category, page = 1 } = req.query;
        const perPage = 12;
        const skip = (page - 1) * perPage;

        // Build filter conditions
        const whereConditions = {
            status: 'published',
            deletedAt: null,
            ...(search ? {
                OR: [
                    { title: { contains: search } },
                    { description: { contains: search } },
                    { keywords: { contains: search } }
                ]
            } : {}),
            ...(category ? { categoryId: parseInt(category) } : {})
        };

        // Get downloads with pagination
        const [downloads, totalCount] = await Promise.all([
            prisma.download.findMany({
                where: whereConditions,
                orderBy: { createdAt: 'desc' },
                skip,
                take: perPage,
                include: {
                    category: true
                }
            }),
            prisma.download.count({
                where: whereConditions
            })
        ]);

        // Get all categories for filter
        const categories = await prisma.category.findMany({
            where: { 
                deletedAt: null,
                type: 'download'
            },
            orderBy: { order: 'asc' }
        });

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / perPage);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.render('frontend/downloads', {
            title: 'Downloads',
            layout: 'layouts/frontend',
            downloads,
            categories,
            filters: {
                search: search || '',
                category: category || ''
            },
            pagination: {
                current: parseInt(page),
                perPage,
                total: totalCount,
                totalPages,
                hasNextPage,
                hasPrevPage
            },
            stats: {
                totalDownloads: totalCount
            }
        });
    } catch (error) {
        logger.error('Error listing frontend downloads:', error);
        res.status(500).render('error', {
            message: 'Error loading downloads',
            error
        });
    }
};

// Frontend: Download a file
exports.downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        logger.info(`Attempting to download file with ID: ${id}`);
        
        // Find the download
        const download = await prisma.download.findFirst({
            where: {
                id: parseInt(id),
                status: 'published',
                deletedAt: null
            },
            include: { category: true }
        });

        if (!download) {
            logger.warn(`Download with ID ${id} not found or not published`);
            return res.status(404).render('frontend/error', {
                title: 'Not Found',
                message: 'The requested file was not found',
                layout: 'layouts/frontend'
            });
        }

        logger.info(`Found download record: ${JSON.stringify(download, null, 2)}`);

        // Increment download count
        await prisma.download.update({
            where: { id: parseInt(id) },
            data: { downloadCount: { increment: 1 } }
        });

        // Remove leading slash from path and join with public directory
        const relativePath = download.path.startsWith('/') ? download.path.slice(1) : download.path;
        const filePath = path.join(process.cwd(), 'public', relativePath);
        
        logger.info(`Attempting to access file at path: ${filePath}`);
        
        // Check if file exists
        try {
            await fs.access(filePath);
            logger.info('File exists, proceeding with download');
        } catch (error) {
            logger.error(`File not found at path ${filePath}:`, error);
            return res.status(404).render('frontend/error', {
                title: 'Not Found',
                message: 'The requested file was not found',
                layout: 'layouts/frontend'
            });
        }
        
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
            logger.info(`Successfully initiated download for file: ${download.originalName}`);
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
