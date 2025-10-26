const cron = require('node-cron');
const prisma = require('../config/database');
const notificationService = require('./notificationService');
const emailService = require('./emailService');

// Check for deadline warnings daily at 9 AM
const scheduleDeadlineWarnings = () => {
  // Run at 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Running deadline warning check...');

    try {
      await checkDeadlineWarnings();
    } catch (error) {
      console.error('Error in deadline warning cron job:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Bangkok"
  });

  console.log('📅 Deadline warning cron job scheduled for 9:00 AM daily');
};

// Cleanup old notifications (run weekly on Sunday at 2 AM)
const scheduleNotificationCleanup = () => {
  cron.schedule('0 2 * * 0', async () => {
    console.log('🧹 Running notification cleanup...');

    try {
      await cleanupOldNotifications();
    } catch (error) {
      console.error('Error in notification cleanup cron job:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Bangkok"
  });

  console.log('🗑️  Notification cleanup cron job scheduled for 2:00 AM every Sunday');
};

// Delete notifications older than 1 year
const cleanupOldNotifications = async () => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await prisma.notifications.deleteMany({
      where: {
        created_at: {
          lt: oneYearAgo
        }
      }
    });

    console.log(`✅ Deleted ${result.count} notifications older than 1 year`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
    throw error;
  }
};

// Check for users approaching submission deadlines
const checkDeadlineWarnings = async () => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const oneDayFromNow = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000));

    // Find open academic years that are approaching their end dates
    const academicYears = await prisma.academic_years.findMany({
      where: {
        OR: [
          { status: 'OPEN' },
          { status: null }
        ],
        end_date: {
          gte: now,
          lte: sevenDaysFromNow
        }
      }
    });

    for (const year of academicYears) {
      const endDate = new Date(year.end_date);
      const daysLeft = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));

      // Only warn at specific thresholds: 7, 3, 1 days
      if (![7, 3, 1].includes(daysLeft)) continue;

      console.log(`📅 Processing academic year ${year.year_name} (${daysLeft} days left)`);

      // Get users who haven't completed their 36 hours for this academic year
      const incompleteUsers = await findIncompleteUsers(year.academic_year_id, daysLeft);

      if (incompleteUsers.length === 0) {
        console.log(`✅ No incomplete users found for ${year.year_name}`);
        continue;
      }

      // BATCH PROCESSING: Create all web notifications in bulk using createMany
      console.log(`📝 Creating ${incompleteUsers.length} web notifications in bulk...`);
      try {
        await prisma.notifications.createMany({
          data: incompleteUsers.map(user => ({
            user_id: user.user_id,
            type: 'DEADLINE_WARNING',
            title: 'ใกล้หมดเขตยื่นเอกสาร',
            message: `เหลือเวลายื่นเอกสารอีกเพียง ${daysLeft} วัน โปรดยื่นเอกสารให้ทันกำหนด`
          })),
          skipDuplicates: true
        });
        console.log(`✅ ${incompleteUsers.length} web notifications created successfully`);
      } catch (notifError) {
        console.error(`❌ Error creating bulk notifications:`, notifError.message);
        // Fallback to individual creation if bulk fails
        console.log(`🔄 Falling back to individual notification creation...`);
        const notificationPromises = incompleteUsers.map(user =>
          notificationService.createDeadlineWarning(user.user_id, daysLeft)
            .catch(err => {
              console.error(`Failed to create notification for ${user.username}:`, err.message);
              return null;
            })
        );
        await Promise.allSettled(notificationPromises);
        console.log(`✅ Individual notifications created`);
      }

      // BATCH PROCESSING: Send emails in batches with rate limiting
      console.log(`📧 Preparing ${incompleteUsers.length} deadline warning emails...`);
      const emailData = incompleteUsers.map(user => {
        const currentHours = user.currentHours || 0;
        const remainingHours = Math.max(0, 36 - currentHours);
        const deadline = new Date(year.end_date).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        return {
          to: user.email,
          subject: `⏰ แจ้งเตือน: ใกล้หมดเขตยื่นเอกสาร (เหลือ ${daysLeft} วัน)`,
          template: 'deadline-warning',
          variables: {
            userName: user.name || user.username,
            daysLeft: daysLeft,
            deadline: deadline,
            currentHours: currentHours,
            remainingHours: remainingHours,
            systemUrl: process.env.CLIENT_URL || 'http://localhost:5173'
          }
        };
      }).filter(email => email.to); // Only include users with valid emails

      // Send emails in batches with 2-second delays between batches
      const emailResults = await emailService.sendBatchEmails(emailData, {
        batchSize: 50,
        delayMs: 2000
      });

      console.log(`⚠️  Deadline warnings complete for ${year.year_name}:`);
      console.log(`   📧 Emails: ${emailResults.success} sent, ${emailResults.failed} failed`);
      console.log(`   ⏱️  Duration: ${emailResults.duration}s`);

      if (emailResults.errors.length > 0) {
        console.error(`   ❌ Failed emails:`, emailResults.errors.slice(0, 5)); // Show first 5 errors
      }
    }
    
  } catch (error) {
    console.error('Error checking deadline warnings:', error);
  }
};

