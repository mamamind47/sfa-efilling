const prisma = require("../config/database");
const ExcelJS = require("exceljs");

exports.getUserStatistics = async (req, res) => {
  try {
    // 1. Extract Filters, Pagination, and Search from Query Params
    const {
      page = 1,
      limit = 50,
      academicYearId,
      faculty = "all",
      hourStatus = "all",
      scholarshipStatus = "all",
      search, // <-- รับ parameter search
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // 2. Fetch Filter Options (Academic Years and Faculties)
    const allAcademicYears = await prisma.academic_years.findMany({
      orderBy: { start_date: "desc" },
      select: {
        academic_year_id: true,
        year_name: true,
        status: true,
        start_date: true,
      },
    });

    const distinctFaculties = await prisma.users.findMany({
      where: {
        role: "student",
        AND: [{ faculty: { not: null } }, { faculty: { not: "" } }],
      },
      distinct: ["faculty"],
      select: { faculty: true },
      orderBy: { faculty: "asc" },
    });
    const availableFaculties = distinctFaculties.map((f) => f.faculty);

    // 3. Determine Target Academic Year
    let targetAcademicYear = null;
    if (academicYearId) {
      targetAcademicYear = allAcademicYears.find(
        (ay) => ay.academic_year_id === academicYearId
      );
    } else {
      targetAcademicYear =
        allAcademicYears.find((ay) => ay.status === "OPEN") ||
        allAcademicYears[0];
    }

    if (!targetAcademicYear) {
      // Handle case where no academic years exist at all
      console.warn("No academic years found in the database.");
      return res.status(200).json({
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          limit: limitNum,
        },
        // Send available faculties even if no year is found
        filters: {
          academicYears: [],
          faculties: availableFaculties,
          selectedAcademicYear: null,
        },
      });
    }
    const targetAcademicYearId = targetAcademicYear.academic_year_id;
    const targetAcademicYearName = targetAcademicYear.year_name;

    // 4. Build Base WHERE Clause for Users (including Search)
    const userWhereClause = {
      role: "student",
    };
    if (faculty && faculty !== "all") {
      userWhereClause.faculty = faculty;
    }
    // --- Add Search Condition ---
    if (search && search.trim() !== "") {
      const searchTerm = search.trim();
      userWhereClause.OR = [
        // ค้นหาในชื่อ หรือ รหัสนักศึกษา
        { name: { contains: searchTerm /*, mode: 'insensitive' */ } },
        { username: { contains: searchTerm /*, mode: 'insensitive' */ } },
      ];
    }
    // --- End Search Condition ---

    // 5. Fetch Paginated User IDs matching base filters AND Search
    const allFilteredUsers = await prisma.users.findMany({
      where: userWhereClause,
      select: {
        user_id: true,
        username: true,
        name: true,
        faculty: true,
        major: true,
      },
      orderBy: { name: "asc" },
    });

    const allUserIds = allFilteredUsers.map((u) => u.user_id);
    const allUsernames = allFilteredUsers.map((u) => u.username);


    // 6. Fetch Detailed Statistics Data (MODLINK, Submissions, Scholarship)
    const [modLinkHoursData, submissionHoursData, scholarshipData] =
      await Promise.all([
        prisma.linked_volunteer.findMany({
          where: {
            user_id: { in: allUsernames },
            year: targetAcademicYearName,
          },
          select: { user_id: true, hours: true },
        }),
        prisma.submissions.findMany({
          where: {
            user_id: { in: allUserIds },
            academic_year_id: targetAcademicYearId,
            status: "approved",
          },
          select: { user_id: true, type: true, hours: true },
        }),
        prisma.linked_scholarship.findMany({
          where: {
            student_id: { in: allUsernames },
            academic_year: targetAcademicYearName,
          },
          select: { student_id: true, type: true },
        }),
      ]);

    // --- Process fetched data into maps ---
    const modLinkHoursMap = modLinkHoursData.reduce((acc, item) => {
      acc[item.user_id] = (acc[item.user_id] || 0) + (item.hours || 0);
      return acc;
    }, {});
    const submissionHoursMap = submissionHoursData.reduce((acc, item) => {
      if (!acc[item.user_id]) {
        acc[item.user_id] = {};
      }
      acc[item.user_id][item.type] =
        (acc[item.user_id][item.type] || 0) + (item.hours || 0);
      return acc;
    }, {});
    // Create Map for scholarship type { username: scholarshipType }
    const scholarshipTypeMap = scholarshipData.reduce((acc, item) => {
      if (!acc[item.student_id]) {
        acc[item.student_id] = item.type;
      }
      return acc;
    }, {});
    // --- End Processing ---

    // 7. Combine Data and Apply Post-Fetch Filters (Hour Status, Scholarship Status)
    let combinedResults = allFilteredUsers.map((user) => {
      const userSubmissions = submissionHoursMap[user.user_id] || {};
      const eLearningHours = userSubmissions["Certificate"] || 0;
      const bloodDonateHours = userSubmissions["BloodDonate"] || 0;
      const nsfHours = userSubmissions["NSF"] || 0;
      const aomYoungHours = userSubmissions["AOM YOUNG"] || 0;
      const knownTypes = ["Certificate", "BloodDonate", "NSF", "AOM YOUNG"];
      const otherHours = Object.entries(userSubmissions)
        .filter(([type]) => !knownTypes.includes(type))
        .reduce((sum, [, h]) => sum + (h || 0), 0); // Ensure 'h' is treated as 0 if null/undefined
      const modLinkHours = modLinkHoursMap[user.username] || 0;
      const totalHours =
        modLinkHours +
        eLearningHours +
        bloodDonateHours +
        nsfHours +
        aomYoungHours +
        otherHours;
      const scholarshipType = scholarshipTypeMap[user.username];
      const scholarshipStatusDisplay = scholarshipType || "ยังไม่สมัคร";

      return {
        userId: user.user_id,
        username: user.username,
        name: user.name,
        faculty: user.faculty,
        major: user.major,
        academicYearName: targetAcademicYearName,
        modLinkHours,
        eLearningHours,
        bloodDonateHours,
        nsfHours,
        aomYoungHours,
        otherHours,
        totalHours,
        scholarshipStatusDisplay, // Use the display string
      };
    });

    // Apply post-fetch filters
    if (hourStatus === "completed") {
      combinedResults = combinedResults.filter((user) => user.totalHours >= 36);
    } else if (hourStatus === "incomplete") {
      combinedResults = combinedResults.filter((user) => user.totalHours < 36);
    }

    if (scholarshipStatus === "applied") {
      combinedResults = combinedResults.filter(
        (user) => user.scholarshipStatusDisplay !== "ยังไม่สมัคร"
      );
    } else if (scholarshipStatus === "not_applied") {
      combinedResults = combinedResults.filter(
        (user) => user.scholarshipStatusDisplay === "ยังไม่สมัคร"
      );
    }

    // 8. Fetch Total Count matching ALL filters including Search for accurate pagination
    const totalItems = combinedResults.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const paginatedResults = combinedResults.slice(skip, skip + limitNum);

    // 9. Structure and Send Response
    res.status(200).json({
      data: paginatedResults,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        limit: limitNum,
      },
      filters: {
        academicYears: allAcademicYears.map(
          ({ academic_year_id, year_name }) => ({
            id: academic_year_id,
            name: year_name,
          })
        ),
        faculties: availableFaculties,
        selectedAcademicYear: {
          id: targetAcademicYearId,
          name: targetAcademicYearName,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// --- FULL FUNCTION for Exporting User Statistics ---
exports.getUserStatisticsExport = async (req, res) => {
  try {
    // 1. Extract Filters from Query Params (NO Pagination, NO Search for Export)
    const {
      academicYearId,
      faculty = "all",
      hourStatus = "all",
      scholarshipStatus = "all",
    } = req.query;

    // 2. Fetch Academic Years (needed for year name)
    const allAcademicYears = await prisma.academic_years.findMany({
      orderBy: { start_date: "desc" },
      select: {
        academic_year_id: true,
        year_name: true,
        status: true,
        start_date: true,
      },
    });

    // 3. Determine Target Academic Year
    let targetAcademicYear = null;
    if (academicYearId) {
      targetAcademicYear = allAcademicYears.find(
        (ay) => ay.academic_year_id === academicYearId
      );
    } else {
      targetAcademicYear =
        allAcademicYears.find((ay) => ay.status === "OPEN") ||
        allAcademicYears[0];
    }

    if (!targetAcademicYear) {
      return res
        .status(404)
        .json({ error: "Academic year not found for export." });
    }
    const targetAcademicYearId = targetAcademicYear.academic_year_id;
    const targetAcademicYearName = targetAcademicYear.year_name;

    // 4. Build WHERE Clause for Users (NO Search for Export)
    const userWhereClause = {
      role: "student",
    };
    if (faculty && faculty !== "all") {
      userWhereClause.faculty = faculty;
    }

    // 5. Fetch *ALL* Users matching base filters
    // console.log(`[Export] Fetching all users with filters: ${JSON.stringify(userWhereClause)}`);
    const allMatchingUsers = await prisma.users.findMany({
      where: userWhereClause, // Only role and faculty filters
      select: {
        user_id: true,
        username: true,
        name: true,
        faculty: true,
        major: true,
        email: true,
        phone: true,
      },
      orderBy: { name: "asc" },
      // NO skip, NO take
    });
    // console.log(`[Export] Found ${allMatchingUsers.length} users matching base filters.`);

    if (allMatchingUsers.length === 0) {
      return res
        .status(404)
        .json({
          error: "No users found matching the specified criteria for export.",
        });
    }

    const allUserIds = allMatchingUsers.map((u) => u.user_id);
    const allUsernames = allMatchingUsers.map((u) => u.username);

    // 6. Fetch Detailed Statistics Data for *ALL* these Users
    // console.log(`[Export] Fetching detailed stats for ${allUserIds.length} users...`);
    const [modLinkHoursData, submissionHoursData, scholarshipData] =
      await Promise.all([
        prisma.linked_volunteer.findMany({
          where: {
            user_id: { in: allUsernames },
            year: targetAcademicYearName,
          },
          select: { user_id: true, hours: true },
        }),
        prisma.submissions.findMany({
          where: {
            user_id: { in: allUserIds },
            academic_year_id: targetAcademicYearId,
            status: "approved",
          },
          select: { user_id: true, type: true, hours: true }, // Use 'hours'
        }),
        prisma.linked_scholarship.findMany({
          where: {
            student_id: { in: allUsernames },
            academic_year: targetAcademicYearName,
          },
          select: { student_id: true, type: true }, // <-- Select type
        }),
      ]);
    // console.log(`[Export] Fetched detailed stats.`);

    // --- Process fetched data into maps ---
    const modLinkHoursMap = modLinkHoursData.reduce((acc, item) => {
      acc[item.user_id] = (acc[item.user_id] || 0) + (item.hours || 0);
      return acc;
    }, {});
    const submissionHoursMap = submissionHoursData.reduce((acc, item) => {
      if (!acc[item.user_id]) {
        acc[item.user_id] = {};
      }
      acc[item.user_id][item.type] =
        (acc[item.user_id][item.type] || 0) + (item.hours || 0);
      return acc;
    }, {});
    // Create Map for scholarship type { username: scholarshipType }
    const scholarshipTypeMap = scholarshipData.reduce((acc, item) => {
      if (!acc[item.student_id]) {
        acc[item.student_id] = item.type;
      }
      return acc;
    }, {});
    // --- End Processing ---

    // 7. Combine Data for *ALL* Users
    // console.log(`[Export] Combining data...`);
    let combinedResults = allMatchingUsers.map((user) => {
      const userSubmissions = submissionHoursMap[user.user_id] || {};
      const eLearningHours = userSubmissions["Certificate"] || 0;
      const bloodDonateHours = userSubmissions["BloodDonate"] || 0;
      const nsfHours = userSubmissions["NSF"] || 0;
      const aomYoungHours = userSubmissions["AOM YOUNG"] || 0;
      const knownTypes = ["Certificate", "BloodDonate", "NSF", "AOM YOUNG"];
      const otherHours = Object.entries(userSubmissions)
        .filter(([type]) => !knownTypes.includes(type))
        .reduce((sum, [, h]) => sum + (h || 0), 0);
      const modLinkHours = modLinkHoursMap[user.username] || 0;
      const totalHours =
        modLinkHours +
        eLearningHours +
        bloodDonateHours +
        nsfHours +
        aomYoungHours +
        otherHours;
      const scholarshipType = scholarshipTypeMap[user.username];
      const scholarshipStatusDisplay = scholarshipType || "ยังไม่สมัคร";

      return {
        userId: user.user_id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        faculty: user.faculty,
        major: user.major,
        academicYearName: targetAcademicYearName,
        modLinkHours,
        eLearningHours,
        bloodDonateHours,
        nsfHours,
        aomYoungHours,
        otherHours,
        totalHours,
        scholarshipStatusDisplay,
      };
    });
    // console.log(`[Export] Combined data for ${combinedResults.length} users.`);

    // Apply Post-Fetch Filters to *ALL* Data
    // console.log(`[Export] Applying post-fetch filters (hourStatus: ${hourStatus}, scholarshipStatus: ${scholarshipStatus})...`);
    if (hourStatus === "completed") {
      combinedResults = combinedResults.filter((user) => user.totalHours >= 36);
    } else if (hourStatus === "incomplete") {
      combinedResults = combinedResults.filter((user) => user.totalHours < 36);
    }
    // Filter based on new display string
    if (scholarshipStatus === "applied") {
      combinedResults = combinedResults.filter(
        (user) => user.scholarshipStatusDisplay !== "ยังไม่สมัคร"
      );
    } else if (scholarshipStatus === "not_applied") {
      combinedResults = combinedResults.filter(
        (user) => user.scholarshipStatusDisplay === "ยังไม่สมัคร"
      );
    }
    // console.log(`[Export] ${combinedResults.length} users remain after post-fetch filters.`);

    if (combinedResults.length === 0) {
      return res
        .status(404)
        .json({
          error:
            "No users found matching all specified criteria (including hour/scholarship status) for export.",
        });
    }

    // 8. Generate Excel File using exceljs
    // console.log(`[Export] Generating Excel file...`);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(
      `User Statistics ${targetAcademicYearName}`
    );

    // Define Columns - Adjust headers as needed
    worksheet.columns = [
      { header: "ชื่อ-สกุล", key: "name", width: 30 },
      { header: "รหัสนักศึกษา", key: "username", width: 15 },
      { header: "อีเมล", key: "email", width: 30 },
      { header: "เบอร์โทรศัพท์", key: "phone", width: 15 },
      { header: "คณะ", key: "faculty", width: 30 },
      { header: "สาขาวิชา", key: "major", width: 30 },
      {
        header: "MODLINK",
        key: "modLinkHours",
        width: 10,
        style: { numFmt: "0", alignment: { horizontal: "center" } },
      },
      {
        header: "e-Learning",
        key: "eLearningHours",
        width: 12,
        style: { numFmt: "0", alignment: { horizontal: "center" } },
      },
      {
        header: "บริจาคเลือด",
        key: "bloodDonateHours",
        width: 12,
        style: { numFmt: "0", alignment: { horizontal: "center" } },
      },
      {
        header: "กอช.",
        key: "nsfHours",
        width: 10,
        style: { numFmt: "0", alignment: { horizontal: "center" } },
      },
      {
        header: "AOM YOUNG",
        key: "aomYoungHours",
        width: 12,
        style: { numFmt: "0", alignment: { horizontal: "center" } },
      },
      {
        header: "อื่นๆ (ชม.)",
        key: "otherHours",
        width: 12,
        style: { numFmt: "0", alignment: { horizontal: "center" } },
      },
      {
        header: "รวม (ชม.)",
        key: "totalHours",
        width: 12,
        style: {
          numFmt: "0",
          alignment: { horizontal: "center" },
          font: { bold: true },
        },
      },
      { header: "ประเภททุน/สถานะ", key: "scholarshipStatusDisplay", width: 20 },
    ];

    // Add Rows
    combinedResults.forEach((user) => {
      worksheet.addRow(user); // Directly add the user object as keys match column keys
    });

    // Style Header Row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // 9. Send Excel File as Response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="user_statistics_${targetAcademicYearName}_${Date.now()}.xlsx"` // Add timestamp to filename
    );

    await workbook.xlsx.write(res);
    // console.log(`[Export] Excel file sent successfully.`);
    res.end(); // End the response stream
  } catch (error) {
    console.error("Error exporting user statistics:", error);
    // Avoid sending headers twice if error occurs after setting them
    if (!res.headersSent) {
      res
        .status(500)
        .json({
          error: "Internal server error during export",
          details: error.message,
        });
    } else {
      console.error(
        "Headers already sent, could not send JSON error response for export failure."
      );
      res.end();
    }
  }
};

exports.updateScholarshipStatus = async (req, res) => {
  try {
    const { student_id, academic_year, new_type } = req.body;

    if (!student_id || !academic_year || !new_type) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Upsert (insert if not exists, else update)
    const updated = await prisma.linked_scholarship.upsert({
      where: {
        student_id_academic_year: {
          student_id,
          academic_year,
        },
      },
      update: {
        type: new_type,
      },
      create: {
        student_id,
        academic_year,
        type: new_type,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating scholarship status:", error);
    res.status(500).json({ error: "Failed to update scholarship status." });
  }
};