const { type } = require("os");
const prisma = require("../config/database");
const path = require("path");
const axios = require("axios");
const sharp = require("sharp");
const jsQR = require("jsqr");
const fs = require("fs");
const { parse } = require("date-fns");
const thLocale = require("date-fns/locale/th");
// NOTE: pdf-lib + pdfjs-dist + canvas are used for PDF processing instead of pdf-poppler
const { PDFDocument } = require("pdf-lib");
const { getDocument } = require("pdfjs-dist/legacy/build/pdf.js");
const { createCanvas } = require("canvas");

// Setup PDF.js worker path
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const workerPath = require.resolve("pdfjs-dist/build/pdf.worker.js");
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

// ยื่น Submission
exports.submitSubmission = async (req, res) => {
  const { academic_year_id, type, certificate_type_id, hours } = req.body;
  const files = req.files;
  const user_id = req.user.id;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded." });
  }

  try {
    // --- BEGIN DUPLICATE SUBMISSION CHECK ---
    if (type === "Certificate") {
      if (
        !certificate_type_id ||
        typeof certificate_type_id !== "string" ||
        certificate_type_id.trim() === ""
      ) {
        return res.status(400).json({
          error:
            "กรุณาระบุรหัสประเภท Certificate (certificate_type_id) ที่เป็น UUID ที่ถูกต้อง",
        });
      }
      // ไม่จำเป็นต้องใช้ parseInt สำหรับ UUID เพราะมันเป็น string

      const existingSubmission = await prisma.submissions.findFirst({
        where: {
          user_id: user_id,
          type: "Certificate",
          certificate_type_id: certificate_type_id, // ใช้ค่า UUID (string) โดยตรง
          status: {
            in: ["submitted", "approved"],
          },
        },
      });

      if (existingSubmission) {
        return res.status(409).json({
          // 409 Conflict สำหรับทรัพยากรซ้ำซ้อน
          error:
            "คุณได้ส่งคำขอ Certificate ประเภทนี้ไปแล้ว และกำลังรอการตรวจสอบหรือได้รับการอนุมัติแล้ว",
          existingSubmissionId: existingSubmission.submission_id,
        });
      }
    }
    // --- END DUPLICATE SUBMISSION CHECK ---

    // เตรียมข้อมูลสำหรับการสร้าง submission
    const dataToCreate = {
      user_id,
      academic_year_id,
      type,
      status: "submitted",
    };

    if (type === "Certificate") {
      // certificate_type_id (UUID string) ได้รับการตรวจสอบแล้วว่ามีค่า
      dataToCreate.certificate_type_id = certificate_type_id;
      dataToCreate.hours_requested = null; // Certificate ไม่มีจำนวนชั่วโมงที่ขอ
    } else {
      // สำหรับ type อื่นๆ ที่ไม่ใช่ Certificate
      if (hours === undefined || hours === null) {
        return res.status(400).json({ error: "กรุณาระบุจำนวนชั่วโมง" });
      }
      const hoursAsInt = parseInt(hours, 10); // hours ยังคงเป็น Int
      if (isNaN(hoursAsInt)) {
        return res.status(400).json({ error: "จำนวนชั่วโมงไม่ถูกต้อง" });
      }
      dataToCreate.hours_requested = hoursAsInt;
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

    if (type === "Certificate" && certificate_type_id) {
      certType = await prisma.certificate_types.findUnique({
        where: { certificate_type_id },
      });
    }

    const user = await prisma.users.findUnique({
      where: { user_id },
    });

    const academicYear = await prisma.academic_years.findUnique({
      where: { academic_year_id },
    });

    const isSetELearning = certType?.category === "SET-eLearning";
    const filePath = files?.[0]?.path;
    let qrCodeData;
    let certRefCode;

    if (isSetELearning && filePath) {
      const fileExt = path.extname(filePath).toLowerCase();
      if (fileExt === ".pdf") {
        // Use pdf-lib + pdfjs-dist + canvas for PDF to image conversion (first page) for QR scan
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
          await prisma.submissions.update({
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

          autoApproved = true;
        } else {
          // Auto reject with reasons
          const rejectionReasonText = rejectionReasons.join(" ");
          await prisma.submissions.update({
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
          changed_by: user_id,
        },
      });
    }
    // --- END AUTO APPROVAL LOGIC ---

    res.status(201).json({
      // 201 Created สำหรับการสร้างสำเร็จ
      message: "Submission created successfully",
      data: submission,
    });
  } catch (error) {
    console.error("Error creating submission:", error);
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ error: "ข้อมูลบางอย่างที่ส่งมาซ้ำกับที่มีอยู่แล้วในระบบ" });
    }
    if (error.name === "PrismaClientValidationError") {
      return res
        .status(400)
        .json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง: " + error.message });
    }
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
  const {
    category,
    page = 1,
    pageSize = 50,
    searchQuery = "",
    sortOption = "latest", // latest, oldest, type, user
  } = req.query;

  const numericPage = parseInt(page);
  const numericPageSize = parseInt(pageSize);
  const q = searchQuery.trim();

  // ตรวจสอบเงื่อนไขใหม่: Filter Certificate และ Sort ผู้ส่ง เพื่อแสดง User List
  const isFetchingUserList =
    category === "Certificate" && sortOption === "user";

  try {
    if (isFetchingUserList) {
      // --- Logic สำหรับการดึงรายการ User ที่มี Certificate รออนุมัติ ---

      // 1. ค้นหา User ID และวันที่ยื่นที่เก่าแก่ที่สุดของรายการ Certificate ที่รออนุมัติ สำหรับ User ทุกคน
      // พร้อมนับจำนวนรายการและกรองตาม searchQuery (ถ้ามี)
      const userPendingAggregates = await prisma.submissions.groupBy({
        by: ["user_id"],
        where: {
          type: "Certificate",
          status: "submitted",
          ...(q && {
            // Apply search query filter if present
            users: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
                { major: { contains: q, mode: "insensitive" } },
                // Consider adding academic_years or certificate_type search if needed in user view search
              ],
            },
          }),
        },
        _min: {
          created_at: true, // Get the creation date of the oldest pending submission
        },
        _count: {
          submission_id: true, // Count pending submissions per user
        },
        // We sort and paginate in memory after fetching all aggregates
        orderBy: {
          // Initial sort for groupBy can help, but the final sort is on _min.created_at
          user_id: "asc", // Arbitrary initial sort
        },
      });

      // 2. จัดเรียง User ตามวันที่ยื่นที่เก่าแก่ที่สุด (น้อยไปมาก)
      userPendingAggregates.sort((a, b) => {
        const dateA = a._min.created_at;
        const dateB = b._min.created_at;

        // Handle cases where created_at might be null (shouldn't happen with status 'submitted', but safe)
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1; // If A has no date, B comes first
        if (!dateB) return -1; // If B has no date, A comes first

        return dateA.getTime() - dateB.getTime(); // Sort by date ascending (oldest first)
      });

      // 3. ทำ Pagination กับรายการ User IDs ที่จัดเรียงแล้ว
      const startIndex = (numericPage - 1) * numericPageSize;
      const paginatedUserAggregates = userPendingAggregates.slice(
        startIndex,
        startIndex + numericPageSize
      );
      const paginatedUserIds = paginatedUserAggregates.map(
        (item) => item.user_id
      );

      // 4. ดึงข้อมูล User รายละเอียดสำหรับ User IDs ที่อยู่ในหน้านั้น
      const usersDetails = await prisma.users.findMany({
        where: {
          user_id: { in: paginatedUserIds },
        },
        // Sorting by 'in' array order requires manual sorting in JS
        include: {
          // Include relevant fields like faculty and major directly
          // academic_years: { select: { year_name: true } } // Include academic year if needed in the user list row
        },
      });

      // 5. รวมข้อมูล User รายละเอียดกับข้อมูล aggregate (count, oldest_date)
      // และจัดเรียงให้ตรงกับลำดับใน paginatedUserIds
      const sortedUsers = paginatedUserIds
        .map((userId) => {
          const userDetail = usersDetails.find(
            (user) => user.user_id === userId
          );
          const aggregateData = userPendingAggregates.find(
            (item) => item.user_id === userId
          );

          // Return user data with pending count and oldest submission date
          return userDetail
            ? {
                ...userDetail,
                pending_count: aggregateData?._count.submission_id || 0,
                oldest_submission_date: aggregateData?._min.created_at || null,
              }
            : null; // Should not be null if findMany returned it
        })
        .filter(Boolean); // Filter out any potential nulls

      const totalUsers = userPendingAggregates.length; // Total count of users with pending submissions matching criteria
      const totalPages = Math.ceil(totalUsers / numericPageSize);

      // Send response structured for user list
      res.json({
        users: sortedUsers, // Use 'users' field
        totalPages,
        currentPage: numericPage,
        totalUsers, // Total count of users
        // Do not send 'submissions' in this mode
      });
    } else {
      // --- Logic เดิม สำหรับการดึงรายการ Submission ---
      // Apply search query filter
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
            type: {
              in: [
                "Certificate",
                "BloodDonate",
                "NSF",
                "AOM YOUNG",
                "ต้นไม้ล้านต้น ล้านความดี",
                "religious",
                "social-development"
              ],
            },
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

      // Determine sorting criteria (only latest or oldest supported)
      const allowedSorts = ["latest", "oldest"];
      const finalSortOption = allowedSorts.includes(sortOption) ? sortOption : "latest";
      const finalOrderBy = { created_at: finalSortOption === "latest" ? "desc" : "asc" };

      // Fetch submissions and total count
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
              take: 1, // Get the latest status log
            },
          },
          orderBy: finalOrderBy, // Use the determined orderBy
          skip: (numericPage - 1) * numericPageSize,
          take: numericPageSize,
        }),
        prisma.submissions.count({ where }), // Count submissions matching criteria
      ]);

      const totalPages = Math.ceil(totalSubmissions / numericPageSize);

      // Send response structured for submission list
      res.json({
        submissions, // Use 'submissions' field
        totalPages,
        currentPage: numericPage,
        totalSubmissions, // Total count of submissions
        // Do not send 'users' in this mode
      });
    }
  } catch (error) {
    console.error("❌ Error fetching pending data:", error); // Log detailed error server-side
    // Send a generic error response to the client
    res.status(500).json({ error: "Failed to fetch pending data" });
  }
};

