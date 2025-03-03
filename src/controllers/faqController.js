const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const slugify = require('slugify');

// List all FAQ categories
exports.listCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: {
                deletedAt: null,
                type: 'faq'
            },
            include: {
                _count: {
                    select: {
                        faqItems: {
                            where: {
                                deletedAt: null
                            }
                        }
                    }
                }
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        res.render('admin/faq/categories/index', {
            title: 'FAQ Categories',
            categories
        });
    } catch (error) {
        logger.error('Error listing FAQ categories:', error);
        req.flash('error_msg', `Failed to load FAQ categories: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
};

// Render create FAQ category form
exports.renderCreateCategory = (req, res) => {
    res.render('admin/faq/categories/create', {
        title: 'Create FAQ Category'
    });
};

// Create a new FAQ category
exports.createCategory = async (req, res) => {
    try {
        const { name, description, order } = req.body;
        
        // Generate slug from name
        const slug = slugify(name, {
            lower: true,
            strict: true
        });
        
        // Check if slug already exists
        const existingCategory = await prisma.category.findUnique({
            where: { slug, type: 'faq' }
        });
        
        if (existingCategory) {
            req.flash('error_msg', 'A category with this name already exists');
            return res.redirect('/admin/faq/categories/create');
        }
        
        // Create the category
        await prisma.category.create({
            data: {
                name,
                slug,
                description,
                order: order ? parseInt(order) : 0,
                type: 'faq'
            }
        });
        
        req.flash('success_msg', 'FAQ category created successfully');
        res.redirect('/admin/faq/categories');
    } catch (error) {
        logger.error('Error creating FAQ category:', error);
        req.flash('error_msg', `Failed to create FAQ category: ${error.message}`);
        res.redirect('/admin/faq/categories/create');
    }
};

// Render edit FAQ category form
exports.renderEditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await prisma.category.findUnique({
            where: { id: parseInt(id), type: 'faq' }
        });
        
        if (!category) {
            req.flash('error_msg', 'FAQ category not found');
            return res.redirect('/admin/faq/categories');
        }
        
        res.render('admin/faq/categories/edit', {
            title: `Edit FAQ Category: ${category.name}`,
            category
        });
    } catch (error) {
        logger.error('Error rendering edit FAQ category form:', error);
        req.flash('error_msg', `Failed to load FAQ category: ${error.message}`);
        res.redirect('/admin/faq/categories');
    }
};

// Update a FAQ category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, order } = req.body;
        
        // Generate slug from name
        const slug = slugify(name, {
            lower: true,
            strict: true
        });
        
        // Check if slug already exists on a different category
        const existingCategory = await prisma.category.findFirst({
            where: {
                slug,
                id: {
                    not: parseInt(id)
                },
                type: 'faq'
            }
        });
        
        if (existingCategory) {
            req.flash('error_msg', 'A category with this name already exists');
            return res.redirect(`/admin/faq/categories/edit/${id}`);
        }
        
        // Update the category
        await prisma.category.update({
            where: { id: parseInt(id), type: 'faq' },
            data: {
                name,
                slug,
                description,
                order: order ? parseInt(order) : 0,
                updatedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'FAQ category updated successfully');
        res.redirect('/admin/faq/categories');
    } catch (error) {
        logger.error('Error updating FAQ category:', error);
        req.flash('error_msg', `Failed to update FAQ category: ${error.message}`);
        res.redirect(`/admin/faq/categories/edit/${req.params.id}`);
    }
};

// Delete a FAQ category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Soft delete the category
        await prisma.category.update({
            where: { id: parseInt(id), type: 'faq' },
            data: {
                deletedAt: new Date()
            }
        });
        
        // Soft delete all items in this category
        await prisma.faqItem.updateMany({
            where: { categoryId: parseInt(id) },
            data: {
                deletedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'FAQ category deleted successfully');
        res.redirect('/admin/faq/categories');
    } catch (error) {
        logger.error('Error deleting FAQ category:', error);
        req.flash('error_msg', `Failed to delete FAQ category: ${error.message}`);
        res.redirect('/admin/faq/categories');
    }
};

// List all FAQ items
exports.listItems = async (req, res) => {
    try {
        const items = await prisma.faqItem.findMany({
            where: {
                deletedAt: null
            },
            include: {
                category: true,
                author: {
                    select: {
                        username: true
                    }
                }
            },
            orderBy: [
                {
                    categoryId: 'asc'
                },
                {
                    order: 'asc'
                }
            ]
        });
        
        res.render('admin/faq/items/index', {
            title: 'FAQ Items',
            items
        });
    } catch (error) {
        logger.error('Error listing FAQ items:', error);
        req.flash('error_msg', `Failed to load FAQ items: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
};

// Render create FAQ item form
exports.renderCreateItem = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: {
                deletedAt: null,
                type: 'faq'
            },
            orderBy: {
                name: 'asc'
            }
        });
        
        res.render('admin/faq/items/create', {
            title: 'Create FAQ Item',
            categories
        });
    } catch (error) {
        logger.error('Error rendering create FAQ item form:', error);
        req.flash('error_msg', `Failed to load FAQ categories: ${error.message}`);
        res.redirect('/admin/faq/items');
    }
};

