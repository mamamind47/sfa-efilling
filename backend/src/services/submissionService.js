const prisma = require("../config/database");
const emailService = require("./emailService");
const notificationService = require("./notificationService");
const { validateActivityLimit } = require("../utils/activityLimitValidator");
const path = require("path");
const axios = require("axios");
const sharp = require("sharp");
const jsQR = require("jsqr");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const { getDocument } = require("pdfjs-dist/legacy/build/pdf.js");
const { createCanvas } = require("canvas");

// Setup PDF.js worker path
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const workerPath = require.resolve("pdfjs-dist/build/pdf.worker.js");
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

// Activity type mapping for display names
const ACTIVITY_TYPE_MAPPING = {
  "BloodDonate": "บริจาคโลหิต",
  "NSF": "ออมเงิน กอช.", 
  "AOM YOUNG": "โครงการ AOM YOUNG",
  "ต้นไม้ล้านต้น ล้านความดี": "ต้นไม้ล้านต้น ล้านความดี",
  "religious": "กิจกรรมทำนุบำรุงศาสนสถาน",
  "social-development": "กิจกรรมพัฒนาโรงเรียน ชุมชนและสังคม",
  "Certificate": "e-Learning"
};

// Get display name for submission type
function getSubmissionTypeDisplayName(type) {
  return ACTIVITY_TYPE_MAPPING[type] || type;
}

// Email notification service
async function sendSubmissionEmail(submission, status, rejectionReason = null, adminId = null, originalHours = null) {
  try {
    // Get user and submission details
    const submissionDetails = await prisma.submissions.findUnique({
      where: { submission_id: submission.submission_id },
      include: {
        users: true,
        academic_years: true,
        certificate_type: true
      }
    });

    if (!submissionDetails || !submissionDetails.users.email) {
      console.log('No email found for user or submission not found');
      return;
    }

    const user = submissionDetails.users;
    const activityType = submissionDetails.type === 'Certificate' && submissionDetails.certificate_type
      ? submissionDetails.certificate_type.certificate_name
      : ACTIVITY_TYPE_MAPPING[submissionDetails.type] || submissionDetails.type;

    // Get admin name if adminId is provided
    let adminName = 'ระบบอัตโนมัติ';
    if (adminId) {
      const admin = await prisma.users.findUnique({
        where: { user_id: adminId },
        select: { name: true, username: true }
      });
      adminName = admin ? (admin.name || admin.username) : 'เจ้าหน้าที่';
    }

    // For rejected emails, use original hours requested, not the approved hours
    const displayHours = (status === 'rejected' && originalHours !== null) 
      ? originalHours 
      : submissionDetails.hours || 0;

    const variables = {
      userName: user.name || user.username,
      submissionId: submissionDetails.submission_id.toString(),
      activityType: activityType,
      activityName: activityType,
      hours: displayHours,
      systemUrl: process.env.CLIENT_URL || 'http://localhost:5173'
    };

    if (status === 'approved') {
      variables.approvedDate = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',  
        day: 'numeric'
      });
      variables.approvedBy = adminName;

      await emailService.sendEmail({
        to: user.email,
        subject: 'แจ้งการอนุมัติคำขอกิจกรรมจิตอาสา',
        template: 'approved',
        variables: variables
      });

      console.log(`Approval email sent to ${user.email} for submission ${submission.submission_id}`);

    } else if (status === 'rejected') {
      variables.rejectedDate = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      variables.rejectedBy = adminName;
      variables.rejectionReason = rejectionReason || 'ไม่ระบุเหตุผล';

      await emailService.sendEmail({
        to: user.email,
        subject: 'แจ้งการปฏิเสธคำขอกิจกรรมจิตอาสา',
        template: 'rejected',
        variables: variables
      });

      console.log(`Rejection email sent to ${user.email} for submission ${submission.submission_id}`);
    }

  } catch (error) {
    console.error('Error sending submission email:', error);
  }
}

