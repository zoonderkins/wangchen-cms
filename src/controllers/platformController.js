const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Admin: List all platform items
exports.listItems = async (req, res) => {
    try {
        const items = await prisma.platform.findMany({
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
                category: true,
                attachments: {
                    where: {
                        deletedAt: null
                    },
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        mimeType: true,
                        size: true,
                        path: true,
                        title_en: true,
                        title_tw: true,
                        description_en: true,
                        description_tw: true,
                        attachment_name_en: true,
                        attachment_name_tw: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
        
        // Log item types for debugging
        console.log('平台項目類型:', items.map(item => ({
            id: item.id,
            title: item.title_en,
            type: item.type
        })));
        logger.info(`平台項目數量: ${items.length}`);
        
        const categories = await prisma.platformCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        res.render('admin/platforms/index', {
            title: 'Platform Items',
            items,
            categories
        });
    } catch (error) {
        logger.error('列出平台項目時發生錯誤:', error);
        req.flash('error_msg', `無法加載平台項目: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
};

// Admin: Render create platform item form
exports.renderCreateItem = async (req, res) => {
    try {
        const categories = await prisma.platformCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });

        res.render('admin/platforms/create', {
            title: 'Create Platform Item',
            categories
        });
    } catch (error) {
        logger.error('加載分類時發生錯誤:', error);
        req.flash('error_msg', `無法加載分類: ${error.message}`);
        res.redirect('/admin/platforms');
    }
};

// Admin: Create a new platform item
exports.createItem = async (req, res) => {
    try {
        const { 
            title_en, title_tw, type, content_en, content_tw, 
            order, categoryId, url, publishedDate, status,
            partners_subtype 
        } = req.body;
        
        // Handle image upload
        let imagePath = null;
        if (req.files && req.files.image && req.files.image.length > 0) {
            imagePath = `/uploads/platform/${req.files.image[0].filename}`;
            console.log('圖片已上傳:', req.files.image[0].filename);
            console.log('圖片路徑:', imagePath);
            logger.info(`圖片已上傳: ${req.files.image[0].filename}`);
            logger.info(`圖片路徑: ${imagePath}`);
        }
        
        // Generate slug from English title with timestamp to ensure uniqueness
        const timestamp = new Date().getTime();
        let slug;
        
        if (title_en) {
            slug = `${title_en
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')}-${timestamp}`;
        } else {
            // Fallback if title_en is undefined or null
            slug = `platform-item-${timestamp}`;
        }
            
        // Log the generated slug
        console.log('生成的網址別名:', slug);
        logger.info(`生成的網址別名: ${slug}`);
        
        // Set default values based on type
        let finalContentEn, finalContentTw, finalCategoryId;
        
        switch(type) {
            case 'attachment_only':
                finalContentEn = '';
                finalContentTw = '';
                finalCategoryId = null;
                break;
            case 'plain_text':
            case 'image_with_caption':
                finalContentEn = content_en || '';
                finalContentTw = content_tw || '';
                finalCategoryId = categoryId ? parseInt(categoryId) : null;
                break;
            case 'partners':
                finalContentEn = '';
                finalContentTw = '';
                finalCategoryId = categoryId ? parseInt(categoryId) : null;
                break;
            default:
                finalContentEn = content_en || '';
                finalContentTw = content_tw || '';
                finalCategoryId = categoryId ? parseInt(categoryId) : null;
        }
        
        // For partners type, handle partners data
        const isPartners = type === 'partners';
        let partnersData = null;
        
        if (isPartners) {
            console.log('正在創建夥伴類型項目');
            logger.info('正在創建夥伴類型項目');
            
            // Get supplier and buyer company lists from request
            const suppliers_en = req.body.suppliers_en || '';
            const suppliers_tw = req.body.suppliers_tw || '';
            const buyers_en = req.body.buyers_en || '';
            const buyers_tw = req.body.buyers_tw || '';
            
            console.log('供應商 EN:', suppliers_en);
            console.log('供應商 TW:', suppliers_tw);
            console.log('買家 EN:', buyers_en);
            console.log('買家 TW:', buyers_tw);
            
            logger.info(`供應商 EN: ${suppliers_en}`);
            logger.info(`供應商 TW: ${suppliers_tw}`);
            logger.info(`買家 EN: ${buyers_en}`);
            logger.info(`買家 TW: ${buyers_tw}`);
            
            // Store both supplier and buyer company lists in a JSON field
            partnersData = {
                suppliers: {
                    companies_en: suppliers_en ? suppliers_en.split('\n').filter(line => line.trim() !== '') : [],
                    companies_tw: suppliers_tw ? suppliers_tw.split('\n').filter(line => line.trim() !== '') : []
                },
                buyers: {
                    companies_en: buyers_en ? buyers_en.split('\n').filter(line => line.trim() !== '') : [],
                    companies_tw: buyers_tw ? buyers_tw.split('\n').filter(line => line.trim() !== '') : []
                }
            };
            
            console.log('夥伴數據:', partnersData);
            logger.info(`夥伴數據: ${JSON.stringify(partnersData)}`);
        }
        
        // Create the platform item
        const platform = await prisma.platform.create({
            data: {
                title_en,
                title_tw,
                type,
                content_en: finalContentEn,
                content_tw: finalContentTw,
                imagePath,
                url,
                slug,
                publishedDate: publishedDate ? new Date(publishedDate) : new Date(),
                order: order ? parseInt(order) : 0,
                categoryId: finalCategoryId,
                authorId: req.session.user.id,
                status: status || 'draft',
                partnersData: isPartners ? JSON.stringify(partnersData) : null
            }
        });
        
        // Handle attachments if any
        if (req.files && req.files.attachments && req.files.attachments.length > 0) {
            console.log(`正在處理 ${req.files.attachments.length} 個附件`);
            logger.info(`正在處理 ${req.files.attachments.length} 個附件`);
            
            try {
                const attachmentPromises = req.files.attachments.map((file, index) => {
                    console.log(`處理附件: ${file.originalname}, 大小: ${file.size}, 類型: ${file.mimetype}`);
                    logger.info(`處理附件: ${file.originalname}, 大小: ${file.size}, 類型: ${file.mimetype}`);
                    
                    // Get custom attachment names if provided
                    const attachmentNameEn = req.body[`new_attachment_name_en_${index}`] || null;
                    const attachmentNameTw = req.body[`new_attachment_name_tw_${index}`] || null;
                    
                    console.log(`自定義附件名稱 - EN: ${attachmentNameEn}, TW: ${attachmentNameTw}`);
                    
                    return prisma.platformAttachment.create({
                        data: {
                            filename: file.filename,
                            originalName: file.originalname,
                            mimeType: file.mimetype,
                            size: file.size,
                            path: `/uploads/platform/attachments/${file.filename}`,
                            platformId: platform.id,
                            attachment_name_en: attachmentNameEn,
                            attachment_name_tw: attachmentNameTw
                        }
                    });
                });
                
                await Promise.all(attachmentPromises);
                console.log('所有附件處理成功');
                logger.info('所有附件處理成功');
            } catch (attachmentError) {
                console.error('處理附件時出錯:', attachmentError);
                logger.error(`處理附件時出錯: ${attachmentError.message}`);
                // Continue with the response even if attachments fail
            }
        }
        
        req.flash('success_msg', 'Platform item created successfully');
        res.redirect('/admin/platforms');
    } catch (error) {
        logger.error('創建平台項目時出錯:', error);
        req.flash('error_msg', `無法創建平台項目: ${error.message}`);
        res.redirect('/admin/platforms/create');
    }
};

// Admin: Render edit platform item form
exports.renderEditItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            req.flash('error_msg', 'Platform item ID is required');
            return res.redirect('/admin/platforms');
        }
        
        // Log the ID for debugging
        console.log('平台項目 ID:', id, '類型:', typeof id);
        logger.info(`平台項目 ID: ${id}, 類型: ${typeof id}`);
        
        // Try to parse the ID
        let parsedId;
        try {
            parsedId = parseInt(id, 10);
            console.log('解析後 ID:', parsedId, '類型:', typeof parsedId, '是否為NaN:', isNaN(parsedId));
            logger.info(`解析後 ID: ${parsedId}, 類型: ${typeof parsedId}, 是否為NaN: ${isNaN(parsedId)}`);
        } catch (error) {
            console.error('解析 ID 時出錯:', error);
            logger.error(`解析 ID 時出錯: ${error.message}`);
            req.flash('error_msg', '無效的平台項目 ID 格式');
            return res.redirect('/admin/platforms');
        }
        
        if (isNaN(parsedId)) {
            console.log('ID 不是數字，重定向中');
            logger.warn(`ID 不是數字: ${id}`);
            req.flash('error_msg', '無效的平台項目 ID');
            return res.redirect('/admin/platforms');
        }
        
        // Use findFirst instead of findUnique
        console.log('正在查找 ID 為:', parsedId, '的平台項目');
        logger.info(`正在查找 ID 為: ${parsedId} 的平台項目`);
        
        const item = await prisma.platform.findFirst({
            where: {
                id: parsedId,
                deletedAt: null
            },
            include: {
                attachments: {
                    where: {
                        deletedAt: null
                    },
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        mimeType: true,
                        size: true,
                        path: true,
                        title_en: true,
                        title_tw: true,
                        description_en: true,
                        description_tw: true,
                        attachment_name_en: true,
                        attachment_name_tw: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
        
        if (!item) {
            console.log('平台項目未找到，ID:', parsedId);
            logger.warn(`平台項目未找到，ID: ${parsedId}`);
            req.flash('error_msg', '平台項目未找到');
            return res.redirect('/admin/platforms');
        }
        
        console.log('找到平台項目:', item.id, item.title_en);
        logger.info(`找到平台項目: ${item.id}, ${item.title_en}`);
        
        // Log image path for debugging
        console.log('圖片路徑:', item.imagePath);
        logger.info(`圖片路徑: ${item.imagePath || '無'}`);
        
        // Check if the image file exists
        if (item.imagePath) {
            const imagePath = path.join(__dirname, '../../public', item.imagePath);
            try {
                const exists = fs.existsSync(imagePath);
                console.log('圖片文件存在:', exists, imagePath);
                logger.info(`圖片文件存在: ${exists}, ${imagePath}`);
            } catch (err) {
                console.error('檢查圖片文件是否存在時出錯:', err);
                logger.error(`檢查圖片文件是否存在時出錯: ${err.message}`);
            }
        }
        
        // Log attachments for debugging
        console.log('附件:', item.attachments ? item.attachments.length : 0);
        if (item.attachments && item.attachments.length > 0) {
            console.log('附件詳情:', item.attachments.map(a => ({
                id: a.id,
                filename: a.filename,
                originalName: a.originalName,
                path: a.path,
                size: a.size,
                mimeType: a.mimeType
            })));
        } else {
            console.log('此項目沒有找到附件。檢查附件是否包含在查詢中...');
            console.log('項目對象鍵:', Object.keys(item));
            console.log('項目類型:', item.type);
            
            // If this is an attachment_only type but no attachments were found, query for them directly
            if (item.type === 'attachment_only') {
                console.log('這是一個僅附件類型的項目。直接查詢附件...');
                const attachments = await prisma.platformAttachment.findMany({
                    where: {
                        platformId: parsedId,
                        deletedAt: null
                    },
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        mimeType: true,
                        size: true,
                        path: true,
                        title_en: true,
                        title_tw: true,
                        description_en: true,
                        description_tw: true,
                        attachment_name_en: true,
                        attachment_name_tw: true,
                        createdAt: true,
                        updatedAt: true
                    }
                });
                
                console.log('直接查詢找到的附件:', attachments.length);
                if (attachments.length > 0) {
                    console.log('直接查詢的附件詳情:', attachments.map(a => ({
                        id: a.id,
                        filename: a.filename,
                        originalName: a.originalName
                    })));
                    
                    // Add the attachments to the item
                    item.attachments = attachments;
                }
            }
        }
        logger.info(`附件數量: ${item.attachments ? item.attachments.length : 0}`);
        
        const categories = await prisma.platformCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        // If bullet points, convert JSON array back to newline-separated text
        let displayContentEn = item.content_en;
        let displayContentTw = item.content_tw;
        
        // Parse partnersData if this is a partners type item
        if (item.type === 'partners' && item.partnersData) {
            try {
                const partnersData = JSON.parse(item.partnersData);
                console.log('解析的夥伴數據:', partnersData);
                logger.info(`解析的夥伴數據: ${item.partnersData}`);
                
                // Extract supplier and buyer company lists
                if (partnersData.suppliers) {
                    item.suppliers_en = partnersData.suppliers.companies_en && Array.isArray(partnersData.suppliers.companies_en) 
                        ? partnersData.suppliers.companies_en.join('\n') 
                        : '';
                    
                    item.suppliers_tw = partnersData.suppliers.companies_tw && Array.isArray(partnersData.suppliers.companies_tw) 
                        ? partnersData.suppliers.companies_tw.join('\n') 
                        : '';
                }
                
                if (partnersData.buyers) {
                    item.buyers_en = partnersData.buyers.companies_en && Array.isArray(partnersData.buyers.companies_en) 
                        ? partnersData.buyers.companies_en.join('\n') 
                        : '';
                    
                    item.buyers_tw = partnersData.buyers.companies_tw && Array.isArray(partnersData.buyers.companies_tw) 
                        ? partnersData.buyers.companies_tw.join('\n') 
                        : '';
                }
            } catch (e) {
                console.error('解析夥伴數據時出錯:', e);
                logger.error(`解析夥伴數據時出錯: ${e.message}`);
                
                // Initialize empty fields if parsing fails
                item.suppliers_en = '';
                item.suppliers_tw = '';
                item.buyers_en = '';
                item.buyers_tw = '';
            }
        }
        
        res.render('admin/platforms/edit', {
            title: 'Edit Platform Item',
            item: {
                ...item,
                content_en: displayContentEn,
                content_tw: displayContentTw
            },
            categories
        });
        
        console.log('編輯平台項目表單成功渲染');
        logger.info('編輯平台項目表單成功渲染');
    } catch (error) {
        console.error('渲染編輯平台項目表單時出錯:', error);
        logger.error('渲染編輯平台項目表單時出錯:', error);
        req.flash('error_msg', `無法加載平台項目: ${error.message}`);
        res.redirect('/admin/platforms');
    }
};

// Admin: Update a platform item
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            req.flash('error_msg', 'Platform item ID is required');
            return res.redirect('/admin/platforms');
        }
        
        // Log the ID for debugging
        console.log('更新 - 平台項目 ID:', id, '類型:', typeof id);
        logger.info(`更新 - 平台項目 ID: ${id}, 類型: ${typeof id}`);
        
        // Try to parse the ID
        let parsedId;
        try {
            parsedId = parseInt(id, 10);
            console.log('更新 - 解析後 ID:', parsedId, '類型:', typeof parsedId, '是否為NaN:', isNaN(parsedId));
            logger.info(`更新 - 解析後 ID: ${parsedId}, 類型: ${typeof parsedId}, 是否為NaN: ${isNaN(parsedId)}`);
        } catch (error) {
            console.error('更新 - 解析 ID 時出錯:', error);
            logger.error(`更新 - 解析 ID 時出錯: ${error.message}`);
            req.flash('error_msg', '無效的平台項目 ID 格式');
            return res.redirect('/admin/platforms');
        }
        
        if (isNaN(parsedId)) {
            console.log('更新 - ID 不是數字，重定向中');
            logger.warn(`更新 - ID 不是數字: ${id}`);
            req.flash('error_msg', '無效的平台項目 ID');
            return res.redirect('/admin/platforms');
        }
        
        const { 
            title_en, title_tw, type, content_en, content_tw, 
            order, categoryId, url, publishedDate, removeImage,
            removeAttachments, status, partners_subtype 
        } = req.body;
        
        // Log the status for debugging
        console.log('更新 - 狀態:', status);
        logger.info(`更新 - 狀態: ${status}`);
        
        // Use findFirst instead of findUnique
        console.log('更新 - 正在查找 ID 為:', parsedId, '的平台項目');
        logger.info(`更新 - 正在查找 ID 為: ${parsedId} 的平台項目`);
        
        const existingItem = await prisma.platform.findFirst({
            where: {
                id: parsedId,
                deletedAt: null
            },
            include: {
                attachments: {
                    where: {
                        deletedAt: null
                    },
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        mimeType: true,
                        size: true,
                        path: true,
                        title_en: true,
                        title_tw: true,
                        description_en: true,
                        description_tw: true,
                        attachment_name_en: true,
                        attachment_name_tw: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
        
        if (!existingItem) {
            console.log('更新 - 平台項目未找到，ID:', parsedId);
            logger.warn(`更新 - 平台項目未找到，ID: ${parsedId}`);
            req.flash('error_msg', '平台項目未找到');
            return res.redirect('/admin/platforms');
        }
        
        console.log('更新 - 平台項目已找到:', existingItem.id, existingItem.title_en);
        logger.info(`更新 - 平台項目已找到: ${existingItem.id}, ${existingItem.title_en}`);
        
        // Log existing attachments
        console.log('更新 - 現有附件:', existingItem.attachments ? existingItem.attachments.length : 0);
        if (existingItem.attachments && existingItem.attachments.length > 0) {
            console.log('更新 - 附件詳情:', existingItem.attachments.map(a => ({
                id: a.id,
                filename: a.filename,
                originalName: a.originalName
            })));
        }
        logger.info(`更新 - 現有附件數量: ${existingItem.attachments ? existingItem.attachments.length : 0}`);
        
        // Log request files
        console.log('更新 - 請求文件:', req.files ? Object.keys(req.files) : '無');
        if (req.files && req.files.attachments) {
            console.log('更新 - 請求中的新附件:', req.files.attachments.length);
        }
        logger.info(`更新 - 請求文件: ${req.files ? JSON.stringify(Object.keys(req.files)) : '無'}`);
        
        // Handle image upload or removal
        let imagePath = existingItem.imagePath;
        
        // Log image path for debugging
        console.log('更新 - 當前圖片路徑:', imagePath);
        logger.info(`更新 - 當前圖片路徑: ${imagePath || '無'}`);
        
        if (removeImage === 'true') {
            // Only remove the image if explicitly requested
            if (existingItem.imagePath) {
                const filePath = path.join(__dirname, '../../public', existingItem.imagePath);
                try {
                    await unlinkAsync(filePath);
                    console.log('更新 - 圖片已移除:', existingItem.imagePath);
                    logger.info(`更新 - 圖片已移除: ${existingItem.imagePath}`);
                } catch (err) {
                    console.error('更新 - 刪除圖片文件失敗:', err);
                    logger.error(`更新 - 刪除圖片文件失敗: ${err.message}`);
                }
                imagePath = null;
            }
        }
        
        // Handle new image upload
        if (req.files && req.files.image && req.files.image.length > 0) {
            console.log('更新 - 新圖片已上傳:', req.files.image[0].filename);
            logger.info(`更新 - 新圖片已上傳: ${req.files.image[0].filename}`);
            
            // Delete old image if exists
            if (existingItem.imagePath) {
                const oldFilePath = path.join(__dirname, '../../public', existingItem.imagePath);
                try {
                    await unlinkAsync(oldFilePath);
                    console.log('更新 - 舊圖片已刪除:', existingItem.imagePath);
                    logger.info(`更新 - 舊圖片已刪除: ${existingItem.imagePath}`);
                } catch (err) {
                    console.error('更新 - 刪除舊圖片文件失敗:', err);
                    logger.error(`更新 - 刪除舊圖片文件失敗: ${err.message}`);
                }
            }
            
            // Set new image path
            imagePath = `/uploads/platform/${req.files.image[0].filename}`;
            console.log('更新 - 新圖片路徑:', imagePath);
            logger.info(`更新 - 新圖片路徑: ${imagePath}`);
        }
        
        // Handle attachment removals if specified
        if (removeAttachments) {
            const attachmentIds = Array.isArray(removeAttachments) 
                ? removeAttachments.map(id => parseInt(id))
                : [parseInt(removeAttachments)];
            
            const attachmentsToRemove = existingItem.attachments.filter(att => 
                attachmentIds.includes(att.id)
            );
            
            // Delete attachment files
            for (const attachment of attachmentsToRemove) {
                const filePath = path.join(__dirname, '../../public', attachment.path);
                try {
                    await unlinkAsync(filePath);
                    console.log('更新 - 附件文件已刪除:', attachment.path);
                    logger.info(`更新 - 附件文件已刪除: ${attachment.path}`);
                } catch (err) {
                    console.error('更新 - 刪除附件文件失敗:', err);
                    logger.error(`更新 - 刪除附件文件失敗: ${err.message}`);
                }
            }
            
            // Soft delete attachments from database instead of hard delete
            await prisma.platformAttachment.updateMany({
                where: {
                    id: {
                        in: attachmentIds
                    }
                },
                data: {
                    deletedAt: new Date()
                }
            });
            
            console.log(`更新 - 已在數據庫中軟刪除 ${attachmentIds.length} 個附件`);
            logger.info(`更新 - 已在數據庫中軟刪除 ${attachmentIds.length} 個附件`);
        }
        
        // Update custom attachment names for existing attachments
        if (existingItem.attachments) {
            for (const attachment of existingItem.attachments) {
                // Skip attachments that are being removed
                if (removeAttachments && 
                    (Array.isArray(removeAttachments) 
                        ? removeAttachments.map(id => parseInt(id)).includes(attachment.id)
                        : parseInt(removeAttachments) === attachment.id)) {
                    continue;
                }
                
                const attachmentNameEn = req.body[`attachment_name_en_${attachment.id}`];
                const attachmentNameTw = req.body[`attachment_name_tw_${attachment.id}`];
                
                // Only update if values are provided and different from current values
                if (attachmentNameEn !== undefined || attachmentNameTw !== undefined) {
                    console.log(`更新附件 ${attachment.id} 名稱 - EN: ${attachmentNameEn}, TW: ${attachmentNameTw}`);
                    
                    const updateData = {};
                    if (attachmentNameEn !== undefined) {
                        updateData.attachment_name_en = attachmentNameEn;
                    }
                    if (attachmentNameTw !== undefined) {
                        updateData.attachment_name_tw = attachmentNameTw;
                    }
                    
                    await prisma.platformAttachment.update({
                        where: { id: attachment.id },
                        data: updateData
                    });
                }
            }
        }
        
        // Update the platform item
        // Set default values based on type
        let finalContentEn, finalContentTw, finalCategoryId;
        
        switch(type) {
            case 'attachment_only':
                finalContentEn = '';
                finalContentTw = '';
                finalCategoryId = null;
                break;
            case 'plain_text':
            case 'image_with_caption':
                finalContentEn = content_en || '';
                finalContentTw = content_tw || '';
                finalCategoryId = categoryId ? parseInt(categoryId) : null;
                break;
            case 'partners':
                finalContentEn = '';
                finalContentTw = '';
                finalCategoryId = categoryId ? parseInt(categoryId) : null;
                break;
            default:
                finalContentEn = content_en || '';
                finalContentTw = content_tw || '';
                finalCategoryId = categoryId ? parseInt(categoryId) : null;
        }
        
        // For partners type, handle partners data
        const isPartners = type === 'partners';
        let partnersData = null;
        
        if (isPartners) {
            console.log('更新夥伴類型項目');
            logger.info('更新夥伴類型項目');
            
            // Get supplier and buyer company lists from request
            const suppliers_en = req.body.suppliers_en || '';
            const suppliers_tw = req.body.suppliers_tw || '';
            const buyers_en = req.body.buyers_en || '';
            const buyers_tw = req.body.buyers_tw || '';
            
            console.log('供應商 EN:', suppliers_en);
            console.log('供應商 TW:', suppliers_tw);
            console.log('買家 EN:', buyers_en);
            console.log('買家 TW:', buyers_tw);
            
            logger.info(`供應商 EN: ${suppliers_en}`);
            logger.info(`供應商 TW: ${suppliers_tw}`);
            logger.info(`買家 EN: ${buyers_en}`);
            logger.info(`買家 TW: ${buyers_tw}`);
            
            // Store both supplier and buyer company lists in a JSON field
            partnersData = {
                suppliers: {
                    companies_en: suppliers_en ? suppliers_en.split('\n').filter(line => line.trim() !== '') : [],
                    companies_tw: suppliers_tw ? suppliers_tw.split('\n').filter(line => line.trim() !== '') : []
                },
                buyers: {
                    companies_en: buyers_en ? buyers_en.split('\n').filter(line => line.trim() !== '') : [],
                    companies_tw: buyers_tw ? buyers_tw.split('\n').filter(line => line.trim() !== '') : []
                }
            };
            
            console.log('夥伴數據:', partnersData);
            logger.info(`夥伴數據: ${JSON.stringify(partnersData)}`);
        }
        
        await prisma.platform.update({
            where: { id: parsedId },
            data: {
                title_en,
                title_tw,
                type,
                content_en: finalContentEn,
                content_tw: finalContentTw,
                imagePath,
                url,
                publishedDate: publishedDate ? new Date(publishedDate) : new Date(),
                order: order ? parseInt(order) : 0,
                categoryId: finalCategoryId,
                status: status,
                partnersData: isPartners ? JSON.stringify(partnersData) : null
            }
        });
        
        // Log the updated item to confirm status was updated
        const updatedItem = await prisma.platform.findFirst({
            where: { id: parsedId },
            include: {
                attachments: {
                    where: {
                        deletedAt: null
                    },
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        mimeType: true,
                        size: true,
                        path: true,
                        title_en: true,
                        title_tw: true,
                        description_en: true,
                        description_tw: true,
                        attachment_name_en: true,
                        attachment_name_tw: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
        console.log('更新 - 已更新項目狀態:', updatedItem.status);
        logger.info(`更新 - 已更新項目狀態: ${updatedItem.status}`);
        
        // Handle new attachments if any
        if (req.files && req.files.attachments && req.files.attachments.length > 0) {
            console.log(`更新 - 正在處理 ${req.files.attachments.length} 個新附件`);
            logger.info(`更新 - 正在處理 ${req.files.attachments.length} 個新附件`);
            
            try {
                const attachmentPromises = req.files.attachments.map((file, index) => {
                    console.log(`更新 - 處理附件: ${file.originalname}, 大小: ${file.size}, 類型: ${file.mimetype}`);
                    logger.info(`更新 - 處理附件: ${file.originalname}, 大小: ${file.size}, 類型: ${file.mimetype}`);
                    
                    // Get custom attachment names if provided
                    const attachmentNameEn = req.body[`new_attachment_name_en_${index}`] || null;
                    const attachmentNameTw = req.body[`new_attachment_name_tw_${index}`] || null;
                    
                    console.log(`自定義附件名稱 - EN: ${attachmentNameEn}, TW: ${attachmentNameTw}`);
                    
                    return prisma.platformAttachment.create({
                        data: {
                            filename: file.filename,
                            originalName: file.originalname,
                            mimeType: file.mimetype,
                            size: file.size,
                            path: `/uploads/platform/attachments/${file.filename}`,
                            platformId: parsedId,
                            attachment_name_en: attachmentNameEn,
                            attachment_name_tw: attachmentNameTw
                        }
                    });
                });
                
                await Promise.all(attachmentPromises);
                console.log('更新 - 所有附件處理成功');
                logger.info('更新 - 所有附件處理成功');
            } catch (attachmentError) {
                console.error('更新 - 處理附件時出錯:', attachmentError);
                logger.error(`更新 - 處理附件時出錯: ${attachmentError.message}`);
                // Continue with the response even if attachments fail
            }
        }
        
        req.flash('success_msg', '平台項目更新成功');
        res.redirect('/admin/platforms');
    } catch (error) {
        logger.error('更新平台項目時出錯:', error);
        req.flash('error_msg', `無法更新平台項目: ${error.message}`);
        res.redirect(`/admin/platforms/edit/${req.params.id}`);
    }
};

// Admin: Delete a platform item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            req.flash('error_msg', 'Platform item ID is required');
            return res.redirect('/admin/platforms');
        }
        
        // Log the ID for debugging
        console.log('Delete - Platform item ID:', id, 'Type:', typeof id);
        logger.info(`Delete - Platform item ID: ${id}, Type: ${typeof id}`);
        
        // Try to parse the ID
        let parsedId;
        try {
            parsedId = parseInt(id, 10);
            console.log('Delete - Parsed ID:', parsedId, 'Type:', typeof parsedId, 'isNaN:', isNaN(parsedId));
            logger.info(`Delete - Parsed ID: ${parsedId}, Type: ${typeof parsedId}, isNaN: ${isNaN(parsedId)}`);
        } catch (error) {
            console.error('Delete - Error parsing ID:', error);
            logger.error(`Delete - Error parsing ID: ${error.message}`);
            req.flash('error_msg', 'Invalid platform item ID format');
            return res.redirect('/admin/platforms');
        }
        
        if (isNaN(parsedId)) {
            console.log('Delete - ID is not a number, redirecting');
            logger.warn(`Delete - ID is not a number: ${id}`);
            req.flash('error_msg', 'Invalid platform item ID');
            return res.redirect('/admin/platforms');
        }
        
        // Use findFirst instead of findUnique
        console.log('Delete - Finding platform item with ID:', parsedId);
        logger.info(`Delete - Finding platform item with ID: ${parsedId}`);
        
        const item = await prisma.platform.findFirst({
            where: {
                id: parsedId,
                deletedAt: null
            },
            include: {
                attachments: {
                    where: {
                        deletedAt: null
                    },
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        mimeType: true,
                        size: true,
                        path: true,
                        title_en: true,
                        title_tw: true,
                        description_en: true,
                        description_tw: true,
                        attachment_name_en: true,
                        attachment_name_tw: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
        
        if (!item) {
            console.log('Delete - Platform item not found with ID:', parsedId);
            logger.warn(`Delete - Platform item not found with ID: ${parsedId}`);
            req.flash('error_msg', 'Platform item not found');
            return res.redirect('/admin/platforms');
        }
        
        console.log('Delete - Platform item found:', item.id, item.title_en);
        logger.info(`Delete - Platform item found: ${item.id}, ${item.title_en}`);
        
        // Delete image file if exists
        if (item.imagePath) {
            const imagePath = path.join(__dirname, '../../public', item.imagePath);
            try {
                await unlinkAsync(imagePath);
                console.log('Delete - Image file deleted:', imagePath);
                logger.info(`Delete - Image file deleted: ${imagePath}`);
            } catch (err) {
                console.error('Delete - Failed to delete image file:', err);
                logger.error(`Delete - Failed to delete image file: ${err.message}`);
            }
        }
        
        // Delete attachment files
        let deletedAttachments = 0;
        let failedAttachments = 0;
        
        for (const attachment of item.attachments) {
            const filePath = path.join(__dirname, '../../public', attachment.path);
            try {
                await unlinkAsync(filePath);
                deletedAttachments++;
                console.log('Delete - Attachment file deleted:', filePath);
                logger.info(`Delete - Attachment file deleted: ${filePath}`);
            } catch (err) {
                failedAttachments++;
                console.error('Delete - Failed to delete attachment file:', err);
                logger.error(`Delete - Failed to delete attachment file: ${err.message}`);
            }
        }
        
        console.log(`Delete - Deleted ${deletedAttachments} attachment files, failed to delete ${failedAttachments} attachment files`);
        logger.info(`Delete - Deleted ${deletedAttachments} attachment files, failed to delete ${failedAttachments} attachment files`);
        
        // Begin a transaction to ensure both platform and attachments are deleted together
        await prisma.$transaction(async (prisma) => {
            // Soft delete the attachments first
            if (item.attachments && item.attachments.length > 0) {
                const attachmentIds = item.attachments.map(att => att.id);
                
                await prisma.platformAttachment.updateMany({
                    where: { 
                        id: { 
                            in: attachmentIds 
                        } 
                    },
                    data: {
                        deletedAt: new Date()
                    }
                });
                
                console.log(`Delete - Soft deleted ${attachmentIds.length} attachments in database`);
                logger.info(`Delete - Soft deleted ${attachmentIds.length} attachments in database`);
            }
            
            // Soft delete the platform item
            await prisma.platform.update({
                where: { id: parsedId },
                data: {
                    deletedAt: new Date()
                }
            });
            
            console.log(`Delete - Soft deleted platform item ${parsedId} in database`);
            logger.info(`Delete - Soft deleted platform item ${parsedId} in database`);
        });
        
        req.flash('success_msg', 'Platform item deleted successfully');
        res.redirect('/admin/platforms');
    } catch (error) {
        console.error('Delete - Error deleting platform item:', error);
        logger.error('Error deleting platform item:', error);
        req.flash('error_msg', `Failed to delete platform item: ${error.message}`);
        res.redirect('/admin/platforms');
    }
};

// Frontend: Display platform page
exports.showPlatformPage = async (req, res) => {
    try {
        // Get language from URL path parameter first, then from req.language, default to 'tw'
        const language = req.params.language || req.language || 'tw';
        
        console.log('平台頁面語言:', language);
        logger.info(`平台頁面語言: ${language}`);
        
        const pageTitle = language === 'tw' ? '製造平台' : 'Manufacturing Platform';
        
        // Fetch navigation pages for the layout
        const navigationPages = await prisma.page.findMany({
            where: {
                status: 'published',
                showInNavigation: true
            },
            orderBy: {
                navigationOrder: 'asc'
            }
        });
        
        const platforms = await prisma.platform.findMany({
            where: {
                deletedAt: null,
                status: 'published'
            },
            orderBy: [
                {
                    categoryId: 'asc'
                },
                {
                    order: 'asc'
                }
            ],
            include: {
                category: true,
                attachments: {
                    where: {
                        deletedAt: null
                    },
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        mimeType: true,
                        size: true,
                        path: true,
                        title_en: true,
                        title_tw: true,
                        description_en: true,
                        description_tw: true,
                        attachment_name_en: true,
                        attachment_name_tw: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
        
        // Log platform types and attachment counts for debugging
        console.log('前端平台項目:', platforms.map(item => ({
            id: item.id,
            title: item.title_en,
            type: item.type,
            categoryId: item.categoryId,
            attachmentsCount: item.attachments ? item.attachments.length : 0
        })));
        
        // Check specifically for attachment_only type items
        const attachmentOnlyItems = platforms.filter(p => p.type === 'attachment_only');
        console.log(`找到 ${attachmentOnlyItems.length} 個僅附件類型項目:`, 
            attachmentOnlyItems.map(item => ({
                id: item.id,
                title: item.title_en,
                categoryId: item.categoryId,
                attachmentsCount: item.attachments ? item.attachments.length : 0
            }))
        );
        
        // Check for uncategorized items
        const uncategorizedItems = platforms.filter(p => p.categoryId === null);
        console.log(`找到 ${uncategorizedItems.length} 個未分類項目:`, 
            uncategorizedItems.map(item => ({
                id: item.id,
                title: item.title_en,
                type: item.type,
                attachmentsCount: item.attachments ? item.attachments.length : 0
            }))
        );
        
        // Process partners data for each platform item
        platforms.forEach(platform => {
            if (platform.type === 'partners' && platform.partnersData) {
                try {
                    // Keep the original JSON string for the template
                    platform.parsedPartnersData = JSON.parse(platform.partnersData);
                } catch (error) {
                    console.error('Error parsing partners data:', error);
                    logger.error(`Error parsing partners data for platform ${platform.id}: ${error.message}`);
                    platform.parsedPartnersData = { 
                        suppliers: {
                            companies_en: [],
                            companies_tw: []
                        },
                        buyers: {
                            companies_en: [],
                            companies_tw: []
                        }
                    };
                }
            }
        });
        
        const categories = await prisma.platformCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        // Group platforms by category
        const platformsByCategory = categories.map(category => ({
            ...category,
            platforms: platforms.filter(p => p.categoryId === category.id)
        }));
        
        // Add a section for uncategorized items if there are any
        if (uncategorizedItems.length > 0) {
            platformsByCategory.push({
                id: 0,
                name_en: 'Uncategorized',
                name_tw: '未分類',
                platforms: uncategorizedItems
            });
        }
        
        res.render('frontend/platform', {
            title: pageTitle,
            platformsByCategory,
            navigationPages,
            currentLanguage: language
        });
    } catch (error) {
        const language = req.params.language || req.language || 'tw';
        logger.error('Error displaying platform page:', error);
        res.status(500).render('error', {
            message: language === 'tw' ? '載入平台頁面失敗' : 'Error loading platform page',
            error,
            navigationPages: [],
            currentLanguage: language
        });
    }
};

// Admin: Platform Categories
exports.listCategories = async (req, res) => {
    try {
        const categories = await prisma.platformCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            },
            include: {
                platforms: {
                    where: {
                        deletedAt: null
                    }
                }
            }
        });

        res.render('admin/platforms/categories', {
            title: 'Platform Categories',
            categories
        });
    } catch (error) {
        logger.error('Error listing platform categories:', error);
        req.flash('error_msg', `Failed to load platform categories: ${error.message}`);
        res.redirect('/admin/platforms');
    }
};

// Admin: Render create platform category form
exports.renderCreateCategory = (req, res) => {
    try {
        res.render('admin/platforms/categories/create', {
            title: 'Create Platform Category'
        });
    } catch (error) {
        logger.error('Error rendering create platform category form:', error);
        req.flash('error_msg', `Failed to load form: ${error.message}`);
        res.redirect('/admin/platforms/categories');
    }
};

// Admin: Create a new platform category
exports.createCategory = async (req, res) => {
    try {
        const { name_en, name_tw, description_en, description_tw, order } = req.body;

        // Generate slug from English name
        const slug = name_en
            ? name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            : `category-${Date.now()}`;

        // Create the category
        await prisma.platformCategory.create({
            data: {
                name_en,
                name_tw,
                description_en,
                description_tw,
                slug,
                order: order ? parseInt(order, 10) : 0
            }
        });

        req.flash('success_msg', 'Platform category created successfully');
        res.redirect('/admin/platforms/categories');
    } catch (error) {
        logger.error('Error creating platform category:', error);
        req.flash('error_msg', `Failed to create category: ${error.message}`);
        res.redirect('/admin/platforms/categories');
    }
};

// Admin: Render edit platform category form
exports.renderEditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            req.flash('error_msg', 'Category ID is required');
            return res.redirect('/admin/platforms/categories');
        }

        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId)) {
            req.flash('error_msg', 'Invalid category ID');
            return res.redirect('/admin/platforms/categories');
        }

        const category = await prisma.platformCategory.findFirst({
            where: {
                id: parsedId,
                deletedAt: null
            }
        });

        if (!category) {
            req.flash('error_msg', 'Platform category not found');
            return res.redirect('/admin/platforms/categories');
        }

        res.render('admin/platforms/categories/edit', {
            title: 'Edit Platform Category',
            category
        });
    } catch (error) {
        logger.error('Error rendering edit platform category form:', error);
        req.flash('error_msg', `Failed to load category: ${error.message}`);
        res.redirect('/admin/platforms/categories');
    }
};

// Admin: Update a platform category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            req.flash('error_msg', 'Category ID is required');
            return res.redirect('/admin/platforms/categories');
        }

        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId)) {
            req.flash('error_msg', 'Invalid category ID');
            return res.redirect('/admin/platforms/categories');
        }

        const { name_en, name_tw, description_en, description_tw, order } = req.body;

        // Check if category exists
        const existingCategory = await prisma.platformCategory.findFirst({
            where: {
                id: parsedId,
                deletedAt: null
            }
        });

        if (!existingCategory) {
            req.flash('error_msg', 'Platform category not found');
            return res.redirect('/admin/platforms/categories');
        }

        // Update the category
        await prisma.platformCategory.update({
            where: { id: parsedId },
            data: {
                name_en,
                name_tw,
                description_en,
                description_tw,
                order: order ? parseInt(order, 10) : 0
            }
        });

        req.flash('success_msg', 'Platform category updated successfully');
        res.redirect('/admin/platforms/categories');
    } catch (error) {
        logger.error('Error updating platform category:', error);
        req.flash('error_msg', `Failed to update category: ${error.message}`);
        res.redirect('/admin/platforms/categories');
    }
};

// Admin: Delete a platform category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            req.flash('error_msg', 'Category ID is required');
            return res.redirect('/admin/platforms/categories');
        }

        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId)) {
            req.flash('error_msg', 'Invalid category ID');
            return res.redirect('/admin/platforms/categories');
        }

        // Check if category has any platforms
        const category = await prisma.platformCategory.findFirst({
            where: {
                id: parsedId,
                deletedAt: null
            },
            include: {
                platforms: {
                    where: {
                        deletedAt: null
                    }
                }
            }
        });

        if (!category) {
            req.flash('error_msg', 'Platform category not found');
            return res.redirect('/admin/platforms/categories');
        }

        if (category.platforms.length > 0) {
            req.flash('error_msg', 'Cannot delete category with existing platforms');
            return res.redirect('/admin/platforms/categories');
        }

        // Soft delete the category
        await prisma.platformCategory.update({
            where: { id: parsedId },
            data: {
                deletedAt: new Date()
            }
        });

        req.flash('success_msg', 'Platform category deleted successfully');
        res.redirect('/admin/platforms/categories');
    } catch (error) {
        logger.error('Error deleting platform category:', error);
        req.flash('error_msg', `Failed to delete category: ${error.message}`);
        res.redirect('/admin/platforms/categories');
    }
};

