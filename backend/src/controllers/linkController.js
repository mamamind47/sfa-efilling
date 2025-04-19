// src/controllers/linkController.js
const prisma = require("../config/database");
const xlsx = require("xlsx");

const studentIdHeader = "รหัสนักศึกษา";
const yearHeader = "ปีการศึกษา";
const hoursHeader = "รวมจำนวนชั่วโมงที่ทำทั้งหมด";
const expectedHeaders = [studentIdHeader, yearHeader, hoursHeader];

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
      hours: headers.indexOf(hoursHeader),
    };

    const dataToProcess = rawData.slice(1);
    console.log(
      `Found ${dataToProcess.length} data rows. Starting database upsert...`
    );

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const rowArray of dataToProcess) {
      const studentId = String(rowArray[headerIndices.studentId] || "").trim();
      const academicYear = String(rowArray[headerIndices.year] || "").trim();
      const totalHoursString = String(
        rowArray[headerIndices.hours] || ""
      ).trim();
      const hours = parseInt(totalHoursString, 10);

      if (!studentId || !academicYear || isNaN(hours) || hours <= 0) {
        console.warn(
          `Skipping row due to missing data or invalid/zero hours: StudentID=${studentId}, Year=${academicYear}, Hours=${totalHoursString}`
        );
        errors.push(
          `Row skipped: Missing data or invalid/zero hours for ${
            studentId || "N/A"
          } / ${academicYear || "N/A"}`
        );
        errorCount++;
        continue;
      }

      try {
        await prisma.linked_volunteer.upsert({
          where: {
            user_id_year: { user_id: studentId, year: academicYear },
          },
          update: { hours: hours },
          create: { user_id: studentId, year: academicYear, hours: hours },
        });
        successCount++;
      } catch (upsertError) {
        console.error(
          `Error upserting row: StudentID=${studentId}, Year=${academicYear}`,
          upsertError
        );
        errors.push(
          `Row failed: ${studentId} / ${academicYear} - ${upsertError.message}`
        );
        errorCount++;
      }
    }

    console.log(
      `Database upsert finished. Success: ${successCount}, Failed: ${errorCount}`
    );
    res.json({
      message: `File processed. ${successCount} records upserted, ${errorCount} records failed/skipped.`,
      totalRowsInFile: dataToProcess.length + 1,
      validRowsProcessed: successCount + errorCount,
      successCount,
      errorCount,
      errors: errorCount > 0 ? errors : undefined,
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
