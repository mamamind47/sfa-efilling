const prisma = require("../config/database");
const ExcelJS = require("exceljs");
const axios = require("axios");
const crypto = require("crypto");

const studentApiUrl = process.env.STUDENT_API_URL;
const studentApiKey = process.env.STUDENT_API_KEY;

// Store progress for bulk update operations
const bulkUpdateProgress = new Map();

// Utility function to map API data to database fields
const mapStudentApiData = (apiData) => {
  // Map student status from API to enum
  let studentStatus = null;
  if (apiData.studentStatusName) {
    const statusMap = {
      'ปกติ': 'normal',
      'ลาออก': 'withdrawn',
      'ตกออก': 'dropped',
      'สำเร็จการศึกษา': 'graduated',
      'ลาพัก': 'on_leave',
      'คัดชื่อออก': 'expelled',
      'โอนย้ายหลักสูตร': 'transferred',
      'เสียชีวิต': 'deceased'
    };
    studentStatus = statusMap[apiData.studentStatusName] || null;
  }

  // Convert isSenior from Y/N to boolean
  let isSenior = null;
  if (apiData.isSenior === 'Y') {
    isSenior = true;
  } else if (apiData.isSenior === 'N') {
    isSenior = false;
  }

  return {
    username: apiData.studentId || apiData.username,
    name: `${apiData.firstnameTh} ${apiData.lastnameTh}`,
    email: apiData.studentUniversityEmail,
    faculty: apiData.facultyNameTh,
    major: apiData.fieldNameTh,
    phone: apiData.studentMobileNo || null,
    studentStatusName: studentStatus,
    isSenior: isSenior,
    finishedAcadYear: apiData.finishedAcadYear ? String(apiData.finishedAcadYear) : null,
  };
};

