const prisma = require("../config/database");

// Activity type mapping
const ACTIVITY_TYPE_MAPPING = {
  "BloodDonate": "บริจาคโลหิต",
  "NSF": "ออมเงินกองทุนการออมแห่งชาติ", 
  "AOM YOUNG": "โครงการ AOM YOUNG",
  "ต้นไม้ล้านต้น ล้านความดี": "ต้นไม้ล้านต้น ล้านความดี",
  "religious": "กิจรรมทำนุบำรุงศาสนสถาน",
  "social-development": "กิจรรมพัฒนาชุมชนและโรงเรียน",
  "Certificate": "e-Learning"
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { academicYear, timeFilter } = req.query;

    // Build where clause for academic year filter
    const whereClause = academicYear ? {
      academic_years: {
        year_name: academicYear
      }
    } : {};

    // 1. Volunteer Activity Statistics
    const activityStats = await getActivityStatistics(whereClause);
    
    // 2. Student Statistics  
    const studentStats = await getStudentStatistics();

    // 3. Request Timeline Statistics
    const timelineStats = await getTimelineStatistics(whereClause, timeFilter);

    res.status(200).json({
      activityStats,
      studentStats,
      timelineStats
    });

  } catch (err) {
    console.error("Dashboard stats error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get activity statistics
async function getActivityStatistics(whereClause) {
  // Submission counts by type and status
  const submissionsByType = await prisma.submissions.groupBy({
    by: ['type', 'status'],
    where: whereClause,
    _count: {
      submission_id: true,
    },
    _sum: {
      hours: true,
    }
  });

  // Process data by activity type
  const activityData = {};
  
  for (const item of submissionsByType) {
    const activityName = ACTIVITY_TYPE_MAPPING[item.type] || item.type;
    
    if (!activityData[activityName]) {
      activityData[activityName] = {
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        totalHours: 0,
        approvedHours: 0
      };
    }
    
    const count = item._count.submission_id;
    const hours = item._sum.hours || 0;
    
    activityData[activityName].total += count;
    activityData[activityName].totalHours += hours;
    
    if (item.status === 'approved') {
      activityData[activityName].approved += count;
      activityData[activityName].approvedHours += hours;
    } else if (item.status === 'rejected') {
      activityData[activityName].rejected += count;
    } else {
      activityData[activityName].pending += count;
    }
  }

  // Overall submission statistics
  const totalSubmissions = await prisma.submissions.count({ where: whereClause });
  const approvedSubmissions = await prisma.submissions.count({ 
    where: { ...whereClause, status: 'approved' } 
  });
  const rejectedSubmissions = await prisma.submissions.count({ 
    where: { ...whereClause, status: 'rejected' } 
  });
  const pendingSubmissions = totalSubmissions - approvedSubmissions - rejectedSubmissions;

  return {
    byType: activityData,
    overall: {
      total: totalSubmissions,
      approved: approvedSubmissions,
      rejected: rejectedSubmissions,
      pending: pendingSubmissions
    }
  };
}

// Get student statistics
async function getStudentStatistics() {
  // Current students by scholarship type (normal + on_leave + null)
  const activeStudentsByScholarship = await prisma.users.groupBy({
    by: ['scholarship_type'],
    where: {
      role: 'student',
      OR: [
        { studentStatusName: 'normal' },
        { studentStatusName: 'on_leave' },
        { studentStatusName: null }
      ]
    },
    _count: {
      user_id: true,
    }
  });

  // All students by scholarship type 
  const allStudentsByScholarship = await prisma.users.groupBy({
    by: ['scholarship_type'],
    where: {
      role: 'student'
    },
    _count: {
      user_id: true,
    }
  });

  // Students by status - include users with null studentStatusName
  const studentsByStatus = await prisma.users.groupBy({
    by: ['studentStatusName'],
    where: {
      role: 'student'
    },
    _count: {
      user_id: true,
    }
  });

  // Current students by faculty (active students only)
  const activeStudentsByFaculty = await prisma.users.groupBy({
    by: ['faculty'],
    where: {
      role: 'student',
      faculty: {
        not: null
      },
      OR: [
        { studentStatusName: 'normal' },
        { studentStatusName: 'on_leave' },
        { studentStatusName: null }
      ]
    },
    _count: {
      user_id: true,
    }
  });

  // All students by faculty
  const allStudentsByFaculty = await prisma.users.groupBy({
    by: ['faculty'],
    where: {
      role: 'student',
      faculty: {
        not: null
      }
    },
    _count: {
      user_id: true,
    }
  });

  // Also get count of users with null studentStatusName separately
  const nullStatusCount = await prisma.users.count({
    where: {
      role: 'student',
      studentStatusName: null
    }
  });

  // Process active scholarship type data (current students only)
  const activeScholarshipStats = {};
  let totalActive = 0;

  for (const item of activeStudentsByScholarship) {
    const scholarshipType = item.scholarship_type;
    const count = item._count.user_id;
    
    if (scholarshipType) {
      const displayName = scholarshipType === 'TYPE1' ? 'ลักษณะที่ 1' :
                         scholarshipType === 'TYPE2' ? 'ลักษณะที่ 2' :
                         scholarshipType === 'TYPE3' ? 'ลักษณะที่ 3' : 
                         scholarshipType;
      activeScholarshipStats[displayName] = count;
    } else {
      activeScholarshipStats['ไม่ระบุ'] = count;
    }
    totalActive += count;
  }

  // Process all scholarship type data (all students)
  const allScholarshipStats = {};
  let totalAll = 0;

  for (const item of allStudentsByScholarship) {
    const scholarshipType = item.scholarship_type;
    const count = item._count.user_id;
    
    if (scholarshipType) {
      const displayName = scholarshipType === 'TYPE1' ? 'ลักษณะที่ 1' :
                         scholarshipType === 'TYPE2' ? 'ลักษณะที่ 2' :
                         scholarshipType === 'TYPE3' ? 'ลักษณะที่ 3' : 
                         scholarshipType;
      allScholarshipStats[displayName] = count;
    } else {
      allScholarshipStats['ไม่ระบุ'] = count;
    }
    totalAll += count;
  }

  // Process status data
  const statusStats = {};
  for (const item of studentsByStatus) {
    const status = item.studentStatusName;
    const count = item._count.user_id;
    
    if (status) {  // Only include non-null statuses
      const displayName = status === 'normal' ? 'ปกติ' :
                         status === 'graduated' ? 'สำเร็จการศึกษา' :
                         status === 'dropped' ? 'ตกออก' :
                         status === 'withdrawn' ? 'ลาออก' :
                         status === 'on_leave' ? 'ลาพัก' :
                         status === 'expelled' ? 'คัดชื่อออก' :
                         status === 'transferred' ? 'โอนย้ายหลักสูตร' :
                         status === 'deceased' ? 'เสียชีวิต' :
                         status;
      statusStats[displayName] = count;
    }
  }
  
  // Add null status count
  if (nullStatusCount > 0) {
    statusStats['ไม่ระบุ'] = nullStatusCount;
  }

  // Process active students faculty data
  const activeFacultyStats = {};
  for (const item of activeStudentsByFaculty) {
    const faculty = item.faculty;
    const count = item._count.user_id;
    
    if (faculty) {
      activeFacultyStats[faculty] = count;
    }
  }

  // Process all students faculty data
  const allFacultyStats = {};
  for (const item of allStudentsByFaculty) {
    const faculty = item.faculty;
    const count = item._count.user_id;
    
    if (faculty) {
      allFacultyStats[faculty] = count;
    }
  }

  return {
    activeStudents: {
      total: totalActive,
      byScholarshipType: activeScholarshipStats,
      byFaculty: activeFacultyStats
    },
    allStudents: {
      total: totalAll,
      byStatus: statusStats,
      byScholarshipType: allScholarshipStats,
      byFaculty: allFacultyStats
    }
  };
}

// Get timeline statistics for submissions
async function getTimelineStatistics(whereClause, timeFilter = '1year') {
  // Calculate date range based on filter
  const now = new Date();
  let startDate;
  
  switch (timeFilter) {
    case '7days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1year':
    default:
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }

  // Add date filter to whereClause
  const timelineWhereClause = {
    ...whereClause,
    created_at: {
      gte: startDate
    }
  };

  const timelineData = await prisma.submissions.findMany({
    where: timelineWhereClause,
    select: {
      created_at: true,
      status: true
    },
    orderBy: {
      created_at: 'asc'
    }
  });

  // Process timeline data based on time filter
  const groupedData = {};
  
  for (const submission of timelineData) {
    const date = new Date(submission.created_at);
    let groupKey;
    
    // Group by different intervals based on filter
    if (timeFilter === '7days') {
      groupKey = date.toISOString().split('T')[0]; // Daily grouping
    } else if (timeFilter === '1month') {
      groupKey = date.toISOString().split('T')[0]; // Daily grouping
    } else if (timeFilter === '3months') {
      // Weekly grouping
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      groupKey = weekStart.toISOString().split('T')[0];
    } else {
      // Monthly grouping for 1year
      groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0
      };
    }
    
    groupedData[groupKey].total++;
    
    if (submission.status === 'approved') {
      groupedData[groupKey].approved++;
    } else if (submission.status === 'rejected') {
      groupedData[groupKey].rejected++;
    } else {
      groupedData[groupKey].pending++;
    }
  }

  // Convert to array format for easier charting
  const timelineArray = Object.entries(groupedData)
    .map(([period, data]) => ({
      เดือน: period,
      ...data
    }))
    .sort((a, b) => a.เดือน.localeCompare(b.เดือน));

  return timelineArray;
}

// Get available academic years
exports.getAcademicYears = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const academicYears = await prisma.academic_years.findMany({
      select: {
        academic_year_id: true,
        year_name: true
      },
      orderBy: {
        year_name: 'desc'
      }
    });

    res.status(200).json(academicYears);
  } catch (err) {
    console.error("Academic years error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get volunteer activity overview
exports.getVolunteerOverview = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { academicYear, viewMode = 'count' } = req.query;

    // Build where clause for academic year filter
    const whereClause = academicYear ? {
      academic_years: {
        year_name: academicYear
      }
    } : {};

    // 1. Activity Sources (MOD LINK vs System)
    const activitySources = await getActivitySources(whereClause, viewMode);
    
    // 2. Activity Types
    const activityTypes = await getActivityTypes(whereClause, viewMode);

    res.status(200).json({
      activitySources,
      activityTypes
    });

  } catch (err) {
    console.error("Volunteer overview error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get activity sources statistics
async function getActivitySources(whereClause, viewMode) {
  // From MOD LINK (linked_volunteer table)
  // Filter by year if academicYear is provided
  const modLinkWhere = {};
  if (whereClause.academic_years) {
    modLinkWhere.year = whereClause.academic_years.year_name;
  }
  
  if (viewMode === 'count') {
    // For project count mode: Group by project_name, hours, and year to count unique activities
    const modLinkActivities = await prisma.linked_volunteer.groupBy({
      by: ['project_name', 'hours', 'year'],
      where: {
        hours: { gt: 0 }, // Only activities with hours > 0
        ...modLinkWhere
      },
      _count: {
        id: true
      }
    });
    
    const modLinkCount = modLinkActivities.length; // Count unique combinations
    const modLinkHours = 0; // Not used in count mode
    
    // From System (submissions table)
    const systemActivities = await prisma.submissions.findMany({
      where: {
        status: 'approved', // Only approved submissions
        ...whereClause
      },
      select: {
        hours: true
      }
    });

    const systemCount = systemActivities.length;
    const systemHours = systemActivities.reduce((sum, activity) => sum + (activity.hours || 0), 0);

    return {
      'จาก MOD LINK': modLinkCount,
      'จากระบบ': systemCount
    };
  } else {
    // For hours mode: Get all records and sum hours
    const modLinkActivities = await prisma.linked_volunteer.findMany({
      where: {
        hours: { gt: 0 }, // Only activities with hours > 0
        ...modLinkWhere
      },
      select: {
        hours: true
      }
    });

    // From System (submissions table)
    const systemActivities = await prisma.submissions.findMany({
      where: {
        status: 'approved', // Only approved submissions
        ...whereClause
      },
      select: {
        hours: true
      }
    });

    const modLinkHours = modLinkActivities.reduce((sum, activity) => sum + (activity.hours || 0), 0);
    const systemHours = systemActivities.reduce((sum, activity) => sum + (activity.hours || 0), 0);

    return {
      'จาก MOD LINK': modLinkHours,
      'จากระบบ': systemHours
    };
  }
}

// Get activity types statistics
async function getActivityTypes(whereClause, viewMode) {
  // Activity type mapping for submissions
  const SUBMISSION_TYPE_MAPPING = {
    'BloodDonate': 'กิจกรรมบริจาคโลหิต',
    'religious': 'กิจกรรมจิตอาสาพัฒนาชุมชนและสังคมภายนอกมหาวิทยาลัยฯ',
    'social-development': 'กิจกรรมจิตอาสาพัฒนาชุมชนและสังคมภายนอกมหาวิทยาลัยฯ'
  };

  // Default type for other submissions
  const DEFAULT_SUBMISSION_TYPE = 'กิจกรรมที่จัดโดยทางกองทุนกู้ยืมฯ (กยศ.)';

  // Get from linked_volunteer
  // Filter by year if academicYear is provided
  const modLinkWhere = {};
  if (whereClause.academic_years) {
    modLinkWhere.year = whereClause.academic_years.year_name;
  }
  
  const linkedVolunteerData = await prisma.linked_volunteer.findMany({
    where: {
      hours: { gt: 0 },
      ...modLinkWhere
    },
    select: {
      activity_type: true,
      hours: true
    }
  });

  // Get from submissions
  const submissionsData = await prisma.submissions.findMany({
    where: {
      status: 'approved',
      ...whereClause
    },
    select: {
      type: true,
      hours: true
    }
  });

  // Process activity types
  const activityTypeStats = {};

  // Process linked_volunteer data
  for (const activity of linkedVolunteerData) {
    if (activity.activity_type) {
      // Split by comma if multiple types
      const types = activity.activity_type.split(',').map(type => type.trim());
      
      for (const type of types) {
        // Replace "-" with "ไม่มีหมวดหมู่"
        const displayType = type === '-' ? 'ไม่มีหมวดหมู่' : type;
        
        if (!activityTypeStats[displayType]) {
          activityTypeStats[displayType] = { count: 0, hours: 0 };
        }
        activityTypeStats[displayType].count += 1;
        activityTypeStats[displayType].hours += activity.hours || 0;
      }
    } else {
      // If no activity_type, treat as "ไม่มีหมวดหมู่"
      const displayType = 'ไม่มีหมวดหมู่';
      if (!activityTypeStats[displayType]) {
        activityTypeStats[displayType] = { count: 0, hours: 0 };
      }
      activityTypeStats[displayType].count += 1;
      activityTypeStats[displayType].hours += activity.hours || 0;
    }
  }

  // Process submissions data
  for (const submission of submissionsData) {
    const mappedType = SUBMISSION_TYPE_MAPPING[submission.type] || DEFAULT_SUBMISSION_TYPE;
    
    if (!activityTypeStats[mappedType]) {
      activityTypeStats[mappedType] = { count: 0, hours: 0 };
    }
    activityTypeStats[mappedType].count += 1;
    activityTypeStats[mappedType].hours += submission.hours || 0;
  }

  // Convert to the format expected by frontend
  const result = {};
  for (const [type, data] of Object.entries(activityTypeStats)) {
    result[type] = viewMode === 'hours' ? data.hours : data.count;
  }

  return result;
}