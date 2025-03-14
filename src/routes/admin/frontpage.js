const express = require('express');
const router = express.Router();
const frontpageController = require('../../controllers/admin/frontpageController');

// Frontpage Items Routes
router.get('/', frontpageController.index);
router.get('/items/create', frontpageController.createForm);
router.post('/items', frontpageController.uploadImages, frontpageController.create);
router.get('/items/:id/edit', frontpageController.editForm);
router.post('/items/:id', frontpageController.uploadImages, frontpageController.update);
router.post('/items/:id/delete', frontpageController.delete);

// Frontpage Categories Routes
router.get('/categories', frontpageController.categoriesIndex);
router.post('/categories', frontpageController.createCategory);
router.post('/categories/:id', frontpageController.updateCategory);
router.post('/categories/:id/delete', frontpageController.deleteCategory);

module.exports = router; 