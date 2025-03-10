const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

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

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidExtension = allowedExtensions.includes(ext);
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
  
  if (isValidExtension && isValidMimeType) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed!'), false);
  }
};

// File filter for attachments
const attachmentFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];
  
  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.ppt', '.pptx', '.txt', '.zip', '.rar'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidExtension = allowedExtensions.includes(ext);
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
  
  if (isValidExtension && isValidMimeType) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: PDF, Word, Excel, PowerPoint, TXT, ZIP, RAR'), false);
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
      // 5MB for images, 50MB for attachments
      return file.fieldname === 'attachments' ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    }
  }
});

module.exports = upload;