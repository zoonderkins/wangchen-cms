const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// Frontend: Render contact form
exports.showContactForm = async (req, res) => {
    try {
        const language = req.params.language || 'en';
        
        // Get all active categories
        const categories = await prisma.contactCategory.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                order: 'asc'
            }
        });
        
        res.render('frontend/contact', {
            title: language === 'en' ? 'Contact Us' : '聯絡我們',
            categories,
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error displaying contact page:', error);
        res.status(500).render('frontend/error', {
            title: 'Error',
            message: req.params.language === 'en' ? 'Failed to load contact page' : '載入聯絡頁面失敗',
            layout: 'layouts/frontend'
        });
    }
};

// Frontend: Submit contact form
exports.submitContactForm = async (req, res) => {
    try {
        const language = req.params.language || 'en';
        const { name, email, company, phone, categoryId, message, agreeTerms } = req.body;
        
        // Validate required fields
        if (!name || !email || !message || !agreeTerms) {
            return res.status(400).render('frontend/contact', {
                title: language === 'en' ? 'Contact Us' : '聯絡我們',
                categories: await prisma.contactCategory.findMany({
                    where: { deletedAt: null },
                    orderBy: { order: 'asc' }
                }),
                error: language === 'en' ? 'Please fill in all required fields and agree to the terms.' : '請填寫所有必填欄位並同意條款。',
                formData: { name, email, company, phone, categoryId, message },
                layout: 'layouts/frontend'
            });
        }
        
        // Create contact submission
        await prisma.contact.create({
            data: {
                name,
                email,
                company: company || null,
                phone: phone || null,
                categoryId: categoryId ? parseInt(categoryId) : null,
                message,
                agreeTerms: agreeTerms === 'on' || agreeTerms === true
            }
        });
        
        // Render success page
        res.render('frontend/contact-success', {
            title: language === 'en' ? 'Message Sent' : '訊息已送出',
            layout: 'layouts/frontend'
        });
    } catch (error) {
        logger.error('Error submitting contact form:', error);
        
        const language = req.params.language || 'en';
        res.status(500).render('frontend/contact', {
            title: language === 'en' ? 'Contact Us' : '聯絡我們',
            categories: await prisma.contactCategory.findMany({
                where: { deletedAt: null },
                orderBy: { order: 'asc' }
            }),
            error: language === 'en' ? 'Failed to submit your message. Please try again later.' : '無法提交您的訊息。請稍後再試。',
            formData: req.body,
            layout: 'layouts/frontend'
        });
    }
};

// Admin: List all contact submissions
exports.listContacts = async (req, res) => {
    try {
        const { category, status, sort, order } = req.query;
        
        // Build where clause
        const where = {
            deletedAt: null
        };
        
        if (category) {
            where.categoryId = parseInt(category);
        }
        
        if (status) {
            where.status = status;
        }
        
        // Build order by
        let orderBy = {};
        if (sort) {
            orderBy[sort] = order === 'asc' ? 'asc' : 'desc';
        } else {
            orderBy = { createdAt: 'desc' };
        }
        
        // Get contacts with pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        
        const [contacts, totalCount, categories] = await Promise.all([
            prisma.contact.findMany({
                where,
                include: {
                    category: true
                },
                orderBy,
                skip,
                take: limit
            }),
            prisma.contact.count({ where }),
            prisma.contactCategory.findMany({
                where: { deletedAt: null },
                orderBy: { order: 'asc' }
            })
        ]);
        
        const totalPages = Math.ceil(totalCount / limit);
        
        res.render('admin/contact/index', {
            title: 'Contact Submissions',
            contacts,
            categories,
            currentCategory: category,
            currentStatus: status,
            currentSort: sort,
            currentOrder: order,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages
            }
        });
    } catch (error) {
        logger.error('Error listing contact submissions:', error);
        req.flash('error_msg', `Failed to load contact submissions: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
};

// Admin: View contact details
exports.viewContact = async (req, res) => {
    try {
        const { id } = req.params;
        
        const contact = await prisma.contact.findUnique({
            where: { id: parseInt(id) },
            include: {
                category: true
            }
        });
        
        if (!contact) {
            req.flash('error_msg', 'Contact submission not found');
            return res.redirect('/admin/contact');
        }
        
        res.render('admin/contact/view', {
            title: 'View Contact Submission',
            contact
        });
    } catch (error) {
        logger.error('Error viewing contact submission:', error);
        req.flash('error_msg', `Failed to load contact submission: ${error.message}`);
        res.redirect('/admin/contact');
    }
};

// Admin: Update contact status
exports.updateContactStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await prisma.contact.update({
            where: { id: parseInt(id) },
            data: {
                status,
                updatedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'Contact status updated successfully');
        res.redirect(`/admin/contact/view/${id}`);
    } catch (error) {
        logger.error('Error updating contact status:', error);
        req.flash('error_msg', `Failed to update contact status: ${error.message}`);
        res.redirect(`/admin/contact/view/${req.params.id}`);
    }
};

// Admin: Delete contact
exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Soft delete the contact
        await prisma.contact.update({
            where: { id: parseInt(id) },
            data: {
                deletedAt: new Date()
            }
        });
        
        req.flash('success_msg', 'Contact submission deleted successfully');
        res.redirect('/admin/contact');
    } catch (error) {
        logger.error('Error deleting contact submission:', error);
        req.flash('error_msg', `Failed to delete contact submission: ${error.message}`);
        res.redirect('/admin/contact');
    }
}; 