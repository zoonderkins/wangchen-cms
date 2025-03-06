const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// List all download categories
exports.listCategories = async (req, res) => {
    try {
        const categories = await prisma.downloadCategory.findMany({
            where: { deletedAt: null },
            orderBy: { order: 'asc' }
        });

        res.render('admin/downloads/categories/list', {
            title: 'Download Categories',
            layout: 'layouts/admin',
            categories
        });
    } catch (error) {
        logger.error('Error listing download categories:', error);
        req.flash('error_msg', 'Error loading download categories');
        res.redirect('/admin/downloads');
    }
};

// Render create category form
exports.renderCreateCategory = (req, res) => {
    res.render('admin/downloads/categories/create', {
        title: 'Create Download Category',
        layout: 'layouts/admin'
    });
};

// Create a new category
exports.createCategory = async (req, res) => {
    try {
        const { name_en, name_tw, description_en, description_tw, order } = req.body;

        await prisma.downloadCategory.create({
            data: {
                name_en,
                name_tw,
                description_en,
                description_tw,
                order: order ? parseInt(order) : 0
            }
        });

        req.flash('success_msg', 'Download category created successfully');
        res.redirect('/admin/downloads/categories');
    } catch (error) {
        logger.error('Error creating download category:', error);
        req.flash('error_msg', 'Error creating download category');
        res.redirect('/admin/downloads/categories/create');
    }
};

// Render edit category form
exports.renderEditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.downloadCategory.findUnique({
            where: { id: parseInt(id) }
        });

        if (!category) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/downloads/categories');
        }

        res.render('admin/downloads/categories/edit', {
            title: 'Edit Download Category',
            layout: 'layouts/admin',
            category
        });
    } catch (error) {
        logger.error('Error loading download category:', error);
        req.flash('error_msg', 'Error loading download category');
        res.redirect('/admin/downloads/categories');
    }
};

// Update a category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name_en, name_tw, description_en, description_tw, order } = req.body;

        await prisma.downloadCategory.update({
            where: { id: parseInt(id) },
            data: {
                name_en,
                name_tw,
                description_en,
                description_tw,
                order: order ? parseInt(order) : 0,
                updatedAt: new Date()
            }
        });

        req.flash('success_msg', 'Download category updated successfully');
        res.redirect('/admin/downloads/categories');
    } catch (error) {
        logger.error('Error updating download category:', error);
        req.flash('error_msg', 'Error updating download category');
        res.redirect('/admin/downloads/categories');
    }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.downloadCategory.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });

        req.flash('success_msg', 'Download category deleted successfully');
        res.redirect('/admin/downloads/categories');
    } catch (error) {
        logger.error('Error deleting download category:', error);
        req.flash('error_msg', 'Error deleting download category');
        res.redirect('/admin/downloads/categories');
    }
};
