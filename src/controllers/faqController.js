const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const slugify = require('slugify');

// List all FAQ categories
exports.listCategories = async (req, res) => {
    try {
        const categories = await prisma.faqCategory.findMany({
            where: {
                deletedAt: null
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
        const { name_en, name_tw, description_en, description_tw, order } = req.body;
        
        // Generate slug from English name
        const slug = slugify(name_en, {
            lower: true,
            strict: true
        });
        
        // Check if slug already exists
        const existingCategory = await prisma.faqCategory.findUnique({
            where: { slug }
        });
        
        if (existingCategory) {
            req.flash('error_msg', 'A category with this name already exists');
            return res.redirect('/admin/faq/categories/create');
        }
        
        // Create the category
        await prisma.faqCategory.create({
            data: {
                name_en,
                name_tw,
                slug,
                description_en,
                description_tw,
                order: order ? parseInt(order) : 0
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
        
        const category = await prisma.faqCategory.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!category) {
            req.flash('error_msg', 'FAQ category not found');
            return res.redirect('/admin/faq/categories');
        }
        
        res.render('admin/faq/categories/edit', {
            title: `Edit FAQ Category: ${category.name_en}`,
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
        const { name_en, name_tw, description_en, description_tw, order } = req.body;
        
        // Generate slug from English name
        const slug = slugify(name_en, {
            lower: true,
            strict: true
        });
        
        // Check if slug already exists on a different category
        const existingCategory = await prisma.faqCategory.findFirst({
            where: {
                slug,
                id: {
                    not: parseInt(id)
                }
            }
        });
        
        if (existingCategory) {
            req.flash('error_msg', 'A category with this name already exists');
            return res.redirect(`/admin/faq/categories/edit/${id}`);
        }
        
        // Update the category
        await prisma.faqCategory.update({
            where: { id: parseInt(id) },
            data: {
                name_en,
                name_tw,
                slug,
                description_en,
                description_tw,
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
        await prisma.faqCategory.update({
            where: { id: parseInt(id) },
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
        const categories = await prisma.faqCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                name_en: 'asc'
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
        const { title_en, title_tw, content_en, content_tw, categoryId, order, status } = req.body;
        
        // Parse the Quill Delta JSON for English content
        let processedContentEn = content_en;
        try {
            // Check if the content is a valid Quill Delta JSON
            const deltaObjEn = JSON.parse(content_en);
            // Store the Delta JSON as is - we'll render it properly on the frontend
            processedContentEn = content_en;
        } catch (e) {
            // If parsing fails, it's not JSON, so use as is
            processedContentEn = content_en;
        }
        
        // Parse the Quill Delta JSON for Traditional Chinese content
        let processedContentTw = content_tw;
        try {
            // Check if the content is a valid Quill Delta JSON
            const deltaObjTw = JSON.parse(content_tw);
            // Store the Delta JSON as is - we'll render it properly on the frontend
            processedContentTw = content_tw;
        } catch (e) {
            // If parsing fails, it's not JSON, so use as is
            processedContentTw = content_tw;
        }
        
        // Create the item
        await prisma.faqItem.create({
            data: {
                title_en,
                title_tw,
                content_en: processedContentEn,
                content_tw: processedContentTw,
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
            prisma.faqCategory.findMany({
                where: {
                    deletedAt: null
                },
                orderBy: {
                    name_en: 'asc'
                }
            })
        ]);
        
        if (!item) {
            req.flash('error_msg', 'FAQ item not found');
            return res.redirect('/admin/faq/items');
        }
        
        res.render('admin/faq/items/edit', {
            title: `Edit FAQ Item: ${item.title_en}`,
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
        const { title_en, title_tw, content_en, content_tw, categoryId, order, status } = req.body;
        
        // Parse the Quill Delta JSON for English content
        let processedContentEn = content_en;
        try {
            // Check if the content is a valid Quill Delta JSON
            const deltaObjEn = JSON.parse(content_en);
            // Store the Delta JSON as is - we'll render it properly on the frontend
            processedContentEn = content_en;
        } catch (e) {
            // If parsing fails, it's not JSON, so use as is
            processedContentEn = content_en;
            logger.info('English content is not in Delta JSON format:', e.message);
        }
        
        // Parse the Quill Delta JSON for Traditional Chinese content
        let processedContentTw = content_tw;
        try {
            // Check if the content is a valid Quill Delta JSON
            const deltaObjTw = JSON.parse(content_tw);
            // Store the Delta JSON as is - we'll render it properly on the frontend
            processedContentTw = content_tw;
        } catch (e) {
            // If parsing fails, it's not JSON, so use as is
            processedContentTw = content_tw;
            logger.info('Traditional Chinese content is not in Delta JSON format:', e.message);
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
                title_en,
                title_tw,
                content_en: processedContentEn,
                content_tw: processedContentTw,
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
