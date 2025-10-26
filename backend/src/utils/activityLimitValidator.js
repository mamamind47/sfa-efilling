const prisma = require('../config/database');
const activityLimitsService = require('../services/activityLimitsService');

// Activity type mapping from submission type to activity enum (based on submissionService.js)
const activityTypeMapping = {
  'Certificate': 'Certificate',
  'BloodDonate': 'BloodDonate', 
  'NSF': 'NSF',
  'AOM YOUNG': 'AOM_YOUNG',
  'religious': 'religious',
  'social-development': 'social_development',
  'ต้นไม้ล้านต้น ล้านความดี': 'tree_planting'
};

/**
 * Check if submission exceeds activity limit
 * @param {string} userId - User ID
 * @param {string} academicYearId - Academic Year ID
 * @param {string} submissionType - Type of submission
 * @param {number} requestedHours - Hours being requested
 * @returns {Promise<{isValid: boolean, limit: number|null, current: number, message: string}>}
 */
const validateActivityLimit = async (userId, academicYearId, submissionType, requestedHours) => {
  try {
    // Map submission type to activity type enum
    const activityType = activityTypeMapping[submissionType];
    
    if (!activityType) {
      // If no mapping found, allow submission (no limit)
      return {
        isValid: true,
        limit: null,
        current: 0,
        message: 'No limit set for this activity type'
      };
    }

    // Get activity limit for this type and academic year
    const limit = await prisma.activity_limits.findUnique({
      where: {
        activity_type_academic_year_id: {
          activity_type: activityType,
          academic_year_id: academicYearId
        }
      }
    });

    if (!limit || !limit.is_active) {
      // No limit set or limit is inactive
      return {
        isValid: true,
        limit: null,
        current: 0,
        message: 'No active limit for this activity type'
      };
    }

    // Calculate current hours (approved + submitted) for this activity type
    const submissions = await prisma.submissions.findMany({
      where: {
        user_id: userId,
        academic_year_id: academicYearId,
        type: submissionType,
        status: {
          in: ['approved', 'submitted'] // Count both approved and pending submissions
        }
      }
    });

    const currentHours = submissions.reduce((total, submission) => {
      // Use hours for approved submissions, or hours_requested for pending
      return total + (submission.hours || submission.hours_requested || 0);
    }, 0);

    // Check if adding requested hours would exceed limit
    const totalAfterSubmission = currentHours + requestedHours;
    const isValid = totalAfterSubmission <= limit.max_hours;

    return {
      isValid,
      limit: limit.max_hours,
      current: currentHours,
      remaining: limit.max_hours - currentHours,
      requested: requestedHours,
      totalAfter: totalAfterSubmission,
      message: isValid 
        ? 'Submission within limit'
        : `Submission would exceed limit. Current: ${currentHours}/${limit.max_hours} hours, Requested: ${requestedHours} hours`
    };

  } catch (error) {
    console.error('Error validating activity limit:', error);
    // In case of error, allow submission to avoid blocking users
    return {
      isValid: true,
      limit: null,
      current: 0,
      message: 'Error checking limit, allowing submission',
      error: error.message
    };
  }
};

/**
 * Get user's activity limits and usage for all activity types in an academic year
 * @param {string} userId - User ID
 * @param {string} academicYearId - Academic Year ID
 * @returns {Promise<Array>} Array of activity limits with usage data
 */
const getUserActivityLimitsStatus = async (userId, academicYearId) => {
  try {
    // Get all activity limits for the academic year
    const limits = await prisma.activity_limits.findMany({
      where: {
        academic_year_id: academicYearId,
        is_active: true
      }
    });

    const statusArray = [];

    for (const limit of limits) {
      // Find corresponding submission type
      const submissionType = Object.keys(activityTypeMapping).find(
        key => activityTypeMapping[key] === limit.activity_type
      );

      if (submissionType) {
        // Calculate current hours (approved + submitted)
        const submissions = await prisma.submissions.findMany({
          where: {
            user_id: userId,
            academic_year_id: academicYearId,
            type: submissionType,
            status: {
              in: ['approved', 'submitted'] // Count both approved and pending submissions
            }
          }
        });

        const currentHours = submissions.reduce((total, submission) => {
          // Use hours for approved submissions, or hours_requested for pending
          return total + (submission.hours || submission.hours_requested || 0);
        }, 0);

        statusArray.push({
          activity_type: limit.activity_type,
          submission_type: submissionType,
          max_hours: limit.max_hours,
          current_hours: currentHours,
          remaining_hours: Math.max(0, limit.max_hours - currentHours),
          percentage: Math.min(100, Math.round((currentHours / limit.max_hours) * 100)),
          is_exceeded: currentHours > limit.max_hours
        });
      }
    }

    return statusArray;
  } catch (error) {
    console.error('Error getting user activity limits status:', error);
    throw error;
  }
};

module.exports = {
  validateActivityLimit,
  getUserActivityLimitsStatus,
  activityTypeMapping
};