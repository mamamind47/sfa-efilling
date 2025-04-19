const prisma = require("../config/database");

// ✅ ดึงปีการศึกษาทั้งหมด
exports.getAllAcademicYears = async (req, res) => {
  const userRole = req.user.role; 
  try {
    let academicYears;

    if (userRole === "admin") {
      academicYears = await prisma.academic_years.findMany({
        orderBy: { year_name: "desc" },
      });
    } else {
      const now = new Date();
      academicYears = await prisma.academic_years.findMany({
        where: {
          OR: [
            { status: "OPEN" },
            // ถ้า status เป็น null (ตามเวลา) ต้องอยู่ในช่วง start_date และ end_date
            {
              status: null,
              start_date: { lte: now }, // วันเริ่มต้น <= วันนี้
              end_date: { gte: now }, // วันสิ้นสุด >= วันนี้
            },
          ],
        },
        orderBy: { year_name: "desc" }, // อาจจะเรียงตามปีล่าสุดเหมือน Admin
      });
    }

    res.json(academicYears);
  } 
  catch (error) {
    console.error("❌ Error fetching academic years:", error);
    res.status(500).json({ error: "Failed to fetch academic years" });
  }
};


// ✅ สร้างปีการศึกษาใหม่ (Admin)
exports.createAcademicYear = async (req, res) => {
  const { year_name, start_date, end_date} = req.body;

  try {
    const newYear = await prisma.academic_years.create({
      data: {
        year_name,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
      },
    });

    res.json({ message: "Academic year created successfully", data: newYear });
  } catch (error) {
    console.error("❌ CREATE ERROR:", error);
    res.status(500).json({ error: "Failed to create academic year" });
  }
};


// ✅ แก้ไขปีการศึกษา (Admin)
exports.updateAcademicYear = async (req, res) => {
  const { academic_year_id } = req.params;
  const { year_name, start_date, end_date, status } = req.body;

  try {
    const updatedYear = await prisma.academic_years.update({
      where: { academic_year_id: academic_year_id },
      data: {
        year_name,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        status,
      },
    });

    res.json({
      message: "Academic year updated successfully",
      data: updatedYear,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update academic year" });
  }
};


// ✅ ปิด/เปิดปีการศึกษา (Admin)
exports.toggleAcademicYearStatus = async (req, res) => {
  const { academic_year_id } = req.params;
  let { status } = req.body; // status สามารถเป็น null, "OPEN", หรือ "CLOSED"

  // ถ้า frontend ส่งค่า "ตามเวลาที่ตั้ง" เราจะรับมาเป็น "" (empty string) แล้วแปลงเป็น null
  if (status === "" || status === "ตามเวลาที่ตั้ง") {
    status = null;
  }

  try {
    const updatedYear = await prisma.academic_years.update({
      where: { academic_year_id: academic_year_id },
      data: { status },
    });

    res.json({
      message: `Academic year status updated`,
      data: updatedYear,
    });
  } catch (error) {
    console.error("❌ TOGGLE STATUS ERROR:", error);
    res.status(500).json({ error: "Failed to update academic year status" });
  }
};