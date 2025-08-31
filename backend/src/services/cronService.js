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

      // Get users who haven't completed their 36 hours for this academic year
      const incompleteUsers = await findIncompleteUsers(year.academic_year_id, daysLeft);
      
      // Send notifications to incomplete users
      for (const user of incompleteUsers) {
        // Send web notification
        await notificationService.createDeadlineWarning(user.user_id, daysLeft);
        
        // Send email notification
        await sendDeadlineWarningEmail(user, year, daysLeft);
        
        console.log(`📢 Sent deadline warning (web + email) to user ${user.username} (${daysLeft} days left)`);
      }
      
      console.log(`⚠️  Sent deadline warnings for academic year ${year.year_name}: ${incompleteUsers.length} users notified`);
    }
    
  } catch (error) {
    console.error('Error checking deadline warnings:', error);
  }
};

// Find users who haven't completed 36 hours for the academic year
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

    const incompleteUsers = [];

    for (const student of students) {
      // Check if user already received warning for this threshold
      const recentWarning = await prisma.notifications.findFirst({
        where: {
          user_id: student.user_id,
          type: 'DEADLINE_WARNING',
          message: {
            contains: `${daysLeft} วัน`
          },
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
          }
        }
      });

      if (recentWarning) continue; // Already warned today

      // Get user's total volunteer hours for this academic year
      const totalHours = await getUserTotalHours(student.user_id, academicYearId);
      
      if (totalHours < 36) {
        incompleteUsers.push(student);
      }
    }

    return incompleteUsers;
  } catch (error) {
    console.error('Error finding incomplete users:', error);
    return [];
  }
};

// Calculate user's total volunteer hours for an academic year
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
  checkDeadlineWarnings,
  triggerDeadlineCheck
};