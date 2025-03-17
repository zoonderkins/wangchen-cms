const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const multer = require('multer');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../public/uploads/about');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let suffix = '';
        
        // Add appropriate suffix based on field name
        if (file.fieldname === 'imageDesktop') {
            suffix = '-desktop';
        } else if (file.fieldname === 'imageTablet') {
            suffix = '-tablet';
        } else if (file.fieldname === 'imageMobile') {
            suffix = '-mobile';
        }
        
        cb(null, 'about-' + uniqueSuffix + suffix + path.extname(file.originalname));
    }
});

exports.upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB limit for uploaded files
        fieldSize: 100 * 1024 * 1024 // 100MB limit for form fields (for base64 encoded images in Quill editor)
    },
    fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
}).fields([
    { name: 'imageDesktop', maxCount: 1 },
    { name: 'imageTablet', maxCount: 1 },
    { name: 'imageMobile', maxCount: 1 }
]);

// Admin: List all about items
exports.listItems = async (req, res) => {
    try {
        const items = await prisma.aboutItem.findMany({
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
                }
            }
        });
        
        res.render('admin/about/index', {
            title: 'About Page Items',
            items
        });
    } catch (error) {
        logger.error('Error listing about items:', error);
        req.flash('error_msg', `Failed to load about items: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
};

// Admin: Render create about item form
exports.renderCreateItem = (req, res) => {
    res.render('admin/about/create', {
        title: 'Create About Item'
    });
};

// Admin: Create a new about item
exports.createItem = async (req, res) => {
    try {
        const { title_en, title_tw, type, content_en, content_tw, order } = req.body;
        
        // Process content based on type
        let processedContentEn = content_en;
        let processedContentTw = content_tw;
        
        // Check content length and truncate if necessary
        // MySQL LONGTEXT can store up to 4GB, but we'll use a more reasonable limit
        const MAX_CONTENT_LENGTH = 100 * 1024 * 1024; // 100MB limit to match Multer fieldSize limit
        
        if (processedContentEn && processedContentEn.length > MAX_CONTENT_LENGTH) {
            logger.warn(`Content_en for "${title_en}" was truncated from ${processedContentEn.length} to ${MAX_CONTENT_LENGTH} bytes`);
            processedContentEn = processedContentEn.substring(0, MAX_CONTENT_LENGTH);
        }
        
        if (processedContentTw && processedContentTw.length > MAX_CONTENT_LENGTH) {
            logger.warn(`Content_tw for "${title_tw}" was truncated from ${processedContentTw.length} to ${MAX_CONTENT_LENGTH} bytes`);
            processedContentTw = processedContentTw.substring(0, MAX_CONTENT_LENGTH);
        }
        
        // Handle image uploads
        let imagePath = null;
        let imagePathDesktop = null;
        let imagePathTablet = null;
        let imagePathMobile = null;
        
        if (req.files && type === 'image') {
            // Handle desktop image
            if (req.files.imageDesktop && req.files.imageDesktop.length > 0) {
                imagePathDesktop = `/uploads/about/${req.files.imageDesktop[0].filename}`;
                // Set the main image path to desktop image if available
                imagePath = imagePathDesktop;
            }
            
            // Handle tablet image
            if (req.files.imageTablet && req.files.imageTablet.length > 0) {
                imagePathTablet = `/uploads/about/${req.files.imageTablet[0].filename}`;
                // If no desktop image, use tablet as main image
                if (!imagePath) imagePath = imagePathTablet;
            }
            
            // Handle mobile image
            if (req.files.imageMobile && req.files.imageMobile.length > 0) {
                imagePathMobile = `/uploads/about/${req.files.imageMobile[0].filename}`;
                // If no desktop or tablet image, use mobile as main image
                if (!imagePath) imagePath = imagePathMobile;
            }
        }
        
        // Create the about item
        await prisma.aboutItem.create({
            data: {
                title_en,
                title_tw,
                type,
                content_en: processedContentEn,
                content_tw: processedContentTw,
                imagePath,
                imagePathDesktop,
                imagePathTablet,
                imagePathMobile,
                order: order ? parseInt(order) : 0,
                authorId: req.session.user.id
            }
        });
        
        req.flash('success_msg', 'About item created successfully');
        res.redirect('/admin/about');
    } catch (error) {
        logger.error('Error creating about item:', error);
        req.flash('error_msg', `Failed to create about item: ${error.message}`);
        res.redirect('/admin/about/create');
    }
};

// Admin: Render edit about item form
exports.renderEditItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        const item = await prisma.aboutItem.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!item) {
            req.flash('error_msg', 'About item not found');
            return res.redirect('/admin/about');
        }
        
        // Process content for Quill.js
        let processedItem = { ...item };
        
        // For bullet points, ensure content is valid JSON
        if (item.type === 'bullet_points') {
            try {
                // If content is already a string, make sure it's valid JSON
                if (typeof item.content_en === 'string') {
                    // Try to parse and re-stringify to ensure valid JSON
                    const parsedEn = JSON.parse(item.content_en);
                    processedItem.content_en = JSON.stringify(parsedEn);
                } else {
                    // If it's an object, stringify it
                    processedItem.content_en = JSON.stringify(item.content_en);
                }
                
                if (typeof item.content_tw === 'string') {
                    const parsedTw = JSON.parse(item.content_tw);
                    processedItem.content_tw = JSON.stringify(parsedTw);
                } else {
                    processedItem.content_tw = JSON.stringify(item.content_tw);
                }
            } catch (e) {
                logger.error('Error processing bullet points for edit:', e);
                // Provide empty valid JSON if parsing fails
                processedItem.content_en = JSON.stringify({ ops: [] });
                processedItem.content_tw = JSON.stringify({ ops: [] });
            }
        }
        
        res.render('admin/about/edit', {
            title: 'Edit About Item',
            item: processedItem
        });
    } catch (error) {
        logger.error('Error rendering edit about item form:', error);
        req.flash('error_msg', `Failed to load about item: ${error.message}`);
        res.redirect('/admin/about');
    }
};

// Admin: Update an about item
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { title_en, title_tw, type, content_en, content_tw, order } = req.body;
        
        // Get the existing item
        const existingItem = await prisma.aboutItem.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!existingItem) {
            req.flash('error_msg', 'About item not found');
            return res.redirect('/admin/about');
        }
        
        // Process content based on type
        let processedContentEn = content_en;
        let processedContentTw = content_tw;
        
        // Check content length and truncate if necessary
        // MySQL LONGTEXT can store up to 4GB, but we'll use a more reasonable limit
        const MAX_CONTENT_LENGTH = 100 * 1024 * 1024; // 100MB limit to match Multer fieldSize limit
        
        if (processedContentEn && processedContentEn.length > MAX_CONTENT_LENGTH) {
            logger.warn(`Content_en for "${title_en}" was truncated from ${processedContentEn.length} to ${MAX_CONTENT_LENGTH} bytes`);
            processedContentEn = processedContentEn.substring(0, MAX_CONTENT_LENGTH);
        }
        
        if (processedContentTw && processedContentTw.length > MAX_CONTENT_LENGTH) {
            logger.warn(`Content_tw for "${title_tw}" was truncated from ${processedContentTw.length} to ${MAX_CONTENT_LENGTH} bytes`);
            processedContentTw = processedContentTw.substring(0, MAX_CONTENT_LENGTH);
        }
        
        // Handle image uploads or removal
        let imagePath = existingItem.imagePath;
        let imagePathDesktop = existingItem.imagePathDesktop;
        let imagePathTablet = existingItem.imagePathTablet;
        let imagePathMobile = existingItem.imagePathMobile;
        
        // Remove existing images if type changed from image
        if (type !== 'image') {
            // Helper function to delete file if it exists
            const deleteFileIfExists = async (filePath) => {
                if (filePath) {
                    const fullPath = path.join(__dirname, '../../public', filePath);
                    try {
                        await unlinkAsync(fullPath);
                    } catch (err) {
                        logger.error(`Failed to delete image file: ${err.message}`);
                    }
                }
            };
            
            // Delete all image files
            await deleteFileIfExists(existingItem.imagePath);
            await deleteFileIfExists(existingItem.imagePathDesktop);
            await deleteFileIfExists(existingItem.imagePathTablet);
            await deleteFileIfExists(existingItem.imagePathMobile);
            
            // Reset all image paths
            imagePath = null;
            imagePathDesktop = null;
            imagePathTablet = null;
            imagePathMobile = null;
        }
        
        // Add new images if uploaded
        if (req.files && type === 'image') {
            // Helper function to delete file if it exists
            const deleteFileIfExists = async (filePath) => {
                if (filePath) {
                    const fullPath = path.join(__dirname, '../../public', filePath);
                    try {
                        await unlinkAsync(fullPath);
                    } catch (err) {
                        logger.error(`Failed to delete image file: ${err.message}`);
                    }
                }
            };
            
            // Handle desktop image
            if (req.files.imageDesktop && req.files.imageDesktop.length > 0) {
                // Delete old desktop image if exists
                await deleteFileIfExists(existingItem.imagePathDesktop);
                
                // Set new desktop image path
                imagePathDesktop = `/uploads/about/${req.files.imageDesktop[0].filename}`;
                
                // Update main image path if it was previously desktop or not set
                if (!imagePath || imagePath === existingItem.imagePathDesktop) {
                    imagePath = imagePathDesktop;
                }
            }
            
            // Handle tablet image
            if (req.files.imageTablet && req.files.imageTablet.length > 0) {
                // Delete old tablet image if exists
                await deleteFileIfExists(existingItem.imagePathTablet);
                
                // Set new tablet image path
                imagePathTablet = `/uploads/about/${req.files.imageTablet[0].filename}`;
                
                // Update main image path if it was previously tablet or not set
                if (!imagePath || imagePath === existingItem.imagePathTablet) {
                    imagePath = imagePathTablet;
                }
            }
            
            // Handle mobile image
            if (req.files.imageMobile && req.files.imageMobile.length > 0) {
                // Delete old mobile image if exists
                await deleteFileIfExists(existingItem.imagePathMobile);
                
                // Set new mobile image path
                imagePathMobile = `/uploads/about/${req.files.imageMobile[0].filename}`;
                
                // Update main image path if it was previously mobile or not set
                if (!imagePath || imagePath === existingItem.imagePathMobile) {
                    imagePath = imagePathMobile;
                }
            }
        }
        
        // Update the about item
        await prisma.aboutItem.update({
            where: { id: parseInt(id) },
            data: {
                title_en,
                title_tw,
                type,
                content_en: processedContentEn,
                content_tw: processedContentTw,
                imagePath,
                imagePathDesktop,
                imagePathTablet,
                imagePathMobile,
                order: order ? parseInt(order) : 0,
                updatedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'About item updated successfully');
        res.redirect('/admin/about');
    } catch (error) {
        logger.error('Error updating about item:', error);
        req.flash('error_msg', `Failed to update about item: ${error.message}`);
        res.redirect(`/admin/about/edit/${req.params.id}`);
    }
};

// Admin: Delete an about item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get the item to check if it has images
        const item = await prisma.aboutItem.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!item) {
            req.flash('error_msg', 'About item not found');
            return res.redirect('/admin/about');
        }
        
        // Soft delete the item
        await prisma.aboutItem.update({
            where: { id: parseInt(id) },
            data: {
                deletedAt: new Date()
            }
        });
        
        // Helper function to delete file if it exists
        const deleteFileIfExists = async (filePath) => {
            if (filePath) {
                const fullPath = path.join(__dirname, '../../public', filePath);
                try {
                    await unlinkAsync(fullPath);
                } catch (err) {
                    logger.error(`Failed to delete image file: ${err.message}`);
                }
            }
        };
        
        // Delete all image files
        await deleteFileIfExists(item.imagePath);
        await deleteFileIfExists(item.imagePathDesktop);
        await deleteFileIfExists(item.imagePathTablet);
        await deleteFileIfExists(item.imagePathMobile);
        
        req.flash('success_msg', 'About item deleted successfully');
        res.redirect('/admin/about');
    } catch (error) {
        logger.error('Error deleting about item:', error);
        req.flash('error_msg', `Failed to delete about item: ${error.message}`);
        res.redirect('/admin/about');
    }
};

// Frontend: Display about page
exports.showAboutPage = async (req, res) => {
    try {
        const language = req.params.language;
        
        // Get all about items
        const items = await prisma.aboutItem.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        // Process items for display
        const processedItems = items.map(item => {
            let processedItem = { ...item };
            
            // Process bullet points
            if (item.type === 'bullet_points') {
                try {
                    // Ensure content is parsed as JSON if it's a string
                    if (typeof item.content_en === 'string') {
                        processedItem.content_en = JSON.parse(item.content_en);
                    }
                    if (typeof item.content_tw === 'string') {
                        processedItem.content_tw = JSON.parse(item.content_tw);
                    }
                } catch (e) {
                    logger.error('Error parsing bullet points:', e);
                    processedItem.content_en = { ops: [] };
                    processedItem.content_tw = { ops: [] };
                }
            } else if (item.type === 'plain_text') {
                // For plain text, ensure the HTML content is properly sanitized but preserves formatting
                // No need to modify, as it will be rendered with <%- %> in the template
                // But we need to make sure it's a string
                if (typeof processedItem.content_en !== 'string') {
                    processedItem.content_en = String(processedItem.content_en || '');
                }
                if (typeof processedItem.content_tw !== 'string') {
                    processedItem.content_tw = String(processedItem.content_tw || '');
                }
                
                // Check if the content might be Quill Delta JSON that was mistakenly saved as plain text
                try {
                    // If content starts with { and contains "ops", it might be a Quill Delta object
                    if (processedItem.content_en.trim().startsWith('{') && processedItem.content_en.includes('"ops"')) {
                        const deltaObj = JSON.parse(processedItem.content_en);
                        if (deltaObj && deltaObj.ops) {
                            // It's a Delta object, convert it to HTML
                            const tempDiv = document.createElement('div');
                            const quill = new Quill(tempDiv);
                            quill.setContents(deltaObj);
                            processedItem.content_en = tempDiv.querySelector('.ql-editor').innerHTML;
                        }
                    }
                    
                    if (processedItem.content_tw.trim().startsWith('{') && processedItem.content_tw.includes('"ops"')) {
                        const deltaObj = JSON.parse(processedItem.content_tw);
                        if (deltaObj && deltaObj.ops) {
                            // It's a Delta object, convert it to HTML
                            const tempDiv = document.createElement('div');
                            const quill = new Quill(tempDiv);
                            quill.setContents(deltaObj);
                            processedItem.content_tw = tempDiv.querySelector('.ql-editor').innerHTML;
                        }
                    }
                } catch (e) {
                    // If parsing fails, it's likely already HTML content, so we can ignore this error
                    logger.debug('Content appears to be HTML already, not Delta JSON:', e.message);
                }
                
                // Check if the content might be Quill Delta JSON that was mistakenly saved as plain text
                try {
                    // If content starts with { and contains "ops", it might be a Quill Delta object
                    if (processedItem.content_en.trim().startsWith('{') && processedItem.content_en.includes('"ops"')) {
                        const deltaObj = JSON.parse(processedItem.content_en);
                        if (deltaObj && deltaObj.ops) {
                            // It's a Delta object, we'll pass it as is and let the frontend handle it
                            // We'll add a flag to indicate it's a Delta object
                            processedItem._content_en_is_delta = true;
                        }
                    }
                    
                    if (processedItem.content_tw.trim().startsWith('{') && processedItem.content_tw.includes('"ops"')) {
                        const deltaObj = JSON.parse(processedItem.content_tw);
                        if (deltaObj && deltaObj.ops) {
                            // It's a Delta object, we'll pass it as is and let the frontend handle it
                            // We'll add a flag to indicate it's a Delta object
                            processedItem._content_tw_is_delta = true;
                        }
                    }
                } catch (e) {
                    // If parsing fails, it's likely already HTML content, so we can ignore this error
                    logger.debug('Content appears to be HTML already, not Delta JSON:', e.message);
                }
            }
            
            return processedItem;
        });
        
        res.render('frontend/about', {
            title: language === 'en' ? 'About Us' : '關於我們',
            items: processedItems,
            layout: 'layouts/frontend',
            currentLanguage: language || 'en'
        });
    } catch (error) {
        logger.error('Error displaying about page:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: 'Failed to load about page',
            layout: 'layouts/frontend'
        });
    }
}; 