const prisma = require("../config/database");
const submissionService = require("../services/submissionService");

// ยื่น Submission
exports.submitSubmission = async (req, res) => {
  const { academic_year_id, type, certificate_type_id, hours } = req.body;
  const files = req.files;
  const user_id = req.user.id;

  try {
    const submission = await submissionService.submitSubmission({
      userId: user_id,
      academicYearId: academic_year_id,
      type,
      certificateTypeId: certificate_type_id,
      hours
    }, files);

    res.status(201).json({
      message: "Submission created successfully",
      data: submission,
    });
  } catch (error) {
    console.error("Error creating submission:", error.message);
    
    if (error.code === "DUPLICATE_SUBMISSION") {
      return res.status(409).json({
        error: error.message,
        existingSubmissionId: error.existingSubmissionId,
      });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ 
        error: "ข้อมูลบางอย่างที่ส่งมาซ้ำกับที่มีอยู่แล้วในระบบ" 
      });
    }
    if (error.name === "PrismaClientValidationError") {
      return res.status(400).json({ 
        error: "ข้อมูลที่ส่งมาไม่ถูกต้อง: " + error.message 
      });
    }
    
    res.status(500).json({ error: "Failed to create submission" });
  }
};

exports.getUserSubmissions = async (req, res) => {
  const user_id = req.user.id;
  try {
    const submissions = await submissionService.getUserSubmissions(user_id);
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user submissions" });
  }
};

exports.getPendingSubmissions = async (req, res) => {
  const {
    category,
    page = 1,
    pageSize = 50,
    searchQuery = "",
    sortOption = "latest",
  } = req.query;

  try {
    const result = await submissionService.getPendingSubmissions({
      category,
      page,
      pageSize,
      searchQuery,
      sortOption
    });
    
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching pending data:", error);
    res.status(500).json({ error: "Failed to fetch pending data" });
  }
};

exports.reviewSubmission = async (req, res) => {
  const { submission_id } = req.params;
  const { status, rejection_reason, hours } = req.body;
  const admin_id = req.user.id;

  try {
    const updatedSubmission = await submissionService.reviewSubmission(
      submission_id, // ไม่ต้อง parseInt เพราะเป็น String/UUID
      { status, rejectionReason: rejection_reason, hours },
      admin_id
    );
    res.json({ message: `Submission ${status} successfully`, data: updatedSubmission });
  } catch (error) {
    console.error("Failed to review submission:", error.message);
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
    const results = await submissionService.batchReviewSubmissions(
      ids,
      { action: status, rejectionReason: rejection_reason },
      admin_id
    );
    res.json({ 
      message: `Batch ${status} สำเร็จแล้ว`,
      results: results
    });
  } catch (error) {
    console.error("❌ Batch review error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดขณะดำเนินการ batch-review" });
  }
};

exports.getPendingCertificatesByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await submissionService.getPendingCertificatesByUser(userId);
    res.json(result);
  } catch (error) {
    console.error(
      `❌ Error fetching pending certificates for user ${userId}:`,
      error.message
    );
    
    if (error.code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to fetch user's pending certificates" });
  }
};

exports.getApprovalHistory = async (req, res) => {
  const {
    category,
    page = 1,
    pageSize = 50,
    searchQuery = "",
    sortOption = "latest",
    status = "all",
    academicYear = "all",
  } = req.query;

  try {
    const result = await submissionService.getApprovalHistory({
      category,
      page,
      pageSize,
      searchQuery,
      sortOption,
      status,
      academicYear,
    });
    
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching approval history:", error.message);
    res.status(500).json({ error: "Failed to fetch approval history" });
  }
};

exports.exportApprovalHistoryExcel = async (req, res) => {
  const {
    category,
    searchQuery = "",
    sortOption = "latest",
    status = "all",
    academicYear,
  } = req.query;

  try {
    const { workbook, filename } = await submissionService.exportApprovalHistoryExcel({
      category,
      searchQuery,
      sortOption,
      status,
      academicYear,
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    // Send file
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("❌ Error exporting approval history:", error.message);
    res.status(500).json({ error: "Failed to export approval history" });
  }
};

