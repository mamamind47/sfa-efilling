const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');
const authenticateToken = require('../middlewares/authMiddleware');

// Middleware for file uploads
const uploadFields = postsController.upload.fields([
  { name: 'featured_image', maxCount: 1 },
  { name: 'attachments', maxCount: 10 }
]);

// ================================
// PUBLIC ROUTES (No auth required)
// ================================

// Get all published posts with pagination and search
router.get('/', postsController.getPosts);

// Get single post by ID
router.get('/:postId', postsController.getPostById);

// Get categories (active only for public)
router.get('/categories/list', postsController.getCategories);

// ================================
// PROTECTED ROUTES (Auth required)
// ================================

// Categories management (Admin only)
router.post('/categories', authenticateToken, postsController.createCategory);
router.put('/categories/:categoryId', authenticateToken, postsController.updateCategory);
router.delete('/categories/:categoryId', authenticateToken, postsController.deleteCategory);

// Posts management (Admin only)
router.post('/', authenticateToken, uploadFields, postsController.createPost);
router.put('/:postId', authenticateToken, uploadFields, postsController.updatePost);
router.delete('/:postId', authenticateToken, postsController.deletePost);
router.patch('/:postId/pin', authenticateToken, postsController.togglePinPost);

// Admin stats
router.get('/admin/stats', authenticateToken, postsController.getPostStats);

module.exports = router;