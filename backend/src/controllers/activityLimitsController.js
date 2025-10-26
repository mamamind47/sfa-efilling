const activityLimitsService = require('../services/activityLimitsService');
const { getUserActivityLimitsStatus, validateActivityLimit } = require('../utils/activityLimitValidator');

// ================================
// ACTIVITY LIMITS CONTROLLERS
// ================================

const getAllLimits = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { academicYearId } = req.query;
    const limits = await activityLimitsService.getAllLimits(academicYearId);
    res.status(200).json(limits);
  } catch (error) {
    console.error('Error fetching activity limits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getLimitsByAcademicYear = async (req, res) => {
  try {
    const { academicYearId } = req.params;
    const limits = await activityLimitsService.getLimitsByAcademicYear(academicYearId);
    res.status(200).json(limits);
  } catch (error) {
    console.error('Error fetching limits by academic year:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getActivityTypesWithLimits = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { academicYearId } = req.params;
    const activityTypes = await activityLimitsService.getActivityTypesWithLimits(academicYearId);
    res.status(200).json(activityTypes);
  } catch (error) {
    console.error('Error fetching activity types with limits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createLimit = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { activity_type, max_hours, academic_year_id, description } = req.body;

    if (!activity_type || !max_hours || !academic_year_id) {
      return res.status(400).json({ 
        error: 'Activity type, max hours, and academic year are required' 
      });
    }

    if (max_hours < 0) {
      return res.status(400).json({ error: 'Max hours must be non-negative' });
    }

    const limit = await activityLimitsService.createLimit({
      activity_type,
      max_hours: parseInt(max_hours),
      academic_year_id,
      description
    });

    res.status(201).json(limit);
  } catch (error) {
    console.error('Error creating activity limit:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Limit for this activity type and academic year already exists' 
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateLimit = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { limitId } = req.params;
    const { max_hours, description, is_active } = req.body;

    const updateData = {};
    if (max_hours !== undefined) {
      if (max_hours < 0) {
        return res.status(400).json({ error: 'Max hours must be non-negative' });
      }
      updateData.max_hours = parseInt(max_hours);
    }
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    const limit = await activityLimitsService.updateLimit(limitId, updateData);
    res.status(200).json(limit);
  } catch (error) {
    console.error('Error updating activity limit:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Activity limit not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteLimit = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { limitId } = req.params;
    await activityLimitsService.deleteLimit(limitId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting activity limit:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Activity limit not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

const upsertLimit = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { activity_type, academic_year_id, max_hours, description } = req.body;

    if (!activity_type || !academic_year_id || max_hours === undefined) {
      return res.status(400).json({ 
        error: 'Activity type, academic year, and max hours are required' 
      });
    }

    if (max_hours < 0) {
      return res.status(400).json({ error: 'Max hours must be non-negative' });
    }

    const limit = await activityLimitsService.upsertLimit(
      activity_type,
      academic_year_id,
      parseInt(max_hours),
      description
    );

    res.status(200).json(limit);
  } catch (error) {
    console.error('Error upserting activity limit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const batchUpsertLimits = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { limits, academic_year_id } = req.body;

    if (!limits || !Array.isArray(limits) || !academic_year_id) {
      return res.status(400).json({ 
        error: 'Limits array and academic year are required' 
      });
    }

    const results = [];
    
    for (const limitData of limits) {
      const { activity_type, max_hours, description } = limitData;
      
      if (max_hours !== null && max_hours !== undefined && max_hours >= 0) {
        const limit = await activityLimitsService.upsertLimit(
          activity_type,
          academic_year_id,
          parseInt(max_hours),
          description
        );
        results.push(limit);
      }
    }

    res.status(200).json({ 
      message: `Successfully updated ${results.length} activity limits`,
      limits: results 
    });
  } catch (error) {
    console.error('Error batch upserting activity limits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserLimitsStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { academicYearId } = req.params;

    const status = await getUserActivityLimitsStatus(userId, academicYearId);
    res.status(200).json(status);
  } catch (error) {
    console.error('Error fetching user limits status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const validateSubmissionLimit = async (req, res) => {
  try {
    const userId = req.user.id; // Fix: use 'id' instead of 'user_id'
    const { academicYearId, submissionType, requestedHours } = req.body;

    if (!academicYearId || !submissionType || !requestedHours) {
      return res.status(400).json({
        error: 'Academic year ID, submission type, and requested hours are required'
      });
    }

    const validation = await validateActivityLimit(
      userId,
      academicYearId, 
      submissionType,
      parseInt(requestedHours)
    );

    res.status(200).json(validation);
  } catch (error) {
    console.error('Error validating submission limit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllLimits,
  getLimitsByAcademicYear,
  getActivityTypesWithLimits,
  createLimit,
  updateLimit,
  deleteLimit,
  upsertLimit,
  batchUpsertLimits,
  getUserLimitsStatus,
  validateSubmissionLimit
};