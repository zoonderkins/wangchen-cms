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
        cb(null, 'about-' + uniqueSuffix + path.extname(file.originalname));
    }
});

exports.upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
}).single('image');

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
        
        // Process bullet points if type is bullet_points
        let processedContentEn = content_en;
        let processedContentTw = content_tw;
        
        if (type === 'bullet_points') {
            // Convert line breaks to JSON array for bullet points
            processedContentEn = JSON.stringify(content_en.split('\n').filter(line => line.trim()));
            processedContentTw = JSON.stringify(content_tw.split('\n').filter(line => line.trim()));
        }
        
        // Handle image upload
        let imagePath = null;
        if (req.file && type === 'image') {
            imagePath = `/uploads/about/${req.file.filename}`;
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
        
        // If bullet points, convert JSON array back to newline-separated text
        let displayContentEn = item.content_en;
        let displayContentTw = item.content_tw;
        
        if (item.type === 'bullet_points') {
            try {
                displayContentEn = JSON.parse(item.content_en).join('\n');
                displayContentTw = JSON.parse(item.content_tw).join('\n');
            } catch (e) {
                logger.error('Error parsing bullet points:', e);
            }
        }
        
        res.render('admin/about/edit', {
            title: 'Edit About Item',
            item: {
                ...item,
                content_en: displayContentEn,
                content_tw: displayContentTw
            }
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
        const { title_en, title_tw, type, content_en, content_tw, order, removeImage } = req.body;
        
        // Get the existing item
        const existingItem = await prisma.aboutItem.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!existingItem) {
            req.flash('error_msg', 'About item not found');
            return res.redirect('/admin/about');
        }
        
        // Process bullet points if type is bullet_points
        let processedContentEn = content_en;
        let processedContentTw = content_tw;
        
        if (type === 'bullet_points') {
            // Convert line breaks to JSON array for bullet points
            processedContentEn = JSON.stringify(content_en.split('\n').filter(line => line.trim()));
            processedContentTw = JSON.stringify(content_tw.split('\n').filter(line => line.trim()));
        }
        
        // Handle image upload or removal
        let imagePath = existingItem.imagePath;
        
        // Remove existing image if requested or if type changed from image
        if ((removeImage === 'true' || type !== 'image') && existingItem.imagePath) {
            const filePath = path.join(__dirname, '../../public', existingItem.imagePath);
            try {
                await unlinkAsync(filePath);
            } catch (err) {
                logger.error(`Failed to delete image file: ${err.message}`);
            }
            imagePath = null;
        }
        
        // Add new image if uploaded
        if (req.file && type === 'image') {
            // Remove old image if exists
            if (existingItem.imagePath) {
                const filePath = path.join(__dirname, '../../public', existingItem.imagePath);
                try {
                    await unlinkAsync(filePath);
                } catch (err) {
                    logger.error(`Failed to delete old image file: ${err.message}`);
                }
            }
            imagePath = `/uploads/about/${req.file.filename}`;
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
        
        // Get the item to check if it has an image
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
        
        // Delete the image file if exists
        if (item.imagePath) {
            const filePath = path.join(__dirname, '../../public', item.imagePath);
            try {
                await unlinkAsync(filePath);
            } catch (err) {
                logger.error(`Failed to delete image file: ${err.message}`);
            }
        }
        
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
                    processedItem.content_en = JSON.parse(item.content_en);
                    processedItem.content_tw = JSON.parse(item.content_tw);
                } catch (e) {
                    logger.error('Error parsing bullet points:', e);
                    processedItem.content_en = [];
                    processedItem.content_tw = [];
                }
            }
            
            return processedItem;
        });
        
        res.render('frontend/about', {
            title: language === 'en' ? 'About Us' : '關於我們',
            items: processedItems,
            layout: 'layouts/frontend'
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