// Create submission
async function createSubmission(submissionData, files) {
  const { userId, academicYearId, type, certificateTypeId, hoursRequested } = submissionData;

  try {
    // Validate academic year
    const academicYear = await prisma.academic_years.findUnique({
      where: { academic_year_id: academicYearId }
    });

    if (!academicYear) {
      throw new Error('ไม่พบปีการศึกษาที่ระบุ');
    }

    // Create submission
    const submission = await prisma.submissions.create({
      data: {
        user_id: userId,
        academic_year_id: academicYearId,
        type: type,
        hours_requested: hoursRequested,
        certificate_type_id: certificateTypeId || null,
        status: 'submitted'
      },
      include: {
        users: true,
        academic_years: true,
        certificate_type: true
      }
    });

    // Create status log
    await prisma.submission_status_logs.create({
      data: {
        submission_id: submission.submission_id,
        status: 'submitted',
        changed_by: userId,
        changed_at: new Date()
      }
    });

    // Handle file uploads if provided
    if (files && files.length > 0) {
      const filePromises = files.map(file => 
        prisma.submission_files.create({
          data: {
            submission_id: submission.submission_id,
            file_path: file.path
          }
        })
      );
      await Promise.all(filePromises);
    }

    return submission;
  } catch (error) {
    console.error('Error creating submission:', error);
    throw error;
  }
}

