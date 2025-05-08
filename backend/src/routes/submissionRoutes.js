const express = require("express");
const {
  submitSubmission,
  getUserSubmissions,
  getPendingSubmissions,
  reviewSubmission,
  batchReviewSubmissions,
  getPendingCertificatesByUser
} = require("../controllers/submissionController");
const upload = require("../utils/fileUpload");

const router = express.Router();

// ✅ ยื่น Submission พร้อมอัปโหลดไฟล์ (Certificate, Blood Donate ฯลฯ)
router.post("/", upload.array("files", 10), submitSubmission);

// ✅ ดูรายการ Submission ของผู้ใช้
router.get("/", getUserSubmissions);

// ✅ Admin ดูรายการที่รออนุมัติทั้งหมด
router.get("/pending", getPendingSubmissions);

// ✅ Admin อนุมัติ / ปฏิเสธ Submission (พร้อมเหตุผล และชั่วโมงถ้าไม่ใช่ Certificate)
router.put("/:submission_id/review", reviewSubmission);

router.post("/batch-review", batchReviewSubmissions);

router.get('/submission/user/:userId/pending-certificates',getPendingCertificatesByUser);

module.exports = router;
