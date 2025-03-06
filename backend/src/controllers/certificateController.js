const prisma = require("../config/database");

// ✅ ดึงรายการใบรับรองทั้งหมด
exports.getAllCertificates = async (req, res) => {
  try {
    const certificates = await prisma.certificate_types.findMany();
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch certificates" });
    console.log(error);
  }
};

// exports.getAllCertificates = async (req, res) => {
//   const { role, user_id, academic_year_id, current_year } = req.query; // รับค่าจาก query parameters

//   try {
//     let certificates;

//     if (role === "admin") {
//       // ✅ แอดมินเห็นทุกใบรับรอง
//       certificates = await prisma.certificate_types.findMany();
//     } else {
//       if (current_year === "true") {
//         // ✅ ผู้ใช้กำลังยื่นใบรับรอง (ปีปัจจุบัน) → เห็นเฉพาะที่เปิดใช้งาน
//         certificates = await prisma.certificate_types.findMany({
//           where: { is_active: 1 },
//         });
//       } else {
//         // ✅ ผู้ใช้ดูประวัติย้อนหลัง → เห็นเฉพาะที่เคยยื่น
//         certificates = await prisma.certificate_types.findMany({
//           where: {
//             OR: [
//               { is_active: 1 }, // ที่เปิดใช้งาน
//               {
//                 submission_details: {
//                   some: {
//                     submission: {
//                       userId: parseInt(user_id),
//                       academicYearId: parseInt(academic_year_id),
//                     },
//                   },
//                 },
//               }, // หรือที่เคยยื่น
//             ],
//           },
//         });
//       }
//     }

//     res.json(certificates);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch certificates" });
//   }
// };


// ✅ สร้างประเภทใบรับรองใหม่ (Admin Only)
exports.createCertificate = async (req, res) => {
  const { certificate_code, certificate_name, hours, is_active } = req.body;

  try {
    // 🔍 ตรวจสอบว่ามี certificate_code นี้อยู่ในฐานข้อมูลแล้วหรือไม่
    const existingCertificate = await prisma.certificate_types.findUnique({
      where: { certificate_code },
    });

    if (existingCertificate) {
      return res.status(400).json({ error: "Certificate code already exists" });
    }

    // ✅ ถ้าไม่ซ้ำ ให้สร้างใหม่
    const newCertificate = await prisma.certificate_types.create({
      data: {
        certificate_code,
        certificate_name,
        hours,
        is_active: is_active ?? 1,
      },
    });

    res.json({
      message: "Certificate type created successfully",
      data: newCertificate,
    });
  } catch (error) {
    console.error("❌ Error creating certificate:", error);
    res.status(500).json({ error: "Failed to create certificate" });
  }
};


// ✅ แก้ไขประเภทใบรับรอง (Admin Only)
exports.updateCertificate = async (req, res) => {
  const { certificate_type_id } = req.params;
  const { certificate_code, certificate_name, hours, is_active } = req.body;

  try {
    const updatedCertificate = await prisma.certificate_types.update({
      where: { certificate_type_id: parseInt(certificate_type_id) },
      data: { certificate_code, certificate_name, hours, is_active },
    });

    res.json({
      message: "Certificate updated successfully",
      data: updatedCertificate,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update certificate" });
  }
};

// ✅ ลบประเภทใบรับรอง (Admin Only)
exports.deleteCertificate = async (req, res) => {
  const { certificate_type_id } = req.params;

  try {
    await prisma.certificate_types.delete({
      where: { certificate_type_id: parseInt(certificate_type_id) },
    });

    res.json({ message: "Certificate deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete certificate" });
  }
};


// ✅ ปิด/เปิดใช้งานใบรับรอง
exports.toggleCertificateStatus = async (req, res) => {
    const { certificate_type_id } = req.params;
    const { is_active } = req.body; // ค่าใหม่ที่ต้องการอัปเดต (0 หรือ 1)

    try {
        // ตรวจสอบว่าใบรับรองมีอยู่หรือไม่
        const certificate = await prisma.certificate_types.findUnique({
            where: { certificate_type_id: parseInt(certificate_type_id) },
        });

        if (!certificate) {
            return res.status(404).json({ error: "Certificate not found" });
        }

        // อัปเดตสถานะ
        const updatedCertificate = await prisma.certificate_types.update({
            where: { certificate_type_id: parseInt(certificate_type_id) },
            data: { is_active: is_active ? 1 : 0 }, // บังคับเป็น 1 หรือ 0
        });

        res.json({ message: `Certificate status updated successfully`, data: updatedCertificate });
    } catch (error) {
        res.status(500).json({ error: "Failed to update certificate status" });
    }
};

