const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Display list of all links
exports.index = async (req, res) => {
    try {
        const links = await prisma.link.findMany({
            orderBy: {
                order: 'asc'
            }
        });

        res.render('admin/links/index', {
            title: 'Links Management',
            links
        });
    } catch (error) {
        console.error('Error fetching links:', error);
        req.flash('error_msg', 'Failed to load links');
        res.redirect('/admin/dashboard');
    }
};

// Display link create form
exports.createForm = async (req, res) => {
    res.render('admin/links/create', {
        title: 'Create Link'
    });
};

// Handle link create
exports.create = async (req, res) => {
    try {
        const { title_en, title_tw, url, order } = req.body;
        let image = null;

        // Handle image upload
        if (req.file) {
            // Store the path relative to the public directory for proper URL generation
            image = `/uploads/links/${path.basename(req.file.path)}`;
        }

        // Create link
        await prisma.link.create({
            data: {
                title_en,
                title_tw,
                url,
                image,
                order: parseInt(order) || 0,
                active: true
            }
        });

        req.flash('success_msg', 'Link created successfully');
        res.redirect('/admin/links');
    } catch (error) {
        console.error('Error creating link:', error);
        req.flash('error_msg', 'Failed to create link');
        res.redirect('/admin/links/create');
    }
};

// Display link edit form
exports.editForm = async (req, res) => {
    try {
        const { id } = req.params;
        const link = await prisma.link.findUnique({
            where: { id: parseInt(id) }
        });

        if (!link) {
            req.flash('error_msg', 'Link not found');
            return res.redirect('/admin/links');
        }

        res.render('admin/links/edit', {
            title: 'Edit Link',
            link
        });
    } catch (error) {
        console.error('Error fetching link:', error);
        req.flash('error_msg', 'Failed to load link');
        res.redirect('/admin/links');
    }
};

// Handle link update
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { title_en, title_tw, url, order, removeImage } = req.body;
        
        const link = await prisma.link.findUnique({
            where: { id: parseInt(id) }
        });

        if (!link) {
            req.flash('error_msg', 'Link not found');
            return res.redirect('/admin/links');
        }

        let image = link.image;

        // Handle image removal
        if (removeImage === 'on' && link.image) {
            const imagePath = path.join(__dirname, '../../public', link.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
            image = null;
        }

        // Handle new image upload
        if (req.file) {
            // Remove old image if exists
            if (link.image) {
                const oldImagePath = path.join(__dirname, '../../public', link.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            // Store the path relative to the public directory for proper URL generation
            image = `/uploads/links/${path.basename(req.file.path)}`;
        }

        // Update link
        await prisma.link.update({
            where: { id: parseInt(id) },
            data: {
                title_en,
                title_tw,
                url,
                image,
                order: parseInt(order) || 0
            }
        });

        req.flash('success_msg', 'Link updated successfully');
        res.redirect('/admin/links');
    } catch (error) {
        console.error('Error updating link:', error);
        req.flash('error_msg', 'Failed to update link');
        res.redirect(`/admin/links/edit/${req.params.id}`);
    }
};

// Handle link delete
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        
        const link = await prisma.link.findUnique({
            where: { id: parseInt(id) }
        });

        if (!link) {
            req.flash('error_msg', 'Link not found');
            return res.redirect('/admin/links');
        }

        // Delete image if exists
        if (link.image) {
            const imagePath = path.join(__dirname, '../../public', link.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Delete link
        await prisma.link.delete({
            where: { id: parseInt(id) }
        });

        req.flash('success_msg', 'Link deleted successfully');
        res.redirect('/admin/links');
    } catch (error) {
        console.error('Error deleting link:', error);
        req.flash('error_msg', 'Failed to delete link');
        res.redirect('/admin/links');
    }
};

// Toggle link active status
exports.toggleActive = async (req, res) => {
    try {
        const { id } = req.params;
        
        const link = await prisma.link.findUnique({
            where: { id: parseInt(id) }
        });

        if (!link) {
            req.flash('error_msg', 'Link not found');
            return res.redirect('/admin/links');
        }

        // Toggle active status
        await prisma.link.update({
            where: { id: parseInt(id) },
            data: {
                active: !link.active
            }
        });

        req.flash('success_msg', `Link ${link.active ? 'deactivated' : 'activated'} successfully`);
        res.redirect('/admin/links');
    } catch (error) {
        console.error('Error toggling link status:', error);
        req.flash('error_msg', 'Failed to update link status');
        res.redirect('/admin/links');
    }
}; 