const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ กำหนดที่เก็บไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { academic_year } = req.body; // ปีการศึกษาที่ได้รับจาก body
    if (!academic_year) return cb(new Error("Academic year is required"));

    const uploadPath = path.join("uploads", academic_year); // 📂 โฟลเดอร์ตามปีการศึกษา

    // ✅ ตรวจสอบว่ามีโฟลเดอร์หรือยัง ถ้ายังไม่มีให้สร้างใหม่
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const { username, submission_id } = req.body;
    if (!username || !submission_id)
      return cb(new Error("Username and Submission ID are required"));

    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${username}_${submission_id}${ext}`);
  },
});

// ✅ กำหนดเงื่อนไขการอัปโหลด
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัดขนาด 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|jpg|jpeg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) return cb(null, true);
    else return cb(new Error("Only PDF, JPG, JPEG, PNG files are allowed"));
  },
});

module.exports = upload;
