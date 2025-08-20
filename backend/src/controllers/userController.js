const prisma = require("../config/database");

exports.getUserApprovedHours = async (req, res) => {
  const user = req.user;

  try {
    // ดึงข้อมูลปีการศึกษา
    const academicYears = await prisma.academic_years.findMany();
    const yearMeta = {}; // ใช้ map เพื่อให้เข้าถึงง่าย
    for (const y of academicYears) {
      yearMeta[y.year_name] = {
        academic_year_id: y.academic_year_id,
        year_name: y.year_name,
      };
    }

    // รวมชั่วโมงจาก linked_volunteer
    const volunteerData = await prisma.linked_volunteer.findMany({
      where: { user_id: user.username },
    });

    const volunteerHoursByYear = {};
    for (const row of volunteerData) {
      if (!volunteerHoursByYear[row.year]) {
        volunteerHoursByYear[row.year] = 0;
      }
      volunteerHoursByYear[row.year] += row.hours;
    }

    // รวมจาก submissions ที่ได้รับการอนุมัติ
    const approvedSubmissions = await prisma.submissions.findMany({
      where: {
        user_id: user.id,
        status: "approved",
      },
      include: {
        academic_years: true,
      },
    });

    // รวมผลลัพธ์เป็น object โดยใช้ year_name เป็น key ชั่วคราว
    const rawResult = {};

    for (const submission of approvedSubmissions) {
      const yearName = submission.academic_years?.year_name;
      const type = submission.type;
      if (!yearName) continue;

      let hours = 0;
      if (type === "Certificate") {
        const cert = await prisma.certificate_types.findUnique({
          where: { certificate_type_id: submission.certificate_type_id },
        });
        hours = cert?.hours || 0;
      } else {
        hours = submission.hours || 0;
      }

      if (!rawResult[yearName]) rawResult[yearName] = {};
      if (!rawResult[yearName][type]) rawResult[yearName][type] = 0;
      rawResult[yearName][type] += hours;
    }

    // ใส่ volunteer hours เข้าไปใน rawResult
    for (const yearName in volunteerHoursByYear) {
      if (!rawResult[yearName]) rawResult[yearName] = {};
      rawResult[yearName].volunteer_hours = volunteerHoursByYear[yearName];
    }

    // แปลง rawResult เป็น array พร้อม id และ year_name
    const finalResult = Object.entries(rawResult).map(([yearName, types]) => ({
      academic_year_id: yearMeta[yearName]?.academic_year_id || null,
      year_name: yearName,
      ...types,
    }));

    res.json(finalResult);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user hours" });
  }
};

exports.getUserScholarshipStatus = async (req, res) => {
  const user = req.user;

  try {
    // ดึงปีการศึกษาทั้งหมด
    const academicYears = await prisma.academic_years.findMany();

    // สร้าง Map ปี id -> name
    const yearNameMap = {};
    for (const y of academicYears) {
      yearNameMap[y.year_name] = y.year_name;
    }

    // ดึงข้อมูลทุนของ user
    const userScholarships = await prisma.linked_scholarship.findMany({
      where: {
        student_id: user.username,
      },
    });

    // แปลงให้อยู่ในรูปแบบ flat array
    const result = userScholarships.map((entry) => ({
      year_name: entry.academic_year,
      type: entry.type,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scholarship status" });
  }
};

exports.userInfo = async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { user_id: req.user.id },
      select: {
        user_id: true,
        username: true,
        name: true,
        faculty: true,
        major: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user info" });
  }
};

