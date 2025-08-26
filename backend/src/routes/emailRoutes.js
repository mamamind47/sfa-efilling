const express = require('express');
const router = express.Router();
const {
  sendSubmissionApprovedEmail,
  sendSubmissionRejectedEmail,
  sendNotificationEmail,
  sendAnnouncementEmail,
  sendBulkEmail,
  sendGroupEmail,
  getEmailTemplates,
  testEmailConfig
} = require('../controllers/emailController');

// Email template management
router.get('/templates', getEmailTemplates);

// Test email configuration
router.post('/test', testEmailConfig);

// Individual email sending
router.post('/submission/approved', sendSubmissionApprovedEmail);
router.post('/submission/rejected', sendSubmissionRejectedEmail);
router.post('/personal-notification', sendNotificationEmail);
router.post('/announcement', sendAnnouncementEmail);

// Bulk email sending
router.post('/bulk', sendBulkEmail);

// Group email sending
router.post('/group', sendGroupEmail);

module.exports = router;