// routes/userRoutes.js
const express = require("express");
const { getUserApprovedHours, getUserScholarshipStatus, userInfo } = require("../controllers/userController");

const router = express.Router();

router.get("/hours", getUserApprovedHours);
router.get("/scholarship", getUserScholarshipStatus);
router.get("/info", userInfo);

module.exports = router;