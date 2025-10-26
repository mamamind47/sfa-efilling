const notificationService = require('../services/notificationService');

// Get user notifications
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id; // Fix: use 'id' instead of 'user_id'
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await notificationService.getUserNotifications(userId, limit);

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id; // Fix: use 'id' instead of 'user_id'

    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id; // Fix: use 'id' instead of 'user_id'
    const { notificationId } = req.params;

    const notification = await notificationService.markAsRead(notificationId, userId);

    res.status(200).json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id; // Fix: use 'id' instead of 'user_id'

    const result = await notificationService.markAllAsRead(userId);

    res.status(200).json({ message: 'All notifications marked as read', count: result.count });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};