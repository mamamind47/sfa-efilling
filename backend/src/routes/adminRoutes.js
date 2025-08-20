const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const {
  getUserStatistics,
  getUserStatisticsExport,
  updateScholarshipStatus,
} = require("../controllers/adminController");

const {
  addSingleUser,
  updateUserRole,
  addMultipleStudentsFromExcel,
  listUsers,
  bulkUpdateMissingPhones,
} = require("../controllers/userManagementController");

// ส่วนวิเคราะห์/สถิติ
router.get("/user-statistics", getUserStatistics);
router.get("/user-statistics/export", getUserStatisticsExport);
router.post("/update-scholarship", updateScholarshipStatus);

// การจัดการผู้ใช้
router.post("/users/add", addSingleUser);
router.post("/users/update-role", updateUserRole);
router.post(
  "/users/import-excel",
  upload.single("file"),
  addMultipleStudentsFromExcel
);
router.get("/users", listUsers);

// Bulk update missing phones for users
router.post("/users/update-missing-phones", bulkUpdateMissingPhones);

module.exports = router;