// Get user submissions
async function getUserSubmissions(userId) {
  try {
    const submissions = await prisma.submissions.findMany({
      where: { user_id: userId },
      include: {
        academic_years: true,
        certificate_type: true,
        submission_files: true,
        status_logs: {
          orderBy: { changed_at: 'desc' },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Add display name for each submission
    const submissionsWithDisplayName = submissions.map(submission => ({
      ...submission,
      type_display_name: getSubmissionTypeDisplayName(submission.type)
    }));
    
    return submissionsWithDisplayName;
  } catch (error) {
    console.error('Error getting user submissions:', error);
    throw error;
  }
}

// Get pending submissions for admin with advanced filtering
async function getPendingSubmissions(filters) {
  const {
    category,
    page = 1,
    pageSize = 50,
    searchQuery = "",
    sortOption = "latest"
  } = filters;

  const numericPage = parseInt(page);
  const numericPageSize = parseInt(pageSize);
  const q = searchQuery.trim();

  // Check if fetching user list (Certificate + sort by user)
  const isFetchingUserList = category === "Certificate" && sortOption === "user";

  try {
    if (isFetchingUserList) {
      // Get user aggregates with pending Certificate submissions
      const userPendingAggregates = await prisma.submissions.groupBy({
        by: ["user_id"],
        where: {
          type: "Certificate",
          status: "submitted",
          ...(q && {
            users: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
                { major: { contains: q, mode: "insensitive" } },
              ],
            },
          }),
        },
        _min: {
          created_at: true,
        },
        _count: {
          submission_id: true,
        },
        orderBy: {
          user_id: "asc",
        },
      });

      // Sort by oldest submission date
      userPendingAggregates.sort((a, b) => {
        const dateA = a._min.created_at;
        const dateB = b._min.created_at;

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        return dateA.getTime() - dateB.getTime();
      });

      // Paginate user aggregates
      const startIndex = (numericPage - 1) * numericPageSize;
      const paginatedUserAggregates = userPendingAggregates.slice(
        startIndex,
        startIndex + numericPageSize
      );
      const paginatedUserIds = paginatedUserAggregates.map(
        (item) => item.user_id
      );

      // Get user details
      const usersDetails = await prisma.users.findMany({
        where: {
          user_id: { in: paginatedUserIds },
        },
      });

      // Merge user details with aggregate data
      const sortedUsers = paginatedUserIds
        .map((userId) => {
          const userDetail = usersDetails.find(
            (user) => user.user_id === userId
          );
          const aggregateData = userPendingAggregates.find(
            (item) => item.user_id === userId
          );

          return userDetail
            ? {
                ...userDetail,
                pending_count: aggregateData?._count.submission_id || 0,
                oldest_submission_date: aggregateData?._min.created_at || null,
              }
            : null;
        })
        .filter(Boolean);

      const totalUsers = userPendingAggregates.length;
      const totalPages = Math.ceil(totalUsers / numericPageSize);

      return {
        users: sortedUsers,
        totalPages,
        currentPage: numericPage,
        totalUsers,
      };
    } else {
      // Regular submission list logic
      let where;
      if (category === "Others") {
        const orConditions = [
          { users: { name: { contains: q } } },
          { users: { username: { contains: q } } },
          { users: { major: { contains: q } } },
        ];

        where = {
          status: "submitted",
          NOT: {
            type: "Certificate",
          },
          ...(q && { OR: orConditions }),
        };
      } else {
        const orConditions = [
          { users: { name: { contains: q } } },
          { users: { username: { contains: q } } },
          { users: { major: { contains: q } } },
        ];

        if (category === "Certificate") {
          orConditions.push(
            {
              certificate_type: {
                certificate_name: { contains: q },
              },
            },
            { certificate_type: { category: { contains: q } } }
          );
        }

        where = {
          status: "submitted",
          type: category,
          ...(q && { OR: orConditions }),
        };
      }

      const allowedSorts = ["latest", "oldest"];
      const finalSortOption = allowedSorts.includes(sortOption) ? sortOption : "latest";
      const finalOrderBy = { created_at: finalSortOption === "latest" ? "desc" : "asc" };

      const [submissions, totalSubmissions] = await Promise.all([
        prisma.submissions.findMany({
          where,
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
          orderBy: finalOrderBy,
          skip: (numericPage - 1) * numericPageSize,
          take: numericPageSize,
        }),
        prisma.submissions.count({ where }),
      ]);

      const totalPages = Math.ceil(totalSubmissions / numericPageSize);

      // Add display name for each submission
      const submissionsWithDisplayName = submissions.map(submission => ({
        ...submission,
        type_display_name: getSubmissionTypeDisplayName(submission.type)
      }));

      return {
        submissions: submissionsWithDisplayName,
        totalPages,
        currentPage: numericPage,
        totalSubmissions,
      };
    }
  } catch (error) {
    console.error("Error fetching pending data:", error);
    throw error;
  }
}

// Review submission (approve/reject)  
async function reviewSubmission(submissionId, reviewData, adminId) {
  const { status, rejectionReason, hours } = reviewData;

  try {
    // Get original submission data for email notification
    const originalSubmission = await prisma.submissions.findUnique({
      where: { submission_id: submissionId },
      select: { hours_requested: true }
    });

    const originalHours = originalSubmission?.hours_requested;

    // Update submission
    const updatedSubmission = await prisma.submissions.update({
      where: { submission_id: submissionId },
      data: {
        status: status,
        rejection_reason: status === 'rejected' ? rejectionReason : null,
        hours: status === 'approved' ? hours : null,
        updated_at: new Date()
      },
      include: {
        users: true,
        academic_years: true,
        certificate_type: true
      }
    });

    // Create status log
    await prisma.submission_status_logs.create({
      data: {
        submission_id: submissionId,
        status: status,
        reason: rejectionReason || null,
        changed_by: adminId,
        changed_at: new Date()
      }
    });

    // Send email notification
    await sendSubmissionEmail(updatedSubmission, status, rejectionReason, adminId, originalHours);

    // Create web notification
    try {
      const activityName = getSubmissionTypeDisplayName(updatedSubmission.type);
      
      if (status === 'approved') {
        await notificationService.createApprovalNotification(
          updatedSubmission.user_id, 
          submissionId, 
          hours,
          activityName
        );
      } else if (status === 'rejected') {
        await notificationService.createRejectionNotification(
          updatedSubmission.user_id, 
          submissionId, 
          rejectionReason,
          activityName
        );
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't throw error here - notification failure shouldn't break the review process
    }

    return updatedSubmission;
  } catch (error) {
    console.error('Error reviewing submission:', error);
    throw error;
  }
}

// Batch review submissions
async function batchReviewSubmissions(submissionIds, reviewData, adminId) {
  const { action, rejectionReason, hours } = reviewData;
  const results = { success: 0, failed: 0, errors: [] };

  for (const submissionId of submissionIds) {
    try {
      await reviewSubmission(submissionId, {
        status: action,
        rejectionReason,
        hours
      }, adminId);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        submissionId,
        error: error.message
      });
    }
  }

  return results;
}

// Submit submission with auto-approval logic
async function submitSubmission(submissionData, files) {
  const { userId, academicYearId, type, certificateTypeId, hours } = submissionData;
  
  if (!files || files.length === 0) {
    throw new Error("No files uploaded.");
  }

  try {
    // --- BEGIN DUPLICATE SUBMISSION CHECK ---
    if (type === "Certificate") {
      if (
        !certificateTypeId ||
        typeof certificateTypeId !== "string" ||
        certificateTypeId.trim() === ""
      ) {
        throw new Error(
          "กรุณาระบุรหัสประเภท Certificate (certificate_type_id) ที่เป็น UUID ที่ถูกต้อง"
        );
      }

      const existingSubmission = await prisma.submissions.findFirst({
        where: {
          user_id: userId,
          type: "Certificate",
          certificate_type_id: certificateTypeId,
          status: {
            in: ["submitted", "approved"],
          },
        },
      });

      if (existingSubmission) {
        const error = new Error(
          "คุณได้ส่งคำขอ Certificate ประเภทนี้ไปแล้ว และกำลังรอการตรวจสอบหรือได้รับการอนุมัติแล้ว"
        );
        error.code = "DUPLICATE_SUBMISSION";
        error.existingSubmissionId = existingSubmission.submission_id;
        throw error;
      }
    }
    // --- END DUPLICATE SUBMISSION CHECK ---

    // --- BEGIN ACTIVITY LIMIT VALIDATION ---
    let hoursToValidate = 0;
    if (type === "Certificate") {
      // Get certificate type to retrieve hours for validation
      const certType = await prisma.certificate_types.findUnique({
        where: { certificate_type_id: certificateTypeId }
      });
      if (!certType) {
        throw new Error("ไม่พบประเภท Certificate ที่ระบุ");
      }
      hoursToValidate = certType.hours;
    } else {
      if (hours === undefined || hours === null) {
        throw new Error("กรุณาระบุจำนวนชั่วโมง");
      }
      const hoursAsInt = parseInt(hours, 10);
      if (isNaN(hoursAsInt)) {
        throw new Error("จำนวนชั่วโมงไม่ถูกต้อง");
      }
      hoursToValidate = hoursAsInt;
    }

    // Validate activity limits before creating submission
    const limitValidation = await validateActivityLimit(userId, academicYearId, type, hoursToValidate);
    if (!limitValidation.isValid) {
      const error = new Error(`ไม่สามารถส่งได้: ${limitValidation.message}`);
      error.code = "ACTIVITY_LIMIT_EXCEEDED";
      error.details = {
        limit: limitValidation.limit,
        current: limitValidation.current,
        requested: limitValidation.requested,
        totalAfter: limitValidation.totalAfter
      };
      throw error;
    }
    // --- END ACTIVITY LIMIT VALIDATION ---

    // เตรียมข้อมูลสำหรับการสร้าง submission
    const dataToCreate = {
      user_id: userId,
      academic_year_id: academicYearId,
      type,
      status: "submitted",
      hours_requested: hoursToValidate,
    };

    if (type === "Certificate") {
      dataToCreate.certificate_type_id = certificateTypeId;
    }

    const submission = await prisma.submissions.create({
      data: dataToCreate,
    });

    // สร้างรายการไฟล์ที่แนบมา
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

    // --- BEGIN AUTO APPROVAL LOGIC ---
    let certType = null;

    if (type === "Certificate" && certificateTypeId) {
      certType = await prisma.certificate_types.findUnique({
        where: { certificate_type_id: certificateTypeId },
      });
    }

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
    });

    const academicYear = await prisma.academic_years.findUnique({
      where: { academic_year_id: academicYearId },
    });

    const isSetELearning = certType?.category === "SET-eLearning";
    const filePath = files?.[0]?.path;
    let qrCodeData;
    let certRefCode;

    if (isSetELearning && filePath) {
      const fileExt = path.extname(filePath).toLowerCase();
      if (fileExt === ".pdf") {
        try {
          const fileData = fs.readFileSync(filePath);
          const pdfDoc = await PDFDocument.load(fileData);
          const pdfBuffer = await pdfDoc.save();

          const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);

          const viewport = page.getViewport({ scale: 2 });
          const canvas = createCanvas(viewport.width, viewport.height);
          const context = canvas.getContext("2d");

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          await page.render(renderContext).promise;
          const imageBuffer = canvas.toBuffer("image/jpeg");

          const image = sharp(imageBuffer);
          const metadata = await image.metadata();

          if (metadata.space !== "rgb" && metadata.space !== "b-w") {
            image.toColorspace("srgb");
          }

          const { data, info } = await image
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

          const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height);
          if (qr) {
            qrCodeData = qr.data;
            const qrMatch = qrCodeData.match(/certificate-checker\/(SET.+)$/);
            certRefCode = qrMatch?.[1];
          }
        } catch (err) {
          console.error("Failed to extract QR from PDF with pdf-lib:", err.message);
        }
      } else {
        try {
          const imageBuffer = fs.readFileSync(filePath);
          const image = sharp(imageBuffer);
          const metadata = await image.metadata();

          if (metadata.space !== "rgb" && metadata.space !== "b-w") {
            image.toColorspace("srgb");
          }

          const { data, info } = await image
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

          const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height);
          if (qr) {
            qrCodeData = qr.data;
            const qrMatch = qrCodeData.match(/certificate-checker\/(SET.+)$/);
            certRefCode = qrMatch?.[1];
          }
        } catch (err) {
          console.error("QR code reading failed:", err.message);
        }
      }
    }

    let autoApproved = false;

    if (certRefCode && isSetELearning && certType?.certificate_code && user?.name && academicYear) {
      try {
        const response = await axios.get(`${process.env.SET_EL_API}/${certRefCode}`);
        const certData = response.data;

        // Convert Thai date to Date object
        let certDate;
        try {
          const rawDate = certData && typeof certData.certificate_datetime === "string"
            ? certData.certificate_datetime.trim()
            : null;
          const thaiMonthMap = {
            มกราคม: "01",
            กุมภาพันธ์: "02",
            มีนาคม: "03",
            เมษายน: "04",
            พฤษภาคม: "05",
            มิถุนายน: "06",
            กรกฎาคม: "07",
            สิงหาคม: "08",
            กันยายน: "09",
            ตุลาคม: "10",
            พฤศจิกายน: "11",
            ธันวาคม: "12",
          };
          if (rawDate) {
            try {
              const [dayStr, monthThai, yearThai] = rawDate.split(" ");
              const month = thaiMonthMap[monthThai];
              const year = parseInt(yearThai) - 543;
              const dateStr = `${year}-${month}-${dayStr.padStart(2, "0")}`;
              certDate = new Date(dateStr);
              if (!(certDate instanceof Date) || isNaN(certDate)) {
                console.warn("⚠️ Parsed certificate date is invalid:", dateStr);
                certDate = undefined;
              }
            } catch (parseErr) {
              console.error("❌ Failed to parse certificate date:", parseErr.message);
            }
          } else {
            console.warn("⚠️ certificate_datetime is missing or not a string", certData?.certificate_datetime);
          }
        } catch (parseError) {
          console.error("Failed to parse certificate date:", parseError.message);
        }

        const isDateValid =
          certDate instanceof Date &&
          !isNaN(certDate) &&
          certDate >= new Date(academicYear.start_date) &&
          certDate <= new Date(academicYear.end_date);

        const isNameMatched = certData.members.full_name.trim() === user.name.trim();
        const isCodeMatched = certData.courses.code === certType.certificate_code;

        const rejectionReasons = [];

        if (!isCodeMatched) {
          rejectionReasons.push(
            "หัวข้อในใบรับรองไม่ตรงกับหัวข้อที่ยื่น หรือ ไม่ได้เรียนในระบบ SET e-Learning ของ กยศ. โปรดเข้าเรียนผ่านเมนู SET e-Learning จากเว็บไซต์ของ กยศ."
          );
        }

        if (!isNameMatched) {
          rejectionReasons.push("ชื่อผู้เรียนไม่ถูกต้อง");
        }

        if (!isDateValid) {
          const start = new Date(academicYear.start_date).toLocaleDateString("th-TH");
          const end = new Date(academicYear.end_date).toLocaleDateString("th-TH");
          rejectionReasons.push(`วันที่ในใบรับรองต้องอยู่ในช่วง ${start} - ${end} เท่านั้น`);
        }

        if (rejectionReasons.length === 0) {
          // Auto approve
          const updatedSubmission = await prisma.submissions.update({
            where: { submission_id: submission.submission_id },
            data: {
              status: "approved",
              hours: certType.hours,
            },
          });

          await prisma.submission_status_logs.create({
            data: {
              submission_id: submission.submission_id,
              status: "approved",
              changed_by: null,
            },
          });

          // Send approval email
          await sendSubmissionEmail(updatedSubmission, 'approved', null, null);

          // Create web notification for auto-approval
          try {
            const activityName = getSubmissionTypeDisplayName(submission.type);
            await notificationService.createApprovalNotification(
              updatedSubmission.user_id, 
              submission.submission_id, 
              certType.hours,
              activityName
            );
          } catch (notificationError) {
            console.error('Error creating auto-approval notification:', notificationError);
          }

          autoApproved = true;
        } else {
          // Auto reject with reasons
          const rejectionReasonText = rejectionReasons.join(" ");
          const updatedSubmission = await prisma.submissions.update({
            where: { submission_id: submission.submission_id },
            data: {
              status: "rejected",
              rejection_reason: rejectionReasonText,
            },
          });

          await prisma.submission_status_logs.create({
            data: {
              submission_id: submission.submission_id,
              status: "rejected",
              reason: rejectionReasonText,
              changed_by: null,
            },
          });

          // Send rejection email with original hours
          await sendSubmissionEmail(updatedSubmission, 'rejected', rejectionReasonText, null, submission.hours);

          // Create web notification for auto-rejection
          try {
            const activityName = getSubmissionTypeDisplayName(submission.type);
            await notificationService.createRejectionNotification(
              updatedSubmission.user_id, 
              submission.submission_id, 
              rejectionReasonText,
              activityName
            );
          } catch (notificationError) {
            console.error('Error creating auto-rejection notification:', notificationError);
          }

          autoApproved = true; // Still mark as handled
        }
      } catch (err) {
        console.error("Failed to verify SET eLearning certificate:", err.message);
      }
    }

    if (!autoApproved) {
      await prisma.submission_status_logs.create({
        data: {
          submission_id: submission.submission_id,
          status: "submitted",
          changed_by: userId,
        },
      });
    }
    // --- END AUTO APPROVAL LOGIC ---

    return submission;
  } catch (error) {
    console.error("Error creating submission:", error);
    throw error;
  }
}

