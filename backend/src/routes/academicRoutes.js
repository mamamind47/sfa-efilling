const express = require("express");
const {
  getAllAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  toggleAcademicYearStatus,
} = require("../controllers/academicController");

const router = express.Router();

// ✅ ดึงปีการศึกษาทั้งหมด
router.get("/", getAllAcademicYears);

// ✅ สร้างปีการศึกษาใหม่ (Admin)
router.post("/", createAcademicYear);

// ✅ แก้ไขปีการศึกษา (Admin)
router.put("/:academic_year_id", updateAcademicYear);

// ✅ ปิด/เปิดปีการศึกษา (Admin)
router.put("/:academic_year_id/status", toggleAcademicYearStatus);

module.exports = router;
