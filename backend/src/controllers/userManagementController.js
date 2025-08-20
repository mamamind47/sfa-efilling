const prisma = require("../config/database");
const ExcelJS = require("exceljs");
const axios = require("axios");

const studentApiUrl = process.env.STUDENT_API_URL;
const studentApiKey = process.env.STUDENT_API_KEY;

exports.listUsers = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { search = "", role, page = 1, limit = 20 } = req.query;

    const filters = {};

    if (role) {
      filters.role = role;
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
    const failed = [];

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const studentId = String(row.getCell(1).value || "").trim();

      if (!/^\d{11}$/.test(studentId)) {
        failed.push({ studentId, reason: "Invalid ID format" });
        continue;
      }

      try {
        const studentInfo = await axios.get(`${studentApiUrl}/${studentId}`, {
          headers: { authKey: studentApiKey },
        });
        const data = studentInfo.data?.data;

        if (!data) {
          failed.push({ studentId, reason: "Not found in student API" });
          continue;
        }

        await prisma.users.create({
          data: {
            username: studentId,
            name: `${data.firstnameTh} ${data.lastnameTh}`,
            email: data.studentUniversityEmail,
            faculty: data.facultyNameTh,
            major: data.fieldNameTh,
            role: "student",
            phone: data.studentMobileNo || null,
          },
        });

        added.push(studentId);
      } catch (err) {
        failed.push({ studentId, reason: err.message });
      }
    }

    res.status(200).json({ added, failed });
  } catch (err) {
    console.error("Excel import error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.addSingleUser = async (req, res) => {
  try {
    const { studentId, username, firstname, lastname, role } = req.body;
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

      const newUser = await prisma.users.create({
        data: {
          username: studentId,
          name: `${data.firstnameTh} ${data.lastnameTh}`,
          email: data.studentUniversityEmail,
          faculty: data.facultyNameTh,
          major: data.fieldNameTh,
          phone: data.studentMobileNo || null,
          role: role || "student",
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