const prisma = require("../config/database");

exports.getActiveStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds)) {
      return res
        .status(400)
        .json({ error: "Invalid input. studentIds must be an array." });
    }

    const activeStatuses = await Promise.all(
      studentIds.map(async (user_id) => {
        const student = await prisma.users.findUnique({
          where: { user_id },
        });
        return { user_id, isActive: !!student };
      })
    );
    res.status(200).json(activeStatuses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

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
      select: { academic_year_id: true, year_name: true, status: true, start_date: true },
    });

    const distinctFaculties = await prisma.users.findMany({
      where: {
        role: "student",
        AND: [ { faculty: { not: null } }, { faculty: { not: "" } } ]
      },
      distinct: ["faculty"], select: { faculty: true, }, orderBy: { faculty: "asc", },
    });
    const availableFaculties = distinctFaculties.map((f) => f.faculty);

    // 3. Determine Target Academic Year
    let targetAcademicYear = null;
    if (academicYearId) {
      targetAcademicYear = allAcademicYears.find((ay) => ay.academic_year_id === academicYearId);
    } else {
      targetAcademicYear = allAcademicYears.find(ay => ay.status === 'OPEN') || allAcademicYears[0];
    }

    if (!targetAcademicYear) { /* ... handle no academic year ... */
        return res.status(200).json({
            data: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: limitNum },
            filters: { academicYears: [], faculties: availableFaculties, selectedAcademicYear: null },
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
        userWhereClause.OR = [ // ค้นหาในชื่อ หรือ รหัสนักศึกษา
            { name: { contains: searchTerm /*, mode: 'insensitive' */ } }, // mode: 'insensitive' ถ้าต้องการ case-insensitive (ขึ้นกับ DB collation)
            { username: { contains: searchTerm /*, mode: 'insensitive' */ } }
            // เพิ่ม field อื่นๆ ที่ต้องการค้นหาได้ เช่น major
            // { major: { contains: searchTerm /*, mode: 'insensitive' */ } }
        ];
    }
    // --- End Search Condition ---

    // 5. Fetch Paginated User IDs matching base filters AND Search
    const usersForPage = await prisma.users.findMany({
        where: userWhereClause, // <--- Where clause includes search now
        select: { user_id: true, username: true, name: true, faculty: true, major: true, },
        orderBy: { name: 'asc'},
        skip: skip,
        take: limitNum,
    });

    const userIdsOnPage = usersForPage.map(u => u.user_id);
    const usernamesOnPage = usersForPage.map(u => u.username);

    // If no users match filters + search on this page
    if (userIdsOnPage.length === 0) {
         // Calculate total matching items based on search+filters for accurate empty state message
         const totalMatchingItems = await prisma.users.count({ where: userWhereClause });
         return res.status(200).json({
            data: [],
            pagination: { currentPage: pageNum, totalPages: Math.ceil(totalMatchingItems / limitNum), totalItems: totalMatchingItems, limit: limitNum, },
            filters: { /* ... filters ... */ },
        });
    }

    // 6. Fetch Detailed Statistics Data (MODLINK, Submissions, Scholarship) - Logic remains the same
    const [modLinkHoursData, submissionHoursData, scholarshipData] = await Promise.all([
        prisma.linked_volunteer.findMany({
            where: { user_id: { in: usernamesOnPage }, year: targetAcademicYearName, },
            select: { user_id: true, hours: true, }
        }),
        prisma.submissions.findMany({
            where: { user_id: { in: userIdsOnPage }, academic_year_id: targetAcademicYearId, status: 'approved', },
            select: { user_id: true, type: true, hours: true, } // Use 'hours'
        }),
        prisma.linked_scholarship.findMany({
            where: { student_id: { in: usernamesOnPage }, academic_year: targetAcademicYearName, },
            select: { student_id: true, }
        })
    ]);

    // --- Process fetched data into maps (modLinkHoursMap, submissionHoursMap, appliedScholarshipUsernames) ---
    const modLinkHoursMap = modLinkHoursData.reduce((acc, item) => { /* ... */ acc[item.user_id] = (acc[item.user_id] || 0) + (item.hours || 0); return acc; }, {});
    const submissionHoursMap = submissionHoursData.reduce((acc, item) => { /* ... */ if (!acc[item.user_id]) { acc[item.user_id] = {}; } acc[item.user_id][item.type] = (acc[item.user_id][item.type] || 0) + (item.hours || 0); return acc; }, {});
    const appliedScholarshipUsernames = new Set(scholarshipData.map(s => s.student_id));
    // --- End Processing ---


    // 7. Combine Data and Apply Post-Fetch Filters (Hour Status, Scholarship Status) - Logic remains the same structure
    let combinedResults = usersForPage.map(user => { /* ... combine data logic ... */
        const userSubmissions = submissionHoursMap[user.user_id] || {};
        const eLearningHours = userSubmissions['Certificate'] || 0;
        const bloodDonateHours = userSubmissions['BloodDonate'] || 0;
        const nsfHours = userSubmissions['NSF'] || 0;
        const aomYoungHours = userSubmissions['AOM YOUNG'] || 0;
        const knownTypes = ['Certificate', 'BloodDonate', 'NSF', 'AOM YOUNG'];
        const otherHours = Object.entries(userSubmissions).filter(([type]) => !knownTypes.includes(type)).reduce((sum, [, h]) => sum + h, 0);
        const modLinkHours = modLinkHoursMap[user.username] || 0;
        const totalHours = modLinkHours + eLearningHours + bloodDonateHours + nsfHours + aomYoungHours + otherHours;
        const scholarshipApplied = appliedScholarshipUsernames.has(user.username);
        return { userId: user.user_id, username: user.username, name: user.name, faculty: user.faculty, major: user.major, academicYearName: targetAcademicYearName, modLinkHours, eLearningHours, bloodDonateHours, nsfHours, aomYoungHours, otherHours, totalHours, scholarshipApplied, };
     });

    // Apply post-fetch filters
    if (hourStatus === 'completed') { combinedResults = combinedResults.filter(user => user.totalHours >= 36); }
    else if (hourStatus === 'incomplete') { combinedResults = combinedResults.filter(user => user.totalHours < 36); }
    if (scholarshipStatus === 'applied') { combinedResults = combinedResults.filter(user => user.scholarshipApplied); }
    else if (scholarshipStatus === 'not_applied') { combinedResults = combinedResults.filter(user => !user.scholarshipApplied); }


    // 8. Fetch Total Count matching ALL filters including Search for accurate pagination
    const totalItems = await prisma.users.count({
         where: userWhereClause // Where clause now includes search
    });
    const totalPages = Math.ceil(totalItems / limitNum);

    // 9. Structure and Send Response
    res.status(200).json({
      data: combinedResults, // Data for the current page, after all filters
      pagination: { currentPage: pageNum, totalPages: totalPages, totalItems: totalItems, limit: limitNum, }, // Pagination based on *all* filters
      filters: { /* ... */ },
    });
    console.log(combinedResults);

  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};


