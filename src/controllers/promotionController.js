const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');
const { parsePlatformEmbeds } = require('../utils/platformEmbedParser');

// List all promotion categories
exports.listCategories = async (req, res) => {
    try {
        const categories = await prisma.promotionCategory.findMany({
            where: {
                deletedAt: null
            },
            include: {
                _count: {
                    select: {
                        promotionItems: {
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
        
        res.render('admin/promotions/categories/index', {
            title: 'Promotion Categories',
            categories
        });
    } catch (error) {
        logger.error('Error listing promotion categories:', error);
        req.flash('error_msg', `Failed to load promotion categories: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
};

// Render create promotion category form
exports.renderCreateCategory = (req, res) => {
    res.render('admin/promotions/categories/form', {
        title: 'Create Promotion Category',
        category: null
    });
};

// Create a new promotion category
exports.createCategory = async (req, res) => {
    try {
        const { name_en, name_tw, description_en, description_tw, order } = req.body;
        
        // Generate slug from English name
        const slug = slugify(name_en, {
            lower: true,
            strict: true
        });
        
        // Check if slug already exists
        const existingCategory = await prisma.promotionCategory.findFirst({
            where: { 
                slug,
                deletedAt: null
            }
        });
        
        if (existingCategory) {
            req.flash('error_msg', 'A category with this name already exists');
            return res.redirect('/admin/promotions/categories/create');
        }
        
        // Create the category
        await prisma.promotionCategory.create({
            data: {
                name_en,
                name_tw,
                slug,
                description_en,
                description_tw,
                order: order ? parseInt(order, 10) : 0
            }
        });
        
        req.flash('success_msg', 'Promotion category created successfully');
        res.redirect('/admin/promotions/categories');
    } catch (error) {
        logger.error('Error creating promotion category:', error);
        req.flash('error_msg', `Failed to create promotion category: ${error.message}`);
        res.redirect('/admin/promotions/categories/create');
    }
};

// Render edit promotion category form
exports.renderEditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        const parsedId = parseInt(id, 10);
        
        if (isNaN(parsedId)) {
            req.flash('error_msg', 'Invalid category ID');
            return res.redirect('/admin/promotions/categories');
        }
        
        const category = await prisma.promotionCategory.findFirst({
            where: { 
                id: parsedId,
                deletedAt: null
            }
        });
        
        if (!category) {
            req.flash('error_msg', 'Promotion category not found');
            return res.redirect('/admin/promotions/categories');
        }
        
        res.render('admin/promotions/categories/form', {
            title: `Edit Promotion Category: ${category.name_en}`,
            category
        });
    } catch (error) {
        logger.error('Error rendering edit promotion category form:', error);
        req.flash('error_msg', `Failed to load promotion category: ${error.message}`);
        res.redirect('/admin/promotions/categories');
    }
};

// Update a promotion category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name_en, name_tw, description_en, description_tw, order } = req.body;
        
        // Generate slug from English name
        const slug = slugify(name_en, {
            lower: true,
            strict: true
        });
        
        const parsedId = parseInt(id, 10);
        
        if (isNaN(parsedId)) {
            req.flash('error_msg', 'Invalid category ID');
            return res.redirect('/admin/promotions/categories');
        }
        
        // Check if slug already exists on a different category
        const existingCategory = await prisma.promotionCategory.findFirst({
            where: {
                slug: slug,
                deletedAt: null,
                NOT: {
                    id: parsedId
                }
            }
        });
        
        if (existingCategory) {
            req.flash('error_msg', 'A category with this name already exists');
            return res.redirect(`/admin/promotions/categories/edit/${id}`);
        }
        
        // Update the category
        await prisma.promotionCategory.update({
            where: { id: parsedId },
            data: {
                name_en,
                name_tw,
                slug,
                description_en,
                description_tw,
                order: order ? parseInt(order, 10) : 0,
                updatedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'Promotion category updated successfully');
        res.redirect('/admin/promotions/categories');
    } catch (error) {
        logger.error('Error updating promotion category:', error);
        req.flash('error_msg', `Failed to update promotion category: ${error.message}`);
        res.redirect(`/admin/promotions/categories/edit/${req.params.id}`);
    }
};

// Delete a promotion category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Soft delete the category
        await prisma.promotionCategory.update({
            where: { id: parseInt(id, 10) },
            data: {
                deletedAt: new Date()
            }
        });
        
        // Soft delete all items in this category
        await prisma.promotionItem.updateMany({
            where: { categoryId: parseInt(id) },
            data: {
                deletedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'Promotion category deleted successfully');
        res.redirect('/admin/promotions/categories');
    } catch (error) {
        logger.error('Error deleting promotion category:', error);
        req.flash('error_msg', `Failed to delete promotion category: ${error.message}`);
        res.redirect('/admin/promotions/categories');
    }
};

// List all promotion items
exports.listItems = async (req, res) => {
    try {
        const { search, category, status, page = 1 } = req.query;
        const perPage = 10; // Number of items per page
        const currentPage = parseInt(page, 10) || 1;
        
        // Build where clause
        const whereClause = {
            deletedAt: null
        };
        
        // Add search filter if provided
        if (search) {
            whereClause.OR = [
                { title_en: { contains: search, mode: 'insensitive' } },
                { title_tw: { contains: search, mode: 'insensitive' } }
            ];
        }
        
        // Add category filter if provided
        if (category && category !== 'all') {
            whereClause.categoryId = parseInt(category, 10);
        }
        
        // Add status filter if provided
        if (status && status !== '') {
            whereClause.status = status;
        }
        
        // Count total items for pagination
        const totalItems = await prisma.promotionItem.count({
            where: whereClause
        });
        
        // Calculate total pages
        const totalPages = Math.ceil(totalItems / perPage);
        
        // Get items with pagination
        const items = await prisma.promotionItem.findMany({
            where: whereClause,
            include: {
                category: true,
                author: true
            },
            orderBy: {
                publishedDate: 'desc'
            },
            skip: (currentPage - 1) * perPage,
            take: perPage
        });
        
        // Get all categories for filter dropdown
        const categories = await prisma.promotionCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                name_en: 'asc'
            }
        });
        
        res.render('admin/promotions/items/index', {
            title: 'Promotion Items',
            items,
            categories,
            search: search || '',
            selectedCategory: category || 'all',
            selectedStatus: status || '',
            pagination: {
                currentPage,
                totalPages,
                totalItems,
                perPage
            }
        });
    } catch (error) {
        logger.error('Error listing promotion items:', error);
        req.flash('error_msg', `Failed to load promotion items: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
};

// Render create promotion item form
exports.renderCreateItem = async (req, res) => {
    try {
        // Get all categories for dropdown
        const categories = await prisma.promotionCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                name_en: 'asc'
            }
        });
        
        res.render('admin/promotions/items/form', {
            title: 'Create Promotion Item',
            item: null,
            categories
        });
    } catch (error) {
        logger.error('Error rendering create promotion item form:', error);
        req.flash('error_msg', `Failed to load form: ${error.message}`);
        res.redirect('/admin/promotions/items');
    }
};

// Create a new promotion item
exports.createItem = async (req, res) => {
    try {
        // Log the request body for debugging
        console.log('Request body:', req.body);
        
        const { 
            title_en, title_tw, 
            content_en, content_tw,
            url,
            categoryId, 
            status, 
            publishedDate 
        } = req.body;
        
        // Log the extracted categoryId
        console.log('Extracted categoryId:', categoryId);
        
        // Check if categoryId is valid
        if (!categoryId) {
            req.flash('error_msg', 'Category ID is required');
            return res.redirect('/admin/promotions/items/create');
        }
        
        // Generate slug from English title
        const slug = slugify(title_en, {
            lower: true,
            strict: true
        });
        
        // Check if slug already exists
        const existingItem = await prisma.promotionItem.findFirst({
            where: { 
                slug,
                deletedAt: null
            }
        });
        
        if (existingItem) {
            req.flash('error_msg', 'A promotion item with this title already exists');
            return res.redirect('/admin/promotions/items/create');
        }
        
        // Get image path if uploaded
        const imagePath = req.file ? req.file.relativePath : null;
        
        // Create the promotion item
        const parsedCategoryId = parseInt(categoryId, 10);
        
        if (isNaN(parsedCategoryId)) {
            req.flash('error_msg', 'Invalid category ID');
            return res.redirect('/admin/promotions/items/create');
        }
        
        // Verify the category exists
        const categoryExists = await prisma.promotionCategory.findUnique({
            where: { id: parsedCategoryId }
        });
        
        if (!categoryExists) {
            req.flash('error_msg', 'Selected category does not exist');
            return res.redirect('/admin/promotions/items/create');
        }
        
        await prisma.promotionItem.create({
            data: {
                title_en,
                title_tw,
                content_en,
                content_tw,
                url,
                slug,
                imagePath,
                publishedDate: new Date(publishedDate),
                status,
                category: {
                    connect: {
                        id: parsedCategoryId
                    }
                },
                author: {
                    connect: {
                        id: req.session.user.id
                    }
                }
            }
        });
        
        req.flash('success_msg', 'Promotion item created successfully');
        res.redirect('/admin/promotions/items');
    } catch (error) {
        logger.error('Error creating promotion item:', error);
        req.flash('error_msg', `Failed to create promotion item: ${error.message}`);
        res.redirect('/admin/promotions/items/create');
    }
};

// Render edit promotion item form
exports.renderEditItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        const parsedId = parseInt(id, 10);
        
        if (isNaN(parsedId)) {
            req.flash('error_msg', 'Invalid item ID');
            return res.redirect('/admin/promotions/items');
        }
        
        const item = await prisma.promotionItem.findFirst({
            where: { 
                id: parsedId,
                deletedAt: null
            }
        });
        
        if (!item) {
            req.flash('error_msg', 'Promotion item not found');
            return res.redirect('/admin/promotions/items');
        }
        
        // Format date for the form
        item.formattedPublishedDate = item.publishedDate.toISOString().split('T')[0];
        
        // Get all categories for dropdown
        const categories = await prisma.promotionCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                name_en: 'asc'
            }
        });
        
        res.render('admin/promotions/items/form', {
            title: `Edit Promotion Item: ${item.title_en}`,
            item,
            categories
        });
    } catch (error) {
        logger.error('Error rendering edit promotion item form:', error);
        req.flash('error_msg', `Failed to load promotion item: ${error.message}`);
        res.redirect('/admin/promotions/items');
    }
};

