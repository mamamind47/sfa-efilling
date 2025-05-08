const prisma = require("../config/database");
const path = require("path");

// ✅ ยื่น Submission
exports.submitSubmission = async (req, res) => {
  const { academic_year_id, type, certificate_type_id, hours } = req.body;
  const files = req.files;
  const user_id = req.user.id;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded." });
  }

  try {
    const submission = await prisma.submissions.create({
      data: {
        user_id,
        academic_year_id,
        type,
        certificate_type_id,
        hours_requested: type !== "Certificate" ? parseInt(hours) : null,
        status: "submitted",
      },
    });

    await Promise.all(
      files.map((file) => {
        const relativePath = file.path.replace(/\\/g, "/").split("uploads")[1];
        const file_path = `/uploads${relativePath}`;
        return prisma.submission_files.create({
          data: {
            submission_id: submission.submission_id,
            file_path,
          },
        });
      })
    );

    await prisma.submission_status_logs.create({
      data: {
        submission_id: submission.submission_id,
        status: "submitted",
        changed_by: user_id,
      },
    });

    res.json({
      message: "Submission created successfully",
      data: submission,
    });
  } catch (error) {
    console.error("❌ Error creating submission:", error);
    res.status(500).json({ error: "Failed to create submission" });
  }
};

exports.getUserSubmissions = async (req, res) => {
  const user_id = req.user.id;
  try {
    const submissions = await prisma.submissions.findMany({
      where: {
        user_id,
      },
      orderBy: { created_at: "desc" },
      include: {
        certificate_type: true,
        status_logs: {
          orderBy: { changed_at: "desc" },
          take: 1,
        },
        academic_years: {
          select: {
            year_name: true,
          },
        },
      },
    });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user submissions" });
  }
};

exports.getPendingSubmissions = async (req, res) => {
  const { category, page = 1, pageSize = 50 } = req.query;
  const numericPage = parseInt(page);
  const numericPageSize = parseInt(pageSize);

  try {
    const [submissions, totalSubmissions] = await Promise.all([
      prisma.submissions.findMany({
        where: { status: "submitted", type: category },
        include: {
          users: true,
          academic_years: true,
          certificate_type: true,
          submission_files: true,
          status_logs: {
            orderBy: { changed_at: "desc" },
            take: 1,
          },
        },
        orderBy: { created_at: "desc" },
        skip: (numericPage - 1) * numericPageSize,
        take: numericPageSize,
      }),
      prisma.submissions.count({
        where: { status: "submitted", type: category },
      }),
    ]);

    const totalPages = Math.ceil(totalSubmissions / numericPageSize);

    res.json({
      submissions,
      totalPages,
      currentPage: numericPage,
      totalSubmissions,
    });
  } catch (error) {
    console.error("❌ Error fetching pending submissions:", error);
    res.status(500).json({ error: "Failed to fetch pending submissions" });
  }
};

