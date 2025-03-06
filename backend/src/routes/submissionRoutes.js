const express = require("express");
const {
  submitCertificate,
  getUserSubmissions,
  getPendingSubmissions,
  reviewSubmission,
  updateSubmissionStatus,
  markUserSubmission,
  getPendingMarkedUsers,
  getCompletedUsers,
} = require("../controllers/submissionController");
const upload = require("../utils/fileUpload");

const router = express.Router();

// ✅ ยื่นใบรับรอง (User)
router.post("/", submitCertificate);

// ✅ ดูรายการที่เคยยื่นไปแล้ว
router.get("/", getUserSubmissions);

// ✅ ดูรายการใบรับรองที่รออนุมัติ
router.get("/pending", getPendingSubmissions);

// ✅ อนุมัติ / ปฏิเสธใบรับรอง
router.put("/:submission_detail_id/review", reviewSubmission);

// ✅ ยื่นใบรับรองพร้อมอัปโหลดไฟล์
router.post("/", upload.single("certificate"), submitCertificate);

// ✅ อัปเดตสถานะว่าผู้ใช้ครบ 36 ชั่วโมงหรือไม่
router.post("/update-status", updateSubmissionStatus);

// ✅ ผู้ใช้กดปุ่ม "ขอใช้ชั่วโมงที่มีอยู่"
router.post("/mark", markUserSubmission);

// ✅ Admin ดูรายชื่อที่ขอใช้ชั่วโมง (ยังไม่ครบ 36 ชั่วโมง)
router.get("/marked/pending", getPendingMarkedUsers);

// ✅ Admin ดูรายชื่อที่ได้รับอนุมัติครบ 36 ชั่วโมง
router.get("/marked/completed", getCompletedUsers);

module.exports = router;
