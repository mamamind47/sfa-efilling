# SFA E-Filing Project

## Project Overview

This is a full-stack web application for SFA (Student Financial Aid) e-filing. It allows students to submit and manage their financial aid applications, and for administrators to review and approve them. The project is built with a modern JavaScript stack:

*   **Backend:** Node.js with Express.js, using Prisma as the ORM for a MySQL database. It handles user authentication, data processing, and provides a RESTful API.
*   **Frontend:** A single-page application built with React.js and Vite. It uses Tailwind CSS and DaisyUI for styling, and `react-router-dom` for navigation.
*   **Language:** The user interface is in Thai, while the codebase is in English.

## Building and Running

### Backend

To run the backend development server:

```bash
cd backend
npm install
npm run dev
```

The backend server will start on `http://localhost:3000`.

### Frontend

To run the frontend development server:

```bash
cd client
npm install
npm run dev
```

The frontend development server will start on `http://localhost:5173` (or another port if 5173 is in use).

### Database

The project uses Prisma to manage the database schema. To apply schema changes to the database, run:

```bash
cd backend
npx prisma db push
```

## Development Conventions

### General

*   **Code:** All code (variables, functions, comments) should be in English.
*   **UI Text:** All user-facing text (labels, messages, notifications) should be in Thai.
*   **API Messages:** API error messages for the developer should be in English, while user-facing messages can be in Thai.

### Backend

*   **File Naming:**
    *   Controllers: `*Controller.js` (e.g., `userController.js`)
    *   Routes: `*Routes.js` (e.g., `userRoutes.js`)
    *   Middleware: `*Middleware.js` (e.g., `authMiddleware.js`)
*   **Express:** Route handlers are structured as `async (req, res) => { ... }` and use a consistent error handling pattern with try-catch blocks.
*   **Prisma:** Database fields use `snake_case`, while JavaScript code uses `camelCase`.
*   **Error Handling:** Consistent error responses are sent as `{ error: "message" }`.

### Frontend

*   **Components:** Use functional components with React Hooks. Component files are named in `PascalCase` (e.g., `AddUserModal.jsx`).
*   **State Management:** Use `useState` for local component state.
*   **Styling:** The project uses Tailwind CSS with the DaisyUI component library. The color scheme is based on an orange gradient.
*   **API Integration:** API calls are made using an `apiClient` (Axios instance) and should handle loading and error states.