// Get pending certificates by user
async function getPendingCertificatesByUser(userId) {
  if (!userId || typeof userId !== "string") {
    throw new Error("User ID ไม่ถูกต้อง");
  }

  try {
    // Get user details first
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        name: true,
        username: true,
        faculty: true,
        major: true,
      },
    });

    if (!user) {
      const error = new Error("ไม่พบผู้ใช้");
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    // Get pending Certificate submissions for this user
    const userSubmissions = await prisma.submissions.findMany({
      where: {
        user_id: userId,
        type: "Certificate",
        status: "submitted",
      },
      orderBy: { created_at: "asc" },
      include: {
        certificate_type: {
          select: { certificate_name: true, category: true, hours: true },
        },
        submission_files: {
          select: { file_path: true },
        },
        academic_years: {
          select: { year_name: true },
        },
      },
    });

    return { user, submissions: userSubmissions };
  } catch (error) {
    console.error(`Error fetching pending certificates for user ${userId}:`, error);
    throw error;
  }
}

// Get approval history
async function getApprovalHistory(filters) {
  const {
    category,
    page = 1,
    pageSize = 50,
    searchQuery = "",
    sortOption = "latest",
    status = "all",
    academicYear = "all",
  } = filters;

  const numericPage = parseInt(page);
  const numericPageSize = parseInt(pageSize);
  const q = searchQuery.trim();

  let where;
  if (category === "ALL") {
    const orConditions = [
      { users: { name: { contains: q } } },
      { users: { username: { contains: q } } },
      { users: { major: { contains: q } } },
      { type: { contains: q } }
    ];

    if (q) {
      orConditions.push(
        { certificate_type: { certificate_name: { contains: q } } },
        { certificate_type: { category: { contains: q } } }
      );
    }

    where = {
      status: status === "all" ? { in: ["approved", "rejected"] } : status,
      ...(academicYear && academicYear !== "all" && { academic_year_id: academicYear }),
      ...(q && { OR: orConditions }),
    };
  } else {
    const orConditions = [
      { users: { name: { contains: q } } },
      { users: { username: { contains: q } } },
      { users: { major: { contains: q } } },
    ];

    if (category === "Certificate") {
      orConditions.push(
        { certificate_type: { certificate_name: { contains: q } } },
        { certificate_type: { category: { contains: q } } }
      );
    }

    where = {
      type: category,
      status: status === "all" ? { in: ["approved", "rejected"] } : status,
      ...(academicYear && academicYear !== "all" && { academic_year_id: academicYear }),
      ...(q && { OR: orConditions }),
    };
  }

  const finalOrderBy = {
    updated_at: sortOption === "latest" ? "desc" : "asc",
  };

  try {
    const [submissions, totalSubmissions] = await Promise.all([
      prisma.submissions.findMany({
        where,
        include: {
          users: true,
          academic_years: true,
          certificate_type: true,
          submission_files: true,
          status_logs: {
            orderBy: { changed_at: "desc" },
            take: 1,
            include: {
              changed_by_user: {
                select: { name: true, username: true },
              },
            },
          },
        },
        orderBy: finalOrderBy,
        skip: (numericPage - 1) * numericPageSize,
        take: numericPageSize,
      }),
      prisma.submissions.count({ where }),
    ]);

    const totalPages = Math.ceil(totalSubmissions / numericPageSize);

    // Add display name for each submission
    const submissionsWithDisplayName = submissions.map(submission => ({
      ...submission,
      type_display_name: getSubmissionTypeDisplayName(submission.type)
    }));

    return {
      submissions: submissionsWithDisplayName,
      totalPages,
      currentPage: numericPage,
      totalSubmissions,
    };
  } catch (error) {
    console.error("Error fetching approval history:", error);
    throw error;
  }
}

