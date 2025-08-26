# 📧 Email System Documentation

## Overview
ระบบส่งอีเมลอัตโนมัติสำหรับระบบจัดการกิจกรรมจิตอาสา KMUTT รองรับการส่งอีเมลแบบต่างๆ:
- อีเมลส่งเดี่ยว (Individual)
- อีเมลส่งหลายคนพร้อมกัน (Bulk)
- อีเมลส่งกลุ่ม (Group)
- อีเมลแบบ CC/BCC

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy environment example
cp .env.example .env

# Edit .env with your email credentials
EMAIL_HOST="mail-hybrid.kmutt.ac.th"
EMAIL_PORT=587
EMAIL_USER="your-email@kmutt.ac.th"
EMAIL_PASS="your-email-password"
EMAIL_FROM="noreply@kmutt.ac.th"
```

### 2. Test Email Configuration
```bash
POST /api/email/test
{
  "testEmail": "test@example.com"
}
```

## 📝 Email Templates

### Available Templates:
1. **approved** - แจ้งการอนุมัติคำขอกิจกรรมจิตอาสา
2. **rejected** - แจ้งการปฏิเสธคำขอกิจกรรมจิตอาสา
3. **personal-notification** - แจ้งเตือนส่วนบุคคล (ระบุชื่อผู้รับ)
4. **general-announcement** - ประกาศทั่วไป (ไม่ระบุชื่อผู้รับ)

### Get Available Templates:
```bash
GET /api/email/templates
```

## 🔧 API Endpoints

### 1. Send Approval Email
```bash
POST /api/email/submission/approved
{
  "submissionId": "123",
  "email": "user@example.com",
  "userName": "John Doe",
  "approvedBy": "Admin Name",
  "approvalComment": "Great work!",
  "systemUrl": "https://yourapp.com"
}
```

### 2. Send Rejection Email
```bash
POST /api/email/submission/rejected
{
  "submissionId": "123",
  "email": "user@example.com",
  "userName": "John Doe",
  "rejectedBy": "Admin Name",
  "rejectionReason": "Missing documents",
  "systemUrl": "https://yourapp.com"
}
```

### 3. Send Personal Notification
```bash
POST /api/email/personal-notification
{
  "email": "user@example.com",
  "recipientName": "John Doe",
  "subject": "Important Notice",
  "headerTitle": "📢 ประกาศสำคัญ",
  "headerSubtitle": "ระบบจัดการกิจกรรมจิตอาสา",
  "notificationType": "warning",
  "notificationTitle": "การปรับปรุงระบบ",
  "message": "ระบบจะปิดปรับปรุงในวันที่...",
  "actionRequired": "โปรดอ่านและเตรียมตัว",
  "buttonText": "ดูรายละเอียด",
  "buttonUrl": "https://yourapp.com/maintenance",
  "additionalInfo": "ติดต่อ 02-470-9982 หากมีข้อสงสัย"
}
```

### 4. Send General Announcement
```bash
POST /api/email/announcement
{
  "email": "user@example.com",
  "subject": "ประกาศปิดระบบ",
  "headerTitle": "ประกาศสำคัญ",
  "headerSubtitle": "ระบบจัดการกิจกรรมจิตอาสา KMUTT",
  "announcementTitle": "ประกาศปิดระบบเพื่อปรับปรุง",
  "announcementType": "warning",
  "notificationTitle": "ระบบจะปิดชั่วคราว",
  "message": "ระบบจะปิดปรับปรุงในวันที่ 1 มกราคม 2567 เวลา 00:00-06:00 น.",
  "effectiveDate": "1 มกราคม 2567",
  "importantNotice": "กรุณาบันทึกข้อมูลก่อนเวลาดังกล่าว",
  "buttonText": "ดูรายละเอียด",
  "buttonUrl": "https://yourapp.com/maintenance",
  "additionalInfo": "ระบบจะกลับมาใช้งานได้ปกติหลังเวลา 06:00 น.",
  "publishDate": "25 ธันวาคม 2566"
}
```

### 5. Send Bulk Email (Individual)
```bash
POST /api/email/bulk
{
  "recipients": [
    {
      "email": "user1@example.com",
      "name": "User 1",
      "variables": {
        "customField": "value1"
      }
    },
    {
      "email": "user2@example.com", 
      "name": "User 2",
      "variables": {
        "customField": "value2"
      }
    }
  ],
  "subject": "Important Update",
  "template": "personal-notification",
  "variables": {
    "headerTitle": "อัปเดตระบบ",
    "message": "ระบบมีการอัปเดตใหม่"
  },
  "sendMethod": "individual"
}
```

### 6. Send Bulk Email (BCC Method)
```bash
POST /api/email/bulk
{
  "recipients": [
    {"email": "user1@example.com", "name": "User 1"},
    {"email": "user2@example.com", "name": "User 2"},
    {"email": "user3@example.com", "name": "User 3"}
  ],
  "subject": "Meeting Announcement",
  "template": "general-announcement",
  "variables": {
    "headerTitle": "ประกาศการประชุม",
    "announcementTitle": "ประชุมใหญ่ประจำปี",
    "message": "ขอเชิญทุกท่านเข้าร่วมประชุมใหญ่ประจำปี..."
  },
  "sendMethod": "bcc"
}
```

### 7. Send Group Email
```bash
POST /api/email/group
{
  "userGroup": "students",
  "subject": "Student Announcement",
  "template": "general-announcement", 
  "variables": {
    "headerTitle": "ประกาศสำหรับนักศึกษา",
    "announcementTitle": "แจ้งเตือนสำคัญ",
    "message": "แจ้งเตือนสำหรับนักศึกษาทุกคน..."
  },
  "sendMethod": "individual"
}
```

#### Available User Groups:
- `all` - ผู้ใช้ทั้งหมด
- `students` - นักศึกษาทั้งหมด  
- `admins` - ผู้ดูแลระบบ
- `faculty` - ตามคณะ (ใส่ filterValue)
- `scholarship_type` - ตามประเภททุน (ใส่ filterValue เช่น "TYPE1")
- `status` - ตามสถานะ (ใส่ filterValue เช่น "normal")

#### Group Email Examples:
```bash
# Send to all TYPE1 scholarship students
POST /api/email/group
{
  "userGroup": "scholarship_type",
  "filterValue": "TYPE1",
  "subject": "TYPE1 Scholarship Update",
  "template": "personal-notification",
  "variables": {
    "headerTitle": "แจ้งเตือนทุนการศึกษา",
    "message": "มีข้อมูลสำคัญเกี่ยวกับทุนลักษณะที่ 1..."
  }
}

