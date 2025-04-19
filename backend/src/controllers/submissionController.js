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
    // ✅ สร้าง submission เดียว
    const submission = await prisma.submissions.create({
      data: {
        user_id,
        academic_year_id,
        type,
        certificate_type_id,
        hours: type !== "Certificate" ? parseInt(hours) : null,
        status: "submitted",
      },
    });

    // ✅ เพิ่มไฟล์ทั้งหมดไปยัง submission_files
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

    // ✅ เพิ่ม log
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


// ✅ ดูรายการ Submission ของผู้ใช้เพื่อนำไปใข้ในหน้าอัปโหลดว่ามีการอัปโหลดไปแล้วหรือไม่
exports.getUserSubmissions = async (req, res) => {
  const user_id = req.user.id;
  try {
    const submissions = await prisma.submissions.findMany({
      where: {
        user_id,
      },
      orderBy: { created_at: "desc" },
      include: {
        certificate_type: true, // ✅ ดึงข้อมูลใบรับรองมาด้วย
        status_logs: {
          orderBy: { changed_at: "desc" },
          take: 1,
        },
      },
    });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user submissions" });
  }
};

// ✅ Admin ดูรายการที่รออนุมัติทั้งหมด
exports.getPendingSubmissions = async (req, res) => {
  const { category, page = 1, pageSize = 50 } = req.query;
  const numericPage = parseInt(page);
  const numericPageSize = parseInt(pageSize);

  try {
    const [submissions, totalSubmissions] = await Promise.all([
      prisma.submissions.findMany({
        where: {
          status: "submitted",
          type: category,
        },
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
        where: {
          status: "submitted",
          type: category,
        },
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



// ✅ Admin อนุมัติ / ปฏิเสธ Submission
exports.reviewSubmission = async (req, res) => {
  const { submission_id } = req.params;
  const { status, rejection_reason, hours } = req.body;
  const admin_id = req.user.id;

  try {
    const submission = await prisma.submissions.findUnique({
      where: { submission_id },
    });
    if (!submission)
      return res.status(404).json({ error: "Submission not found" });

    // กรณี Certificate
    let finalHours = submission.hours;
    if (submission.type === "Certificate") {
      const cert = await prisma.certificate_types.findFirst({
        where: {
          certificate_type_id: submission.certificate_type_id,
        },
      });
      if (cert) finalHours = cert.hours;
    } else if (hours !== undefined) {
      finalHours = parseInt(hours);
    }

    const updated = await prisma.submissions.update({
      where: { submission_id },
      data: {
        status,
        rejection_reason: status === "rejected" ? rejection_reason : null,
        hours: finalHours,
      },
    });

    // ✅ เพิ่ม log
    await prisma.submission_status_logs.create({
      data: {
        submission_id,
        status,
        reason: rejection_reason,
        changed_by: admin_id,
      },
    });

    res.json({ message: `Submission ${status} successfully`, data: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to review submission" });
  }
};

// ✅ Admin อนุมัติ / ปฏิเสธหลายรายการพร้อมกัน
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

      if (!submission) continue;

      let finalHours = submission.hours;
      if (submission.type === "Certificate") {
        const cert = await prisma.certificate_types.findFirst({
          where: {
            certificate_type_id: submission.certificate_type_id,
          },
        });
        if (cert) finalHours = cert.hours;
      }

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
