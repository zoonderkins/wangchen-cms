const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'frontpages');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename using timestamp and random number
        const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1000000)}${path.extname(file.originalname)}`;
        cb(null, uniqueFilename);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允許上傳圖片檔案！'), false);
        }
    }
});

// Helper function to process images (simplified without sharp)
function processImage(file) {
    // Simply return the file information without processing
    return {
        filename: path.basename(file.path),
        originalName: file.originalname,
        path: `/uploads/frontpages/${path.basename(file.path)}`
    };
}

// Frontpage Items Controllers
exports.index = async (req, res) => {
    try {
        const items = await prisma.frontpageItem.findMany({
            include: {
                category: true,
                images: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        res.render('admin/frontpage/index', {
            title: '首頁管理',
            items,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (error) {
        console.error('Error fetching frontpage items:', error);
        req.flash('error_msg', '獲取首頁項目時發生錯誤');
        res.redirect('/admin/dashboard');
    }
};

exports.createForm = async (req, res) => {
    try {
        const categories = await prisma.frontpageCategory.findMany({
            orderBy: {
                order: 'asc'
            }
        });
        
        res.render('admin/frontpage/items/create', {
            title: '新增首頁項目',
            categories,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (error) {
        console.error('Error loading create form:', error);
        req.flash('error_msg', '載入表單時發生錯誤');
        res.redirect('/admin/frontpage');
    }
};

exports.create = async (req, res) => {
    try {
        const { title_tw, title_en, content_tw, content_en, type, categoryId, order, status } = req.body;
        
        // Create the frontpage item
        const item = await prisma.frontpageItem.create({
            data: {
                title_tw,
                title_en,
                content_tw: type === 'plain_text' ? content_tw : null,
                content_en: type === 'plain_text' ? content_en : null,
                type,
                order: parseInt(order) || 0,
                status,
                categoryId: parseInt(categoryId),
                authorId: req.session.user.id
            }
        });
        
        // Handle image uploads for picture type
        if (type === 'picture' && req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const processedImage = processImage(req.files[i]);
                
                await prisma.frontpageImage.create({
                    data: {
                        filename: processedImage.filename,
                        originalName: processedImage.originalName,
                        path: processedImage.path,
                        order: i,
                        itemId: item.id
                    }
                });
            }
        }
        
        req.flash('success_msg', '首頁項目已成功新增');
        res.redirect('/admin/frontpage');
    } catch (error) {
        console.error('Error creating frontpage item:', error);
        req.flash('error_msg', '新增首頁項目時發生錯誤');
        res.redirect('/admin/frontpage/items/create');
    }
};

exports.editForm = async (req, res) => {
    try {
        const { id } = req.params;
        
        const item = await prisma.frontpageItem.findUnique({
            where: { id: parseInt(id) },
            include: {
                images: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });
        
        if (!item) {
            req.flash('error_msg', '找不到該首頁項目');
            return res.redirect('/admin/frontpage');
        }
        
        const categories = await prisma.frontpageCategory.findMany({
            orderBy: {
                order: 'asc'
            }
        });
        
        res.render('admin/frontpage/items/edit', {
            title: '編輯首頁項目',
            item,
            categories,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        req.flash('error_msg', '載入編輯表單時發生錯誤');
        res.redirect('/admin/frontpage');
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { title_tw, title_en, content_tw, content_en, type, categoryId, order, status, existingImages, deleteImages } = req.body;
        
        // Update the frontpage item
        await prisma.frontpageItem.update({
            where: { id: parseInt(id) },
            data: {
                title_tw,
                title_en,
                content_tw: type === 'plain_text' ? content_tw : null,
                content_en: type === 'plain_text' ? content_en : null,
                type,
                order: parseInt(order) || 0,
                status,
                categoryId: parseInt(categoryId)
            }
        });
        
        // Handle image deletions
        if (deleteImages && Array.isArray(deleteImages)) {
            for (const imageId of deleteImages) {
                const image = await prisma.frontpageImage.findUnique({
                    where: { id: parseInt(imageId) }
                });
                
                if (image) {
                    // Delete the file
                    const filePath = path.join(process.cwd(), 'public', image.path);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                    
                    // Delete the database record
                    await prisma.frontpageImage.delete({
                        where: { id: parseInt(imageId) }
                    });
                }
            }
        }
        
        // Update image orders
        if (existingImages && Array.isArray(existingImages) && req.body.imageOrders) {
            for (const imageId of existingImages) {
                const order = req.body.imageOrders[imageId];
                if (order !== undefined) {
                    await prisma.frontpageImage.update({
                        where: { id: parseInt(imageId) },
                        data: { order: parseInt(order) || 0 }
                    });
                }
            }
        }
        
        // Handle new image uploads
        if (type === 'picture' && req.files && req.files.length > 0) {
            // Get the current highest order
            const highestOrderImage = await prisma.frontpageImage.findFirst({
                where: { itemId: parseInt(id) },
                orderBy: { order: 'desc' }
            });
            
            let startOrder = highestOrderImage ? highestOrderImage.order + 1 : 0;
            
            for (let i = 0; i < req.files.length; i++) {
                const processedImage = processImage(req.files[i]);
                
                await prisma.frontpageImage.create({
                    data: {
                        filename: processedImage.filename,
                        originalName: processedImage.originalName,
                        path: processedImage.path,
                        order: startOrder + i,
                        itemId: parseInt(id)
                    }
                });
            }
        }
        
        req.flash('success_msg', '首頁項目已成功更新');
        res.redirect('/admin/frontpage');
    } catch (error) {
        console.error('Error updating frontpage item:', error);
        req.flash('error_msg', '更新首頁項目時發生錯誤');
        res.redirect(`/admin/frontpage/items/${req.params.id}/edit`);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get the item with its images
        const item = await prisma.frontpageItem.findUnique({
            where: { id: parseInt(id) },
            include: { images: true }
        });
        
        if (!item) {
            req.flash('error_msg', '找不到該首頁項目');
            return res.redirect('/admin/frontpage');
        }
        
        // Delete associated images
        for (const image of item.images) {
            const filePath = path.join(process.cwd(), 'public', image.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        // Delete the item (cascade will delete the images in the database)
        await prisma.frontpageItem.delete({
            where: { id: parseInt(id) }
        });
        
        req.flash('success_msg', '首頁項目已成功刪除');
        res.redirect('/admin/frontpage');
    } catch (error) {
        console.error('Error deleting frontpage item:', error);
        req.flash('error_msg', '刪除首頁項目時發生錯誤');
        res.redirect('/admin/frontpage');
    }
};

// Frontpage Categories Controllers
exports.categoriesIndex = async (req, res) => {
    try {
        const categories = await prisma.frontpageCategory.findMany({
            orderBy: {
                order: 'asc'
            }
        });
        
        res.render('admin/frontpage/categories/index', {
            title: '首頁分類管理',
            categories,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (error) {
        console.error('Error fetching frontpage categories:', error);
        req.flash('error_msg', '獲取首頁分類時發生錯誤');
        res.redirect('/admin/dashboard');
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name_tw, order } = req.body;
        
        await prisma.frontpageCategory.create({
            data: {
                name_tw,
                order: parseInt(order) || 0
            }
        });
        
        req.flash('success_msg', '首頁分類已成功新增');
        res.redirect('/admin/frontpage/categories');
    } catch (error) {
        console.error('Error creating frontpage category:', error);
        req.flash('error_msg', '新增首頁分類時發生錯誤');
        res.redirect('/admin/frontpage/categories');
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name_tw, order } = req.body;
        
        await prisma.frontpageCategory.update({
            where: { id: parseInt(id) },
            data: {
                name_tw,
                order: parseInt(order) || 0
            }
        });
        
        req.flash('success_msg', '首頁分類已成功更新');
        res.redirect('/admin/frontpage/categories');
    } catch (error) {
        console.error('Error updating frontpage category:', error);
        req.flash('error_msg', '更新首頁分類時發生錯誤');
        res.redirect('/admin/frontpage/categories');
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if there are any items using this category
        const itemsCount = await prisma.frontpageItem.count({
            where: { categoryId: parseInt(id) }
        });
        
        if (itemsCount > 0) {
            req.flash('error_msg', '無法刪除此分類，因為有項目正在使用它');
            return res.redirect('/admin/frontpage/categories');
        }
        
        await prisma.frontpageCategory.delete({
            where: { id: parseInt(id) }
        });
        
        req.flash('success_msg', '首頁分類已成功刪除');
        res.redirect('/admin/frontpage/categories');
    } catch (error) {
        console.error('Error deleting frontpage category:', error);
        req.flash('error_msg', '刪除首頁分類時發生錯誤');
        res.redirect('/admin/frontpage/categories');
    }
};

// Middleware for handling file uploads
exports.uploadImages = upload.array('images', 10); // Allow up to 10 images 