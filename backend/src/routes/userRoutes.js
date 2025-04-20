// routes/userRoutes.js
const express = require("express");
const { getUserApprovedHours, getUserScholarshipStatus } = require("../controllers/userController");

const router = express.Router();

router.get("/hours", getUserApprovedHours);
router.get("/scholarship", getUserScholarshipStatus);

module.exports = router;