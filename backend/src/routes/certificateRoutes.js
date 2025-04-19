const express = require("express");
const {
  getAllCertificates,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  toggleCertificateStatus,
  uploadCertificateFile,
} = require("../controllers/certificateController"); // ✅ ตรวจสอบว่า import ฟังก์ชันถูกต้อง
const multer = require("multer");


const router = express.Router();

// ✅ ดึงรายการใบรับรองทั้งหมด
router.get("/", getAllCertificates);

// ✅ สร้างใบรับรองใหม่ (Admin เท่านั้น)
router.post("/", createCertificate);

// ✅ แก้ไขใบรับรอง (Admin เท่านั้น)
router.put("/:certificate_type_id", updateCertificate);

// ✅ ลบใบรับรอง (Admin เท่านั้น)
router.delete("/:certificate_type_id", deleteCertificate);

// ✅ ปิด/เปิดใช้งานใบรับรอง
router.put("/:certificate_type_id/status", toggleCertificateStatus);


const upload = multer({ dest: "uploads/" });
router.post("/upload", upload.single("file"), uploadCertificateFile);

module.exports = router;