const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middlewares/authMiddleware');

// All notification routes require authentication
router.use(authenticate);

// GET /notifications - Get user notifications
router.get('/', notificationController.getUserNotifications);

// GET /notifications/unread-count - Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// PUT /notifications/:notificationId/read - Mark notification as read
router.put('/:notificationId/read', notificationController.markAsRead);

// PUT /notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', notificationController.markAllAsRead);

module.exports = router;