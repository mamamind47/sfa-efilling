const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// ===================================
// PROJECT ROUTES
// ===================================

// Create new project
router.post('/', projectController.createProject);

// Get all projects (with filters)
router.get('/', projectController.getProjects);

// Get my created projects
router.get('/my-projects', projectController.getMyProjects);

// Get projects I'm participating in
router.get('/participated', projectController.getParticipatedProjects);

// Search users to add to project
router.get('/search-users', projectController.searchUsers);

// Get specific project
router.get('/:projectId', projectController.getProject);

// Update project (draft/rejected only)
router.put('/:projectId', projectController.updateProject);

// Submit draft project
router.post('/:projectId/submit', projectController.submitProject);

// Resubmit rejected project
router.post('/:projectId/resubmit', projectController.resubmitProject);

// Upload project documents
router.post('/:projectId/documents', projectController.uploadDocuments);

// Delete project
router.delete('/:projectId', projectController.deleteProject);

// Add participants to project
router.post('/:projectId/participants', projectController.addParticipants);

// Remove participant from project
router.delete('/:projectId/participants/:userId', projectController.removeParticipant);

// Approve/Reject project (Admin only) - Step 1
router.post('/:projectId/approve', projectController.approveProject);
router.post('/:projectId/reject', projectController.rejectProject);

// Approve/Reject participants (Admin only) - Step 2
router.post('/:projectId/participants/approve', projectController.approveParticipants);
router.post('/:projectId/participants/reject', projectController.rejectParticipants);
router.post('/:projectId/participants/revert', projectController.revertParticipants);

module.exports = router;