// Find users who haven't completed 36 hours for the academic year
// OPTIMIZED: Bulk queries instead of per-user queries
const findIncompleteUsers = async (academicYearId, daysLeft) => {
  try {
    // Get active students only (status = normal, not senior, not graduated/about to graduate)
    const students = await prisma.users.findMany({
      where: {
        role: 'student',
        studentStatusName: 'normal', // เฉพาะสถานะปกติ
        isSenior: false, // เฉพาะรุ่นน้อง ไม่ใช่รุ่นพี่
        NOT: {
          OR: [
            { studentStatusName: 'graduated' },
            { studentStatusName: null } // หลีกเลี่ยง null status ที่อาจเป็นกรณีพิเศษ
          ]
        }
      },
      select: { user_id: true, username: true, name: true, email: true, studentStatusName: true, isSenior: true }
    });

    console.log(`📊 Found ${students.length} eligible students to check`);

    // OPTIMIZATION 1: Bulk fetch recent warnings for all students
    const studentIds = students.map(s => s.user_id);
    const recentWarnings = await prisma.notifications.findMany({
      where: {
        user_id: { in: studentIds },
        type: 'DEADLINE_WARNING',
        message: { contains: `${daysLeft} วัน` },
        created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      select: { user_id: true }
    });
    const warnedUserIds = new Set(recentWarnings.map(w => w.user_id));

    // OPTIMIZATION 2: Bulk fetch academic year info (only once)
    const academicYear = await prisma.academic_years.findUnique({
      where: { academic_year_id: academicYearId }
    });

    if (!academicYear) return [];

    // OPTIMIZATION 3: Bulk fetch all submissions for all students
    const allSubmissions = await prisma.submissions.findMany({
      where: {
        user_id: { in: studentIds },
        academic_year_id: academicYearId,
        status: 'approved',
        hours: { not: null }
      },
      select: { user_id: true, hours: true }
    });

    // OPTIMIZATION 4: Bulk fetch all linked volunteer hours
    const allVolunteerHours = await prisma.linked_volunteer.findMany({
      where: {
        user_id: { in: studentIds },
        year: academicYear.year_name
      },
      select: { user_id: true, hours: true }
    });

    // Build hour maps for quick lookup
    const submissionHoursMap = {};
    allSubmissions.forEach(sub => {
      if (!submissionHoursMap[sub.user_id]) submissionHoursMap[sub.user_id] = 0;
      submissionHoursMap[sub.user_id] += (sub.hours || 0);
    });

    const volunteerHoursMap = {};
    allVolunteerHours.forEach(vol => {
      if (!volunteerHoursMap[vol.user_id]) volunteerHoursMap[vol.user_id] = 0;
      volunteerHoursMap[vol.user_id] += (vol.hours || 0);
    });

    // Filter incomplete users
    const incompleteUsers = [];
    for (const student of students) {
      // Skip if already warned today
      if (warnedUserIds.has(student.user_id)) continue;

      // Calculate total hours from maps
      const submissionHours = submissionHoursMap[student.user_id] || 0;
      const volunteerHours = volunteerHoursMap[student.user_id] || 0;
      const totalHours = submissionHours + volunteerHours;

      if (totalHours < 36) {
        incompleteUsers.push({
          ...student,
          currentHours: totalHours // Add for email template
        });
      }
    }

    console.log(`📋 Found ${incompleteUsers.length} students with incomplete hours`);
    return incompleteUsers;
  } catch (error) {
    console.error('Error finding incomplete users:', error);
    return [];
  }
};

// Calculate user's total volunteer hours for an academic year
// NOTE: This function is now deprecated in favor of bulk processing in findIncompleteUsers
// Kept for backward compatibility if needed elsewhere
const getUserTotalHours = async (userId, academicYearId) => {
  try {
    // Get academic year info
    const academicYear = await prisma.academic_years.findUnique({
      where: { academic_year_id: academicYearId }
    });

    if (!academicYear) return 0;

    // Get approved submissions for this user and academic year
    const approvedSubmissions = await prisma.submissions.findMany({
      where: {
        user_id: userId,
        academic_year_id: academicYearId,
        status: 'approved',
        hours: {
          not: null
        }
      },
      select: { hours: true }
    });

    const submissionHours = approvedSubmissions.reduce((total, sub) => total + (sub.hours || 0), 0);

    // Get MOD LINK volunteer hours (if any)
    const modLinkHours = await prisma.linked_volunteer.findMany({
      where: {
        user_id: userId,
        year: academicYear.year_name
      },
      select: { hours: true }
    });

    const volunteerHours = modLinkHours.reduce((total, entry) => total + (entry.hours || 0), 0);

    return submissionHours + volunteerHours;
  } catch (error) {
    console.error('Error calculating user total hours:', error);
    return 0;
  }
};

// Send deadline warning email
// NOTE: This function is now deprecated in favor of batch processing in checkDeadlineWarnings
// Kept for backward compatibility if needed for manual/individual sending
const sendDeadlineWarningEmail = async (user, academicYear, daysLeft) => {
  try {
    if (!user.email) {
      console.log(`⚠️ No email found for user ${user.username}`);
      return;
    }

    // Calculate user's current hours
    const currentHours = await getUserTotalHours(user.user_id, academicYear.academic_year_id);
    const remainingHours = Math.max(0, 36 - currentHours);

    // Format deadline date
    const deadline = new Date(academicYear.end_date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const variables = {
      userName: user.name || user.username,
      daysLeft: daysLeft,
      deadline: deadline,
      currentHours: currentHours,
      remainingHours: remainingHours,
      systemUrl: process.env.CLIENT_URL || 'http://localhost:5173'
    };

    await emailService.sendEmail({
      to: user.email,
      subject: `⏰ แจ้งเตือน: ใกล้หมดเขตยื่นเอกสาร (เหลือ ${daysLeft} วัน)`,
      template: 'deadline-warning',
      variables: variables
    });

    console.log(`📧 Deadline warning email sent to ${user.email}`);
  } catch (error) {
    console.error(`Error sending deadline warning email to user ${user.username}:`, error);
  }
};

// Manual trigger for testing
const triggerDeadlineCheck = async () => {
  console.log('🧪 Manually triggering deadline warning check...');
  await checkDeadlineWarnings();
};

module.exports = {
  scheduleDeadlineWarnings,
  scheduleNotificationCleanup,
  checkDeadlineWarnings,
  cleanupOldNotifications,
  triggerDeadlineCheck
};