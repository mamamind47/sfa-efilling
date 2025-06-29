const express = require("express");
const {
  getActiveStudents,
  getUserStatistics,
  getUserStatisticsExport,
  updateScholarshipStatus,
} = require("../controllers/adminController");

const router = express.Router();

router.post("/active-students", getActiveStudents);
router.get("/user-statistics", getUserStatistics);
router.get("/user-statistics/export", getUserStatisticsExport);
router.post("/update-scholarship", updateScholarshipStatus);

module.exports = router;