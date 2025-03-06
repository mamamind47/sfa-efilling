require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
//const adminRoutes = require("./routes/adminRoutes");
//const userRoutes = require("./routes/userRoutes");
const academicRoutes = require("./routes/academicRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const submissionRoutes = require("./routes/submissionRoutes");

const app = express();

//Middleware
app.use(cors());
app.use(express.json());

//Routes
app.use("/api/auth", authRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api/user", userRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/certificate", certificateRoutes);
app.use("/api/submission", submissionRoutes);

//Test Route
app.get("/", (req, res) => {
  res.send("🚀 KMUTT SFA e-filling API is Running!");
});

module.exports = app;
