const prisma = require('../lib/prisma');
const logger = require('../config/logger');

exports.listCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: {
                _count: {
                    select: {
                        articles: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.render('admin/categories/list', {
            title: 'Categories',
            layout: 'layouts/admin',
            categories
        });
    } catch (error) {
        logger.error('Error listing categories:', error);
        req.flash('error_msg', 'Error loading categories');
        res.redirect('/admin/dashboard');
    }
};

exports.renderCreateCategory = (req, res) => {
    res.render('admin/categories/create', {
        title: 'Create Category',
        layout: 'layouts/admin'
    });
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        await prisma.category.create({
            data: {
                name,
                description
            }
        });

        req.flash('success_msg', 'Category created successfully');
        res.redirect('/admin/categories');
    } catch (error) {
        logger.error('Error creating category:', error);
        req.flash('error_msg', 'Error creating category');
        res.redirect('/admin/categories/create');
    }
};

exports.renderEditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const categoryId = parseInt(id);
        
        if (isNaN(categoryId)) {
            req.flash('error_msg', 'Invalid category ID');
            return res.redirect('/admin/categories');
        }

        const category = await prisma.category.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/categories');
        }

        res.render('admin/categories/edit', {
            title: 'Edit Category',
            layout: 'layouts/admin',
            category
        });
    } catch (error) {
        logger.error('Error loading category:', error);
        req.flash('error_msg', 'Error loading category');
        res.redirect('/admin/categories');
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const categoryId = parseInt(id);

        if (isNaN(categoryId)) {
            req.flash('error_msg', 'Invalid category ID');
            return res.redirect('/admin/categories');
        }

        // Check if category exists
        const existingCategory = await prisma.category.findUnique({
            where: { id: categoryId }
        });

        if (!existingCategory) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/categories');
        }

        await prisma.category.update({
            where: { id: categoryId },
            data: {
                name,
                description
            }
        });

        req.flash('success_msg', 'Category updated successfully');
        res.redirect('/admin/categories');
    } catch (error) {
        logger.error('Error updating category:', error);
        req.flash('error_msg', 'Error updating category');
        res.redirect(`/admin/categories/edit/${req.params.id}`);
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const categoryId = parseInt(id);

        if (isNaN(categoryId)) {
            req.flash('error_msg', 'Invalid category ID');
            return res.redirect('/admin/categories');
        }

        // Check if category exists and has no articles
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                _count: {
                    select: {
                        articles: true
                    }
                }
            }
        });

        if (!category) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/categories');
        }

        if (category._count.articles > 0) {
            req.flash('error_msg', 'Cannot delete category with articles. Please remove or reassign articles first.');
            return res.redirect('/admin/categories');
        }

        await prisma.category.delete({
            where: { id: categoryId }
        });

        req.flash('success_msg', 'Category deleted successfully');
        res.redirect('/admin/categories');
    } catch (error) {
        logger.error('Error deleting category:', error);
        req.flash('error_msg', 'Error deleting category');
        res.redirect('/admin/categories');
    }
};