exports.reviewSubmission = async (req, res) => {
  const { submission_id } = req.params;
  const { status, rejection_reason, hours } = req.body; // รับ status, rejection_reason, hours จาก body
  const admin_id = req.user.id;

  // Input validation เพิ่มเติม (แนะนำ)
  if (!status || (status === "rejected" && !rejection_reason)) {
    return res
      .status(400)
      .json({
        error:
          "กรุณาระบุข้อมูลให้ครบถ้วน (status และ rejection_reason ถ้าปฏิเสธ)",
      });
  }

  try {
    const submission = await prisma.submissions.findUnique({
      where: { submission_id },
    });
    if (!submission)
      return res.status(404).json({ error: "Submission not found" });

    let finalHours = submission.hours; // กำหนดค่าเริ่มต้นเป็นชั่วโมงเดิมของ submission

    if (submission.type === "Certificate") {
      const cert = await prisma.certificate_types.findFirst({
        where: { certificate_type_id: submission.certificate_type_id },
      });
      // ถ้าเจอ certificate type และ status ไม่ใช่ rejected ให้ใช้ชั่วโมงจาก certificate
      // (อาจจะต้องพิจารณาว่าถ้า reject certificate ควรเก็บชั่วโมงเดิม หรือ 0 หรือ null)
      // ในที่นี้ยังคงใช้ชั่วโมงจาก cert ถ้าหาเจอ ไม่ว่า status จะเป็นอะไร
      if (cert) {
        finalHours = cert.hours;
      }
      // หากไม่เจอ cert อาจจะ fallback ไปใช้ submission.hours หรือบังคับ error ตามนโยบาย
    } else {
      // ----- ส่วนที่แก้ไข -----
      // ตรวจสอบและกำหนดค่า hours เฉพาะกรณีที่ไม่ใช่ Certificate และ status เป็น 'approved' (หรือสถานะอื่นที่ต้องการ)
      if (status === "approved") {
        // หรืออาจจะเป็นเงื่อนไขอื่นเช่น status !== 'rejected'
        if (hours === undefined) {
          // ถ้าอนุมัติ แต่ไม่ส่ง hours มา -> error
          return res
            .status(400)
            .json({ error: "กรุณาระบุจำนวนชั่วโมงที่อนุมัติ" });
        }
        // แปลง hours ที่ส่งมาเป็น integer ถ้า status เป็น approved
        finalHours = parseInt(hours);
        if (isNaN(finalHours)) {
          // ตรวจสอบว่าเป็นตัวเลขหรือไม่หลังแปลง
          return res
            .status(400)
            .json({ error: "จำนวนชั่วโมงที่ระบุไม่ถูกต้อง" });
        }
      }
      // ถ้า status เป็น 'rejected' หรือสถานะอื่น จะใช้ค่า finalHours ที่กำหนดไว้ตอนต้น (submission.hours)
      // ----- จบส่วนที่แก้ไข -----
    }

    // อัปเดตข้อมูล submission
    const updated = await prisma.submissions.update({
      where: { submission_id },
      data: {
        status,
        rejection_reason: status === "rejected" ? rejection_reason : null, // ใส่เหตุผลเฉพาะเมื่อ rejected
        hours: finalHours, // ใช้ค่า finalHours ที่คำนวณไว้
      },
    });

    // สร้าง log การเปลี่ยนสถานะ
    await prisma.submission_status_logs.create({
      data: {
        submission_id,
        status,
        reason: status === "rejected" ? rejection_reason : null, // ใส่เหตุผลเฉพาะเมื่อ rejected
        changed_by: admin_id,
      },
    });

    res.json({ message: `Submission ${status} successfully`, data: updated });
  } catch (error) {
    console.error("Failed to review submission:", error); // แสดง log error จริง ๆ ด้วยจะดีมาก
    res.status(500).json({ error: "Failed to review submission" });
  }
};

exports.batchReviewSubmissions = async (req, res) => {
  const { ids, status, rejection_reason } = req.body;
  const admin_id = req.user.id;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ไม่มี submission ที่เลือก" });
  }

  try {
    for (const submission_id of ids) {
      const submission = await prisma.submissions.findUnique({
        where: { submission_id },
      });

      if (!submission || submission.type !== "Certificate") continue;

      let finalHours = submission.hours;
      const cert = await prisma.certificate_types.findFirst({
        where: { certificate_type_id: submission.certificate_type_id },
      });
      if (cert) finalHours = cert.hours;

      await prisma.submissions.update({
        where: { submission_id },
        data: {
          status,
          rejection_reason: status === "rejected" ? rejection_reason : null,
          hours: finalHours,
        },
      });

      await prisma.submission_status_logs.create({
        data: {
          submission_id,
          status,
          reason: rejection_reason,
          changed_by: admin_id,
        },
      });
    }

    res.json({ message: `Batch ${status} สำเร็จแล้ว` });
  } catch (error) {
    console.error("❌ Batch review error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดขณะดำเนินการ batch-review" });
  }
};