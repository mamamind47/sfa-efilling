require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// --- Import Middleware ---
const authenticateToken = require("./middlewares/authMiddleware"); // <-- 1. Import Middleware (ตรวจสอบ Path ให้ถูกต้อง)

// --- Import Routes ---
const authRoutes = require("./routes/authRoutes");
//const adminRoutes = require("./routes/adminRoutes"); // ยังไม่ได้ใช้
const academicRoutes = require("./routes/academicRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const linkRoutes = require("./routes/linkRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const sseRoutes = require("./routes/sseRoutes");
const emailRoutes = require("./routes/emailRoutes");


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

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Public Routes (ไม่ต้องการ Login) ---
app.use("/api/auth", authRoutes); // <--- Route สำหรับ Login/Callback ต้องอยู่ *ก่อน* Middleware

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


module.exports = app;
