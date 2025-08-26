// src/controllers/linkController.js
const prisma = require("../config/database");
const xlsx = require("xlsx");

const studentIdHeader = "รหัสนักศึกษา";
const yearHeader = "ปีการศึกษา";
const projectNameHeader = "ชื่อโครงการ";
const hoursHeader = "จำนวนชั่วโมงที่ทำกิจกรรม";
const activityTypeHeader = "ประเภทกิจกรรมจิตอาสา";
const expectedHeaders = [studentIdHeader, yearHeader, projectNameHeader, hoursHeader, activityTypeHeader];

exports.uploadVolunteerHours = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      error: "Invalid file type. Only Excel (.xlsx, .xls) is allowed.",
    });
  }

  try {
    console.log("Reading Excel file buffer...");
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("Excel file contains no sheets.");
    const worksheet = workbook.Sheets[sheetName];

    const rawData = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      range: 1,
      blankrows: false,
    });
    if (rawData.length < 1)
      throw new Error("ไม่พบ Header ในไฟล์ Excel (แถวที่ 2)");

    const headers = rawData[0].map((h) => String(h || "").trim());
    console.log("Excel Headers found:", headers);
    const requiredHeadersPresent = expectedHeaders.every((eh) =>
      headers.includes(eh)
    );
    if (!requiredHeadersPresent) {
      const missing = expectedHeaders.filter((h) => !headers.includes(h));
      throw new Error(`Invalid Excel headers. Missing: ${missing.join(", ")}`);
    }
    console.log("Excel headers verified successfully.");

    const headerIndices = {
      studentId: headers.indexOf(studentIdHeader),
      year: headers.indexOf(yearHeader),
      projectName: headers.indexOf(projectNameHeader),
      hours: headers.indexOf(hoursHeader),
      activityType: headers.indexOf(activityTypeHeader),
    };

    const dataToProcess = rawData.slice(1);
    console.log(
      `Found ${dataToProcess.length} data rows. Starting database upsert...`
    );

    // Prepare data for batch insert
    const validData = [];
    const errors = [];
    let skippedCount = 0;

    for (const rowArray of dataToProcess) {
      const studentId = String(rowArray[headerIndices.studentId] || "").trim();
      const academicYear = String(rowArray[headerIndices.year] || "").trim();
      const projectName = String(rowArray[headerIndices.projectName] || "").trim();
      const totalHoursString = String(
        rowArray[headerIndices.hours] || ""
      ).trim();
      const hours = parseInt(totalHoursString, 10);
      const activityType = String(rowArray[headerIndices.activityType] || "").trim();

      if (!studentId || !academicYear || !projectName || isNaN(hours) || hours <= 0 || !activityType) {
        console.warn(
          `Skipping row due to missing data or invalid/zero hours: StudentID=${studentId}, Year=${academicYear}, Project=${projectName}, Hours=${totalHoursString}, ActivityType=${activityType}`
        );
        errors.push(
          `Row skipped: Missing data or invalid/zero hours for ${
            studentId || "N/A"
          } / ${academicYear || "N/A"} / ${projectName || "N/A"}`
        );
        skippedCount++;
        continue;
      }

      validData.push({
        user_id: studentId,
        year: academicYear,
        project_name: projectName,
        hours: hours,
        activity_type: activityType
      });
    }

    let successCount = 0;
    let duplicateCount = 0;

    try {
      const result = await prisma.linked_volunteer.createMany({
        data: validData,
        skipDuplicates: true,
      });
      successCount = result.count;
      duplicateCount = validData.length - result.count;
      
      console.log(`Batch insert completed. Created: ${successCount}, Duplicates skipped: ${duplicateCount}`);
    } catch (createError) {
      console.error("Error in batch insert:", createError);
      errors.push(`Batch insert failed: ${createError.message}`);
      skippedCount += validData.length;
    }

    console.log(
      `Database insert finished. Success: ${successCount}, Duplicates: ${duplicateCount}, Invalid: ${skippedCount}`
    );
    res.json({
      message: `File processed. ${successCount} records created, ${duplicateCount} duplicates skipped, ${skippedCount} records invalid/skipped.`,
      totalRowsInFile: dataToProcess.length,
      validRowsProcessed: validData.length,
      successCount,
      duplicateCount,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ Error processing uploaded file:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to process uploaded file.",
        details: error.message,
      });
    }
  }
};


exports.uploadScholarshipApplied = async (req, res) => {
  const { type, academic_year } = req.body;

  if (!req.file || !type || !academic_year) {
    return res.status(400).json({ error: "Missing required file or fields." });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      range: 5, // เริ่มจากแถว C6 เป็นต้นไป
    });

    const studentIds = rows
      .map((r) => String(r[2]).trim())
      .filter((id) => id && /^\d{11}$/.test(id));

    const dataToInsert = studentIds.map((student_id) => ({
      student_id,
      academic_year,
      type,
    }));

    const result = await prisma.linked_scholarship.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    res.json({
      message: `Upload completed. Success: ${
        result.count
      }, Duplicates skipped: ${studentIds.length - result.count}`,
    });

    console.log(
      `Upload completed. Success: ${result.count}, Skipped: ${
        studentIds.length - result.count
      }`
    );
  } catch (err) {
    console.error("Upload failed:", err);
    res
      .status(500)
      .json({ error: "Failed to process file", details: err.message });
  }
};
