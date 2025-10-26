# SFA e-Filling Backend - Claude Code Instructions

## Development Commands
- `npm run dev` - Start development server
- `npm run lint` - Run linting (if available)
- `npm run typecheck` - Run type checking (if available)

## Project Structure
- `/src/controllers/` - API controllers
- `/src/routes/` - API routes
- `/src/services/` - Business logic services
- `/src/templates/emails/` - Email templates
- `/prisma/` - Database schema and migrations

## Key Features
1. **Email System** - Complete email service with templates and sending capabilities
2. **Approval System** - Submission approval/rejection workflow
3. **User Management** - User roles and permissions
4. **File Management** - File upload and preview system

## Recent Updates
### Projects System - Multi-Participant Activities (Latest)
- **New Feature**: Group activity project management system
- **Project Types**:
  - ทำนุบำรุงศาสนสถาน (religious)
  - พัฒนาโรงเรียน/ชุมชน (social_development)
  - กิจกรรมภายในมหาวิทยาลัย (university_activity - Admin only)
- **Key Features**:
  - Multi-participant support with individual approval
  - Activity limit validation per participant
  - Province selection for religious/social projects
  - Document upload with type categorization
  - Student-created projects (pending approval)
  - Admin-created projects (auto-approved)
  - Selective participant approval by admin
- **Database Tables**: projects, project_participants, project_files
- **API Endpoints**: /api/projects/* (CRUD + participant management)

### Cron Job Performance Optimization
- **Batch Email Processing**: Implemented batch email sending with configurable batch size (default: 50)
- **Database Query Optimization**: Reduced from ~10,000 queries to ~5 bulk queries for 2,000+ users
- **Rate Limiting**: Added 2-second delays between email batches to prevent SMTP throttling
- **Error Resilience**: Using Promise.allSettled() to ensure one failure doesn't block others
- **Progress Logging**: Detailed console output showing batch progress, success/failure counts, duration
- **Performance Metrics**: For 2,000 users: ~5-10 minutes (vs previous 1-3 hours)
- **Memory Efficiency**: Bulk fetch with maps instead of individual queries per user

### Approval History Page Enhancements (Completed)
- **Category Filtering**: Changed "ทั้งหมด (ยกเว้นเรียนออนไลน์)" to "ทั้งหมด" to include all submission types including Certificate
- **Status Filtering**: Added dropdown for all/approved/rejected status filtering
- **Academic Year Filtering**: Added dropdown to filter by specific academic years
- **Hours Display**: Added dedicated column showing approved_hours or requested_hours
- **Collapsible Reasons**: Implemented HTML5 `<details>` element for space-efficient rejection reason display
- **Enhanced Table**: Updated from 10 to 11 columns with proper responsive layout
- **UI Improvements**: 5-column filter grid layout with improved spacing and visual hierarchy

### Email System
- Template-based email system with 4 templates
- Real-time preview functionality
- BCC vs Individual sending methods
- Recipient count validation with dry-run API

### Database Schema
- Users table with roles and student information
- Submissions with status tracking
- Academic years management
- Linked volunteer hours tracking