exports.listUsers = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { search = "", role, studentStatus, isSenior, scholarship_type, page = 1, limit = 20 } = req.query;

    const filters = {};

    if (role) {
      filters.role = role;
    }

    // Student status filter (only applies when role is student)
    if (studentStatus && role === 'student') {
      filters.studentStatusName = studentStatus;
    }

    // Senior status filter (only applies when role is student)  
    if (isSenior !== undefined && role === 'student') {
      if (isSenior === 'true') {
        filters.isSenior = true;
      } else if (isSenior === 'false') {
        filters.isSenior = false;
      }
      // If isSenior === 'all', don't add filter
    }

    // Scholarship type filter
    if (scholarship_type) {
      filters.scholarship_type = scholarship_type;
    }

    if (search) {
      const lowered = search.toLowerCase();
      filters.OR = [
        { name: { contains: lowered } },
        { username: { contains: lowered } },
        { email: { contains: lowered } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const users = await prisma.users.findMany({
      where: filters,
      skip,
      take: Number(limit),
      orderBy: { created_at: "desc" },
    });

    const total = await prisma.users.findMany({
      where: filters,
      select: { user_id: true }
    }).then((res) => res.length);

    res.status(200).json({
      total,
      page: Number(page),
      limit: Number(limit),
      users,
    });
  } catch (err) {
    console.error("Error listing users:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.addMultipleStudentsFromExcel = async (req, res) => {
  try {
    const fileBuffer = req.file?.buffer;
    const requester = req.user;

    if (!fileBuffer || requester.role !== "admin") {
      return res.status(400).json({ error: "Missing file or unauthorized" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    const sheet = workbook.worksheets[0];

    const added = [];
    const updated = [];
    const failed = [];

    // Helper function to convert scholarship type to enum value
    const mapScholarshipType = (type) => {
      const mapping = {
        "ลักษณะที่ 1": "TYPE1",
        "ลักษณะที่ 2": "TYPE2", 
        "ลักษณะที่ 3": "TYPE3"
      };
      return mapping[type] || null;
    };

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const studentId = String(row.getCell(1).value || "").trim();
      const scholarshipTypeRaw = String(row.getCell(2).value || "").trim();
      const scholarshipType = mapScholarshipType(scholarshipTypeRaw);

      if (!/^\d{11}$/.test(studentId)) {
        failed.push({ studentId, reason: "Invalid ID format" });
        continue;
      }

      try {
        // Check if user already exists
        const existingUser = await prisma.users.findUnique({
          where: { username: studentId },
        });

        if (existingUser) {
          // Update existing user's scholarship type
          await prisma.users.update({
            where: { username: studentId },
            data: { scholarship_type: scholarshipType || null },
          });
          updated.push({ studentId, scholarshipType });
        } else {
          // Create new user
          const studentInfo = await axios.get(`${studentApiUrl}/${studentId}`, {
            headers: { authKey: studentApiKey },
          });
          const data = studentInfo.data?.data;

          if (!data) {
            failed.push({ studentId, reason: "Not found in student API" });
            continue;
          }

          const mappedData = mapStudentApiData(data);
          await prisma.users.create({
            data: {
              ...mappedData,
              username: studentId,
              role: "student",
              scholarship_type: scholarshipType || null,
            },
          });

          added.push({ studentId, scholarshipType });
        }
      } catch (err) {
        failed.push({ studentId, reason: err.message });
      }
    }

    console.log('Import result:', { added: added.length, updated: updated.length, failed: failed.length });
    if (failed.length > 0) {
      console.log('Sample error:', failed[0]);
    }
    res.status(200).json({ added, updated, failed });
  } catch (err) {
    console.error("Excel import error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.addSingleUser = async (req, res) => {
  try {
    const { studentId, username, firstname, lastname, role, scholarship_type } = req.body;
    const requester = req.user;

    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // กรณีใช้ studentId → ดึงจาก API
    if (studentId && /^\d{11}$/.test(studentId)) {
      const studentInfo = await axios.get(`${studentApiUrl}/${studentId}`, {
        headers: { authKey: studentApiKey },
      });
      const data = studentInfo.data?.data;

      if (!data) {
        return res.status(404).json({ error: "Student not found" });
      }

      const mappedData = mapStudentApiData(data);
      const newUser = await prisma.users.create({
        data: {
          ...mappedData,
          username: studentId, // Override with studentId
          role: role || "student",
          scholarship_type: scholarship_type || null,
        },
      });

      return res.status(201).json(newUser);
    }

    // กรณีระบุ username และชื่อ → ไม่ต้องใช้ API
    if (username && firstname && lastname) {
      const newUser = await prisma.users.create({
        data: {
          username,
          name: `${firstname} ${lastname}`,
          email: `${username}@kmutt.ac.th`,
          role: role || "admin",
        },
      });

      return res.status(201).json(newUser);
    }

    return res.status(400).json({
      error: "กรุณาระบุ studentId หรือ username+ชื่อให้ครบ",
    });
  } catch (err) {
    console.error("Error adding user:", err.message);
    if (
      err.code === "P2002" &&
      err.meta?.target?.includes("users_username_key")
    ) {
      return res.status(400).json({ error: "มีผู้ใช้นี้อยู่ในระบบแล้ว" });
    }
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};


exports.updateUserRole = async (req, res) => {
  try {
    const { username, role } = req.body;
    const requester = req.user;

    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!username || !role) {
      return res.status(400).json({ error: "Missing username or role" });
    }

    const updatedUser = await prisma.users.update({
      where: { username },
      data: { role },
    });

    return res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Error updating user role:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateScholarshipType = async (req, res) => {
  try {
    const { username, scholarshipType } = req.body;
    const requester = req.user;

    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!username) {
      return res.status(400).json({ error: "Missing username" });
    }

    const updatedUser = await prisma.users.update({
      where: { username },
      data: { scholarshipType: scholarshipType || null },
    });

    return res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Error updating scholarship type:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateStudentInfo = async (req, res) => {
  try {
    const { studentId } = req.body;
    const requester = req.user;

    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!studentId || !/^\d{11}$/.test(studentId)) {
      return res.status(400).json({ error: "Invalid or missing studentId" });
    }

    const studentInfo = await axios.get(`${studentApiUrl}/${studentId}`, {
      headers: { authKey: studentApiKey },
    });
    const data = studentInfo.data?.data;

    if (!data) {
      return res.status(404).json({ error: "Student not found in external API" });
    }

    const updatedUser = await prisma.users.update({
      where: { username: studentId },
      data: {
        phone: data.studentMobileNo || null,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Error updating student info:", err.message);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

// SSE endpoint for bulk update progress
exports.bulkUpdateProgress = (req, res) => {
  const { sessionId } = req.params;
  const { token } = req.query;
  
  // Validate token from query parameter
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    // Verify JWT token (assuming you're using jwt)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection confirmation
  res.write(`data: {"type":"connected","sessionId":"${sessionId}"}\n\n`);

  // Check progress every 500ms
  const intervalId = setInterval(() => {
    const progress = bulkUpdateProgress.get(sessionId);
    
    if (progress) {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
      
      // If completed, cleanup and close
      if (progress.status === 'completed' || progress.status === 'error') {
        clearInterval(intervalId);
        bulkUpdateProgress.delete(sessionId);
        res.end();
      }
    }
  }, 500);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    bulkUpdateProgress.delete(sessionId);
  });
};

// Bulk update all users' status information from student API
exports.bulkUpdateAllStudentStatus = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Generate session ID for tracking progress
    const sessionId = `bulk_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get all users that are currently 'normal', 'on_leave' status OR null status
    const users = await prisma.users.findMany({
      where: {
        role: "student",
        OR: [
          { studentStatusName: "normal" },
          { studentStatusName: "on_leave" },
          { studentStatusName: null }
        ]
      },
      select: { username: true, studentStatusName: true }
    });

    // Filter only users with student ID format (11 digits)
    const studentUsers = users.filter(user => /^\d{11}$/.test(user.username));

    // Initialize progress tracking
    bulkUpdateProgress.set(sessionId, {
      type: 'progress',
      status: 'starting',
      total: studentUsers.length,
      completed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      currentStudent: null,
      details: { updated: [], skipped: [], errors: [] }
    });

    // Return session ID immediately to start SSE connection
    res.status(200).json({ sessionId });

    // Process updates asynchronously
    processUpdates(sessionId, studentUsers);

  } catch (err) {
    console.error("Bulk status update error:", err.message);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

// Async function to process updates with progress tracking
async function processUpdates(sessionId, studentUsers) {
  const progress = bulkUpdateProgress.get(sessionId);
  if (!progress) return;

  try {
    progress.status = 'processing';
    bulkUpdateProgress.set(sessionId, progress);

    for (let i = 0; i < studentUsers.length; i++) {
      const user = studentUsers[i];
      const studentId = user.username;

      // Update current progress
      progress.completed = i + 1;
      progress.currentStudent = studentId;
      bulkUpdateProgress.set(sessionId, progress);

      try {
        const studentInfo = await axios.get(`${studentApiUrl}/${studentId}`, {
          headers: { authKey: studentApiKey },
          timeout: 10000 // 10 second timeout
        });
        
        const data = studentInfo.data?.data;

        if (!data) {
          progress.skipped++;
          progress.details.skipped.push({ studentId, reason: "Not found in student API" });
          continue;
        }

        const mappedData = mapStudentApiData(data);
        
        // Update the user with new information
        await prisma.users.update({
          where: { username: studentId },
          data: {
            studentStatusName: mappedData.studentStatusName,
            isSenior: mappedData.isSenior,
            finishedAcadYear: mappedData.finishedAcadYear,
            phone: mappedData.phone || user.phone,
          }
        });

        progress.updated++;
        progress.details.updated.push({
          studentId,
          oldStatus: user.studentStatusName,
          newStatus: mappedData.studentStatusName,
          isSenior: mappedData.isSenior,
          finishedAcadYear: mappedData.finishedAcadYear
        });

      } catch (err) {
        progress.errors++;
        progress.details.errors.push({ studentId, reason: err.message });
      }

      // Update progress in map
      bulkUpdateProgress.set(sessionId, progress);
      
      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mark as completed
    progress.status = 'completed';
    progress.currentStudent = null;
    bulkUpdateProgress.set(sessionId, progress);

  } catch (err) {
    console.error("Process updates error:", err.message);
    progress.status = 'error';
    progress.error = err.message;
    bulkUpdateProgress.set(sessionId, progress);
  }
}

// Bulk update only students with null status
exports.bulkUpdateNullStatusStudents = async (req, res) => {
  try {
    const requester = req.user;
    
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Generate session ID for tracking progress
    const sessionId = `null_status_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get all users that have null status only
    const users = await prisma.users.findMany({
      where: {
        role: "student",
        studentStatusName: null
      },
      select: { username: true, studentStatusName: true }
    });

    // Filter only users with student ID format (11 digits)
    const studentUsers = users.filter(user => /^\d{11}$/.test(user.username));
    
    if (studentUsers.length === 0) {
      return res.status(200).json({ 
        sessionId, 
        message: "No students with null status found to update" 
      });
    }

    // Initialize progress tracking
    const progressData = {
      type: 'progress',
      status: 'starting',
      total: studentUsers.length,
      completed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      currentStudent: null,
      details: { updated: [], skipped: [], errors: [] }
    };
    
    bulkUpdateProgress.set(sessionId, progressData);

    // Return session ID immediately to start SSE connection
    res.status(200).json({ sessionId });

    // Process updates asynchronously
    processUpdates(sessionId, studentUsers);

  } catch (err) {
    console.error("Bulk null status update error:", err.message);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

// Bulk update missing phones for users with null/empty phone, using external student API
exports.bulkUpdateMissingPhones = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const users = await prisma.users.findMany({
      where: {
        OR: [{ phone: null }, { phone: "" }],
      },
      select: { username: true },
    });

    const updated = [];
    const skipped = [];

    for (const user of users) {
      const studentId = user.username;
      if (!/^\d{11}$/.test(studentId)) {
        skipped.push({ studentId, reason: "Not a student ID" });
        continue;
      }

      try {
        const studentInfo = await axios.get(`${studentApiUrl}/${studentId}`, {
          headers: { authKey: studentApiKey },
        });
        const data = studentInfo.data?.data;

        if (!data || !data.studentMobileNo) {
          skipped.push({ studentId, reason: "No phone from API" });
          continue;
        }

        await prisma.users.update({
          where: { username: studentId },
          data: { phone: data.studentMobileNo },
        });

        updated.push(studentId);
      } catch (err) {
        skipped.push({ studentId, reason: err.message });
      }
    }

    return res.status(200).json({ updated, skipped });
  } catch (err) {
    console.error("Bulk phone update error:", err.message);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};