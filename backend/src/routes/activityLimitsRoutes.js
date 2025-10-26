const express = require('express');
const router = express.Router();
const activityLimitsController = require('../controllers/activityLimitsController');
const authenticateToken = require('../middlewares/authMiddleware');

// ================================
// PUBLIC ROUTES (No auth required)
// ================================

// Get activity limits by academic year (for students to see limits)
router.get('/academic-year/:academicYearId', activityLimitsController.getLimitsByAcademicYear);

// Get user's limits status (requires auth)
router.get('/user-status/:academicYearId', authenticateToken, activityLimitsController.getUserLimitsStatus);

// Validate submission against limits (requires auth)
router.post('/validate-submission', authenticateToken, activityLimitsController.validateSubmissionLimit);

// ================================
// PROTECTED ROUTES (Auth required)
// ================================

// Admin routes for managing activity limits
router.get('/', authenticateToken, activityLimitsController.getAllLimits);
router.get('/activity-types/:academicYearId', authenticateToken, activityLimitsController.getActivityTypesWithLimits);
router.post('/', authenticateToken, activityLimitsController.createLimit);
router.put('/:limitId', authenticateToken, activityLimitsController.updateLimit);
router.delete('/:limitId', authenticateToken, activityLimitsController.deleteLimit);
router.post('/upsert', authenticateToken, activityLimitsController.upsertLimit);
router.post('/batch-upsert', authenticateToken, activityLimitsController.batchUpsertLimits);

module.exports = router;