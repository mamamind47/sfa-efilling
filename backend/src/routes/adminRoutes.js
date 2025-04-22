const express = require("express");
const {
  getActiveStudents
} = require("../controllers/adminController");

const router = express.Router();

router.post("/active-students", getActiveStudents);

module.exports = router;