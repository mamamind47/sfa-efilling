const express = require("express");
const { callback } = require("../controllers/authController");

const router = express.Router();

// รับข้อมูลจาก /callback เพื่อเข้าสู่ระบบหรือสมัครสมาชิก
router.post("/callback", callback);

module.exports = router;