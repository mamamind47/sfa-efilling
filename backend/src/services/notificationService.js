const prisma = require("../config/database");

// Create notification
async function createNotification(notificationData) {
  const { userId, type, title, message, submissionId = null } = notificationData;
  
  try {
    const notification = await prisma.notifications.create({
      data: {
        user_id: userId,
        type: type,
        title: title,
        message: message,
        submission_id: submissionId
      }
    });
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Get user notifications
async function getUserNotifications(userId, limit = 20) {
  try {
    const notifications = await prisma.notifications.findMany({
      where: { user_id: userId },
      include: {
        submission: {
          include: {
            academic_years: true,
            certificate_type: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit
    });
    
    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
}

// Get unread notification count
async function getUnreadCount(userId) {
  try {
    const count = await prisma.notifications.count({
      where: { 
        user_id: userId,
        read_status: false
      }
    });
    
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
}

// Mark notification as read
async function markAsRead(notificationId, userId) {
  try {
    const notification = await prisma.notifications.update({
      where: { 
        notification_id: notificationId,
        user_id: userId  // Ensure user owns the notification
      },
      data: { read_status: true }
    });
    
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Mark all notifications as read for user
async function markAllAsRead(userId) {
  try {
    const result = await prisma.notifications.updateMany({
      where: { 
        user_id: userId,
        read_status: false
      },
      data: { read_status: true }
    });
    
    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// Helper functions for specific notification types
async function createApprovalNotification(userId, submissionId, hours, activityName = null) {
  const title = activityName ? `${activityName} - ได้รับการอนุมัติ` : 'คำร้องได้รับการอนุมัติ';
  const message = activityName 
    ? `กิจกรรม "${activityName}" ของคุณได้รับการอนุมัติแล้ว จำนวน ${hours} ชั่วโมง`
    : `คำร้องของคุณได้รับการอนุมัติแล้ว จำนวน ${hours} ชั่วโมง`;
    
  return await createNotification({
    userId,
    type: 'APPROVED',
    title,
    message,
    submissionId
  });
}

async function createRejectionNotification(userId, submissionId, reason, activityName = null) {
  const title = activityName ? `${activityName} - ถูกปฏิเสธ` : 'คำร้องถูกปฏิเสธ';
  const message = activityName
    ? `กิจกรรม "${activityName}" ของคุณถูกปฏิเสธ เหตุผล: ${reason}`
    : `คำร้องของคุณถูกปฏิเสธ เหตุผล: ${reason}`;
    
  return await createNotification({
    userId,
    type: 'REJECTED',
    title,
    message,
    submissionId
  });
}

async function createDeadlineWarning(userId, daysLeft) {
  return await createNotification({
    userId,
    type: 'DEADLINE_WARNING',
    title: 'ใกล้หมดเขตยื่นเอกสาร',
    message: `เหลือเวลายื่นเอกสารอีกเพียง ${daysLeft} วัน โปรดยื่นเอกสารให้ทันกำหนด`
  });
}

async function createHoursCompleteNotification(userId, totalHours) {
  return await createNotification({
    userId,
    type: 'HOURS_COMPLETE',
    title: 'สะสมชั่วโมงครบแล้ว!',
    message: `ยินดีด้วย! คุณสะสมชั่วโมงจิตอาสาได้ ${totalHours} ชั่วโมงแล้ว`
  });
}

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createApprovalNotification,
  createRejectionNotification,
  createDeadlineWarning,
  createHoursCompleteNotification
};