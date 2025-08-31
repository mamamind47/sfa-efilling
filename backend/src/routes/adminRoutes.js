const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const prisma = require("../config/database");

const {
  getUserStatistics,
  getUserStatisticsExport,
  updateScholarshipStatus,
} = require("../controllers/adminController");

const {
  getDashboardStats,
  getAcademicYears,
  getVolunteerOverview,
} = require("../controllers/dashboardController");

const {
  addSingleUser,
  updateUserRole,
  updateScholarshipType,
  addMultipleStudentsFromExcel,
  listUsers,
  bulkUpdateMissingPhones,
  bulkUpdateAllStudentStatus,
  bulkUpdateNullStatusStudents,
} = require("../controllers/userManagementController");

const {
  searchUsers,
  sendToUsers,
  sendToGroup,
  getEmailPreview,
} = require("../controllers/emailController");

// ส่วนวิเคราะห์/สถิติ
router.get("/user-statistics", getUserStatistics);
router.get("/user-statistics/export", getUserStatisticsExport);
router.post("/update-scholarship", updateScholarshipStatus);

// Dashboard
router.get("/dashboard/stats", getDashboardStats);
router.get("/dashboard/academic-years", getAcademicYears);
router.get("/dashboard/volunteer-overview", getVolunteerOverview);

// การจัดการผู้ใช้
router.post("/users/add", addSingleUser);
router.post("/users/update-role", updateUserRole);
router.post("/users/update-scholarship-type", updateScholarshipType);
router.post(
  "/users/import-excel",
  upload.single("file"),
  addMultipleStudentsFromExcel
);
router.get("/users", listUsers);

// Bulk update missing phones for users
router.post("/users/update-missing-phones", bulkUpdateMissingPhones);

// Bulk update all student status information
router.post("/users/bulk-update-status", bulkUpdateAllStudentStatus);

// Bulk update only students with null status
router.post("/users/bulk-update-null-status", bulkUpdateNullStatusStudents);

// Email management routes
router.get("/email/search-users", searchUsers);
router.post("/email/send-to-users", sendToUsers);
router.post("/email/send-to-group", sendToGroup);
router.post("/email/preview", getEmailPreview);

// Get faculties for email filtering
router.get("/faculties", async (req, res) => {
  try {
    const faculties = await prisma.users.findMany({
      where: {
        faculty: { not: null }
      },
      select: { faculty: true },
      distinct: ['faculty']
    });
    
    res.json(faculties.map(f => f.faculty).filter(Boolean).sort());
  } catch (error) {
    console.error('Failed to fetch faculties:', error);
    res.status(500).json({ error: 'Failed to fetch faculties' });
  }
});

// Get academic years for history filtering
router.get("/academic-years", async (req, res) => {
  try {
    const academicYears = await prisma.academic_years.findMany({
      select: {
        academic_year_id: true,
        year_name: true
      },
      orderBy: { year_name: 'desc' }
    });
    
    res.json(academicYears);
  } catch (error) {
    console.error('Failed to fetch academic years:', error);
    res.status(500).json({ error: 'Failed to fetch academic years' });
  }
});

// SSE endpoint for bulk update progress (moved to sseRoutes.js to avoid auth middleware)

// Manual trigger for deadline warnings (testing only)
router.post("/test-deadline-warnings", async (req, res) => {
  try {
    const cronService = require("../services/cronService");
    await cronService.triggerDeadlineCheck();
    res.json({ message: "Deadline warning check triggered successfully" });
  } catch (error) {
    console.error('Error triggering deadline check:', error);
    res.status(500).json({ error: 'Failed to trigger deadline check' });
  }
});

module.exports = router;