// Create a new FAQ item
exports.createItem = async (req, res) => {
    try {
        const { title, content, categoryId, order, status } = req.body;
        
        // Parse the Quill Delta JSON if it exists
        let processedContent = content;
        try {
            // Check if the content is a valid Quill Delta JSON
            const deltaObj = JSON.parse(content);
            // Store the Delta JSON as is - we'll render it properly on the frontend
            processedContent = content;
        } catch (e) {
            // If parsing fails, it's not JSON, so use as is
            processedContent = content;
        }
        
        // Create the item
        await prisma.faqItem.create({
            data: {
                title,
                content: processedContent,
                order: order ? parseInt(order) : 0,
                status: status || 'draft',
                category: {
                    connect: { id: parseInt(categoryId) }
                },
                author: {
                    connect: { id: req.session.user.id }
                }
            }
        });
        
        req.flash('success_msg', 'FAQ item created successfully');
        res.redirect('/admin/faq/items');
    } catch (error) {
        logger.error('Error creating FAQ item:', error);
        req.flash('error_msg', `Failed to create FAQ item: ${error.message}`);
        res.redirect('/admin/faq/items/create');
    }
};

// Render edit FAQ item form
exports.renderEditItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [item, categories] = await Promise.all([
            prisma.faqItem.findUnique({
                where: { id: parseInt(id) },
                include: {
                    category: true
                }
            }),
            prisma.category.findMany({
                where: {
                    deletedAt: null,
                    type: 'faq'
                },
                orderBy: {
                    name: 'asc'
                }
            })
        ]);
        
        if (!item) {
            req.flash('error_msg', 'FAQ item not found');
            return res.redirect('/admin/faq/items');
        }
        
        res.render('admin/faq/items/edit', {
            title: `Edit FAQ Item: ${item.title}`,
            item,
            categories
        });
    } catch (error) {
        logger.error('Error rendering edit FAQ item form:', error);
        req.flash('error_msg', `Failed to load FAQ item: ${error.message}`);
        res.redirect('/admin/faq/items');
    }
};

// Update a FAQ item
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, categoryId, order, status } = req.body;
        
        // Parse the Quill Delta JSON if it exists
        let processedContent = content;
        try {
            // Check if the content is a valid Quill Delta JSON
            const deltaObj = JSON.parse(content);
            // Store the Delta JSON as is - we'll render it properly on the frontend
            processedContent = content;
        } catch (e) {
            // If parsing fails, it's not JSON, so use as is
            processedContent = content;
            logger.info('Content is not in Delta JSON format:', e.message);
        }
        
        // Validate the status value
        const validStatuses = ['draft', 'published', 'archived'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status value: ${status}`);
        }
        
        // Update the item
        await prisma.faqItem.update({
            where: { id: parseInt(id) },
            data: {
                title,
                content: processedContent,
                order: order ? parseInt(order) : 0,
                status,
                categoryId: parseInt(categoryId),
                updatedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'FAQ item updated successfully');
        res.redirect('/admin/faq/items');
    } catch (error) {
        logger.error('Error updating FAQ item:', error);
        req.flash('error_msg', `Failed to update FAQ item: ${error.message}`);
        res.redirect(`/admin/faq/items/edit/${req.params.id}`);
    }
};

// Delete a FAQ item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Soft delete the item
        await prisma.faqItem.update({
            where: { id: parseInt(id) },
            data: {
                deletedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'FAQ item deleted successfully');
        res.redirect('/admin/faq/items');
    } catch (error) {
        logger.error('Error deleting FAQ item:', error);
        req.flash('error_msg', `Failed to delete FAQ item: ${error.message}`);
        res.redirect('/admin/faq/items');
    }
};
