const express = require("express");
const router = express.Router();
const { bulkUpdateProgress } = require("../controllers/userManagementController");

// SSE endpoint for bulk update progress (no auth middleware needed - validates token internally)
router.get("/admin/users/bulk-update-progress/:sessionId", bulkUpdateProgress);

module.exports = router;