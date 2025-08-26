# Claude Code Style Guidelines

This document contains key code style points extracted from the SFA E-Filing project to help maintain consistency.

## Project Overview
- **Backend**: Node.js/Express.js with Prisma ORM and MySQL
- **Frontend**: React.js with Vite, Tailwind CSS, and DaisyUI
- **Language**: Mixed Thai/English (UI in Thai, code in English)

## Backend Code Style

### File Structure & Naming
- Controllers: `*Controller.js` (camelCase)
- Routes: `*Routes.js` (camelCase) 
- Middleware: `*Middleware.js` (camelCase)
- Use descriptive function names: `getUserApprovedHours`, `bulkUpdateAllStudentStatus`

### Express.js Patterns
```javascript
// Route handler structure
exports.functionName = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    // ... logic
    res.status(200).json(data);
  } catch (err) {
    console.error("Error message:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
```

### Database & Prisma
- Use snake_case for database fields: `academic_year_id`, `student_status_name`
- Use camelCase in JavaScript: `academicYearId`, `studentStatusName`
- Always handle database errors with try-catch
- Use destructuring for Prisma imports: `const { users, submissions } = prisma`

### Error Handling
- Consistent error responses: `{ error: "message" }`
- Log errors with context: `console.error("Operation error:", err.message)`
- Use appropriate HTTP status codes (400, 403, 404, 500)

### API Responses
- Success: `res.status(200).json(data)`
- Created: `res.status(201).json(newResource)`
- Error: `res.status(4xx/5xx).json({ error: "message" })`

## Frontend Code Style

### React Components
- Use functional components with hooks
- File naming: PascalCase for components (`AddUserModal.jsx`)
- Import order: React, third-party, internal modules, styles

```jsx
import React, { useState, useEffect } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import apiClient from "../api/axiosConfig";
import { toast } from "react-hot-toast";
```

### State Management
- Use `useState` for local state
- Destructuring for state: `const [loading, setLoading] = useState(false)`
- Boolean states: `isOpen`, `loading`, `error`

### Event Handlers
- Use `handle` prefix: `handleSubmit`, `handleClose`, `handleEscKey`
- Always preventDefault for form submissions: `e.preventDefault()`

### Styling (Tailwind CSS + DaisyUI)
- Use DaisyUI components: `btn`, `modal`, `card`, `badge`
- Responsive design: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Color scheme: Orange gradient theme (`from-orange-500 to-amber-500`)
- Consistent spacing: `p-4`, `mb-4`, `space-x-3`

### API Integration
```javascript
// API calls pattern
const response = await apiClient.post('/endpoint', payload);
// Handle success
toast.success('Success message');
// Handle errors in catch block
catch (err) {
  setError(err.response?.data?.error || "An error occurred");
}
```

## UI/UX Patterns

### Modal Design
- Use `isOpen` prop for visibility
- ESC key to close functionality
- Loading states with disabled buttons
- Clear success/error messaging

### Form Validation
- Real-time validation feedback
- Clear error messages
- Loading states during submission
- Reset form after successful submission

### Data Display
- Use consistent table layouts
- Loading spinners with gradient animations
- Empty states with helpful messages
- Pagination for large datasets

## Language & Content

### Mixed Language Usage
- **Code**: English (variables, functions, comments)
- **UI Text**: Thai (labels, messages, notifications)
- **API Messages**: English for developer, Thai for user-facing

### Examples
```javascript
// Code in English
const getUserStatistics = async (req, res) => {
  // UI messages in Thai
  toast.success('บันทึกข้อมูลสำเร็จ');
  // Error handling in English
  console.error('Database query failed:', err);
};
```

## File Organization

### Backend Structure
```
src/
├── config/database.js
├── controllers/
├── routes/
├── middlewares/
└── utils/
```

### Frontend Structure
```
src/
├── components/
├── pages/app/
├── context/
├── api/
└── assets/
```

## Dependencies & Tools

### Backend Key Dependencies
- `@prisma/client` - Database ORM
- `express` - Web framework
- `jsonwebtoken` - Authentication
- `exceljs` - Excel file processing
- `multer` - File uploads
- `nodemailer` - Email sending service
- `jsqr` - QR code reading for certificates
- `sharp` - Image processing
- `axios` - HTTP client for external APIs

### Frontend Key Dependencies
- `react` - UI library
- `tailwindcss` + `daisyui` - Styling
- `lucide-react` - Icons
- `react-hot-toast` - Notifications
- `recharts` - Data visualization
- `axios` - HTTP client for API calls

## Best Practices

1. **Always use try-catch** for async operations
2. **Validate user permissions** before data operations
3. **Use environment variables** for configuration
4. **Implement proper loading states** in UI
5. **Handle edge cases** (empty data, network errors)
6. **Use consistent naming conventions**
7. **Add meaningful comments** for complex logic
8. **Keep functions focused and small**
9. **Use proper HTTP status codes**
10. **Implement proper error boundaries**

## Database Schema Patterns

### Enum Mappings
- Use Thai labels with English enum values
- Map API data to database enums consistently
- Handle null values appropriately

```javascript
const statusMap = {
  'ปกติ': 'normal',
  'ลาออก': 'withdrawn',
  'ตกออก': 'dropped',
  'สำเร็จการศึกษา': 'graduated'
};
```

## Testing & Development

### Commands
- Backend: `npm run dev` (development server)
- Frontend: `npm run dev` (Vite dev server)
- Database: `npx prisma db push` (schema updates)
- Build: `npm run build` (production build)

## Email System

### Email Templates
- Use HTML templates with inline CSS for better email client compatibility
- Template locations: `src/templates/emails/*.html`
- Support for variable replacement using Handlebars-like syntax
- Templates: `approved.html`, `rejected.html`, `personal-notification.html`, `general-announcement.html`

### Email Service Architecture
```javascript
// Email service pattern
const emailService = require('../services/emailService');

// Send individual email
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Subject',
  template: 'approved',
  variables: { userName: 'John', activityType: 'Certificate' }
});

// Send BCC email
await emailService.sendEmailWithBCC({
  to: ['user1@example.com', 'user2@example.com'],
  subject: 'Subject',
  template: 'general-announcement',
  variables: { message: 'Important announcement' }
});
```

### Email UI Components
- Search functionality for user selection
- Support for individual and group recipient selection
- BCC vs individual sending options
- Real-time user search with debouncing
- Group filters: student status, faculty selection

### Email Controller Endpoints
```javascript
// Admin email management routes
router.get("/email/search-users", searchUsers);          // User search
router.post("/email/send-to-users", sendToUsers);        // Send to selected users
router.post("/email/send-to-group", sendToGroup);        // Send to group
router.get("/faculties", getFaculties);                  // Get faculty list
```

### Email Template Best Practices
- Use fallback colors for gradients (`background-color` + `linear-gradient`)
- Include `!important` for critical color properties in emails
- Use system fonts with fallbacks: `'Sarabun', 'Sukhumvit Set', 'Arial', sans-serif`
- Design for 600px max width with responsive breakpoints
- Include automatic disclaimer and contact information

---

*This document serves as a reference for maintaining consistency across the SFA E-Filing project codebase.*