const prisma = require("../config/database");
const multer = require("multer"); // ไม่ได้ใช้ใน functions เหล่านี้ แต่มี import ไว้
const path = require("path"); // ไม่ได้ใช้ใน functions เหล่านี้ แต่มี import ไว้

exports.getAllCertificates = async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const orderByOptions = { certificate_code: "asc" };

    if (userRole === "admin") {
      // Admin เห็นทุกใบรับรอง
      const certificates = await prisma.certificate_types.findMany({
        orderBy: orderByOptions,
      });
      return res.json(certificates);
    }

    // ✅ ดึงเฉพาะใบรับรองที่เปิดใช้งาน
    const certificates = await prisma.certificate_types.findMany({
      where: { is_active: 1 },
      orderBy: orderByOptions,
    });

    // ✅ ดึง submission ทั้งหมดของผู้ใช้ สำหรับ type = "Certificate"
    const userSubmissions = await prisma.submissions.findMany({
      where: {
        user_id: userId,
        type: "Certificate",
      },
      include: {
        academic_years: true,
      },
    });

    // ✅ ผูก submission เข้ากับ certificate โดยดูจาก file_path (ระบุรหัสไว้)
    const enrichedCertificates = certificates.map((cert) => {
      const matchedSub = userSubmissions.find((sub) =>
        sub.file_path?.includes(cert.certificate_code)
      );

      return {
        ...cert,
        submission_status: matchedSub?.status || null,
        submitted_at: matchedSub?.created_at || null,
        updated_at: matchedSub?.updated_at || null,
        approved_academic_year:
          matchedSub?.status === "approved"
            ? matchedSub.academic_years?.year_name || null
            : null,
      };
    });

    return res.json(enrichedCertificates);
  } catch (error) {
    console.error("❌ Error fetching certificates:", error);
    return res.status(500).json({ error: "Failed to fetch certificates" });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ✅ API อัปโหลดไฟล์ใบรับรอง

exports.uploadCertificateFile = async (req, res) => {
  const { certificate_type_id, academic_year_id, user_id } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "ไฟล์ไม่ถูกต้อง" });
  }

  try {
    await prisma.submission_details.create({
      data: {
        submission_id: user_id + "-" + academic_year_id, // 🔹 ใช้ user_id + academic_year_id เป็น submission_id

        certificate_type_id,

        file_path: req.file.path,

        status: "pending",
      },
    });

    res.json({ message: "อัปโหลดสำเร็จ", file: req.file.path });
  } catch (error) {
    console.error("❌ Error uploading file:", error);

    res.status(500).json({ error: "อัปโหลดไม่สำเร็จ" });
  }
};



// ✅ สร้างประเภทใบรับรองใหม่ (Admin Only) - เพิ่ม category
exports.createCertificate = async (req, res) => {
  // รับ category เพิ่มจาก req.body
  const { certificate_code, certificate_name, hours, category, is_active } =
    req.body;

  // --- เพิ่ม Validation สำหรับ category ---
  if (!category) {
    return res.status(400).json({ error: "Category is required" });
  }
  const hoursNum = parseInt(hours, 10);
  if (isNaN(hoursNum) || hoursNum <= 0) {
    return res.status(400).json({ error: "Hours must be a positive number" });
  }

  try {
    const existingCertificate = await prisma.certificate_types.findUnique({
      where: { certificate_code },
    });

    if (existingCertificate) {
      return res.status(400).json({ error: "Certificate code already exists" });
    }

    const newCertificate = await prisma.certificate_types.create({
      data: {
        certificate_code,
        certificate_name,
        hours: hoursNum, // ใช้ค่าที่แปลงเป็น Int แล้ว
        category: category, // <-- เพิ่ม category
        is_active: is_active ?? 1, // ใช้ค่าที่ส่งมา หรือ default เป็น 1
      },
    });

    res.status(201).json({
      // ใช้ 201 Created
      message: "Certificate type created successfully",
      data: newCertificate,
    });
  } catch (error) {
    console.error("❌ Error creating certificate:", error);
    res.status(500).json({ error: "Failed to create certificate" });
  }
};

