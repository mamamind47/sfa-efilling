const prisma = require("../config/database");

// ✅ ยื่นใบรับรอง (User)
exports.submitCertificate = async (req, res) => {
  const { user_id, academic_year_id, certificate_type_id, username } = req.body;

  try {
    // ✅ 1. ตรวจสอบว่าผู้ใช้เคยได้รับอนุมัติใบรับรองนี้หรือไม่
    const existingApproved = await prisma.submission_details.findFirst({
      where: {
        certificate_type_id: parseInt(certificate_type_id),
        submission: {
          user_id: parseInt(user_id),
          status: "approved",
        },
      },
    });

    if (existingApproved) {
      return res
        .status(400)
        .json({
          error:
            "You have already been approved for this certificate in another academic year.",
        });
    }

    // ✅ 2. ตรวจสอบว่าปีการศึกษาที่เลือกเปิดให้ยื่นหรือไม่
    const academicYear = await prisma.academic_years.findUnique({
      where: { academic_year_id: parseInt(academic_year_id) },
    });

    if (!academicYear || academicYear.status === "closed") {
      return res
        .status(400)
        .json({ error: "This academic year is closed for submission" });
    }

    // ✅ 3. ตรวจสอบว่าผู้ใช้เคยสร้าง submission หรือยัง
    let submission = await prisma.submissions.findFirst({
      where: {
        user_id: parseInt(user_id),
        academic_year_id: parseInt(academic_year_id),
      },
    });

    if (!submission) {
      submission = await prisma.submissions.create({
        data: {
          user_id: parseInt(user_id),
          academic_year_id: parseInt(academic_year_id),
        },
      });
    }

    // ✅ 4. บันทึกไฟล์ที่อัปโหลด
    const file_path = `/uploads/${academicYear.year_name}/${username}_${
      submission.submission_id
    }${path.extname(req.file.originalname)}`;

    // ✅ 5. เพิ่มข้อมูล submission_details
    const newDetail = await prisma.submission_details.create({
      data: {
        submission_id: submission.submission_id,
        certificate_type_id: parseInt(certificate_type_id),
        file_path,
      },
    });

    res.json({
      message: "Certificate submitted successfully",
      data: newDetail,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit certificate" });
  }
};


// ✅ ดูรายการที่ผู้ใช้ยื่นไปแล้ว
exports.getUserSubmissions = async (req, res) => {
  const { user_id, academic_year_id } = req.query;

  try {
    const submissions = await prisma.submissions.findMany({
      where: {
        user_id: parseInt(user_id),
        academic_year_id: parseInt(academic_year_id),
      },
      include: {
        submission_details: true,
      },
    });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

// ✅ ดูรายการใบรับรองที่รออนุมัติ (Admin)
exports.getPendingSubmissions = async (req, res) => {
    try {
        const pendingSubmissions = await prisma.submission_details.findMany({
            where: { status: "pending" },
            include: {
                submission: {
                    include: {
                        user: true,
                        academic_year: true,
                    },
                },
                certificate_type: true,
            },
        });

        res.json(pendingSubmissions);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch pending submissions" });
    }
};

// ✅ อนุมัติ / ปฏิเสธใบรับรอง (Admin)
exports.reviewSubmission = async (req, res) => {
    const { submission_detail_id } = req.params;
    const { status, rejection_reason } = req.body;

    try {
        // ตรวจสอบว่า Submission มีอยู่หรือไม่
        const submissionDetail = await prisma.submission_details.findUnique({
            where: { submission_detail_id: parseInt(submission_detail_id) },
        });

        if (!submissionDetail) {
            return res.status(404).json({ error: "Submission not found" });
        }

        if (status === "approved") {
            // ✅ ถ้าอนุมัติ ต้องอัปเดตสถานะเป็น "approved"
            await prisma.submission_details.update({
                where: { submission_detail_id: parseInt(submission_detail_id) },
                data: { status: "approved", rejection_reason: null },
            });
        } else if (status === "rejected") {
            // ❌ ถ้าปฏิเสธ ต้องมีเหตุผล
            if (!rejection_reason) {
                return res.status(400).json({ error: "Rejection reason is required" });
            }
            await prisma.submission_details.update({
                where: { submission_detail_id: parseInt(submission_detail_id) },
                data: { status: "rejected", rejection_reason },
            });
        } else {
            return res.status(400).json({ error: "Invalid status" });
        }

        res.json({ message: `Submission ${status} successfully` });
    } catch (error) {
        res.status(500).json({ error: "Failed to review submission" });
    }
};

// ✅ อัปเดตสถานะว่าผู้ใช้ครบ 36 ชั่วโมงหรือไม่
exports.updateSubmissionStatus = async (req, res) => {
    const { user_id, academic_year_id } = req.body;

    try {
        // ✅ คำนวณจำนวนชั่วโมงที่อนุมัติแล้ว
        const approvedHours = await prisma.submission_details.aggregate({
            where: {
                submission: {
                    user_id: parseInt(user_id),
                    academic_year_id: parseInt(academic_year_id),
                },
                status: "approved",
            },
            _sum: { certificate_type: { hours: true } },
        });

        const totalApprovedHours = approvedHours._sum.hours || 0;

        if (totalApprovedHours >= 36) {
            // ✅ ถ้าครบ 36 ชั่วโมง อัปเดตสถานะเป็น "approved"
            await prisma.submission_status.upsert({
                where: { user_id: parseInt(user_id) },
                update: { status: "approved", is_marked: true },
                create: {
                    user_id: parseInt(user_id),
                    academic_year_id: parseInt(academic_year_id),
                    status: "approved",
                    is_marked: true,
                },
            });

            return res.json({ message: "User marked as completed (36 hours reached automatically)" });
        }

        return res.json({ message: "User has not yet reached 36 hours" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update submission status" });
    }
};

// ✅ ผู้ใช้กดปุ่ม "ขอใช้ชั่วโมงที่มีอยู่"
exports.markUserSubmission = async (req, res) => {
    const { user_id, academic_year_id } = req.body;

    try {
        // ✅ คำนวณจำนวนชั่วโมงที่อนุมัติแล้ว
        const approvedHours = await prisma.submission_details.aggregate({
            where: {
                submission: {
                    user_id: parseInt(user_id),
                    academic_year_id: parseInt(academic_year_id),
                },
                status: "approved",
            },
            _sum: { certificate_type: { hours: true } },
        });

        const totalApprovedHours = approvedHours._sum.hours || 0;

        // ✅ ทำเครื่องหมายว่าผู้ใช้ "ขอใช้ชั่วโมงที่มีอยู่"
        await prisma.submission_status.upsert({
            where: { user_id: parseInt(user_id) },
            update: { is_marked: true, status: totalApprovedHours >= 36 ? "approved" : "pending" },
            create: {
                user_id: parseInt(user_id),
                academic_year_id: parseInt(academic_year_id),
                is_marked: true,
                status: totalApprovedHours >= 36 ? "approved" : "pending",
            },
        });

        return res.json({ message: "User marked submission request successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to mark submission request" });
    }
};

// ✅ Admin ดูรายชื่อที่ขอใช้ชั่วโมง (ยังไม่ครบ 36 ชั่วโมง)
exports.getPendingMarkedUsers = async (req, res) => {
    try {
        const pendingUsers = await prisma.submission_status.findMany({
            where: { is_marked: true, status: "pending" },
            include: { user: true, academic_year: true },
        });

        res.json(pendingUsers);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch pending marked users" });
    }
};

// ✅ Admin ดูรายชื่อที่ได้รับอนุมัติครบ 36 ชั่วโมง
exports.getCompletedUsers = async (req, res) => {
    try {
        const completedUsers = await prisma.submission_status.findMany({
            where: { status: "approved" },
            include: { user: true, academic_year: true },
        });

        res.json(completedUsers);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch completed users" });
    }
};

