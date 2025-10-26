const prisma = require('../config/database');
const { validateActivityLimit } = require('../utils/activityLimitValidator');

// Activity type mapping for projects
const PROJECT_TO_ACTIVITY_MAPPING = {
  'religious': 'religious',
  'social_development': 'social_development',
  'university_activity': null // ไม่มี activity limit
};

/**
 * Create new project (basic info only)
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project
 */
async function createProject(projectData) {
  try {
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
      created_by,
      creator_role,
      academic_year_id,
      submit_immediately = false
    } = projectData;

    // Determine initial status
    let initialStatus = 'draft';
    let submittedAt = null;

    if (submit_immediately) {
      // User creates and submits immediately
      initialStatus = 'submitted';
      submittedAt = new Date();
    }

    // Create project
    const project = await prisma.projects.create({
      data: {
        project_name,
        project_type,
        description,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        location,
        campus: project_type === 'university_activity' ? campus : null,
        province: project_type !== 'university_activity' ? province : null,
        hours_per_person,
        created_by,
        academic_year_id,
        status: initialStatus,
        submitted_at: submittedAt
      },
      include: {
        creator: {
          select: { user_id: true, name: true, username: true, email: true }
        },
        academic_year: true
      }
    });

    // If creator is a student, automatically add them as a participant
    if (creator_role === 'student') {
      await prisma.project_participants.create({
        data: {
          project_id: project.project_id,
          user_id: created_by,
          status: 'pending'
        }
      });
    }

    return project;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

/**
 * Get project by ID with details
 */
async function getProjectById(projectId) {
  try {
    const project = await prisma.projects.findUnique({
      where: { project_id: projectId },
      include: {
        creator: {
          select: { user_id: true, name: true, username: true, email: true }
        },
        reviewer: {
          select: { user_id: true, name: true, username: true }
        },
        academic_year: true,
        participants: {
          include: {
            user: {
              select: {
                user_id: true,
                name: true,
                username: true,
                email: true,
                faculty: true,
                major: true
              }
            }
          },
          orderBy: { added_at: 'asc' }
        },
        files: {
          orderBy: { uploaded_at: 'asc' }
        }
      }
    });

    return project;
  } catch (error) {
    console.error('Error getting project:', error);
    throw error;
  }
}

/**
 * Get all projects with filters
 */
async function getProjects(filters = {}) {
  try {
    const {
      status,
      project_type,
      academic_year_id,
      created_by,
      province,
      search,
      page = 1,
      limit = 20
    } = filters;

    const where = {};

    if (status) where.status = status;
    if (project_type) where.project_type = project_type;
    if (academic_year_id) where.academic_year_id = academic_year_id;
    if (created_by) where.created_by = created_by;
    if (province) where.province = province;
    if (search) {
      where.project_name = {
        contains: search
      };
    }

    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.projects.findMany({
        where,
        include: {
          creator: {
            select: { user_id: true, name: true, username: true }
          },
          academic_year: {
            select: { academic_year_id: true, year_name: true }
          },
          _count: {
            select: {
              participants: true,
              files: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.projects.count({ where })
    ]);

    return {
      projects,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting projects:', error);
    throw error;
  }
}

/**
 * Get projects where user is a participant
 */
async function getUserParticipatedProjects(userId, filters = {}) {
  try {
    const {
      status,
      academic_year_id,
      page = 1,
      limit = 20
    } = filters;

    const where = {
      participants: {
        some: {
          user_id: userId
        }
      }
    };

    if (status) where.status = status;
    if (academic_year_id) where.academic_year_id = academic_year_id;

    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.projects.findMany({
        where,
        include: {
          creator: {
            select: { user_id: true, name: true, username: true }
          },
          academic_year: {
            select: { academic_year_id: true, year_name: true }
          },
          participants: {
            where: { user_id: userId },
            select: {
              status: true,
              hours_received: true,
              approved_at: true
            }
          },
          _count: {
            select: { participants: true }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.projects.count({ where })
    ]);

    return {
      projects,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting user participated projects:', error);
    throw error;
  }
}

/**
 * Update project
 */
async function updateProject(projectId, updateData) {
  try {
    const project = await prisma.projects.update({
      where: { project_id: projectId },
      data: {
        ...updateData,
        start_date: updateData.start_date ? new Date(updateData.start_date) : undefined,
        end_date: updateData.end_date ? new Date(updateData.end_date) : undefined
      },
      include: {
        creator: {
          select: { user_id: true, name: true, username: true }
        },
        academic_year: true
      }
    });

    return project;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

/**
 * Add participants to project (with optional files)
 */
async function addParticipants(projectId, userIds, hoursPerPerson, academicYearId, projectType, files = []) {
  try {
    // Get project to check status
    const project = await prisma.projects.findUnique({
      where: { project_id: projectId },
      select: { status: true }
    });

    // Validate activity limits for new participants
    const activityType = PROJECT_TO_ACTIVITY_MAPPING[projectType];
    if (activityType) {
      for (const userId of userIds) {
        const validation = await validateActivityLimit(
          userId,
          academicYearId,
          activityType,
          hoursPerPerson
        );

        if (!validation.isValid) {
          const user = await prisma.users.findUnique({
            where: { user_id: userId },
            select: { name: true, username: true }
          });

          throw new Error(
            `ไม่สามารถเพิ่ม ${user?.name || user?.username} ได้ เนื่องจาก${validation.message}`
          );
        }
      }
    }

    // Add participants
    const participantRecords = [];
    for (const userId of userIds) {
      const participant = await prisma.project_participants.create({
        data: {
          project_id: projectId,
          user_id: userId,
          status: 'pending'
        }
      });
      participantRecords.push(participant);
    }

    // Add files for first participant if provided
    if (files.length > 0 && participantRecords.length > 0) {
      await prisma.project_files.createMany({
        data: files.map(file => ({
          project_id: projectId,
          file_path: file.file_path,
          document_type: file.document_type,
          note: file.note || null,
          added_with_participant_id: participantRecords[0].participant_id
        }))
      });
    }

    return participantRecords;
  } catch (error) {
    console.error('Error adding participants:', error);
    throw error;
  }
}

/**
 * Remove participant from project
 */
async function removeParticipant(projectId, userId) {
  try {
    await prisma.project_participants.delete({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: userId
        }
      }
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    throw error;
  }
}

/**
 * Approve project (Admin only) - Step 1
 */
async function approveProject(projectId, reviewedBy) {
  try {
    const project = await prisma.projects.update({
      where: { project_id: projectId },
      data: {
        status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
        rejection_reason: null
      },
      include: {
        creator: true,
        academic_year: true,
        participants: true
      }
    });

    return project;
  } catch (error) {
    console.error('Error approving project:', error);
    throw error;
  }
}

/**
 * Reject project (Admin only) - Step 1
 */
async function rejectProject(projectId, rejectionReason, reviewedBy) {
  try {
    const project = await prisma.projects.update({
      where: { project_id: projectId },
      data: {
        status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_by: reviewedBy,
        reviewed_at: new Date()
      },
      include: {
        creator: true,
        academic_year: true,
        participants: true
      }
    });

    return project;
  } catch (error) {
    console.error('Error rejecting project:', error);
    throw error;
  }
}

/**
 * Approve participants (Admin only) - Step 2
 */
async function approveParticipants(projectId, userIds) {
  try {
    // Get project to get hours_per_person
    const project = await prisma.projects.findUnique({
      where: { project_id: projectId },
      select: { hours_per_person: true, status: true }
    });

    if (!project) {
      throw new Error('ไม่พบโครงการ');
    }

    if (project.status !== 'approved') {
      throw new Error('ต้องอนุมัติโครงการก่อนจึงจะอนุมัติผู้เข้าร่วมได้');
    }

    // Update participants to approved
    await prisma.project_participants.updateMany({
      where: {
        project_id: projectId,
        user_id: { in: userIds }
      },
      data: {
        status: 'approved',
        hours_received: project.hours_per_person,
        approved_at: new Date()
      }
    });

    return await getProjectById(projectId);
  } catch (error) {
    console.error('Error approving participants:', error);
    throw error;
  }
}

/**
 * Reject participants (Admin only) - Step 2
 */
async function rejectParticipants(projectId, userIds, rejectionReason = null) {
  try {
    await prisma.project_participants.updateMany({
      where: {
        project_id: projectId,
        user_id: { in: userIds }
      },
      data: {
        status: 'rejected',
        rejection_reason: rejectionReason
      }
    });

    return await getProjectById(projectId);
  } catch (error) {
    console.error('Error rejecting participants:', error);
    throw error;
  }
}

/**
 * Revert approved participants back to pending (Admin only)
 */
async function revertParticipants(projectId, userIds) {
  try {
    await prisma.project_participants.updateMany({
      where: {
        project_id: projectId,
        user_id: { in: userIds },
        status: 'approved'
      },
      data: {
        status: 'pending',
        hours_received: null,
        approved_at: null
      }
    });

    return await getProjectById(projectId);
  } catch (error) {
    console.error('Error reverting participants:', error);
    throw error;
  }
}

/**
 * Submit draft project
 */
async function submitProject(projectId) {
  try {
    const project = await prisma.projects.update({
      where: { project_id: projectId },
      data: {
        status: 'submitted',
        submitted_at: new Date()
      },
      include: {
        creator: true,
        academic_year: true,
        participants: {
          include: {
            user: {
              select: { user_id: true, name: true, username: true, email: true }
            }
          }
        }
      }
    });

    return project;
  } catch (error) {
    console.error('Error submitting project:', error);
    throw error;
  }
}

/**
 * Resubmit rejected project
 */
async function resubmitProject(projectId) {
  try {
    const project = await prisma.projects.update({
      where: { project_id: projectId },
      data: {
        status: 'submitted',
        submitted_at: new Date(),
        resubmit_count: {
          increment: 1
        },
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null
      },
      include: {
        creator: true,
        academic_year: true,
        participants: {
          include: {
            user: {
              select: { user_id: true, name: true, username: true, email: true }
            }
          }
        }
      }
    });

    // Reset participant status back to pending
    await prisma.project_participants.updateMany({
      where: { project_id: projectId },
      data: {
        status: 'pending',
        hours_received: null,
        approved_at: null
      }
    });

    return project;
  } catch (error) {
    console.error('Error resubmitting project:', error);
    throw error;
  }
}

/**
 * Delete project
 */
async function deleteProject(projectId) {
  try {
    await prisma.projects.delete({
      where: { project_id: projectId }
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

/**
 * Upload project documents
 * @param {String} projectId - Project ID
 * @param {Array} files - Array of uploaded files
 * @returns {Promise<Object>} Updated project
 */
async function uploadProjectDocuments(projectId, files = []) {
  try {
    // Check if project exists
    const project = await prisma.projects.findUnique({
      where: { project_id: projectId }
    });

    if (!project) {
      throw new Error('ไม่พบโครงการ');
    }

    // Add files with added_with_participant_id = null (project documents)
    if (files.length > 0) {
      await prisma.project_files.createMany({
        data: files.map(file => ({
          project_id: projectId,
          file_path: file.file_path,
          document_type: file.document_type,
          note: file.note || null,
          added_with_participant_id: null // Project documents
        }))
      });
    }

    // Return updated project with files
    return await getProjectById(projectId);
  } catch (error) {
    console.error('Error uploading project documents:', error);
    throw error;
  }
}

/**
 * Search users for adding to project
 */
async function searchUsers(searchTerm) {
  try {
    const users = await prisma.users.findMany({
      where: {
        role: 'student',
        OR: [
          { username: searchTerm },
          { email: searchTerm },
          { name: { contains: searchTerm } }
        ]
      },
      select: {
        user_id: true,
        username: true,
        name: true,
        email: true,
        faculty: true,
        major: true
      },
      take: 10
    });

    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

module.exports = {
  createProject,
  getProjectById,
  getProjects,
  getUserParticipatedProjects,
  updateProject,
  addParticipants,
  removeParticipant,
  submitProject,
  resubmitProject,
  approveProject,
  rejectProject,
  approveParticipants,
  rejectParticipants,
  revertParticipants,
  deleteProject,
  searchUsers,
  uploadProjectDocuments
};