exports.reviewSubmission = async (req, res) => {
  const { submission_id } = req.params;
  const { status, rejection_reason, hours } = req.body; // รับ status, rejection_reason, hours จาก body
  const admin_id = req.user.id;

  // Input validation เพิ่มเติม (แนะนำ)
  if (!status || (status === "rejected" && !rejection_reason)) {
    return res.status(400).json({
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

exports.getPendingCertificatesByUser = async (req, res) => {
  const { userId } = req.params; // รับ userId จาก URL parameter

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "User ID ไม่ถูกต้อง" });
  }
  // Optional: Add UUID format validation if user_id is UUID

  try {
    // ดึงข้อมูล User สำหรับแสดงใน Modal Header ก่อน
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        name: true,
        username: true,
        faculty: true,
        major: true,
      }, // เลือกเฉพาะ field ที่ต้องการ
    });

    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }

    // ดึงรายการ Certificate ที่มี status เป็น 'submitted' ของ user คนนี้
    const userSubmissions = await prisma.submissions.findMany({
      where: {
        user_id: userId,
        type: "Certificate", // เฉพาะ Certificate
        status: "submitted", // เฉพาะรายการที่รออนุมัติ
      },
      orderBy: { created_at: "asc" }, // จัดเรียงรายการใน Modal เช่น เรียงตามวันที่ยื่นเก่าสุด
      include: {
        certificate_type: {
          // ต้องใช้ข้อมูลนี้สำหรับชื่อหัวข้อและหมวดหมู่
          select: { certificate_name: true, category: true, hours: true },
        },
        submission_files: {
          // ต้องใช้สำหรับ Preview
          select: { file_path: true }, // เลือกเฉพาะ path
        },
        academic_years: {
          // อาจจะใช้ใน Modal
          select: { year_name: true },
        },
        // ไม่ต้อง include users, status_logs ที่นี่ เพราะดึงข้อมูล user แล้ว และ status ชัดเจน
      },
    });

    // ส่ง response เป็น Object ที่มีทั้ง user info และ list ของ submissions
    res.json({ user: user, submissions: userSubmissions });
  } catch (error) {
    console.error(
      `❌ Error fetching pending certificates for user ${userId}:`,
      error
    );
    // More specific error handling for Prisma errors
    res
      .status(500)
      .json({ error: "Failed to fetch user's pending certificates" });
  }
};

exports.getApprovalHistory = async (req, res) => {
  const {
    category,
    page = 1,
    pageSize = 50,
    searchQuery = "",
    sortOption = "latest",
  } = req.query;

  const numericPage = parseInt(page);
  const numericPageSize = parseInt(pageSize);
  const q = searchQuery.trim();

  let where;
  if (category === "Others") {
    const orConditions = [
      { users: { name: { contains: q } } },
      { users: { username: { contains: q } } },
      { users: { major: { contains: q } } },
      {type: { contains: q }}
    ];

    where = {
      NOT: {
        type: { in: ["Certificate", "BloodDonate", "NSF", "AOM YOUNG"] },
      },
      status: { in: ["approved", "rejected"] },
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
      status: { in: ["approved", "rejected"] },
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

    res.json({
      submissions,
      totalPages,
      currentPage: numericPage,
      totalSubmissions,
    });
  } catch (error) {
    console.error("❌ Error fetching approval history:", error);
    res.status(500).json({ error: "Failed to fetch approval history" });
  }
};