// Admin: Upload attachments (standalone)
exports.uploadAttachment = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files were uploaded'
            });
        }
        
        const attachments = [];
        
        // Process each uploaded file
        for (const file of req.files) {
            console.log(`Processing standalone attachment: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
            logger.info(`Processing standalone attachment: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
            
            // Create attachment record in database
            const attachment = await prisma.platformAttachment.create({
                data: {
                    filename: file.filename,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    path: `/uploads/platform/attachments/${file.filename}`,
                    // No platformId since this is a standalone upload
                }
            });
            
            attachments.push({
                id: attachment.id,
                filename: attachment.filename,
                originalName: attachment.originalName,
                path: attachment.path,
                url: attachment.path
            });
        }
        
        return res.status(200).json({
            success: true,
            message: `${attachments.length} files uploaded successfully`,
            attachments
        });
    } catch (error) {
        console.error('Error uploading attachments:', error);
        logger.error(`Error uploading attachments: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: `Failed to upload attachments: ${error.message}`
        });
    }
};

// API: Get platform item by ID for embedding
exports.getPlatformItemById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Platform item ID is required' 
            });
        }
        
        // Parse the ID
        let parsedId;
        try {
            parsedId = parseInt(id, 10);
        } catch (error) {
            logger.error(`Error parsing platform ID: ${error.message}`);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid platform item ID format' 
            });
        }
        
        if (isNaN(parsedId)) {
            logger.warn(`Invalid platform ID: ${id}`);
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid platform item ID' 
            });
        }
        
        // Find the platform item
        const item = await prisma.platform.findFirst({
            where: {
                id: parsedId,
                deletedAt: null,
                status: 'published'
            },
            include: {
                category: {
                    select: {
                        name_en: true,
                        name_tw: true
                    }
                },
                attachments: {
                    where: {
                        deletedAt: null
                    },
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        mimeType: true,
                        size: true,
                        path: true,
                        title_en: true,
                        title_tw: true,
                        description_en: true,
                        description_tw: true,
                        attachment_name_en: true,
                        attachment_name_tw: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
        
        if (!item) {
            logger.warn(`Platform item not found with ID: ${parsedId}`);
            return res.status(404).json({ 
                success: false, 
                message: 'Platform item not found' 
            });
        }
        
        // Return the platform item
        return res.json({
            success: true,
            data: item
        });
    } catch (error) {
        logger.error('Error getting platform item by ID:', error);
        return res.status(500).json({ 
            success: false, 
            message: `Failed to get platform item: ${error.message}` 
        });
    }
};