// Export approval history to Excel
async function exportApprovalHistoryExcel(filters) {
  const {
    category,
    searchQuery = "",
    sortOption = "latest",
    status = "all",
    academicYear,
  } = filters;

  const ExcelJS = require('exceljs');
  const q = searchQuery.trim();

  let where;
  if (category === "ALL") {
    const orConditions = [
      { users: { name: { contains: q } } },
      { users: { username: { contains: q } } },
      { users: { major: { contains: q } } },
      { type: { contains: q } }
    ];

    if (q) {
      orConditions.push(
        { certificate_type: { certificate_name: { contains: q } } },
        { certificate_type: { category: { contains: q } } }
      );
    }

    where = {
      status: status === "all" ? { in: ["approved", "rejected"] } : status,
      ...(academicYear && academicYear !== "all" && { academic_year_id: academicYear }),
      ...(q && { OR: orConditions }),
    };
  } else {
    const orConditions = [
      { users: { name: { contains: q } } },
      { users: { username: { contains: q } } },
      { users: { major: { contains: q } } },
    ];

    if (category === "Certificate") {
      orConditions.push(
        { certificate_type: { certificate_name: { contains: q } } },
        { certificate_type: { category: { contains: q } } }
      );
    }

    where = {
      type: category,
      status: status === "all" ? { in: ["approved", "rejected"] } : status,
      ...(academicYear && academicYear !== "all" && { academic_year_id: academicYear }),
      ...(q && { OR: orConditions }),
    };
  }

  const finalOrderBy = {
    updated_at: sortOption === "latest" ? "desc" : "asc",
  };

  try {
    const submissions = await prisma.submissions.findMany({
      where,
      include: {
        users: true,
        academic_years: true,
        certificate_type: true,
        status_logs: {
          orderBy: { changed_at: "desc" },
          take: 1,
          include: {
            changed_by_user: true
          }
        },
      },
      orderBy: finalOrderBy,
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ประวัติการอนุมัติ');

    // Define columns
    const columns = [
      { header: 'ชื่อ', key: 'name', width: 25 },
      { header: 'รหัสนักศึกษา', key: 'username', width: 15 },
      { header: 'คณะ', key: 'faculty', width: 20 },
      { header: 'สาขา', key: 'major', width: 25 },
      { header: 'ประเภท', key: 'type', width: 20 },
      { header: 'หัวข้อ', key: 'topic', width: 30 },
      { header: 'ชั่วโมง', key: 'hours', width: 10 },
      { header: 'ปีการศึกษา', key: 'academic_year', width: 15 },
      { header: 'วันที่ยื่น', key: 'created_at', width: 15 },
      { header: 'วันที่พิจารณา', key: 'reviewed_at', width: 15 },
      { header: 'สถานะ', key: 'status', width: 12 },
      { header: 'ผู้พิจารณา', key: 'reviewer', width: 20 },
      { header: 'เหตุผล', key: 'reason', width: 40 }
    ];

    worksheet.columns = columns;

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    submissions.forEach((s) => {
      worksheet.addRow({
        name: s.users?.name || '-',
        username: s.users?.username || '-',
        faculty: s.users?.faculty || '-',
        major: s.users?.major || '-',
        type: getSubmissionTypeDisplayName(s.type),
        topic: s.certificate_type?.certificate_name || s.topic || '-',
        hours: s.hours || s.hours_requested || '-',
        academic_year: s.academic_years?.year_name || '-',
        created_at: s.created_at ? new Date(s.created_at).toLocaleDateString("th-TH") : '-',
        reviewed_at: s.status_logs?.[0]?.changed_at ? new Date(s.status_logs[0].changed_at).toLocaleDateString("th-TH") : '-',
        status: s.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว',
        reviewer: s.status_logs?.[0]?.changed_by_user?.name || 'ระบบอัตโนมัติ',
        reason: s.status_logs?.[0]?.reason || '-'
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width, 10);
    });

    return { workbook, filename: `ประวัติการอนุมัติ_${new Date().toISOString().split('T')[0]}.xlsx` };
  } catch (error) {
    console.error("Error exporting approval history:", error);
    throw error;
  }
}

module.exports = {
  sendSubmissionEmail,
  createSubmission,
  submitSubmission,
  getUserSubmissions,
  getPendingSubmissions,
  reviewSubmission,
  batchReviewSubmissions,
  getPendingCertificatesByUser,
  getApprovalHistory,
  exportApprovalHistoryExcel,
  ACTIVITY_TYPE_MAPPING
};