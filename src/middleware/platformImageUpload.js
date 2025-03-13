const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Get allowed file types from environment variables or use defaults
const ALLOWED_IMAGE_TYPES = process.env.ALLOWED_IMAGE_TYPES || 'jpg,jpeg,png,gif,webp';
const ALLOWED_ATTACHMENT_TYPES = process.env.ALLOWED_ATTACHMENT_TYPES || 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip,rar';

// Parse the comma-separated lists into arrays
const allowedImageExtensions = ALLOWED_IMAGE_TYPES.split(',').map(ext => `.${ext.trim().toLowerCase()}`);
const allowedAttachmentExtensions = ALLOWED_ATTACHMENT_TYPES.split(',').map(ext => `.${ext.trim().toLowerCase()}`);

// Create uploads directories if they don't exist
const uploadDir = path.join(__dirname, '../../public/uploads/platform');
const attachmentDir = path.join(uploadDir, 'attachments');

[uploadDir, attachmentDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Configure storage for images and attachments
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Store attachments in a separate directory
    const dest = file.fieldname === 'attachments' ? attachmentDir : uploadDir;
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with timestamp and random number
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'attachments' ? 'attachment' : 'platform';
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  }
});

// Map of common file extensions to MIME types
const mimeTypeMap = {
  // Image types
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  
  // Document types
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed'
};

// Generate allowed MIME types based on allowed extensions
const allowedImageMimeTypes = allowedImageExtensions
  .map(ext => mimeTypeMap[ext])
  .filter(Boolean);

const allowedAttachmentMimeTypes = allowedAttachmentExtensions
  .map(ext => mimeTypeMap[ext])
  .filter(Boolean);

// File filter for images
const imageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidExtension = allowedImageExtensions.includes(ext);
  const isValidMimeType = allowedImageMimeTypes.includes(file.mimetype);
  
  if (isValidExtension && isValidMimeType) {
    cb(null, true);
  } else {
    cb(new Error(`Only image files (${ALLOWED_IMAGE_TYPES}) are allowed!`), false);
  }
};

// File filter for attachments
const attachmentFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidExtension = allowedAttachmentExtensions.includes(ext);
  const isValidMimeType = allowedAttachmentMimeTypes.includes(file.mimetype);
  
  if (isValidExtension && isValidMimeType) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_ATTACHMENT_TYPES.toUpperCase()}`), false);
  }
};

// Configure multer with file type filtering
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') {
      imageFilter(req, file, cb);
    } else if (file.fieldname === 'attachments') {
      attachmentFilter(req, file, cb);
    } else {
      cb(new Error('Invalid field name'), false);
    }
  },
  limits: {
    fileSize: file => {
      // Use environment variables for file size limits or default to 5MB for images, 50MB for attachments
      const maxImageSize = parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024;
      const maxAttachmentSize = parseInt(process.env.MAX_ATTACHMENT_SIZE) || 50 * 1024 * 1024;
      return file.fieldname === 'attachments' ? maxAttachmentSize : maxImageSize;
    }
  }
});

module.exports = upload;