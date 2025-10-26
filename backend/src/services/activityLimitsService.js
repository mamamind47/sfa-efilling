const prisma = require('../config/database');

// ================================
// ACTIVITY LIMITS SERVICES
// ================================

const getAllLimits = async (academicYearId = null) => {
  try {
    const where = academicYearId ? { academic_year_id: academicYearId } : {};
    
    const limits = await prisma.activity_limits.findMany({
      where,
      include: {
        academic_year: {
          select: {
            year_name: true
          }
        }
      },
      orderBy: [
        { academic_year: { year_name: 'desc' } },
        { activity_type: 'asc' }
      ]
    });

    return limits;
  } catch (error) {
    console.error('Error fetching activity limits:', error);
    throw error;
  }
};

const getLimitsByAcademicYear = async (academicYearId) => {
  try {
    const limits = await prisma.activity_limits.findMany({
      where: {
        academic_year_id: academicYearId,
        is_active: true
      },
      orderBy: { activity_type: 'asc' }
    });

    // Convert to object format for easier frontend consumption
    const limitsObject = {};
    limits.forEach(limit => {
      limitsObject[limit.activity_type] = limit.max_hours;
    });

    return limitsObject;
  } catch (error) {
    console.error('Error fetching limits by academic year:', error);
    throw error;
  }
};

const createLimit = async (limitData) => {
  try {
    const limit = await prisma.activity_limits.create({
      data: limitData,
      include: {
        academic_year: {
          select: {
            year_name: true
          }
        }
      }
    });
    return limit;
  } catch (error) {
    console.error('Error creating activity limit:', error);
    throw error;
  }
};

const updateLimit = async (limitId, updateData) => {
  try {
    const limit = await prisma.activity_limits.update({
      where: { limit_id: limitId },
      data: updateData,
      include: {
        academic_year: {
          select: {
            year_name: true
          }
        }
      }
    });
    return limit;
  } catch (error) {
    console.error('Error updating activity limit:', error);
    throw error;
  }
};

const deleteLimit = async (limitId) => {
  try {
    await prisma.activity_limits.delete({
      where: { limit_id: limitId }
    });
  } catch (error) {
    console.error('Error deleting activity limit:', error);
    throw error;
  }
};

const upsertLimit = async (activityType, academicYearId, maxHours, description = null) => {
  try {
    const limit = await prisma.activity_limits.upsert({
      where: {
        activity_type_academic_year_id: {
          activity_type: activityType,
          academic_year_id: academicYearId
        }
      },
      update: {
        max_hours: maxHours,
        description: description,
        updated_at: new Date()
      },
      create: {
        activity_type: activityType,
        academic_year_id: academicYearId,
        max_hours: maxHours,
        description: description
      },
      include: {
        academic_year: {
          select: {
            year_name: true
          }
        }
      }
    });
    return limit;
  } catch (error) {
    console.error('Error upserting activity limit:', error);
    throw error;
  }
};

const getActivityTypesWithLimits = async (academicYearId) => {
  try {
    // Get all possible activity types (based on ACTIVITY_TYPE_MAPPING from submissionService.js)
    const activityTypes = [
      'Certificate', 
      'BloodDonate',
      'NSF',
      'AOM_YOUNG',
      'religious',
      'social_development',
      'tree_planting'
    ];

    // Get existing limits
    const existingLimits = await prisma.activity_limits.findMany({
      where: { 
        academic_year_id: academicYearId,
        is_active: true 
      }
    });

    // Create map of existing limits
    const limitsMap = {};
    existingLimits.forEach(limit => {
      limitsMap[limit.activity_type] = limit;
    });

    // Return all activity types with their limits (or null if no limit set)
    return activityTypes.map(type => ({
      activity_type: type,
      limit: limitsMap[type] || null
    }));
  } catch (error) {
    console.error('Error fetching activity types with limits:', error);
    throw error;
  }
};

module.exports = {
  getAllLimits,
  getLimitsByAcademicYear,
  createLimit,
  updateLimit,
  deleteLimit,
  upsertLimit,
  getActivityTypesWithLimits
};