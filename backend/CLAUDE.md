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