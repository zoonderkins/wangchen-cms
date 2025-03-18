const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Make sure the uploads directory exists
const uploadDir = 'public/uploads/site-logos';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fieldname = file.fieldname; // 'logo_desktop', 'logo_tablet', or 'logo_mobile'
    const filename = `site-logo-${fieldname.replace('logo_', '')}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

// Set up file filter
const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create multer middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// Export the middleware
module.exports = upload.fields([
  { name: 'logo_desktop', maxCount: 1 },
  { name: 'logo_tablet', maxCount: 1 },
  { name: 'logo_mobile', maxCount: 1 }
]); 