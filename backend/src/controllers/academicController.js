const prisma = require("../config/database");

// ✅ ดึงปีการศึกษาทั้งหมด
exports.getAllAcademicYears = async (req, res) => {
  try {
    const academicYears = await prisma.academic_years.findMany({
      orderBy: { year_name: "desc" },
    });
    res.json(academicYears);
  } catch (error) {
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
      where: { academic_year_id: parseInt(academic_year_id) },
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
      where: { academic_year_id: parseInt(academic_year_id) },
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

