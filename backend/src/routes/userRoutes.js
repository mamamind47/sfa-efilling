// routes/userRoutes.js
const express = require("express");
const { getUserApprovedHours } = require("../controllers/userController");

const router = express.Router();

router.get("/hours", getUserApprovedHours);

module.exports = router;