// --- NEW FUNCTION for Exporting User Statistics ---
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
            select: { academic_year_id: true, year_name: true, status: true, start_date: true },
        });

        // 3. Determine Target Academic Year
        let targetAcademicYear = null;
        if (academicYearId) {
             targetAcademicYear = allAcademicYears.find((ay) => ay.academic_year_id === academicYearId);
        } else {
            targetAcademicYear = allAcademicYears.find(ay => ay.status === 'OPEN') || allAcademicYears[0];
        }

        if (!targetAcademicYear) {
            return res.status(404).json({ error: "Academic year not found for export." });
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
        console.log(`[Export] Fetching all users with filters: ${JSON.stringify(userWhereClause)}`);
        const allMatchingUsers = await prisma.users.findMany({
            where: userWhereClause, // Only role and faculty filters
            select: { user_id: true, username: true, name: true, faculty: true, major: true, },
            orderBy: { name: 'asc'},
            // NO skip, NO take
        });
        console.log(`[Export] Found ${allMatchingUsers.length} users matching base filters.`);


        if (allMatchingUsers.length === 0) {
            return res.status(404).json({ error: "No users found matching the specified criteria for export." });
        }

        const allUserIds = allMatchingUsers.map(u => u.user_id);
        const allUsernames = allMatchingUsers.map(u => u.username);

        // 6. Fetch Detailed Statistics Data for *ALL* these Users
         console.log(`[Export] Fetching detailed stats for ${allUserIds.length} users...`);
         const [modLinkHoursData, submissionHoursData, scholarshipData] = await Promise.all([
            prisma.linked_volunteer.findMany({
                where: { user_id: { in: allUsernames }, year: targetAcademicYearName, },
                select: { user_id: true, hours: true, }
            }),
            prisma.submissions.findMany({
                where: { user_id: { in: allUserIds }, academic_year_id: targetAcademicYearId, status: 'approved', },
                select: { user_id: true, type: true, hours: true, } // Use 'hours'
            }),
            prisma.linked_scholarship.findMany({
                where: { student_id: { in: allUsernames }, academic_year: targetAcademicYearName, },
                select: { student_id: true, }
            })
         ]);
         console.log(`[Export] Fetched detailed stats.`);


        // --- Process fetched data into maps ---
        const modLinkHoursMap = modLinkHoursData.reduce((acc, item) => { acc[item.user_id] = (acc[item.user_id] || 0) + (item.hours || 0); return acc; }, {});
        const submissionHoursMap = submissionHoursData.reduce((acc, item) => { if (!acc[item.user_id]) { acc[item.user_id] = {}; } acc[item.user_id][item.type] = (acc[item.user_id][item.type] || 0) + (item.hours || 0); return acc; }, {});
        const appliedScholarshipUsernames = new Set(scholarshipData.map(s => s.student_id));
        // --- End Processing ---

        // 7. Combine Data for *ALL* Users
        console.log(`[Export] Combining data...`);
        let combinedResults = allMatchingUsers.map(user => { /* ... same combining logic as getUserStatistics ... */
            const userSubmissions = submissionHoursMap[user.user_id] || {};
            const eLearningHours = userSubmissions['Certificate'] || 0;
            const bloodDonateHours = userSubmissions['BloodDonate'] || 0;
            const nsfHours = userSubmissions['NSF'] || 0;
            const aomYoungHours = userSubmissions['AOM YOUNG'] || 0;
            const knownTypes = ['Certificate', 'BloodDonate', 'NSF', 'AOM YOUNG'];
            const otherHours = Object.entries(userSubmissions).filter(([type]) => !knownTypes.includes(type)).reduce((sum, [, h]) => sum + h, 0);
            const modLinkHours = modLinkHoursMap[user.username] || 0;
            const totalHours = modLinkHours + eLearningHours + bloodDonateHours + nsfHours + aomYoungHours + otherHours;
            const scholarshipApplied = appliedScholarshipUsernames.has(user.username);
            return { userId: user.user_id, username: user.username, name: user.name, faculty: user.faculty, major: user.major, academicYearName: targetAcademicYearName, modLinkHours, eLearningHours, bloodDonateHours, nsfHours, aomYoungHours, otherHours, totalHours, scholarshipApplied, };
        });
        console.log(`[Export] Combined data for ${combinedResults.length} users.`);


        // Apply Post-Fetch Filters to *ALL* Data
        console.log(`[Export] Applying post-fetch filters (hourStatus: ${hourStatus}, scholarshipStatus: ${scholarshipStatus})...`);
        if (hourStatus === 'completed') { combinedResults = combinedResults.filter(user => user.totalHours >= 36); }
        else if (hourStatus === 'incomplete') { combinedResults = combinedResults.filter(user => user.totalHours < 36); }
        if (scholarshipStatus === 'applied') { combinedResults = combinedResults.filter(user => user.scholarshipApplied); }
        else if (scholarshipStatus === 'not_applied') { combinedResults = combinedResults.filter(user => !user.scholarshipApplied); }
        console.log(`[Export] ${combinedResults.length} users remain after post-fetch filters.`);


        if (combinedResults.length === 0) {
             return res.status(404).json({ error: "No users found matching all specified criteria (including hour/scholarship status) for export." });
        }

        // 8. Generate Excel File using exceljs
        console.log(`[Export] Generating Excel file...`);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`User Statistics ${targetAcademicYearName}`);

        // Define Columns - Adjust headers as needed
        worksheet.columns = [
            { header: 'ชื่อ-สกุล', key: 'name', width: 30 },
            { header: 'รหัสนักศึกษา', key: 'username', width: 15 },
            { header: 'คณะ', key: 'faculty', width: 30 },
            { header: 'สาขาวิชา', key: 'major', width: 30 },
            // { header: 'ปีการศึกษา', key: 'academicYearName', width: 15 }, // Already clear from sheet name/context
            { header: 'MODLINK', key: 'modLinkHours', width: 10, style: { numFmt: '0', alignment: { horizontal: 'center' } } },
            { header: 'e-Learning', key: 'eLearningHours', width: 12, style: { numFmt: '0', alignment: { horizontal: 'center' } } },
            { header: 'บริจาคเลือด', key: 'bloodDonateHours', width: 12, style: { numFmt: '0', alignment: { horizontal: 'center' } } },
            { header: 'กอช.', key: 'nsfHours', width: 10, style: { numFmt: '0', alignment: { horizontal: 'center' } } },
            { header: 'AOM YOUNG', key: 'aomYoungHours', width: 12, style: { numFmt: '0', alignment: { horizontal: 'center' } } },
            { header: 'อื่นๆ (ชม.)', key: 'otherHours', width: 12, style: { numFmt: '0', alignment: { horizontal: 'center' } } },
            { header: 'รวม (ชม.)', key: 'totalHours', width: 12, style: { numFmt: '0', alignment: { horizontal: 'center' }, font: { bold: true } } },
            { header: 'สถานะทุน', key: 'scholarshipStatusText', width: 15 },
        ];

        // Add Rows
        combinedResults.forEach(user => {
            worksheet.addRow({
                ...user,
                scholarshipStatusText: user.scholarshipApplied ? 'สมัครแล้ว' : 'ยังไม่สมัคร' // Convert boolean to text
            });
        });

         // Style Header Row
         worksheet.getRow(1).font = { bold: true };
         worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };


        // 9. Send Excel File as Response
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="user_statistics_${targetAcademicYearName}_${Date.now()}.xlsx"` // Add timestamp to filename
        );

        await workbook.xlsx.write(res);
        console.log(`[Export] Excel file sent successfully.`);
        res.end(); // End the response stream


    } catch (error) {
        console.error("Error exporting user statistics:", error);
        // Avoid sending headers twice if error occurs after setting them
        if (!res.headersSent) {
             res.status(500).json({ error: "Internal server error during export", details: error.message });
        } else {
            // If headers already sent, we might not be able to send a JSON error
             console.error("Headers already sent, could not send JSON error response for export failure.");
             res.end(); // Try to end the response anyway
        }
    }
};