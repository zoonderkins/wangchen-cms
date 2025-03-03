const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const slugify = require('slugify');

exports.listCategories = async (req, res) => {
    try {
        const { type = 'article' } = req.query;
        
        const categories = await prisma.category.findMany({
            where: {
                type,
                parentId: null,
                deletedAt: null
            },
            include: {
                children: {
                    where: {
                        type,
                        deletedAt: null
                    },
                    include: {
                        _count: {
                            select: {
                                children: true,
                                articles: type === 'article',
                                downloads: type === 'download',
                                faqItems: type === 'faq',
                                pages: type === 'page'
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        children: true,
                        articles: type === 'article',
                        downloads: type === 'download',
                        faqItems: type === 'faq',
                        pages: type === 'page'
                    }
                }
            },
            orderBy: {
                order: 'asc'
            }
        });

        const typeLabels = {
            article: 'Article Categories',
            download: 'Download Categories',
            faq: 'FAQ Categories',
            page: 'Page Categories'
        };

        // Add content count based on type
        const processCategory = (category) => {
            let contentCount = 0;
            if (type === 'article') contentCount = category._count.articles || 0;
            if (type === 'download') contentCount = category._count.downloads || 0;
            if (type === 'faq') contentCount = category._count.faqItems || 0;
            if (type === 'page') contentCount = category._count.pages || 0;

            return {
                ...category,
                contentCount,
                children: category.children?.map(processCategory) || []
            };
        };

        const categoriesWithCount = categories.map(processCategory);

        res.render('admin/categories/list', {
            title: typeLabels[type] || 'Categories',
            layout: 'layouts/admin',
            categories: categoriesWithCount,
            currentType: type,
            typeLabels
        });
    } catch (error) {
        logger.error('Error listing categories:', error);
        req.flash('error_msg', 'Error loading categories');
        res.redirect('/admin/dashboard');
    }
};

exports.renderCreateCategory = async (req, res) => {
    try {
        const { type = 'article' } = req.query;
        
        const categories = await prisma.category.findMany({
            where: {
                type,
                deletedAt: null
            },
            orderBy: {
                name: 'asc'
            }
        });

        const typeLabels = {
            article: 'Article Category',
            download: 'Download Category',
            faq: 'FAQ Category',
            page: 'Page Category'
        };

        res.render('admin/categories/create', {
            title: `Create ${typeLabels[type] || 'Category'}`,
            layout: 'layouts/admin',
            categories,
            currentType: type,
            typeLabels
        });
    } catch (error) {
        logger.error('Error loading create category form:', error);
        req.flash('error_msg', 'Error loading category form');
        res.redirect('/admin/categories');
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, type, parentId, order = 0 } = req.body;
        
        // Generate slug from name
        const slug = slugify(name, {
            lower: true,
            strict: true,
            trim: true
        });

        // Check if parent exists if parentId is provided
        if (parentId) {
            const parent = await prisma.category.findUnique({
                where: { id: parseInt(parentId) }
            });
            if (!parent) {
                req.flash('error_msg', 'Parent category not found');
                return res.redirect('/admin/categories/create');
            }
        }

        await prisma.category.create({
            data: {
                name,
                type,
                slug,
                parentId: parentId ? parseInt(parentId) : null,
                order: parseInt(order)
            }
        });

        req.flash('success_msg', 'Category created successfully');
        res.redirect('/admin/categories?type=' + type);
    } catch (error) {
        logger.error('Error creating category:', error);
        req.flash('error_msg', 'Error creating category');
        res.redirect('/admin/categories/create');
    }
};

exports.renderEditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findUnique({
            where: {
                id: parseInt(id),
                deletedAt: null
            },
            include: {
                parent: true,
                children: {
                    where: {
                        deletedAt: null
                    }
                }
            }
        });

        if (!category) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/categories');
        }

        const categories = await prisma.category.findMany({
            where: {
                type: category.type,
                deletedAt: null,
                NOT: {
                    id: parseInt(id)
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        const typeLabels = {
            article: 'Article Category',
            download: 'Download Category',
            faq: 'FAQ Category',
            page: 'Page Category'
        };

        res.render('admin/categories/edit', {
            title: `Edit ${typeLabels[category.type] || 'Category'}`,
            layout: 'layouts/admin',
            category,
            categories,
            typeLabels
        });
    } catch (error) {
        logger.error('Error loading category for edit:', error);
        req.flash('error_msg', 'Error loading category');
        res.redirect('/admin/categories');
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, parentId, order } = req.body;
        
        await prisma.category.update({
            where: {
                id: parseInt(id)
            },
            data: {
                name,
                type,
                parentId: parentId ? parseInt(parentId) : null,
                order: order ? parseInt(order) : undefined
            }
        });

        req.flash('success_msg', 'Category updated successfully');
        res.redirect(`/admin/categories?type=${type}`);
    } catch (error) {
        logger.error('Error updating category:', error);
        req.flash('error_msg', 'Error updating category');
        res.redirect(`/admin/categories/edit/${req.params.id}`);
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await prisma.category.findUnique({
            where: { 
                id: parseInt(id),
                deletedAt: null
            },
            include: {
                children: {
                    where: {
                        deletedAt: null
                    }
                }
            }
        });

        if (!category) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/categories');
        }

        if (category.children.length > 0) {
            req.flash('error_msg', 'Cannot delete category with subcategories');
            return res.redirect('/admin/categories');
        }

        await prisma.category.update({
            where: {
                id: parseInt(id)
            },
            data: {
                deletedAt: new Date()
            }
        });

        req.flash('success_msg', 'Category deleted successfully');
        res.redirect(`/admin/categories?type=${category.type}`);
    } catch (error) {
        logger.error('Error deleting category:', error);
        req.flash('error_msg', 'Error deleting category');
        res.redirect('/admin/categories');
    }
};
