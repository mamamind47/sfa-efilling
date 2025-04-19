// src/main.jsx

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // Import ไฟล์ CSS หลักที่มี @tailwind directives
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter

ReactDOM.createRoot(document.getElementById("root")).render(
  // StrictMode ช่วยหา potential problems ในแอป
  <React.StrictMode>
    {/* BrowserRouter เปิดใช้งาน client-side routing ทั้งแอป */}
    <BrowserRouter>
      <App /> {/* Render App component หลัก */}
    </BrowserRouter>
  </React.StrictMode>
);
