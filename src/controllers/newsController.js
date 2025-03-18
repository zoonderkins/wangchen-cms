const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// List all news categories
exports.listCategories = async (req, res) => {
    try {
        const categories = await prisma.newsCategory.findMany({
            where: {
                deletedAt: null
            },
            include: {
                _count: {
                    select: {
                        newsItems: {
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
        
        res.render('admin/news/categories/index', {
            title: 'News Categories',
            categories
        });
    } catch (error) {
        logger.error('Error listing news categories:', error);
        req.flash('error_msg', `Failed to load news categories: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
};

// Render create news category form
exports.renderCreateCategory = (req, res) => {
    res.render('admin/news/categories/form', {
        title: 'Create News Category',
        category: null
    });
};

// Create a new news category
exports.createCategory = async (req, res) => {
    try {
        const { name_en, name_tw, description_en, description_tw, order } = req.body;
        
        // Generate slug from English name
        const slug = slugify(name_en, {
            lower: true,
            strict: true
        });
        
        // Check if slug already exists
        const existingCategory = await prisma.newsCategory.findFirst({
            where: { 
                slug,
                deletedAt: null
            }
        });
        
        if (existingCategory) {
            req.flash('error_msg', 'A category with this name already exists');
            return res.redirect('/admin/news/categories/create');
        }
        
        // Create the category
        await prisma.newsCategory.create({
            data: {
                name_en,
                name_tw,
                slug,
                description_en,
                description_tw,
                order: order ? parseInt(order, 10) : 0
            }
        });
        
        req.flash('success_msg', 'News category created successfully');
        res.redirect('/admin/news/categories');
    } catch (error) {
        logger.error('Error creating news category:', error);
        req.flash('error_msg', `Failed to create news category: ${error.message}`);
        res.redirect('/admin/news/categories/create');
    }
};

// Render edit news category form
exports.renderEditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        const parsedId = parseInt(id, 10);
        
        if (isNaN(parsedId)) {
            req.flash('error_msg', 'Invalid category ID');
            return res.redirect('/admin/news/categories');
        }
        
        const category = await prisma.newsCategory.findFirst({
            where: { 
                id: parsedId,
                deletedAt: null
            }
        });
        
        if (!category) {
            req.flash('error_msg', 'News category not found');
            return res.redirect('/admin/news/categories');
        }
        
        res.render('admin/news/categories/form', {
            title: `Edit News Category: ${category.name_en}`,
            category
        });
    } catch (error) {
        logger.error('Error rendering edit news category form:', error);
        req.flash('error_msg', `Failed to load news category: ${error.message}`);
        res.redirect('/admin/news/categories');
    }
};

// Update a news category
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
            return res.redirect('/admin/news/categories');
        }
        
        // Check if slug already exists on a different category
        const existingCategory = await prisma.newsCategory.findFirst({
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
            return res.redirect(`/admin/news/categories/edit/${id}`);
        }
        
        // Update the category
        await prisma.newsCategory.update({
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
        
        req.flash('success_msg', 'News category updated successfully');
        res.redirect('/admin/news/categories');
    } catch (error) {
        logger.error('Error updating news category:', error);
        req.flash('error_msg', `Failed to update news category: ${error.message}`);
        res.redirect(`/admin/news/categories/edit/${req.params.id}`);
    }
};

// Delete a news category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Soft delete the category
        await prisma.newsCategory.update({
            where: { id: parseInt(id, 10) },
            data: {
                deletedAt: new Date()
            }
        });
        
        // Soft delete all items in this category
        await prisma.newsItem.updateMany({
            where: { categoryId: parseInt(id) },
            data: {
                deletedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'News category deleted successfully');
        res.redirect('/admin/news/categories');
    } catch (error) {
        logger.error('Error deleting news category:', error);
        req.flash('error_msg', `Failed to delete news category: ${error.message}`);
        res.redirect('/admin/news/categories');
    }
};

// List all news items
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
        const totalItems = await prisma.newsItem.count({
            where: whereClause
        });
        
        // Calculate total pages
        const totalPages = Math.ceil(totalItems / perPage);
        
        // Get all news items based on filters with pagination
        const items = await prisma.newsItem.findMany({
            where: whereClause,
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
                    publishedDate: 'desc'
                }
            ],
            skip: (currentPage - 1) * perPage,
            take: perPage
        });
        
        // Get all categories for the dropdown
        const categories = await prisma.newsCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                name_en: 'asc'
            }
        });
        
        res.render('admin/news/items/index', {
            title: '消息項目',
            newsItems: items,
            categories,
            search: search || '',
            selectedCategory: category ? parseInt(category, 10) : '',
            status: status || '',
            currentPage,
            totalPages,
            perPage,
            totalItems
        });
    } catch (error) {
        logger.error('Error listing news items:', error);
        req.flash('error_msg', `無法載入消息項目: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
};

// Render create news item form
exports.renderCreateItem = async (req, res) => {
    try {
        const categories = await prisma.newsCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                name_en: 'asc'
            }
        });
        
        res.render('admin/news/items/form', {
            title: '建立消息項目',
            newsItem: null,
            categories
        });
    } catch (error) {
        logger.error('Error rendering create news item form:', error);
        req.flash('error_msg', `無法載入消息分類: ${error.message}`);
        res.redirect('/admin/news/items');
    }
};

// Create a new news item
exports.createItem = async (req, res) => {
    try {
        const { 
            title_en, 
            title_tw, 
            summary_en, 
            summary_tw, 
            url, 
            categoryId, 
            publishedDate, 
            status 
        } = req.body;
        
        // Handle category ID (it's optional)
        let categoryData = {};
        if (categoryId && categoryId.trim() !== '') {
            const parsedCategoryId = parseInt(categoryId, 10);
            if (isNaN(parsedCategoryId)) {
                req.flash('error_msg', 'Invalid category ID');
                return res.redirect('/admin/news/items/create');
            }
            categoryData = {
                category: {
                    connect: { id: parsedCategoryId }
                }
            };
        }
        
        // Generate slug from English title
        const slug = slugify(title_en, {
            lower: true,
            strict: true
        });
        
        // Check if title already exists (which would create a duplicate slug)
        const existingItem = await prisma.newsItem.findFirst({
            where: { 
                title_en: title_en,
                deletedAt: null
            }
        });
        
        if (existingItem) {
            req.flash('error_msg', 'A news item with this title already exists');
            return res.redirect('/admin/news/items/create');
        }
        
        // Handle image upload
        let imagePath = null;
        if (req.file) {
            // Use the relativePath property set by the middleware
            // This is the path relative to the public directory (without 'public/' prefix)
            // which is what we want to store in the database
            imagePath = req.file.relativePath;
            logger.info(`Image path for database storage: ${imagePath}`);
        } else {
            logger.info('No image file uploaded');
        }
        
        // Create the item
        await prisma.newsItem.create({
            data: {
                title_en,
                title_tw,
                summary_en,
                summary_tw,
                slug,
                url,
                imagePath,
                publishedDate: new Date(publishedDate),
                status: status || 'draft',
                ...categoryData,
                author: {
                    connect: { id: req.session.user.id }
                }
            }
        });
        
        req.flash('success_msg', '消息項目建立成功');
        res.redirect('/admin/news/items');
    } catch (error) {
        logger.error('Error creating news item:', error);
        req.flash('error_msg', `無法建立消息項目: ${error.message}`);
        res.redirect('/admin/news/items/create');
    }
};

// Render edit news item form
exports.renderEditItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [newsItem, categories] = await Promise.all([
            prisma.newsItem.findFirst({
                where: { 
                    id: parseInt(id, 10),
                    deletedAt: null
                },
                include: {
                    category: true
                }
            }),
            prisma.newsCategory.findMany({
                where: {
                    deletedAt: null
                },
                orderBy: {
                    name_en: 'asc'
                }
            })
        ]);
        
        if (!newsItem) {
            req.flash('error_msg', '找不到消息項目');
            return res.redirect('/admin/news/items');
        }
        
        res.render('admin/news/items/form', {
            title: `編輯消息項目: ${newsItem.title_en}`,
            newsItem,
            categories
        });
    } catch (error) {
        logger.error('Error rendering edit news item form:', error);
        req.flash('error_msg', `無法載入消息項目: ${error.message}`);
        res.redirect('/admin/news/items');
    }
};

// Update a news item
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title_en, 
            title_tw, 
            summary_en, 
            summary_tw, 
            url, 
            categoryId, 
            publishedDate, 
            status 
        } = req.body;
        
        // Parse item ID
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId)) {
            req.flash('error_msg', '無效的消息項目 ID');
            return res.redirect('/admin/news/items');
        }
        
        // Handle category ID (it's optional)
        let categoryData = {};
        if (categoryId && categoryId.trim() !== '') {
            const parsedCategoryId = parseInt(categoryId, 10);
            if (isNaN(parsedCategoryId)) {
                req.flash('error_msg', '無效的分類 ID');
                return res.redirect(`/admin/news/items/edit/${id}`);
            }
            categoryData = { categoryId: parsedCategoryId };
        }
        
        // Get the existing item to check if we need to delete an old image
        const existingItem = await prisma.newsItem.findFirst({
            where: { 
                id: parsedId,
                deletedAt: null
            }
        });
        
        if (!existingItem) {
            req.flash('error_msg', '找不到消息項目');
            return res.redirect('/admin/news/items');
        }
        
        // Generate slug from English title
        const slug = slugify(title_en, {
            lower: true,
            strict: true
        });
        
        // Check if title already exists on a different item (which would create a duplicate slug)
        const existingItemWithSlug = await prisma.newsItem.findFirst({
            where: { 
                title_en: title_en,
                deletedAt: null,
                NOT: {
                    id: parsedId
                }
            }
        });
        
        if (existingItemWithSlug) {
            req.flash('error_msg', '已存在相同標題的消息項目');
            return res.redirect(`/admin/news/items/edit/${id}`);
        }
        
        // Handle image upload
        let imagePath = existingItem.imagePath;
        
        // Check if removeImage checkbox is checked
        if (req.body.removeImage === 'on') {
            // Delete old image if it exists
            if (existingItem.imagePath) {
                const oldImagePath = path.join(__dirname, '../../public', existingItem.imagePath);
                if (fs.existsSync(oldImagePath)) {
                    try {
                        fs.unlinkSync(oldImagePath);
                        logger.info(`Deleted old image due to removeImage checkbox: ${oldImagePath}`);
                    } catch (err) {
                        logger.error(`Error deleting old image: ${err.message}`);
                    }
                } else {
                    logger.warn(`Old image file not found at ${oldImagePath}`);
                }
            }
            imagePath = null; // Set to null to remove from database
            logger.info('Image removed from news item');
        }
        // Handle new image upload
        else if (req.file) {
            // Delete old image if it exists
            if (existingItem.imagePath) {
                const oldImagePath = path.join(__dirname, '../../public', existingItem.imagePath);
                if (fs.existsSync(oldImagePath)) {
                    try {
                        fs.unlinkSync(oldImagePath);
                        logger.info(`Deleted old image for replacement: ${oldImagePath}`);
                    } catch (err) {
                        logger.error(`Error deleting old image: ${err.message}`);
                    }
                } else {
                    logger.warn(`Old image file not found at ${oldImagePath}`);
                }
            }
            
            // Use the relativePath property set by the middleware
            imagePath = req.file.relativePath;
            logger.info(`New image path for database storage: ${imagePath}`);
        } else {
            logger.info('No new image file uploaded, keeping existing image');
        }
        
        // Validate the status value
        const validStatuses = ['draft', 'published', 'archived'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status value: ${status}`);
        }
        
        // Update the item
        await prisma.newsItem.update({
            where: { id: parsedId },
            data: {
                title_en,
                title_tw,
                summary_en,
                summary_tw,
                slug,
                url,
                imagePath,
                publishedDate: new Date(publishedDate),
                status,
                ...categoryData,
                updatedAt: new Date()
            }
        });
        
        req.flash('success_msg', '消息項目更新成功');
        res.redirect('/admin/news/items');
    } catch (error) {
        logger.error('Error updating news item:', error);
        req.flash('error_msg', `無法更新消息項目: ${error.message}`);
        res.redirect(`/admin/news/items/edit/${req.params.id}`);
    }
};

// Delete a news item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Soft delete the item
        await prisma.newsItem.update({
            where: { id: parseInt(id, 10) },
            data: {
                deletedAt: new Date()
            }
        });
        
        req.flash('success_msg', '消息項目刪除成功');
        res.redirect('/admin/news/items');
    } catch (error) {
        logger.error('Error deleting news item:', error);
        req.flash('error_msg', `無法刪除消息項目: ${error.message}`);
        res.redirect('/admin/news/items');
    }
};

// Frontend: List news items for frontend
exports.listNewsForFrontend = async (req, res) => {
    try {
        const language = req.params.language || 'en';
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const perPage = 10; // Items per page
        const skip = (page - 1) * perPage;
        
        // Prepare filter conditions
        const whereConditions = {
            status: 'published',
            deletedAt: null
        };
        
        // Add search filter if provided
        if (search) {
            whereConditions.OR = [
                { title_en: { contains: search } },
                { title_tw: { contains: search } }
            ];
        }
        
        // Get news items, total count for pagination, and categories
        const [newsItems, total, categories] = await Promise.all([
            prisma.newsItem.findMany({
                where: whereConditions,
                include: {
                    category: true
                },
                orderBy: {
                    publishedDate: 'desc'
                },
                skip,
                take: perPage
            }),
            prisma.newsItem.count({
                where: whereConditions
            }),
            prisma.newsCategory.findMany({
                where: {
                    deletedAt: null
                },
                orderBy: {
                    order: 'asc'
                }
            })
        ]);
        
        // Calculate total pages for pagination
        const totalPages = Math.ceil(total / perPage);
        
        // Process news items for the selected language
        const processedItems = newsItems.map(item => {
            const titleField = `title_${language}`;
            
            // Ensure image path is absolute and doesn't include language prefix
            let imageUrl = null;
            if (item.imagePath) {
                // The imagePath should already be in the correct format (/uploads/news/filename)
                // Just make sure it doesn't have a language prefix
                imageUrl = item.imagePath;
            }
            
            return {
                ...item,
                title: item[titleField] || item.title_en, // Fallback to English
                imageUrl: imageUrl, // Use the corrected image URL
                category: item.category ? {
                    ...item.category,
                    name: item.category[`name_${language}`] || item.category.name_en
                } : null
            };
        });
        
        // Process categories for the selected language
        const processedCategories = categories.map(cat => {
            return {
                ...cat,
                name: cat[`name_${language}`] || cat.name_en
            };
        });
        
        // Set page title based on language
        const pageTitle = language === 'tw' ? '最新消息' : 'News';
        
        res.render('frontend/news', {
            title: pageTitle,
            newsItems: processedItems,
            categories: processedCategories,
            category: null,
            search,
            language,
            currentPage: page,
            totalPages,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error loading news for frontend:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: language === 'en' ? 'Failed to load news' : '載入最新消息失敗',
            layout: 'layouts/frontend'
        });
    }
};

// Frontend: List news by category for frontend
exports.listNewsByCategoryForFrontend = async (req, res) => {
    try {
        const language = req.params.language || 'en';
        const categoryId = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const perPage = 10; // Items per page
        const skip = (page - 1) * perPage;
        
        if (isNaN(categoryId)) {
            return res.status(404).render('frontend/error', {
                title: language === 'en' ? 'Category Not Found' : '找不到分類',
                message: language === 'en' ? 'Invalid category ID' : '無效的分類ID',
                layout: 'layouts/frontend'
            });
        }
        
        // Get the category
        const category = await prisma.newsCategory.findFirst({
            where: { 
                id: categoryId,
                deletedAt: null
            }
        });
        
        if (!category) {
            return res.status(404).render('frontend/error', {
                title: language === 'en' ? 'Category Not Found' : '找不到分類',
                message: language === 'en' ? 'The requested news category does not exist' : '請求的最新消息分類不存在',
                layout: 'layouts/frontend'
            });
        }
        
        // Get news items for this category with pagination
        const [newsItems, total, categories] = await Promise.all([
            prisma.newsItem.findMany({
                where: {
                    categoryId,
                    status: 'published',
                    deletedAt: null
                },
                orderBy: {
                    publishedDate: 'desc'
                },
                skip,
                take: perPage
            }),
            prisma.newsItem.count({
                where: {
                    categoryId,
                    status: 'published',
                    deletedAt: null
                }
            }),
            prisma.newsCategory.findMany({
                where: {
                    deletedAt: null
                },
                orderBy: {
                    order: 'asc'
                }
            })
        ]);
        
        // Calculate total pages for pagination
        const totalPages = Math.ceil(total / perPage);
        
        // Process news items for the selected language
        const processedItems = newsItems.map(item => {
            const titleField = `title_${language}`;
            
            // Ensure image path is absolute and doesn't include language prefix
            let imageUrl = null;
            if (item.imagePath) {
                // The imagePath should already be in the correct format (/uploads/news/filename)
                imageUrl = item.imagePath;
            }
            
            return {
                ...item,
                title: item[titleField] || item.title_en, // Fallback to English
                imageUrl: imageUrl, // Use the corrected image URL
                category: item.category ? {
                    ...item.category,
                    name: item.category[`name_${language}`] || item.category.name_en
                } : null
            };
        });
        
        // Process categories for the selected language
        const processedCategories = categories.map(cat => {
            return {
                ...cat,
                name: cat[`name_${language}`] || cat.name_en
            };
        });
        
        // Get the category name in the correct language
        const categoryName = category[`name_${language}`] || category.name_en;
        
        // Set page title based on language and category
        const pageTitle = language === 'tw' ? `${categoryName} - 最新消息` : `${categoryName} - News`;
        
        res.render('frontend/news-category', {
            title: pageTitle,
            category: {
                ...category,
                name: categoryName
            },
            newsItems: processedItems,
            categories: processedCategories,
            currentPage: page,
            totalPages,
            language,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error loading news category for frontend:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: language === 'en' ? 'Failed to load news category' : '載入最新消息分類失敗',
            layout: 'layouts/frontend'
        });
    }
};

// Frontend: Get news item details for frontend
exports.getNewsItemForFrontend = async (req, res) => {
    try {
        const language = req.params.language || 'en';
        const slug = req.params.slug;
        
        if (!slug) {
            return res.status(404).render('frontend/error', {
                title: language === 'en' ? 'News Not Found' : '找不到最新消息',
                message: language === 'en' ? 'Invalid news slug' : '無效的最新消息網址',
                layout: 'layouts/frontend'
            });
        }
        
        // Get the news item
        const newsItem = await prisma.newsItem.findFirst({
            where: {
                slug: slug,
                status: 'published',
                deletedAt: null
            },
            include: {
                category: true,
                author: {
                    select: { username: true }
                }
            }
        });
        
        if (!newsItem) {
            return res.status(404).render('frontend/error', {
                title: language === 'en' ? 'News Not Found' : '找不到最新消息',
                message: language === 'en' ? 'The requested news item does not exist' : '請求的最新消息不存在',
                layout: 'layouts/frontend'
            });
        }
        
        // Get related news from the same category
        const relatedNews = await prisma.newsItem.findMany({
            where: {
                categoryId: newsItem.categoryId,
                id: { not: newsItem.id },
                status: 'published',
                deletedAt: null
            },
            take: 4,
            orderBy: {
                publishedDate: 'desc'
            }
        });
        
        // Process news item for the selected language
        const titleField = `title_${language}`;
        const contentField = `content_${language}`;
        const summaryField = `summary_${language}`;
        
        // Ensure image path is absolute and doesn't include language prefix
        let imageUrl = null;
        if (newsItem.imagePath) {
            // The imagePath should already be in the correct format (/uploads/news/filename)
            imageUrl = newsItem.imagePath;
        }
        
        // Process the news item for the selected language
        const processedItem = {
            ...newsItem,
            title: newsItem[titleField] || newsItem.title_en, // Fallback to English
            content: newsItem[contentField] || newsItem.content_en, // Fallback to English
            summary: newsItem[summaryField] || newsItem.summary_en, // Fallback to English
            imageUrl: imageUrl, // Use the corrected image URL
            category: {
                ...newsItem.category,
                name: newsItem.category[`name_${language}`] || newsItem.category.name_en
            }
        };
        
        // Process related news for the selected language
        const processedRelatedNews = relatedNews.map(item => {
            // Ensure image path is absolute for related news items
            let relatedImageUrl = null;
            if (item.imagePath) {
                relatedImageUrl = item.imagePath;
            }
            
            return {
                ...item,
                title: item[titleField] || item.title_en, // Fallback to English
                imageUrl: relatedImageUrl // Use the corrected image URL
            };
        });
        
        // Instead of rendering a detail page, redirect to the news listing
        return res.redirect(`/${language}/news`);
        
        /* Uncomment this if you want to implement a detail page in the future
        res.render('frontend/news', {
            title: processedItem.title,
            newsItem: processedItem,
            relatedNews: processedRelatedNews,
            language,
            layout: 'layouts/frontend'
        });
        */
    } catch (error) {
        logger.error('Error loading news item for frontend:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: language === 'en' ? 'Failed to load news item' : '載入最新消息失敗',
            layout: 'layouts/frontend'
        });
    }
};