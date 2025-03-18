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
                    }
                }
            }
        });
        
        // Log item types for debugging
        console.log('Platform items types:', items.map(item => ({
            id: item.id,
            title: item.title_en,
            type: item.type
        })));
        logger.info(`Platform items count: ${items.length}`);
        
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
        logger.error('Error listing platform items:', error);
        req.flash('error_msg', `Failed to load platform items: ${error.message}`);
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
        logger.error('Error loading categories:', error);
        req.flash('error_msg', `Failed to load categories: ${error.message}`);
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
            console.log('Image uploaded:', req.files.image[0].filename);
            console.log('Image path:', imagePath);
            logger.info(`Image uploaded: ${req.files.image[0].filename}`);
            logger.info(`Image path: ${imagePath}`);
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
        console.log('Generated slug:', slug);
        logger.info(`Generated slug: ${slug}`);
        
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
            console.log('Creating a partners type item');
            logger.info('Creating a partners type item');
            
            // Get supplier and buyer company lists from request
            const suppliers_en = req.body.suppliers_en || '';
            const suppliers_tw = req.body.suppliers_tw || '';
            const buyers_en = req.body.buyers_en || '';
            const buyers_tw = req.body.buyers_tw || '';
            
            console.log('Suppliers EN:', suppliers_en);
            console.log('Suppliers TW:', suppliers_tw);
            console.log('Buyers EN:', buyers_en);
            console.log('Buyers TW:', buyers_tw);
            
            logger.info(`Suppliers EN: ${suppliers_en}`);
            logger.info(`Suppliers TW: ${suppliers_tw}`);
            logger.info(`Buyers EN: ${buyers_en}`);
            logger.info(`Buyers TW: ${buyers_tw}`);
            
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
            
            console.log('Partners data:', partnersData);
            logger.info(`Partners data: ${JSON.stringify(partnersData)}`);
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
            console.log(`Processing ${req.files.attachments.length} attachments`);
            logger.info(`Processing ${req.files.attachments.length} attachments`);
            
            try {
                const attachmentPromises = req.files.attachments.map(file => {
                    console.log(`Processing attachment: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
                    logger.info(`Processing attachment: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
                    
                    return prisma.platformAttachment.create({
                        data: {
                            filename: file.filename,
                            originalName: file.originalname,
                            mimeType: file.mimetype,
                            size: file.size,
                            path: `/uploads/platform/attachments/${file.filename}`,
                            platformId: platform.id
                        }
                    });
                });
                
                await Promise.all(attachmentPromises);
                console.log('All attachments processed successfully');
                logger.info('All attachments processed successfully');
            } catch (attachmentError) {
                console.error('Error processing attachments:', attachmentError);
                logger.error(`Error processing attachments: ${attachmentError.message}`);
                // Continue with the response even if attachments fail
            }
        }
        
        req.flash('success_msg', 'Platform item created successfully');
        res.redirect('/admin/platforms');
    } catch (error) {
        logger.error('Error creating platform item:', error);
        req.flash('error_msg', `Failed to create platform item: ${error.message}`);
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
        console.log('Platform item ID:', id, 'Type:', typeof id);
        logger.info(`Platform item ID: ${id}, Type: ${typeof id}`);
        
        // Try to parse the ID
        let parsedId;
        try {
            parsedId = parseInt(id, 10);
            console.log('Parsed ID:', parsedId, 'Type:', typeof parsedId, 'isNaN:', isNaN(parsedId));
            logger.info(`Parsed ID: ${parsedId}, Type: ${typeof parsedId}, isNaN: ${isNaN(parsedId)}`);
        } catch (error) {
            console.error('Error parsing ID:', error);
            logger.error(`Error parsing ID: ${error.message}`);
            req.flash('error_msg', 'Invalid platform item ID format');
            return res.redirect('/admin/platforms');
        }
        
        if (isNaN(parsedId)) {
            console.log('ID is not a number, redirecting');
            logger.warn(`ID is not a number: ${id}`);
            req.flash('error_msg', 'Invalid platform item ID');
            return res.redirect('/admin/platforms');
        }
        
        // Use findFirst instead of findUnique
        console.log('Finding platform item with ID:', parsedId);
        logger.info(`Finding platform item with ID: ${parsedId}`);
        
        const item = await prisma.platform.findFirst({
            where: {
                id: parsedId,
                deletedAt: null
            },
            include: {
                attachments: {
                    where: {
                        deletedAt: null
                    }
                }
            }
        });
        
        if (!item) {
            console.log('Platform item not found with ID:', parsedId);
            logger.warn(`Platform item not found with ID: ${parsedId}`);
            req.flash('error_msg', 'Platform item not found');
            return res.redirect('/admin/platforms');
        }
        
        console.log('Platform item found:', item.id, item.title_en);
        logger.info(`Platform item found: ${item.id}, ${item.title_en}`);
        
        // Log image path for debugging
        console.log('Image path:', item.imagePath);
        logger.info(`Image path: ${item.imagePath || 'none'}`);
        
        // Check if the image file exists
        if (item.imagePath) {
            const imagePath = path.join(__dirname, '../../public', item.imagePath);
            try {
                const exists = fs.existsSync(imagePath);
                console.log('Image file exists:', exists, imagePath);
                logger.info(`Image file exists: ${exists}, ${imagePath}`);
            } catch (err) {
                console.error('Error checking if image file exists:', err);
                logger.error(`Error checking if image file exists: ${err.message}`);
            }
        }
        
        // Log attachments for debugging
        console.log('Attachments:', item.attachments ? item.attachments.length : 0);
        if (item.attachments && item.attachments.length > 0) {
            console.log('Attachment details:', item.attachments.map(a => ({
                id: a.id,
                filename: a.filename,
                originalName: a.originalName,
                path: a.path,
                size: a.size,
                mimeType: a.mimeType
            })));
        } else {
            console.log('No attachments found for this item. Checking if attachments were included in the query...');
            console.log('Item object keys:', Object.keys(item));
            console.log('Item type:', item.type);
            
            // If this is an attachment_only type but no attachments were found, query for them directly
            if (item.type === 'attachment_only') {
                console.log('This is an attachment_only item. Querying for attachments directly...');
                const attachments = await prisma.platformAttachment.findMany({
                    where: {
                        platformId: parsedId,
                        deletedAt: null
                    }
                });
                
                console.log('Direct query found attachments:', attachments.length);
                if (attachments.length > 0) {
                    console.log('Attachment details from direct query:', attachments.map(a => ({
                        id: a.id,
                        filename: a.filename,
                        originalName: a.originalName
                    })));
                    
                    // Add the attachments to the item
                    item.attachments = attachments;
                }
            }
        }
        logger.info(`Attachments count: ${item.attachments ? item.attachments.length : 0}`);
        
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
                console.log('Parsed partners data:', partnersData);
                logger.info(`Parsed partners data: ${item.partnersData}`);
                
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
                console.error('Error parsing partners data:', e);
                logger.error(`Error parsing partners data: ${e.message}`);
                
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
        
        console.log('Edit platform item form rendered successfully');
        logger.info('Edit platform item form rendered successfully');
    } catch (error) {
        console.error('Error rendering edit platform item form:', error);
        logger.error('Error rendering edit platform item form:', error);
        req.flash('error_msg', `Failed to load platform item: ${error.message}`);
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
        console.log('Update - Platform item ID:', id, 'Type:', typeof id);
        logger.info(`Update - Platform item ID: ${id}, Type: ${typeof id}`);
        
        // Try to parse the ID
        let parsedId;
        try {
            parsedId = parseInt(id, 10);
            console.log('Update - Parsed ID:', parsedId, 'Type:', typeof parsedId, 'isNaN:', isNaN(parsedId));
            logger.info(`Update - Parsed ID: ${parsedId}, Type: ${typeof parsedId}, isNaN: ${isNaN(parsedId)}`);
        } catch (error) {
            console.error('Update - Error parsing ID:', error);
            logger.error(`Update - Error parsing ID: ${error.message}`);
            req.flash('error_msg', 'Invalid platform item ID format');
            return res.redirect('/admin/platforms');
        }
        
        if (isNaN(parsedId)) {
            console.log('Update - ID is not a number, redirecting');
            logger.warn(`Update - ID is not a number: ${id}`);
            req.flash('error_msg', 'Invalid platform item ID');
            return res.redirect('/admin/platforms');
        }
        
        const { 
            title_en, title_tw, type, content_en, content_tw, 
            order, categoryId, url, publishedDate, removeImage,
            removeAttachments, status, partners_subtype 
        } = req.body;
        
        // Log the status for debugging
        console.log('Update - Status:', status);
        logger.info(`Update - Status: ${status}`);
        
        // Use findFirst instead of findUnique
        console.log('Update - Finding platform item with ID:', parsedId);
        logger.info(`Update - Finding platform item with ID: ${parsedId}`);
        
        const existingItem = await prisma.platform.findFirst({
            where: {
                id: parsedId,
                deletedAt: null
            },
            include: {
                attachments: {
                    where: {
                        deletedAt: null
                    }
                }
            }
        });
        
        if (!existingItem) {
            console.log('Update - Platform item not found with ID:', parsedId);
            logger.warn(`Update - Platform item not found with ID: ${parsedId}`);
            req.flash('error_msg', 'Platform item not found');
            return res.redirect('/admin/platforms');
        }
        
        console.log('Update - Platform item found:', existingItem.id, existingItem.title_en);
        logger.info(`Update - Platform item found: ${existingItem.id}, ${existingItem.title_en}`);
        
        // Log existing attachments
        console.log('Update - Existing attachments:', existingItem.attachments ? existingItem.attachments.length : 0);
        if (existingItem.attachments && existingItem.attachments.length > 0) {
            console.log('Update - Attachment details:', existingItem.attachments.map(a => ({
                id: a.id,
                filename: a.filename,
                originalName: a.originalName
            })));
        }
        logger.info(`Update - Existing attachments count: ${existingItem.attachments ? existingItem.attachments.length : 0}`);
        
        // Log request files
        console.log('Update - Request files:', req.files ? Object.keys(req.files) : 'none');
        if (req.files && req.files.attachments) {
            console.log('Update - New attachments in request:', req.files.attachments.length);
        }
        logger.info(`Update - Request files: ${req.files ? JSON.stringify(Object.keys(req.files)) : 'none'}`);
        
        // Handle image upload or removal
        let imagePath = existingItem.imagePath;
        
        // Log image path for debugging
        console.log('Update - Current image path:', imagePath);
        logger.info(`Update - Current image path: ${imagePath || 'none'}`);
        
        if (removeImage === 'true') {
            // Only remove the image if explicitly requested
            if (existingItem.imagePath) {
                const filePath = path.join(__dirname, '../../public', existingItem.imagePath);
                try {
                    await unlinkAsync(filePath);
                    console.log('Update - Image removed:', existingItem.imagePath);
                    logger.info(`Update - Image removed: ${existingItem.imagePath}`);
                } catch (err) {
                    console.error('Update - Failed to delete image file:', err);
                    logger.error(`Update - Failed to delete image file: ${err.message}`);
                }
                imagePath = null;
            }
        }
        
        // Handle new image upload
        if (req.files && req.files.image && req.files.image.length > 0) {
            console.log('Update - New image uploaded:', req.files.image[0].filename);
            logger.info(`Update - New image uploaded: ${req.files.image[0].filename}`);
            
            // Delete old image if exists
            if (existingItem.imagePath) {
                const oldFilePath = path.join(__dirname, '../../public', existingItem.imagePath);
                try {
                    await unlinkAsync(oldFilePath);
                    console.log('Update - Old image deleted:', existingItem.imagePath);
                    logger.info(`Update - Old image deleted: ${existingItem.imagePath}`);
                } catch (err) {
                    console.error('Update - Failed to delete old image file:', err);
                    logger.error(`Update - Failed to delete old image file: ${err.message}`);
                }
            }
            
            // Set new image path
            imagePath = `/uploads/platform/${req.files.image[0].filename}`;
            console.log('Update - New image path:', imagePath);
            logger.info(`Update - New image path: ${imagePath}`);
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
                    console.log('Update - Attachment file deleted:', attachment.path);
                    logger.info(`Update - Attachment file deleted: ${attachment.path}`);
                } catch (err) {
                    console.error('Update - Failed to delete attachment file:', err);
                    logger.error(`Update - Failed to delete attachment file: ${err.message}`);
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
            
            console.log(`Update - Soft deleted ${attachmentIds.length} attachments in database`);
            logger.info(`Update - Soft deleted ${attachmentIds.length} attachments in database`);
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
            console.log('Updating a partners type item');
            logger.info('Updating a partners type item');
            
            // Get supplier and buyer company lists from request
            const suppliers_en = req.body.suppliers_en || '';
            const suppliers_tw = req.body.suppliers_tw || '';
            const buyers_en = req.body.buyers_en || '';
            const buyers_tw = req.body.buyers_tw || '';
            
            console.log('Suppliers EN:', suppliers_en);
            console.log('Suppliers TW:', suppliers_tw);
            console.log('Buyers EN:', buyers_en);
            console.log('Buyers TW:', buyers_tw);
            
            logger.info(`Suppliers EN: ${suppliers_en}`);
            logger.info(`Suppliers TW: ${suppliers_tw}`);
            logger.info(`Buyers EN: ${buyers_en}`);
            logger.info(`Buyers TW: ${buyers_tw}`);
            
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
            
            console.log('Partners data:', partnersData);
            logger.info(`Partners data: ${JSON.stringify(partnersData)}`);
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
                    }
                }
            }
        });
        console.log('Update - Updated item status:', updatedItem.status);
        logger.info(`Update - Updated item status: ${updatedItem.status}`);
        
        // Handle new attachments if any
        if (req.files && req.files.attachments && req.files.attachments.length > 0) {
            console.log(`Update - Processing ${req.files.attachments.length} new attachments`);
            logger.info(`Update - Processing ${req.files.attachments.length} new attachments`);
            
            try {
                const attachmentPromises = req.files.attachments.map(file => {
                    console.log(`Update - Processing attachment: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
                    logger.info(`Update - Processing attachment: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
                    
                    return prisma.platformAttachment.create({
                        data: {
                            filename: file.filename,
                            originalName: file.originalname,
                            mimeType: file.mimetype,
                            size: file.size,
                            path: `/uploads/platform/attachments/${file.filename}`,
                            platformId: parsedId
                        }
                    });
                });
                
                await Promise.all(attachmentPromises);
                console.log('Update - All attachments processed successfully');
                logger.info('Update - All attachments processed successfully');
            } catch (attachmentError) {
                console.error('Update - Error processing attachments:', attachmentError);
                logger.error(`Update - Error processing attachments: ${attachmentError.message}`);
                // Continue with the response even if attachments fail
            }
        }
        
        req.flash('success_msg', 'Platform item updated successfully');
        res.redirect('/admin/platforms');
    } catch (error) {
        logger.error('Error updating platform item:', error);
        req.flash('error_msg', `Failed to update platform item: ${error.message}`);
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
        
        console.log('Platform page language:', language);
        logger.info(`Platform page language: ${language}`);
        
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
                    }
                }
            }
        });
        
        // Log platform types and attachment counts for debugging
        console.log('Platform items for frontend:', platforms.map(item => ({
            id: item.id,
            title: item.title_en,
            type: item.type,
            categoryId: item.categoryId,
            attachmentsCount: item.attachments ? item.attachments.length : 0
        })));
        
        // Check specifically for attachment_only type items
        const attachmentOnlyItems = platforms.filter(p => p.type === 'attachment_only');
        console.log(`Found ${attachmentOnlyItems.length} attachment_only items:`, 
            attachmentOnlyItems.map(item => ({
                id: item.id,
                title: item.title_en,
                categoryId: item.categoryId,
                attachmentsCount: item.attachments ? item.attachments.length : 0
            }))
        );
        
        // Check for uncategorized items
        const uncategorizedItems = platforms.filter(p => p.categoryId === null);
        console.log(`Found ${uncategorizedItems.length} uncategorized items:`, 
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