// Update a promotion item
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title_en, title_tw, 
            content_en, content_tw,
            url,
            categoryId, 
            status, 
            publishedDate,
            removeImage
        } = req.body;
        
        const parsedId = parseInt(id, 10);
        
        if (isNaN(parsedId)) {
            req.flash('error_msg', 'Invalid item ID');
            return res.redirect('/admin/promotions/items');
        }
        
        // Generate slug from English title
        const slug = slugify(title_en, {
            lower: true,
            strict: true
        });
        
        // Check if slug already exists on a different item
        const existingItem = await prisma.promotionItem.findFirst({
            where: {
                slug: slug,
                deletedAt: null,
                NOT: {
                    id: parsedId
                }
            }
        });
        
        if (existingItem) {
            req.flash('error_msg', 'A promotion item with this title already exists');
            return res.redirect(`/admin/promotions/items/edit/${id}`);
        }
        
        // Get the current item to check if we need to delete an image
        const currentItem = await prisma.promotionItem.findUnique({
            where: { id: parsedId }
        });
        
        // Determine image path
        let imagePath = currentItem.imagePath;
        
        // If removeImage is set, remove the image
        if (removeImage === 'true') {
            // Delete the file if it exists
            if (currentItem.imagePath) {
                const fullPath = path.join(__dirname, '../../public', currentItem.imagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
            imagePath = null;
        } 
        // If a new image is uploaded, update the path
        else if (req.file) {
            // Delete the old file if it exists
            if (currentItem.imagePath) {
                const fullPath = path.join(__dirname, '../../public', currentItem.imagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
            imagePath = req.file.relativePath;
        }
        
        // Update the promotion item
        await prisma.promotionItem.update({
            where: { id: parsedId },
            data: {
                title_en,
                title_tw,
                content_en,
                content_tw,
                slug,
                imagePath,
                url,
                publishedDate: new Date(publishedDate),
                status,
                categoryId: parseInt(categoryId, 10),
                updatedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'Promotion item updated successfully');
        res.redirect('/admin/promotions/items');
    } catch (error) {
        logger.error('Error updating promotion item:', error);
        req.flash('error_msg', `Failed to update promotion item: ${error.message}`);
        res.redirect(`/admin/promotions/items/edit/${req.params.id}`);
    }
};

// Delete a promotion item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Soft delete the item
        await prisma.promotionItem.update({
            where: { id: parseInt(id, 10) },
            data: {
                deletedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'Promotion item deleted successfully');
        res.redirect('/admin/promotions/items');
    } catch (error) {
        logger.error('Error deleting promotion item:', error);
        req.flash('error_msg', `Failed to delete promotion item: ${error.message}`);
        res.redirect('/admin/promotions/items');
    }
};

// Frontend controllers
exports.listPromotionsForFrontend = async (req, res) => {
    try {
        const { language } = req.params;
        const { category, page, search } = req.query;
        const perPage = 12;
        const currentPage = parseInt(page, 10) || 1;
        
        // Build where clause
        const whereClause = {
            deletedAt: null,
            status: 'published'
        };
        
        // Add category filter if provided
        if (category) {
            const categoryObj = await prisma.promotionCategory.findFirst({
                where: {
                    slug: category,
                    deletedAt: null
                }
            });
            
            if (categoryObj) {
                whereClause.categoryId = categoryObj.id;
            }
        }
        
        // Add search filter if provided
        if (search) {
            const titleField = `title_${language}`;
            const titleFieldEn = 'title_en'; // Fallback to English
            
            whereClause.OR = [
                { [titleField]: { contains: search } },
                { [titleFieldEn]: { contains: search } }
            ];
        }
        
        // Count total items for pagination
        const totalItems = await prisma.promotionItem.count({
            where: whereClause
        });
        
        // Calculate total pages
        const totalPages = Math.ceil(totalItems / perPage);
        
        // Get items with pagination and navigation pages
        const [items, categories, navigationPages] = await Promise.all([
            prisma.promotionItem.findMany({
                where: whereClause,
                include: {
                    category: true
                },
                orderBy: {
                    publishedDate: 'desc'
                },
                skip: (currentPage - 1) * perPage,
                take: perPage
            }),
            // Get all categories for filter
            prisma.promotionCategory.findMany({
                where: {
                    deletedAt: null
                },
                orderBy: {
                    order: 'asc'
                }
            }),
            // Get navigation pages
            prisma.page.findMany({
                where: {
                    status: 'published',
                    showInNavigation: true
                },
                orderBy: {
                    navigationOrder: 'asc'
                }
            })
        ]);
        
        // Add helper function for getting content in the current language
        const getContent = (item, field) => {
            const langField = `${field}_${language}`;
            return item[langField] || item[`${field}_en`] || '';
        };
        
        // Explicitly set the layout to 'layouts/frontend'
        res.locals.layout = 'layouts/frontend';
        
        res.render('frontend/promotions', {
            title: language === 'en' ? 'Promotions' : '推動方案',
            items,
            categories,
            navigationPages,
            selectedCategory: category || '',
            currentSearch: search || '',
            pagination: {
                currentPage,
                totalPages,
                totalItems,
                perPage
            },
            language,
            getContent,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error listing promotions for frontend:', error);
        // Explicitly set the layout to 'layouts/frontend' for error page too
        res.locals.layout = 'layouts/frontend';
        
        // Get language from request params or default to 'en'
        const currentLanguage = req.params.language || 'en';
        
        res.status(500).render('frontend/error', {
            title: currentLanguage === 'en' ? 'Error' : '錯誤',
            message: currentLanguage === 'en' ? 'Failed to load promotions' : '無法加載推動方案',
            language: currentLanguage,
            navigationPages: [],
            getContent: (item, field) => '',
            layout: 'layouts/frontend'
        });
    }
};

// Get a single promotion item for frontend
exports.getPromotionItemForFrontend = async (req, res) => {
    try {
        const { language, id } = req.params;
        
        // Find the item by slug or ID
        const [item, navigationPages] = await Promise.all([
            prisma.promotionItem.findFirst({
                where: {
                    OR: [
                        { id: isNaN(parseInt(id, 10)) ? undefined : parseInt(id, 10) },
                        { slug: id }
                    ],
                    deletedAt: null,
                    status: 'published'
                },
                include: {
                    category: true
                }
            }),
            // Get navigation pages
            prisma.page.findMany({
                where: {
                    status: 'published',
                    showInNavigation: true
                },
                orderBy: {
                    navigationOrder: 'asc'
                }
            })
        ]);
        
        if (!item) {
            // Explicitly set the layout to 'layouts/frontend' for error page
            res.locals.layout = 'layouts/frontend';
            return res.status(404).render('frontend/error', {
                title: language === 'en' ? 'Not Found' : '找不到頁面',
                message: language === 'en' ? 'The promotion you are looking for does not exist.' : '您正在尋找的推動方案不存在。',
                language,
                navigationPages,
                getContent: (item, field) => {
                    const langField = `${field}_${language}`;
                    return item[langField] || item[`${field}_en`] || '';
                },
                layout: 'layouts/frontend'
            });
        }
        
        // Add helper function for getting content in the current language
        const getContent = (item, field) => {
            const langField = `${field}_${language}`;
            return item[langField] || item[`${field}_en`] || '';
        };
        
        // Explicitly set the layout to 'layouts/frontend'
        res.locals.layout = 'layouts/frontend';
        
        res.render('frontend/promotion-detail', {
            title: language === 'en' ? item.title_en : item.title_tw,
            item,
            language,
            navigationPages,
            getContent,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error getting promotion item for frontend:', error);
        // Explicitly set the layout to 'layouts/frontend' for error page
        res.locals.layout = 'layouts/frontend';
        
        // Get language from request params or default to 'en'
        const currentLanguage = req.params.language || 'en';
        
        res.status(500).render('frontend/error', {
            title: currentLanguage === 'en' ? 'Error' : '錯誤',
            message: currentLanguage === 'en' ? 'Failed to load promotion details' : '無法加載推動方案詳情',
            language: currentLanguage,
            navigationPages: [],
            getContent: (item, field) => '',
            layout: 'layouts/frontend'
        });
    }
}; 