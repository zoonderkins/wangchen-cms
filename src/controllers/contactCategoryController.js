const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// Admin: List all contact categories
exports.listCategories = async (req, res) => {
    try {
        const categories = await prisma.contactCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        res.render('admin/contact/categories/index', {
            title: 'Contact Categories',
            categories
        });
    } catch (error) {
        logger.error('Error listing contact categories:', error);
        req.flash('error_msg', `Failed to load contact categories: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
};

// Admin: Render create contact category form
exports.renderCreateCategory = (req, res) => {
    res.render('admin/contact/categories/create', {
        title: 'Create Contact Category'
    });
};

// Admin: Create a new contact category
exports.createCategory = async (req, res) => {
    try {
        const { name_en, name_tw, order } = req.body;
        
        await prisma.contactCategory.create({
            data: {
                name_en,
                name_tw,
                order: order ? parseInt(order) : 0
            }
        });
        
        req.flash('success_msg', 'Contact category created successfully');
        res.redirect('/admin/contact/categories');
    } catch (error) {
        logger.error('Error creating contact category:', error);
        req.flash('error_msg', `Failed to create contact category: ${error.message}`);
        res.redirect('/admin/contact/categories/create');
    }
};

// Admin: Render edit contact category form
exports.renderEditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await prisma.contactCategory.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!category) {
            req.flash('error_msg', 'Contact category not found');
            return res.redirect('/admin/contact/categories');
        }
        
        res.render('admin/contact/categories/edit', {
            title: 'Edit Contact Category',
            category
        });
    } catch (error) {
        logger.error('Error rendering edit contact category form:', error);
        req.flash('error_msg', `Failed to load contact category: ${error.message}`);
        res.redirect('/admin/contact/categories');
    }
};

// Admin: Update a contact category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name_en, name_tw, order } = req.body;
        
        await prisma.contactCategory.update({
            where: { id: parseInt(id) },
            data: {
                name_en,
                name_tw,
                order: order ? parseInt(order) : 0,
                updatedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'Contact category updated successfully');
        res.redirect('/admin/contact/categories');
    } catch (error) {
        logger.error('Error updating contact category:', error);
        req.flash('error_msg', `Failed to update contact category: ${error.message}`);
        res.redirect(`/admin/contact/categories/edit/${req.params.id}`);
    }
};

// Admin: Delete a contact category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Soft delete the category
        await prisma.contactCategory.update({
            where: { id: parseInt(id) },
            data: {
                deletedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'Contact category deleted successfully');
        res.redirect('/admin/contact/categories');
    } catch (error) {
        logger.error('Error deleting contact category:', error);
        req.flash('error_msg', `Failed to delete contact category: ${error.message}`);
        res.redirect('/admin/contact/categories');
    }
}; 