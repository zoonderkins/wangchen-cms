const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Authentication routes
router.get('/login', authController.renderLoginForm);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;
