const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platformController');

// Platform routes
router.get('/platforms/:id', platformController.getPlatformItemById);

module.exports = router; 