// ✅ แก้ไขประเภทใบรับรอง (Admin Only) - เพิ่ม category
exports.updateCertificate = async (req, res) => {
  const { certificate_type_id } = req.params; // ID เป็น String (UUID)
  // รับ category เพิ่มจาก req.body
  const { certificate_code, certificate_name, hours, category, is_active } =
    req.body;

  // Validation ชั่วโมง
  const hoursNum = parseInt(hours, 10);
  if (isNaN(hoursNum) || hoursNum <= 0) {
    return res.status(400).json({ error: "Hours must be a positive number" });
  }
  // --- เพิ่ม Validation สำหรับ category ---
  if (!category) {
    return res.status(400).json({ error: "Category is required" });
  }
  // --- ------------------------------- ---

  try {
    const updatedCertificate = await prisma.certificate_types.update({
      // where id ไม่ต้องแปลง String() ถ้าใน schema เป็น String @db.Char(36)
      where: { certificate_type_id: certificate_type_id },
      data: {
        certificate_code,
        certificate_name,
        hours: hoursNum, // ใช้ค่าที่แปลงเป็น Int แล้ว
        category: category, // <-- เพิ่ม category
        // is_active ควรส่งมาเป็น 1 หรือ 0 จาก Frontend ถ้า Field เป็น Int
        // หรือแปลง boolean เป็น Int ที่นี่ก็ได้ ถ้า Frontend ส่ง boolean มา
        is_active: is_active === undefined ? undefined : is_active ? 1 : 0, // แปลง Boolean/undefined เป็น 1/0/undefined
      },
    });

    res.json({
      message: "Certificate updated successfully",
      data: updatedCertificate,
    });
  } catch (error) {
    console.error("❌ Error updating certificate:", error);
    // เช็คว่าเป็น Error จาก Prisma (เช่น Not Found) หรือไม่
    if (error.code === "P2025") {
      // Prisma error code for record not found
      return res.status(404).json({ error: "Certificate not found" });
    }
    res.status(500).json({ error: "Failed to update certificate" });
  }
};

// ✅ ลบประเภทใบรับรอง (Admin Only) - แก้ไข where ให้ตรงกับ type
exports.deleteCertificate = async (req, res) => {
  const { certificate_type_id } = req.params; // ID เป็น String (UUID)

  try {
    await prisma.certificate_types.delete({
      where: { certificate_type_id: certificate_type_id }, // ใช้ ID ที่เป็น String โดยตรง
    });
    // ใช้ 204 No Content สำหรับ DELETE ที่สำเร็จและไม่มี body ตอบกลับ
    res.status(204).send();
    // หรือ res.json({ message: "Certificate deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting certificate:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Certificate not found" });
    } else if (error.code === "P2003") {
      // Foreign key constraint failed
      return res
        .status(400)
        .json({
          error: "Cannot delete certificate type, it is currently in use.",
        });
    }
    res.status(500).json({ error: "Failed to delete certificate" });
  }
};

// ✅ ปิด/เปิดใช้งานใบรับรอง - แก้ไข where ให้ตรงกับ type
exports.toggleCertificateStatus = async (req, res) => {
  const { certificate_type_id } = req.params; // ID เป็น String (UUID)
  const { is_active } = req.body; // ค่าใหม่ที่ต้องการอัปเดต (ควรเป็น 0 หรือ 1)

  // Basic validation
  if (is_active === undefined || (is_active !== 0 && is_active !== 1)) {
    return res
      .status(400)
      .json({ error: "Invalid 'is_active' value. Must be 0 or 1." });
  }

  try {
    const updatedCertificate = await prisma.certificate_types.update({
      // where id ไม่ต้องแปลง parseInt ถ้าเป็น String UUID
      where: { certificate_type_id: certificate_type_id },
      data: { is_active: is_active }, // บันทึก 0 หรือ 1 ลงไป
    });

    res.json({
      message: `Certificate status updated successfully`,
      data: updatedCertificate,
    });
  } catch (error) {
    console.error("❌ TOGGLE STATUS ERROR:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Certificate not found" });
    }
    res.status(500).json({ error: "Failed to update certificate status" });
  }
};