// src/routes/linkRoutes.js
const express = require("express");
const multer = require("multer");
const router = express.Router();
const linkController = require("../controllers/linkController");

const upload = multer({ storage: multer.memoryStorage() });

// Route POST /upload
router.post(
  "/upload",
  upload.single("volunteerFile"),
  linkController.uploadVolunteerHours
);

module.exports = router;