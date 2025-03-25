const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const slugify = require('slugify');

// Admin: List all partner items
exports.listItems = async (req, res) => {
    try {
        const partners = await prisma.partner.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            },
            include: {
                author: {
                    select: {
                        username: true
                    }
                },
                category: true
            }
        });
        
        logger.info(`Partner items count: ${partners.length}`);
        
        const categories = await prisma.partnersCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        res.render('admin/partners/index', {
            title: '合作夥伴項目',
            partners,
            categories
        });
    } catch (error) {
        logger.error('Error listing partner items:', error);
        req.flash('error_msg', `Failed to load partner items: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
};

// Admin: Render create partner item form
exports.renderCreateItem = async (req, res) => {
    try {
        const categories = await prisma.partnersCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });

        res.render('admin/partners/create', {
            title: '建立合作夥伴項目',
            categories
        });
    } catch (error) {
        logger.error('Error loading categories:', error);
        req.flash('error_msg', `Failed to load categories: ${error.message}`);
        res.redirect('/admin/partners');
    }
};

// Admin: Create a new partner item
exports.createItem = async (req, res) => {
    try {
        // Debug: Log the request details
        console.log('\n==== PARTNER CREATE REQUEST ====');
        console.log('Request URL:', req.originalUrl);
        console.log('Request method:', req.method);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Request body:', req.body);
        logger.info(`Create partner request to ${req.originalUrl}`);
        
        // Check if the request body is empty
        if (!req.body || Object.keys(req.body).length === 0) {
            logger.error('ERROR: Request body is empty');
            req.flash('error_msg', 'No data received. Please fill the form correctly.');
            return res.redirect('/admin/partners/create');
        }
        
        // Extract form data
        const { 
            title_en, title_tw, suppliers_en, suppliers_tw, 
            buyers_en, buyers_tw, order, categoryId, url, 
            publishedDate, status
        } = req.body;
        
        logger.info(`Partner form data: title_en=${title_en}, title_tw=${title_tw}, categoryId=${categoryId}`);
        
        // Generate slug from English title with timestamp to ensure uniqueness
        const timestamp = new Date().getTime();
        const slug = slugify(title_en || `partner-item-${timestamp}`, {
            lower: true,
            strict: true
        }) + `-${timestamp}`;
        
        // Create the partner data object
        const partnerData = {
            title_en: title_en || '',
            title_tw: title_tw || '',
            slug,
            suppliers_en: suppliers_en || '',
            suppliers_tw: suppliers_tw || '',
            buyers_en: buyers_en || '',
            buyers_tw: buyers_tw || '',
            url: url || null,
            order: order ? parseInt(order) : 0,
            status: status || 'draft',
            publishedDate: publishedDate ? new Date(publishedDate) : new Date(),
            categoryId: categoryId && categoryId !== '' ? parseInt(categoryId) : null,
            authorId: req.session.user ? req.session.user.id : 1
        };
        
        logger.info(`Creating partner with data: ${JSON.stringify(partnerData)}`);
        
        // Create the partner item
        const partner = await prisma.partner.create({
            data: partnerData
        });
        
        logger.info(`Partner created: ${partner.id}`);
        req.flash('success_msg', '合作夥伴項目創建成功！');
        res.redirect('/admin/partners');
    } catch (error) {
        console.error('Error creating partner item:', error);
        logger.error(`Error creating partner item: ${error.message}`, { error: error.stack });
        req.flash('error_msg', `創建失敗: ${error.message}`);
        return res.redirect('/admin/partners/create');
    }
};

// Admin: Render edit partner item form
exports.renderEditItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        const partner = await prisma.partner.findUnique({
            where: {
                id: parseInt(id),
                deletedAt: null
            },
            include: {
                category: true
            }
        });
        
        if (!partner) {
            req.flash('error_msg', '找不到此合作夥伴項目');
            return res.redirect('/admin/partners');
        }
        
        const categories = await prisma.partnersCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        res.render('admin/partners/edit', {
            title: '編輯合作夥伴項目',
            partner,
            categories
        });
    } catch (error) {
        logger.error('Error loading partner for edit:', error);
        req.flash('error_msg', `加載失敗: ${error.message}`);
        res.redirect('/admin/partners');
    }
};

// Admin: Update an existing partner item
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('\n==== PARTNER UPDATE REQUEST ====');
        console.log('Request URL:', req.originalUrl);
        console.log('Request method:', req.method);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Partner ID:', id);
        console.log('Request body:', req.body);
        
        // Check if the request body is empty
        if (!req.body || Object.keys(req.body).length === 0) {
            logger.error('ERROR: Update request body is empty');
            req.flash('error_msg', 'No data received. Please fill the form correctly.');
            return res.redirect(`/admin/partners/${id}/edit`);
        }
        
        const { 
            title_en, title_tw, suppliers_en, suppliers_tw, 
            buyers_en, buyers_tw, order, categoryId, url, 
            publishedDate, status
        } = req.body;
        
        logger.info(`Partner update data for ID ${id}: title_en=${title_en}, title_tw=${title_tw}, categoryId=${categoryId}`);
        
        // Update the partner item
        const partner = await prisma.partner.update({
            where: {
                id: parseInt(id)
            },
            data: {
                title_en: title_en || '',
                title_tw: title_tw || '',
                suppliers_en: suppliers_en || '',
                suppliers_tw: suppliers_tw || '',
                buyers_en: buyers_en || '',
                buyers_tw: buyers_tw || '',
                url: url || null,
                order: order ? parseInt(order) : 0,
                status: status || 'draft',
                publishedDate: publishedDate ? new Date(publishedDate) : new Date(),
                categoryId: categoryId && categoryId !== '' ? parseInt(categoryId) : null,
                updatedAt: new Date()
            }
        });
        
        logger.info(`Partner updated: ${partner.id}`);
        req.flash('success_msg', '合作夥伴項目更新成功！');
        res.redirect('/admin/partners');
    } catch (error) {
        console.error('Error updating partner item:', error);
        logger.error(`Error updating partner item: ${error.message}`, { error: error.stack });
        req.flash('error_msg', `更新失敗: ${error.message}`);
        res.redirect(`/admin/partners/${req.params.id}/edit`);
    }
};

// Admin: Delete a partner item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        await prisma.partner.update({
            where: {
                id: parseInt(id)
            },
            data: {
                deletedAt: new Date()
            }
        });
        
        logger.info(`Partner deleted (soft): ${id}`);
        req.flash('success_msg', '合作夥伴項目已刪除');
        res.redirect('/admin/partners');
    } catch (error) {
        logger.error('Error deleting partner item:', error);
        req.flash('error_msg', `刪除失敗: ${error.message}`);
        res.redirect('/admin/partners');
    }
};

// Frontend: Get partners by category
exports.getPartnersByCategory = async (req, res) => {
    try {
        const language = req.params.language || req.language || 'tw';
        const categories = await prisma.partnersCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        // Group partners by category
        const partnersByCategory = {};
        
        for (const category of categories) {
            const partners = await prisma.partner.findMany({
                where: {
                    categoryId: category.id,
                    status: 'published',
                    deletedAt: null
                },
                orderBy: {
                    order: 'asc'
                }
            });
            
            // Group by suppliers and buyers
            const suppliers = partners.filter(p => p.suppliers_en || p.suppliers_tw);
            const buyers = partners.filter(p => p.buyers_en || p.buyers_tw);
            
            partnersByCategory[category.id] = {
                category,
                suppliers,
                buyers
            };
        }
        
        return res.json({
            success: true,
            data: partnersByCategory,
            language
        });
    } catch (error) {
        logger.error('Error getting partners by category:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===== CATEGORY MANAGEMENT =====

// Admin: List all partner categories
exports.listCategories = async (req, res) => {
    try {
        const categories = await prisma.partnersCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            },
            include: {
                partners: {
                    where: {
                        deletedAt: null
                    }
                }
            }
        });
        
        res.render('admin/partners/categories', {
            title: '合作夥伴分類管理',
            categories
        });
    } catch (error) {
        logger.error('Error listing partner categories:', error);
        req.flash('error_msg', `Failed to load categories: ${error.message}`);
        res.redirect('/admin/partners');
    }
};

// Admin: Render create category form
exports.renderCreateCategory = async (req, res) => {
    res.render('admin/partners/categories/create', {
        title: '建立合作夥伴分類'
    });
};

// Admin: Create a new category
exports.createCategory = async (req, res) => {
    try {
        const { name_en, name_tw, description_en, description_tw, order } = req.body;
        
        // Generate slug
        const slug = slugify(name_en || `category-${Date.now()}`, {
            lower: true,
            strict: true
        });
        
        await prisma.partnersCategory.create({
            data: {
                name_en: name_en || '',
                name_tw: name_tw || '',
                description_en: description_en || '',
                description_tw: description_tw || '',
                slug,
                order: order ? parseInt(order) : 0
            }
        });
        
        req.flash('success_msg', '分類創建成功！');
        res.redirect('/admin/partners/categories');
    } catch (error) {
        logger.error('Error creating partner category:', error);
        req.flash('error_msg', `創建失敗: ${error.message}`);
        res.redirect('/admin/partners/categories');
    }
};

// Admin: Render edit category form
exports.renderEditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await prisma.partnersCategory.findUnique({
            where: {
                id: parseInt(id),
                deletedAt: null
            }
        });
        
        if (!category) {
            req.flash('error_msg', '找不到此分類');
            return res.redirect('/admin/partners/categories');
        }
        
        res.render('admin/partners/categories/edit', {
            title: '編輯合作夥伴分類',
            category
        });
    } catch (error) {
        logger.error('Error loading category for edit:', error);
        req.flash('error_msg', `加載失敗: ${error.message}`);
        res.redirect('/admin/partners/categories');
    }
};

// Admin: Update a category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name_en, name_tw, description_en, description_tw, order } = req.body;
        
        await prisma.partnersCategory.update({
            where: {
                id: parseInt(id)
            },
            data: {
                name_en: name_en || '',
                name_tw: name_tw || '',
                description_en: description_en || '',
                description_tw: description_tw || '',
                order: order ? parseInt(order) : 0,
                updatedAt: new Date()
            }
        });
        
        req.flash('success_msg', '分類更新成功！');
        res.redirect('/admin/partners/categories');
    } catch (error) {
        logger.error('Error updating partner category:', error);
        req.flash('error_msg', `更新失敗: ${error.message}`);
        res.redirect('/admin/partners/categories');
    }
};

// Admin: Delete a category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if category is being used by any partner items
        const partnersUsingCategory = await prisma.partner.count({
            where: {
                categoryId: parseInt(id),
                deletedAt: null
            }
        });
        
        if (partnersUsingCategory > 0) {
            req.flash('error_msg', '此分類正在被使用，無法刪除');
            return res.redirect('/admin/partners/categories');
        }
        
        await prisma.partnersCategory.update({
            where: {
                id: parseInt(id)
            },
            data: {
                deletedAt: new Date()
            }
        });
        
        req.flash('success_msg', '分類已刪除');
        res.redirect('/admin/partners/categories');
    } catch (error) {
        logger.error('Error deleting partner category:', error);
        req.flash('error_msg', `刪除失敗: ${error.message}`);
        res.redirect('/admin/partners/categories');
    }
};

// Frontend: Partners section for homepage
exports.getPartnersForHomepage = async (req, res, next) => {
    try {
        const language = req.language || 'tw';
        logger.info(`Getting partners for homepage, language: ${language}`);
        
        // Get all published categories
        const categories = await prisma.partnersCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        // Get all published partners
        const partners = await prisma.partner.findMany({
            where: {
                status: 'published',
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        logger.info(`Found ${partners.length} partners and ${categories.length} categories`);
        
        // Group partners by category
        const partnersByCategory = {};
        
        for (const category of categories) {
            const categoryPartners = partners.filter(p => p.categoryId === category.id);
            
            // Process suppliers from each partner
            let suppliers = [];
            categoryPartners.forEach(partner => {
                if (partner.suppliers_en || partner.suppliers_tw) {
                    const supplierText = language === 'en' ? partner.suppliers_en : partner.suppliers_tw;
                    if (supplierText) {
                        const supplierLines = supplierText.split('\n')
                            .map(line => line.trim())
                            .filter(line => line);
                        
                        // Sanitize each line to ensure it's valid for JSON
                        const sanitizedLines = supplierLines.map(line => 
                            // Replace any characters that might break JSON
                            line.replace(/[\u0000-\u001F\u007F-\u009F\u2000-\u200F\u2028-\u202F]/g, '')
                        );
                        
                        suppliers = [...suppliers, ...sanitizedLines];
                    }
                }
            });
            
            // Process buyers from each partner
            let buyers = [];
            categoryPartners.forEach(partner => {
                if (partner.buyers_en || partner.buyers_tw) {
                    const buyerText = language === 'en' ? partner.buyers_en : partner.buyers_tw;
                    if (buyerText) {
                        const buyerLines = buyerText.split('\n')
                            .map(line => line.trim())
                            .filter(line => line);
                        
                        // Sanitize each line to ensure it's valid for JSON
                        const sanitizedLines = buyerLines.map(line => 
                            // Replace any characters that might break JSON
                            line.replace(/[\u0000-\u001F\u007F-\u009F\u2000-\u200F\u2028-\u202F]/g, '')
                        );
                        
                        buyers = [...buyers, ...sanitizedLines];
                    }
                }
            });
            
            // Only add categories that have suppliers or buyers
            if (suppliers.length > 0 || buyers.length > 0) {
                partnersByCategory[category.id] = {
                    category: {
                        id: category.id,
                        name_en: category.name_en,
                        name_tw: category.name_tw,
                        description_en: category.description_en,
                        description_tw: category.description_tw
                    },
                    suppliers: suppliers,
                    buyers: buyers
                };
            }
        }
        
        logger.info(`Partners data prepared with ${Object.keys(partnersByCategory).length} categories with data`);
        
        // Debug the data structure
        console.log('Partners by category structure:');
        for (const categoryId in partnersByCategory) {
            console.log(`  Category ${categoryId}:`);
            console.log(`    Suppliers: ${partnersByCategory[categoryId].suppliers.length} items`);
            console.log(`    Buyers: ${partnersByCategory[categoryId].buyers.length} items`);
        }
        
        // Sanitize the data by cycling through JSON stringify/parse to ensure it's valid JSON
        // This prevents any unterminated strings or invalid characters
        let sanitizedPartnersByCategory;
        try {
            // Convert to JSON string and back to ensure it's valid
            const jsonString = JSON.stringify(partnersByCategory);
            sanitizedPartnersByCategory = JSON.parse(jsonString);
            
            // Test that the result is valid
            JSON.stringify(sanitizedPartnersByCategory);
            logger.info('Partners data successfully sanitized for JSON output');
        } catch (jsonError) {
            logger.error(`Error sanitizing partners data: ${jsonError.message}`, { error: jsonError.stack });
            // Fallback to empty object if there's a problem
            sanitizedPartnersByCategory = {};
        }
        
        // Set the data for the view
        res.locals.partnersByCategory = sanitizedPartnersByCategory;
        
        // Continue to the next middleware or route handler
        next();
    } catch (error) {
        logger.error(`Error getting partners for homepage: ${error.message}`, { error: error.stack });
        // Set empty partners data to prevent template errors
        res.locals.partnersByCategory = {};
        next();
    }
};

// Frontend: Partners section for promotions page
exports.getPartnersForPromotions = async (req, res, next) => {
    try {
        const language = req.params.language || 'tw';
        logger.info(`Getting partners for promotions page, language: ${language}`);
        
        // Get all published categories
        const categories = await prisma.partnersCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        // Get all published partners
        const partners = await prisma.partner.findMany({
            where: {
                status: 'published',
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        logger.info(`Found ${partners.length} partners and ${categories.length} categories for promotions page`);
        
        // Group partners by category
        const platforms = [];
        
        for (const category of categories) {
            const categoryPartners = partners.filter(p => p.categoryId === category.id);
            
            // Skip categories with no partners
            if (categoryPartners.length === 0) continue;
            
            // Process suppliers from each partner
            let suppliers = [];
            categoryPartners.forEach(partner => {
                if (partner.suppliers_en || partner.suppliers_tw) {
                    const supplierText = language === 'en' ? partner.suppliers_en : partner.suppliers_tw;
                    if (supplierText) {
                        const supplierLines = supplierText.split('\n')
                            .map(line => line.trim())
                            .filter(line => line);
                        
                        // Sanitize each line to ensure it's valid for JSON
                        const sanitizedLines = supplierLines.map(line => 
                            // Replace any characters that might break JSON
                            line.replace(/[\u0000-\u001F\u007F-\u009F\u2000-\u200F\u2028-\u202F]/g, '')
                        );
                        
                        suppliers = [...suppliers, ...sanitizedLines];
                    }
                }
            });
            
            // Process buyers from each partner
            let buyers = [];
            categoryPartners.forEach(partner => {
                if (partner.buyers_en || partner.buyers_tw) {
                    const buyerText = language === 'en' ? partner.buyers_en : partner.buyers_tw;
                    if (buyerText) {
                        const buyerLines = buyerText.split('\n')
                            .map(line => line.trim())
                            .filter(line => line);
                        
                        // Sanitize each line to ensure it's valid for JSON
                        const sanitizedLines = buyerLines.map(line => 
                            // Replace any characters that might break JSON
                            line.replace(/[\u0000-\u001F\u007F-\u009F\u2000-\u200F\u2028-\u202F]/g, '')
                        );
                        
                        buyers = [...buyers, ...sanitizedLines];
                    }
                }
            });
            
            // Only add categories that have suppliers or buyers
            if (suppliers.length > 0 || buyers.length > 0) {
                // Create a formatted platform-like object for compatibility with the existing template
                try {
                    // Create partnersData structure first, to validate
                    const partnersDataObj = {
                        suppliers: {
                            companies_en: language === 'en' ? suppliers : [],
                            companies_tw: language === 'tw' ? suppliers : []
                        },
                        buyers: {
                            companies_en: language === 'en' ? buyers : [],
                            companies_tw: language === 'tw' ? buyers : []
                        }
                    };
                    
                    // Validate by converting to JSON and back
                    const partnersDataStr = JSON.stringify(partnersDataObj);
                    const validatedPartnersData = JSON.parse(partnersDataStr);
                    
                    platforms.push({
                        id: `partner-${category.id}`,
                        type: 'partners',
                        title_en: category.name_en,
                        title_tw: category.name_tw,
                        partnersData: partnersDataStr,
                        parsedPartnersData: validatedPartnersData
                    });
                } catch (jsonError) {
                    logger.error(`Error creating JSON for category ${category.id}: ${jsonError.message}`);
                    // Skip this category if there's a JSON error
                    continue;
                }
            }
        }
        
        // Test the entire platforms array by converting to JSON and back
        let sanitizedPlatforms;
        try {
            const jsonString = JSON.stringify(platforms);
            sanitizedPlatforms = JSON.parse(jsonString);
            logger.info('Partners platforms data successfully sanitized for JSON output');
        } catch (jsonError) {
            logger.error(`Error sanitizing platforms data: ${jsonError.message}`, { error: jsonError.stack });
            // Fallback to empty array if there's a problem
            sanitizedPlatforms = [];
        }
        
        // Add partner categories to a single partnerCategory object
        res.locals.partnerCategories = [{
            id: 'partners',
            name_en: 'Partners',
            name_tw: '合作伙伴',
            platforms: sanitizedPlatforms
        }];
        
        // Continue to the next middleware or route handler
        next();
    } catch (error) {
        logger.error(`Error getting partners for promotions page: ${error.message}`, { error: error.stack });
        // Continue without setting partner data
        next();
    }
}; 