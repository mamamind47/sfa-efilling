require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// --- Import Middleware ---
const authenticateToken = require("./middlewares/authMiddleware"); 

// --- Import Routes ---
const authRoutes = require("./routes/authRoutes");
const academicRoutes = require("./routes/academicRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const linkRoutes = require("./routes/linkRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const sseRoutes = require("./routes/sseRoutes");
const emailRoutes = require("./routes/emailRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const postsRoutes = require("./routes/postsRoutes");
const activityLimitsRoutes = require("./routes/activityLimitsRoutes");
const projectRoutes = require("./routes/projectRoutes");
const cronService = require("./services/cronService");


const app = express();

// --- Basic Middleware ---
app.use(cors());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Public Routes (ไม่ต้องการ Login) ---
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/activity-limits", activityLimitsRoutes);

// Static file serving (must be before auth middleware)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Test Route (อาจจะไม่ต้อง Login)
app.get("/", (req, res) => {
  res.send("🚀 KMUTT SFA e-filling API is Running!");
});

// --- SSE Routes (no auth middleware) ---
app.use("/api", sseRoutes);

// --- Apply Authentication Middleware ---
app.use(authenticateToken); 

// --- Protected Routes (ต้องการ Login) ---
app.use("/api/academic", academicRoutes);
app.use("/api/certificate", certificateRoutes);
app.use("/api/submission", submissionRoutes);
app.use("/api/link", linkRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/projects", projectRoutes);

// Start cron jobs
cronService.scheduleDeadlineWarnings();
// cronService.scheduleNotificationCleanup(); // Disabled for now

module.exports = app;
