const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const prisma = require('../config/database');

/**
 * Send welcome email to new user
 */
exports.sendWelcomeEmail = async (req, res) => {
  try {
    const { email, userName, userRole, loginUrl } = req.body;

    if (!email || !userName) {
      return res.status(400).json({ 
        error: 'Email and userName are required' 
      });
    }

    const variables = {
      userName: userName,
      userEmail: email,
      userRole: userRole || 'student',
      createdDate: new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      loginUrl: loginUrl || process.env.CLIENT_URL || 'http://localhost:5173'
    };

    const result = await emailService.sendEmail({
      to: email,
      subject: '🎉 ยินดีต้อนรับเข้าสู่ระบบจัดการกิจกรรมจิตอาสา KMUTT',
      template: 'welcome',
      variables: variables
    });

    if (result.success) {
      res.status(200).json({
        message: 'Welcome email sent successfully',
        messageId: result.messageId,
        recipient: result.recipient
      });
    } else {
      res.status(500).json({
        error: 'Failed to send welcome email',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Send welcome email error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Send submission approved email
 */
exports.sendSubmissionApprovedEmail = async (req, res) => {
  try {
    const { 
      submissionId, 
      email, 
      userName, 
      approvedBy,
      approvalComment,
      systemUrl 
    } = req.body;

    if (!submissionId || !email || !userName) {
      return res.status(400).json({ 
        error: 'submissionId, email, and userName are required' 
      });
    }

    // Get submission details from database
    const submission = await prisma.submissions.findUnique({
      where: { submission_id: parseInt(submissionId) },
      include: {
        users: true,
        academic_years: true
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Map activity type to Thai
    const activityTypeMapping = {
      'BloodDonate': 'บริจาคโลหิต',
      'NSF': 'ออมเงินกองทุนการออมแห่งชาติ',
      'AOM YOUNG': 'โครงการ AOM YOUNG',
      'ต้นไม้ล้านต้น ล้านความดี': 'ต้นไม้ล้านต้น ล้านความดี',
      'religious': 'กิจรรมทำนุบำรุงศาสนสถาน',
      'social-development': 'กิจรรมพัฒนาชุมชนและโรงเรียน',
      'Certificate': 'e-Learning'
    };

    const variables = {
      userName: userName,
      submissionId: submissionId,
      activityType: activityTypeMapping[submission.type] || submission.type,
      activityName: submission.activity_name || 'ไม่ระบุ',
      hours: submission.hours || 0,
      approvedDate: new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      approvedBy: approvedBy || 'ผู้ดูแลระบบ',
      approvalComment: approvalComment || '',
      systemUrl: systemUrl || process.env.CLIENT_URL || 'http://localhost:5173'
    };

    const result = await emailService.sendEmail({
      to: email,
      subject: 'แจ้งการอนุมัติคำขอกิจกรรมจิตอาสา',
      template: 'approved',
      variables: variables
    });

    if (result.success) {
      res.status(200).json({
        message: 'Approval email sent successfully',
        messageId: result.messageId,
        recipient: result.recipient
      });
    } else {
      res.status(500).json({
        error: 'Failed to send approval email',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Send approval email error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Send submission rejected email
 */
exports.sendSubmissionRejectedEmail = async (req, res) => {
  try {
    const { 
      submissionId, 
      email, 
      userName, 
      rejectedBy,
      rejectionReason,
      systemUrl 
    } = req.body;

    if (!submissionId || !email || !userName) {
      return res.status(400).json({ 
        error: 'submissionId, email, and userName are required' 
      });
    }

    // Get submission details from database
    const submission = await prisma.submissions.findUnique({
      where: { submission_id: parseInt(submissionId) },
      include: {
        users: true,
        academic_years: true
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Map activity type to Thai
    const activityTypeMapping = {
      'BloodDonate': 'บริจาคโลหิต',
      'NSF': 'ออมเงินกองทุนการออมแห่งชาติ',
      'AOM YOUNG': 'โครงการ AOM YOUNG',
      'ต้นไม้ล้านต้น ล้านความดี': 'ต้นไม้ล้านต้น ล้านความดี',
      'religious': 'กิจรรมทำนุบำรุงศาสนสถาน',
      'social-development': 'กิจรรมพัฒนาชุมชนและโรงเรียน',
      'Certificate': 'e-Learning'
    };

    const variables = {
      userName: userName,
      submissionId: submissionId,
      activityType: activityTypeMapping[submission.type] || submission.type,
      activityName: submission.activity_name || 'ไม่ระบุ',
      hours: submission.hours || 0,
      rejectedDate: new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      rejectedBy: rejectedBy || 'ผู้ดูแลระบบ',
      rejectionReason: rejectionReason || '',
      systemUrl: systemUrl || process.env.CLIENT_URL || 'http://localhost:5173'
    };

    const result = await emailService.sendEmail({
      to: email,
      subject: 'แจ้งผลการพิจารณาคำขอกิจกรรมจิตอาสา',
      template: 'rejected',
      variables: variables
    });

    if (result.success) {
      res.status(200).json({
        message: 'Rejection email sent successfully',
        messageId: result.messageId,
        recipient: result.recipient
      });
    } else {
      res.status(500).json({
        error: 'Failed to send rejection email',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Send rejection email error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Send general notification email
 */
exports.sendNotificationEmail = async (req, res) => {
  try {
    const {
      email,
      recipientName,
      subject,
      headerTitle,
      headerSubtitle,
      notificationType, // 'info', 'warning', 'success'
      notificationTitle,
      message,
      actionRequired,
      buttonText,
      buttonUrl,
      additionalInfo
    } = req.body;

    if (!email || !recipientName || !subject || !message) {
      return res.status(400).json({ 
        error: 'email, recipientName, subject, and message are required' 
      });
    }

    const variables = {
      title: subject,
      recipientName: recipientName,
      headerTitle: headerTitle || '📢 แจ้งเตือน',
      headerSubtitle: headerSubtitle || 'ระบบจัดการกิจกรรมจิตอาสา KMUTT',
      notificationType: notificationType,
      notificationTitle: notificationTitle,
      message: message,
      actionRequired: actionRequired,
      buttonText: buttonText,
      buttonUrl: buttonUrl || process.env.CLIENT_URL || 'http://localhost:5173',
      additionalInfo: additionalInfo
    };

    const result = await emailService.sendEmail({
      to: email,
      subject: subject,
      template: 'personal-notification',
      variables: variables
    });

    if (result.success) {
      res.status(200).json({
        message: 'Notification email sent successfully',
        messageId: result.messageId,
        recipient: result.recipient
      });
    } else {
      res.status(500).json({
        error: 'Failed to send notification email',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Send notification email error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Send general announcement email
 */
exports.sendAnnouncementEmail = async (req, res) => {
  try {
    const {
      email,
      subject,
      headerTitle,
      headerSubtitle,
      announcementTitle,
      announcementType, // 'info', 'warning', 'urgent', 'success'
      notificationTitle,
      message,
      effectiveDate,
      importantNotice,
      buttonText,
      buttonUrl,
      additionalInfo,
      publishDate
    } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({ 
        error: 'email, subject, and message are required' 
      });
    }

    const variables = {
      subject: subject,
      headerTitle: headerTitle || 'ประกาศอย่างเป็นทางการ',
      headerSubtitle: headerSubtitle || 'ระบบจัดการกิจกรรมจิตอาสา KMUTT',
      announcementTitle: announcementTitle || subject,
      announcementType: announcementType,
      notificationTitle: notificationTitle,
      message: message,
      effectiveDate: effectiveDate,
      importantNotice: importantNotice,
      buttonText: buttonText,
      buttonUrl: buttonUrl || process.env.CLIENT_URL || 'http://localhost:5173',
      additionalInfo: additionalInfo,
      publishDate: publishDate || new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    const result = await emailService.sendEmail({
      to: email,
      subject: subject,
      template: 'general-announcement',
      variables: variables
    });

    if (result.success) {
      res.status(200).json({
        message: 'Announcement email sent successfully',
        messageId: result.messageId,
        recipient: result.recipient
      });
    } else {
      res.status(500).json({
        error: 'Failed to send announcement email',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Send announcement email error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Send bulk emails to multiple recipients
 */
exports.sendBulkEmail = async (req, res) => {
  try {
    const {
      recipients, // [{ email, name, variables: {} }]
      subject,
      template,
      variables = {},
      sendMethod = 'individual' // 'individual' or 'bcc'
    } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ 
        error: 'recipients array is required' 
      });
    }

    if (!subject || !template) {
      return res.status(400).json({ 
        error: 'subject and template are required' 
      });
    }

    let result;

    if (sendMethod === 'bcc') {
      // Send single email with BCC
      result = await emailService.sendEmailWithBCC({
        recipients: recipients,
        subject: subject,
        template: template,
        variables: variables
      });
    } else {
      // Send individual emails (default)
      result = await emailService.sendBulkEmail({
        recipients: recipients,
        subject: subject,
        template: template,
        variables: variables
      });
    }

    res.status(200).json({
      message: 'Bulk email processed successfully',
      result: result,
      method: sendMethod
    });
  } catch (error) {
    console.error('Send bulk email error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Send email to specific user groups
 */
exports.sendGroupEmail = async (req, res) => {
  try {
    const {
      userGroup, // 'all', 'students', 'admins', 'faculty', 'scholarship_type', 'status'
      filterValue, // For filtering (e.g., 'TYPE1', 'normal', etc.)
      subject,
      template,
      variables = {},
      sendMethod = 'individual'
    } = req.body;

    if (!userGroup || !subject || !template) {
      return res.status(400).json({ 
        error: 'userGroup, subject, and template are required' 
      });
    }

    // Build user query based on group
    let whereClause = {};

    switch (userGroup) {
      case 'all':
        whereClause = {};
        break;
      case 'students':
        whereClause = { role: 'student' };
        break;
      case 'admins':
        whereClause = { role: 'admin' };
        break;
      case 'faculty':
        if (filterValue) {
          whereClause = { role: 'student', faculty: filterValue };
        } else {
          whereClause = { role: 'student', faculty: { not: null } };
        }
        break;
      case 'scholarship_type':
        if (filterValue) {
          whereClause = { role: 'student', scholarship_type: filterValue };
        }
        break;
      case 'status':
        if (filterValue) {
          whereClause = { role: 'student', studentStatusName: filterValue };
        }
        break;
      default:
        return res.status(400).json({ error: 'Invalid userGroup' });
    }

    // Get users from database
    const users = await prisma.users.findMany({
      where: {
        ...whereClause,
        email: { not: null }
      },
      select: {
        user_id: true,
        email: true,
        name: true,
        role: true,
        faculty: true,
        scholarship_type: true,
        studentStatusName: true
      }
    });

    if (users.length === 0) {
      return res.status(404).json({ 
        error: 'No users found for the specified group' 
      });
    }

    // Prepare recipients array
    const recipients = users.map(user => ({
      email: user.email,
      name: user.name || user.email,
      variables: {
        userName: user.name || user.email,
        userRole: user.role,
        userFaculty: user.faculty,
        scholarshipType: user.scholarship_type,
        studentStatus: user.studentStatusName
      }
    }));

    let result;

    if (sendMethod === 'bcc') {
      // Send single email with BCC
      result = await emailService.sendEmailWithBCC({
        recipients: recipients,
        subject: subject,
        template: template,
        variables: variables
      });
    } else {
      // Send individual emails (default)
      result = await emailService.sendBulkEmail({
        recipients: recipients,
        subject: subject,
        template: template,
        variables: variables
      });
    }

    res.status(200).json({
      message: 'Group email processed successfully',
      result: result,
      totalUsers: users.length,
      userGroup: userGroup,
      filterValue: filterValue,
      method: sendMethod
    });
  } catch (error) {
    console.error('Send group email error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Get available email templates
 */
exports.getEmailTemplates = async (req, res) => {
  try {
    const templates = emailService.getAvailableTemplates();
    
    // Add template descriptions
    const templatesWithInfo = templates.map(template => {
      let description = '';
      let requiredVariables = [];
      
      switch (template) {
        case 'approved':
          description = 'อีเมลแจ้งการอนุมัติคำขอกิจกรรมจิตอาสา';
          requiredVariables = ['userName', 'submissionId', 'activityType', 'hours', 'approvedDate'];
          break;
        case 'rejected':
          description = 'อีเมลแจ้งการปฏิเสธคำขอกิจกรรมจิตอาสา';
          requiredVariables = ['userName', 'submissionId', 'rejectionReason', 'rejectedDate'];
          break;
        case 'personal-notification':
          description = 'อีเมลแจ้งเตือนส่วนบุคคล (ระบุชื่อผู้รับ)';
          requiredVariables = ['recipientName', 'message', 'headerTitle'];
          break;
        case 'general-announcement':
          description = 'อีเมลประกาศทั่วไป (ไม่ระบุชื่อผู้รับ)';
          requiredVariables = ['message', 'announcementTitle', 'publishDate'];
          break;
        default:
          description = 'Email template';
      }
      
      return {
        name: template,
        description: description,
        requiredVariables: requiredVariables
      };
    });

    res.status(200).json({
      templates: templatesWithInfo
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Test email configuration
 */
exports.testEmailConfig = async (req, res) => {
  try {
    const { testEmail } = req.body;

    // Test connection
    const connectionTest = await emailService.testConnection();
    
    if (!connectionTest) {
      return res.status(500).json({
        error: 'Email configuration test failed',
        details: 'Unable to connect to email server'
      });
    }

    // Send test email if requested
    if (testEmail) {
      const result = await emailService.sendEmail({
        to: testEmail,
        subject: '✅ ทดสอบการส่งอีเมล - ระบบจัดการกิจกรรมจิตอาสา',
        template: 'notification',
        variables: {
          title: 'ทดสอบการส่งอีเมล',
          recipientName: 'ผู้ทดสอบ',
          headerTitle: '✅ ทดสอบระบบ',
          headerSubtitle: 'การทดสอบการส่งอีเมล',
          message: 'นี่คือการทดสอบการส่งอีเมลของระบบ หากคุณได้รับอีเมลนี้ แสดงว่าระบบทำงานปกติ',
          notificationType: 'success',
          notificationTitle: 'ระบบส่งอีเมลทำงานปกติ'
        }
      });

      res.status(200).json({
        message: 'Email configuration test passed',
        connectionTest: true,
        testEmailSent: result.success,
        testEmailResult: result
      });
    } else {
      res.status(200).json({
        message: 'Email configuration test passed',
        connectionTest: true,
        testEmailSent: false
      });
    }
  } catch (error) {
    console.error('Email config test error:', error);
    res.status(500).json({ 
      error: 'Email configuration test failed',
      details: error.message
    });
  }
};

/**
 * Search users for email recipient selection
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search term must be at least 2 characters' });
    }

    const users = await prisma.users.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { username: { contains: q } },
          { email: { contains: q } }
        ]
      },
      select: {
        user_id: true,
        name: true,
        username: true,
        email: true,
        faculty: true,
        major: true,
        role: true
      },
      take: 20 // Limit results
    });

    res.json(users);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

/**
 * Send email to selected users
 */
exports.sendToUsers = async (req, res) => {
  try {
    const {
      recipients, // array of user_ids
      template,
      subject,
      headerTitle,
      message,
      buttonText,
      buttonUrl,
      sendMethod // 'individual' or 'bcc'
    } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients are required' });
    }

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Get user details
    const users = await prisma.users.findMany({
      where: {
        user_id: { in: recipients }
      },
      select: {
        user_id: true,
        name: true,
        username: true,
        email: true
      }
    });

    if (users.length === 0) {
      return res.status(404).json({ error: 'No valid users found' });
    }

    const validUsers = users.filter(user => user.email);
    if (validUsers.length === 0) {
      return res.status(400).json({ error: 'No users with valid email addresses found' });
    }

    const emailOptions = {
      subject,
      template: template || 'personal-notification',
      variables: {
        headerTitle: headerTitle || 'แจ้งเตือนจากระบบ',
        announcementTitle: headerTitle || subject || 'แจ้งเตือนสำคัญ',
        message,
        buttonText: buttonText || null,
        buttonUrl: buttonUrl || null,
        publishDate: new Date().toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    };

    let result;
    if (sendMethod === 'bcc') {
      // Send BCC email
      emailOptions.recipients = validUsers.map(user => user.email);
      result = await emailService.sendEmailWithBCC(emailOptions);
    } else {
      // Send individual emails
      const results = [];
      for (const user of validUsers) {
        const userEmailOptions = {
          ...emailOptions,
          to: user.email,
          variables: {
            ...emailOptions.variables,
            recipientName: user.name || user.username
          }
        };
        const userResult = await emailService.sendEmail(userEmailOptions);
        results.push({ user: user.email, result: userResult });
      }
      result = { success: true, results };
    }

    // Create in-app notifications for all recipients
    try {
      const notificationTitle = headerTitle || subject;
      const notificationMessage = message.length > 200
        ? message.substring(0, 197) + '...'
        : message;

      await notificationService.createBulkAnnouncementNotifications(
        validUsers.map(u => u.user_id),
        notificationTitle,
        notificationMessage
      );
      console.log(`✅ Created ${validUsers.length} in-app notifications for email recipients`);
    } catch (notifError) {
      console.error('Failed to create in-app notifications:', notifError);
      // Don't fail the request if notifications fail
    }

    res.json({
      message: 'Emails sent successfully',
      method: sendMethod,
      recipientCount: validUsers.length,
      result
    });

  } catch (error) {
    console.error('Send to users error:', error);
    res.status(500).json({ error: 'Failed to send emails' });
  }
};

/**
 * Send email to group based on filters
 */
exports.sendToGroup = async (req, res) => {
  try {
    const {
      groupFilters,
      template,
      subject,
      headerTitle,
      message,
      buttonText,
      buttonUrl,
      sendMethod, // 'individual' or 'bcc'
      dryRun = false
    } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Build query based on group filters
    const whereClause = {};
    
    // Student status filter
    if (groupFilters.status === 'current_not_graduating') {
      whereClause.role = 'student';
      whereClause.isSenior = false;
    } else if (groupFilters.status === 'current') {
      whereClause.role = 'student';
    }

    // Faculty filter
    if (groupFilters.faculty !== 'all') {
      whereClause.faculty = groupFilters.faculty;
    }

    // Get users based on filters
    const users = await prisma.users.findMany({
      where: whereClause,
      select: {
        user_id: true,
        name: true,
        username: true,
        email: true,
        faculty: true
      }
    });

    const validUsers = users.filter(user => user.email);
    if (validUsers.length === 0) {
      return res.status(400).json({ error: 'No users found matching the criteria' });
    }

    // If dry run, just return the count without sending
    if (dryRun) {
      return res.json({
        message: 'Dry run completed',
        method: sendMethod,
        recipientCount: validUsers.length,
        filters: groupFilters
      });
    }

    const emailOptions = {
      subject,
      template: template || 'general-announcement',
      variables: {
        headerTitle: headerTitle || 'ประกาศจากระบบ',
        announcementTitle: headerTitle || 'ประกาศสำคัญ',
        message,
        buttonText: buttonText || null,
        buttonUrl: buttonUrl || null,
        publishDate: new Date().toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    };

    let result;
    if (sendMethod === 'bcc') {
      // Send BCC email
      emailOptions.recipients = validUsers.map(user => user.email);
      result = await emailService.sendEmailWithBCC(emailOptions);
    } else {
      // Send individual emails
      const results = [];
      for (const user of validUsers) {
        const userEmailOptions = {
          ...emailOptions,
          to: user.email,
          variables: {
            ...emailOptions.variables,
            recipientName: user.name || user.username
          }
        };
        const userResult = await emailService.sendEmail(userEmailOptions);
        results.push({ user: user.email, result: userResult });
      }
      result = { success: true, results };
    }

    // Create in-app notifications for all recipients
    try {
      const notificationTitle = headerTitle || 'ประกาศจากระบบ';
      const notificationMessage = message.length > 200
        ? message.substring(0, 197) + '...'
        : message;

      await notificationService.createBulkAnnouncementNotifications(
        validUsers.map(u => u.user_id),
        notificationTitle,
        notificationMessage
      );
      console.log(`✅ Created ${validUsers.length} in-app notifications for group email recipients`);
    } catch (notifError) {
      console.error('Failed to create in-app notifications:', notifError);
      // Don't fail the request if notifications fail
    }

    res.json({
      message: 'Group emails sent successfully',
      method: sendMethod,
      recipientCount: validUsers.length,
      filters: groupFilters,
      result
    });

  } catch (error) {
    console.error('Send to group error:', error);
    res.status(500).json({ error: 'Failed to send group emails' });
  }
};

/**
 * Get email template preview
 */
exports.getEmailPreview = async (req, res) => {
  try {
    const { template, headerTitle, message, buttonText, buttonUrl } = req.body;

    if (!template || !message) {
      return res.status(400).json({ 
        error: 'Template and message are required' 
      });
    }

    // Load and render template with variables
    const variables = {
      headerTitle: headerTitle || 'แจ้งเตือนจากระบบ',
      announcementTitle: headerTitle || 'ประกาศสำคัญ',
      message: message,
      buttonText: buttonText || null,
      buttonUrl: buttonUrl || null,
      recipientName: 'ตัวอย่างชื่อผู้รับ',
      recipientEmail: 'example@kmutt.ac.th',
      currentDate: new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      }),
      publishDate: new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    const htmlContent = await emailService.loadTemplate(template, variables);

    res.json({
      success: true,
      html: htmlContent,
      template: template,
      variables: variables
    });

  } catch (error) {
    console.error('Get email preview error:', error);
    res.status(500).json({ 
      error: 'Failed to generate email preview',
      details: error.message
    });
  }
};