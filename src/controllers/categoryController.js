const prisma = require('../lib/prisma');
const logger = require('../config/logger');

exports.listCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: {
                parentId: null // Get only top-level categories
            },
            include: {
                children: {
                    include: {
                        _count: {
                            select: {
                                articles: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        articles: true
                    }
                }
            },
            orderBy: {
                order: 'asc'
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

exports.renderCreateCategory = async (req, res) => {
    try {
        // Get all categories for parent selection
        const categories = await prisma.category.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        res.render('admin/categories/create', {
            title: 'Create Category',
            layout: 'layouts/admin',
            categories
        });
    } catch (error) {
        logger.error('Error loading categories for create form:', error);
        req.flash('error_msg', 'Error loading category form');
        res.redirect('/admin/categories');
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description, parentId, order } = req.body;

        await prisma.category.create({
            data: {
                name,
                description,
                parentId: parentId ? parseInt(parentId) : null,
                order: order ? parseInt(order) : 0
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
        const categoryId = parseInt(req.params.id);

        const [category, categories] = await Promise.all([
            prisma.category.findUnique({
                where: { id: categoryId },
                include: {
                    parent: true,
                    children: true
                }
            }),
            prisma.category.findMany({
                where: {
                    NOT: {
                        id: categoryId // Exclude current category from parent options
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            })
        ]);

        if (!category) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/categories');
        }

        res.render('admin/categories/edit', {
            title: 'Edit Category',
            layout: 'layouts/admin',
            category,
            categories
        });
    } catch (error) {
        logger.error('Error loading category for edit:', error);
        req.flash('error_msg', 'Error loading category');
        res.redirect('/admin/categories');
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const { name, description, parentId, order } = req.body;

        // Check if trying to set as parent of itself
        if (parentId && parseInt(parentId) === categoryId) {
            req.flash('error_msg', 'A category cannot be its own parent');
            return res.redirect(`/admin/categories/edit/${categoryId}`);
        }

        // Check if trying to set as parent one of its descendants
        if (parentId) {
            const descendants = await getDescendants(categoryId);
            if (descendants.includes(parseInt(parentId))) {
                req.flash('error_msg', 'Cannot set a descendant category as parent');
                return res.redirect(`/admin/categories/edit/${categoryId}`);
            }
        }

        await prisma.category.update({
            where: { id: categoryId },
            data: {
                name,
                description,
                parentId: parentId ? parseInt(parentId) : null,
                order: order ? parseInt(order) : 0
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
    const categoryId = parseInt(req.params.id);

    try {
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                articles: true,
                children: true
            }
        });

        if (!category) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/categories');
        }

        if (category.articles.length > 0) {
            req.flash('error_msg', 'Cannot delete category with articles. Please move or delete the articles first.');
            return res.redirect('/admin/categories');
        }

        if (category.children.length > 0) {
            req.flash('error_msg', 'Cannot delete category with subcategories. Please move or delete the subcategories first.');
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

// Helper function to get all descendant category IDs
async function getDescendants(categoryId) {
    const descendants = [];
    
    async function collect(parentId) {
        const children = await prisma.category.findMany({
            where: { parentId },
            select: { id: true }
        });
        
        for (const child of children) {
            descendants.push(child.id);
            await collect(child.id);
        }
    }
    
    await collect(categoryId);
    return descendants;
}
