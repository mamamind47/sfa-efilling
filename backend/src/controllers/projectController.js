const projectService = require('../services/projectService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/projects');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images and documents are allowed'));
  }
}).fields([
  { name: 'photos', maxCount: 10 },
  { name: 'certificate', maxCount: 1 },
  { name: 'others', maxCount: 10 }
]);

/**
 * Create new project (basic info only, no files, no participants)
 */
exports.createProject = async (req, res) => {
  try {
    const requester = req.user;
    const {
      project_name,
      project_type,
      description,
      start_date,
      end_date,
      location,
      campus,
      province,
      hours_per_person,
      academic_year_id,
      submit_immediately // Boolean - ส่งเลยหรือบันทึกเป็นฉบับร่าง
    } = req.body;

    // Validation
    if (!project_name || !project_type || !start_date || !end_date || !hours_per_person || !academic_year_id) {
      return res.status(400).json({
        error: 'Project name, type, dates, hours, and academic year are required'
      });
    }

    // Check if user can create this project type
    if (project_type === 'university_activity' && requester.role !== 'admin') {
      return res.status(403).json({
        error: 'Only admins can create university activity projects'
      });
    }

    // Create project
    const project = await projectService.createProject({
      project_name,
      project_type,
      description,
      start_date,
      end_date,
      location,
      campus: project_type === 'university_activity' ? campus : null,
      province: (project_type === 'religious' || project_type === 'social_development') ? province : null,
      hours_per_person: parseInt(hours_per_person),
      created_by: requester.id,
      creator_role: requester.role,
      academic_year_id,
      submit_immediately: submit_immediately === 'true' || submit_immediately === true
    });

    res.status(201).json({
      message: 'สร้างโครงการสำเร็จ',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};

/**
 * Get project by ID
 */
exports.getProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await projectService.getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all projects with filters
 */
exports.getProjects = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      project_type: req.query.project_type,
      academic_year_id: req.query.academic_year_id,
      created_by: req.query.created_by,
      province: req.query.province,
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await projectService.getProjects(filters);
    res.json(result);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get projects where user is creator
 */
exports.getMyProjects = async (req, res) => {
  try {
    const requester = req.user;

    const filters = {
      created_by: requester.id,
      status: req.query.status,
      project_type: req.query.project_type,
      academic_year_id: req.query.academic_year_id,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await projectService.getProjects(filters);
    res.json(result);
  } catch (error) {
    console.error('Get my projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get projects where user is participant
 */
exports.getParticipatedProjects = async (req, res) => {
  try {
    const requester = req.user;

    const filters = {
      status: req.query.status,
      academic_year_id: req.query.academic_year_id,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await projectService.getUserParticipatedProjects(requester.id, filters);
    res.json(result);
  } catch (error) {
    console.error('Get participated projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update project (only creator or admin)
 */
exports.updateProject = async (req, res) => {
  try {
    const requester = req.user;
    const { projectId } = req.params;

    // Get project to check ownership
    const project = await projectService.getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permission
    if (project.created_by !== requester.id && requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can only update if draft or rejected
    if (!['draft', 'rejected'].includes(project.status)) {
      return res.status(400).json({ error: 'Can only update draft or rejected projects' });
    }

    const updateData = {};
    if (req.body.project_name) updateData.project_name = req.body.project_name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.start_date) updateData.start_date = req.body.start_date;
    if (req.body.end_date) updateData.end_date = req.body.end_date;
    if (req.body.location !== undefined) updateData.location = req.body.location;
    if (req.body.province !== undefined) updateData.province = req.body.province;
    if (req.body.hours_per_person) updateData.hours_per_person = parseInt(req.body.hours_per_person);

    const updated = await projectService.updateProject(projectId, updateData);

    res.json({
      message: 'Project updated successfully',
      project: updated
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Add participants to project (with optional files)
 */
exports.addParticipants = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const requester = req.user;
      const { projectId } = req.params;
      const { user_ids } = req.body;

      // Parse user_ids if it's a string
      let userIds = user_ids;
      if (typeof user_ids === 'string') {
        try {
          userIds = JSON.parse(user_ids);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid user_ids format' });
        }
      }

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'user_ids array is required' });
      }

      // Get project to check ownership and get details
      const project = await projectService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permission
      if (project.created_by !== requester.id && requester.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Process uploaded files (optional)
      const files = [];
      if (req.files) {
        if (req.files.photos) {
          req.files.photos.forEach(file => {
            files.push({
              file_path: `/uploads/projects/${file.filename}`,
              document_type: 'photo',
              note: null
            });
          });
        }
        if (req.files.certificate) {
          req.files.certificate.forEach(file => {
            files.push({
              file_path: `/uploads/projects/${file.filename}`,
              document_type: 'certificate',
              note: null
            });
          });
        }
        if (req.files.others) {
          req.files.others.forEach(file => {
            files.push({
              file_path: `/uploads/projects/${file.filename}`,
              document_type: 'other',
              note: null
            });
          });
        }
      }

      await projectService.addParticipants(
        projectId,
        userIds,
        project.hours_per_person,
        project.academic_year_id,
        project.project_type,
        files
      );

      res.json({ message: 'เพิ่มผู้เข้าร่วมสำเร็จ' });
    });
  } catch (error) {
    console.error('Add participants error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};

/**
 * Remove participant from project
 */
exports.removeParticipant = async (req, res) => {
  try {
    const requester = req.user;
    const { projectId, userId } = req.params;

    // Get project to check ownership
    const project = await projectService.getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permission
    if (project.created_by !== requester.id && requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can only remove if draft, rejected, or submitted (not approved)
    if (project.status === 'approved') {
      return res.status(400).json({ error: 'Cannot remove participants from approved project' });
    }

    await projectService.removeParticipant(projectId, userId);

    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Approve project (Admin only) - Step 1
 */
exports.approveProject = async (req, res) => {
  try {
    const requester = req.user;

    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { projectId } = req.params;

    const project = await projectService.approveProject(projectId, requester.id);

    res.json({
      message: 'อนุมัติโครงการสำเร็จ',
      project
    });
  } catch (error) {
    console.error('Approve project error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Reject project (Admin only) - Step 1
 */
exports.rejectProject = async (req, res) => {
  try {
    const requester = req.user;

    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { projectId } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason || !rejection_reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const project = await projectService.rejectProject(projectId, rejection_reason, requester.id);

    res.json({
      message: 'ปฏิเสธโครงการสำเร็จ',
      project
    });
  } catch (error) {
    console.error('Reject project error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Approve participants (Admin only) - Step 2
 */
exports.approveParticipants = async (req, res) => {
  try {
    const requester = req.user;

    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { projectId } = req.params;
    const { user_ids } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids array is required' });
    }

    const project = await projectService.approveParticipants(projectId, user_ids);

    res.json({
      message: `อนุมัติผู้เข้าร่วม ${user_ids.length} คนสำเร็จ`,
      project
    });
  } catch (error) {
    console.error('Approve participants error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Reject participants (Admin only) - Step 2
 */
exports.rejectParticipants = async (req, res) => {
  try {
    const requester = req.user;

    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { projectId } = req.params;
    const { user_ids, rejection_reason } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids array is required' });
    }

    const project = await projectService.rejectParticipants(projectId, user_ids, rejection_reason);

    res.json({
      message: `ปฏิเสธผู้เข้าร่วม ${user_ids.length} คนสำเร็จ`,
      project
    });
  } catch (error) {
    console.error('Reject participants error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Revert approved participants back to pending (Admin only)
 */
exports.revertParticipants = async (req, res) => {
  try {
    const requester = req.user;

    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { projectId } = req.params;
    const { user_ids } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids array is required' });
    }

    const project = await projectService.revertParticipants(projectId, user_ids);

    res.json({
      message: `ยกเลิกการอนุมัติผู้เข้าร่วม ${user_ids.length} คนสำเร็จ`,
      project
    });
  } catch (error) {
    console.error('Revert participants error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Delete project
 */
exports.deleteProject = async (req, res) => {
  try {
    const requester = req.user;
    const { projectId } = req.params;

    // Get project to check ownership
    const project = await projectService.getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permission
    if (project.created_by !== requester.id && requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Creator can delete draft, rejected, or submitted
    // Admin can delete anything
    if (project.status === 'approved' && requester.role !== 'admin') {
      return res.status(400).json({ error: 'Cannot delete approved project. Please contact admin.' });
    }

    await projectService.deleteProject(projectId);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Submit draft project
 */
exports.submitProject = async (req, res) => {
  try {
    const requester = req.user;
    const { projectId } = req.params;

    // Get project to check ownership and status
    const project = await projectService.getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permission
    if (project.created_by !== requester.id && requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can only submit if draft
    if (project.status !== 'draft') {
      return res.status(400).json({ error: 'Can only submit draft projects' });
    }

    const submitted = await projectService.submitProject(projectId);

    res.json({
      message: 'Project submitted successfully',
      project: submitted
    });
  } catch (error) {
    console.error('Submit project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Resubmit rejected project
 */
exports.resubmitProject = async (req, res) => {
  try {
    const requester = req.user;
    const { projectId } = req.params;

    // Get project to check ownership and status
    const project = await projectService.getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permission
    if (project.created_by !== requester.id && requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can only resubmit if rejected
    if (project.status !== 'rejected') {
      return res.status(400).json({ error: 'Can only resubmit rejected projects' });
    }

    const resubmitted = await projectService.resubmitProject(projectId);

    res.json({
      message: 'Project resubmitted successfully',
      project: resubmitted
    });
  } catch (error) {
    console.error('Resubmit project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Upload project documents
 */
exports.uploadDocuments = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const requester = req.user;
      const { projectId } = req.params;

      // Get project to check ownership
      const project = await projectService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permission (only creator can upload)
      if (project.created_by !== requester.id && requester.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Process uploaded files
      const files = [];

      if (req.files) {
        // Add photos
        if (req.files.photos) {
          req.files.photos.forEach(file => {
            files.push({
              file_path: `/uploads/projects/${file.filename}`,
              document_type: 'photo',
              note: null
            });
          });
        }

        // Add certificate
        if (req.files.certificate) {
          req.files.certificate.forEach(file => {
            files.push({
              file_path: `/uploads/projects/${file.filename}`,
              document_type: 'certificate',
              note: null
            });
          });
        }

        // Add others
        if (req.files.others) {
          req.files.others.forEach(file => {
            files.push({
              file_path: `/uploads/projects/${file.filename}`,
              document_type: 'other',
              note: null
            });
          });
        }
      }

      // Validate minimum requirements
      const photoCount = files.filter(f => f.document_type === 'photo').length;
      const hasCertificate = files.some(f => f.document_type === 'certificate');

      if (photoCount < 5) {
        return res.status(400).json({ error: 'กรุณาอัปโหลดรูปภาพอย่างน้อย 5 ภาพ' });
      }

      // Admin doesn't need certificate
      if (requester.role !== 'admin' && !hasCertificate) {
        return res.status(400).json({ error: 'กรุณาอัปโหลดเอกสารรับรอง (กยศ.002 หรือ กยศ.003)' });
      }

      // Upload documents
      const updatedProject = await projectService.uploadProjectDocuments(projectId, files);

      res.json({
        message: 'อัปโหลดเอกสารสำเร็จ',
        project: updatedProject
      });
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};

/**
 * Search users to add to project
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await projectService.searchUsers(q.trim());
    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = exports;
