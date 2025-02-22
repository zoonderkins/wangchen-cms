const multer = require('multer');
const logger = require('../config/logger');

exports.handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        logger.error('Multer upload error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            req.flash('error_msg', 'File is too large. Maximum size is 5MB');
        } else {
            req.flash('error_msg', 'Error uploading file');
        }
        return res.redirect('/admin/media');
    }
    
    if (err) {
        logger.error('Upload error:', err);
        req.flash('error_msg', 'Error uploading file');
        return res.redirect('/admin/media');
    }
    
    next();
};
