const express = require("express");
const {
  getActiveStudents,
  getUserStatistics,
  getUserStatisticsExport
} = require("../controllers/adminController");

const router = express.Router();

router.post("/active-students", getActiveStudents);
router.get("/user-statistics", getUserStatistics);
router.get("/user-statistics/export", getUserStatisticsExport);

module.exports = router;