# Send to specific faculty
POST /api/email/group  
{
  "userGroup": "faculty",
  "filterValue": "วิศวกรรมศาสตร์",
  "subject": "Faculty Announcement",
  "template": "general-announcement", 
  "variables": {
    "announcementTitle": "ประกาศจากคณะ",
    "message": "แจ้งเตือนสำหรับนักศึกษาคณะวิศวกรรมศาสตร์..."
  }
}

# Send to students with normal status
POST /api/email/group
{
  "userGroup": "status", 
  "filterValue": "normal",
  "subject": "Active Students Notice",
  "template": "personal-notification",
  "variables": {
    "headerTitle": "แจ้งเตือนนักศึกษา",
    "message": "แจ้งเตือนสำหรับนักศึกษาที่มีสถานะปกติ..."
  }
}
```

## 📊 Response Format

### Success Response:
```json
{
  "message": "Email sent successfully",
  "messageId": "email-message-id",
  "recipient": "user@example.com"
}
```

### Bulk Email Response:
```json
{
  "message": "Bulk email processed successfully", 
  "result": {
    "successful": [
      {"email": "user1@example.com", "messageId": "msg-1"},
      {"email": "user2@example.com", "messageId": "msg-2"}
    ],
    "failed": [
      {"email": "invalid@example.com", "error": "Invalid email"}
    ],
    "total": 3
  },
  "method": "individual"
}
```

### Error Response:
```json
{
  "error": "Error description",
  "details": "Detailed error message"
}
```

## 🎨 Custom Templates

### Template Variables:
Templates support dynamic variables using `{{variableName}}` syntax:

```html
<h1>Hello {{userName}}!</h1>
<p>Your email is {{userEmail}}</p>
```

### Creating New Templates:
1. Create HTML file in `/src/templates/emails/`
2. Use the base template structure
3. Include all required variables
4. Test with API endpoints

### Template Best Practices:
- Always include the disclaimer about automatic email
- Use responsive design
- Include KMUTT contact information
- Use appropriate colors and styling
- Test on different email clients

## 🛡️ Security Features

1. **Email Validation** - All emails are validated before sending
2. **Rate Limiting** - Prevents spam/abuse
3. **Template Sanitization** - Prevents XSS attacks
4. **Environment Variables** - Credentials stored securely
5. **Error Handling** - Graceful failure handling
6. **Logging** - All email activities are logged

## 🔍 Monitoring & Debugging

### Enable Debug Mode:
```bash
# In .env file
NODE_ENV=development
EMAIL_DEBUG=true
```

### Log Files:
- Email sending attempts
- Success/failure rates
- Error messages
- Performance metrics

### Testing:
```bash
# Test connection only
POST /api/email/test
{}

# Test with actual email
POST /api/email/test  
{
  "testEmail": "your-test@email.com"
}
```

## 🚨 Important Notes

1. **Auto-Reply Warning**: All emails include disclaimer about automatic system
2. **Contact Info**: Always includes 02-470-9982 for support
3. **Delivery Method**: 
   - Individual emails: Better for personalization, tracking
   - CC emails: Single email, recipients can see each other
4. **Rate Limits**: System includes delays between bulk emails
5. **Error Handling**: Failed emails are logged but don't stop the process

## 🔧 Troubleshooting

### Common Issues:

1. **Connection Failed**
   - Check EMAIL_HOST, EMAIL_PORT settings
   - Verify username/password
   - Check firewall settings

2. **Authentication Error**
   - Verify EMAIL_USER and EMAIL_PASS
   - Check account permissions

3. **Template Not Found**
   - Ensure template exists in `/src/templates/emails/`
   - Check file permissions

4. **Bulk Email Slow**
   - Adjust delay between emails in service
   - Consider using CC method for large groups

5. **Some Emails Failed**
   - Check recipient email addresses
   - Review error logs for specific failures
   - Verify email server limits

## 📞 Support

For technical support or questions:
- Phone: 02-470-9982
- Email: Contact system administrator
- Documentation: This README file

---

**ระบบอีเมลอัตโนมัติ - ระบบจัดการกิจกรรมจิตอาสา KMUTT**