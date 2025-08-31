// src/App.jsx
import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { Toaster } from "react-hot-toast";

// Import Components และ Pages (สร้างไฟล์เหล่านี้ด้วย .jsx)
import Footer from "./components/Footer.jsx";
// NavBar จะถูก import และใช้ใน ProtectedLayout แทน
// import NavBar from './components/NavBar.jsx';
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import ProtectedLayout from "./components/ProtectedLayout.jsx"; // <--- ใช้ Import นี้

// --- Pages ที่จะใช้ (ประกาศไว้ที่นี่ หรือ import มาก็ได้) ---
const DashboardPage = () => (
  <div className="p-4">Dashboard Page (Protected)</div>
);
const SubmitCertificatePage = () => (
  <div className="p-4">Submit Certificate Page (Student)</div>
);
const ManageAcademicYearPage = () => (
  <div className="p-4">Manage Academic Year Page (Admin)</div>
);
const PendingApprovalsPage = () => (
  <div className="p-4">Pending Approvals Page (Admin)</div>
);
const CompletedCertificatesPage = () => (
  <div className="p-4">Completed Certificates Page (Admin)</div>
);
const ManageCertificatesPage = () => (
  <div className="p-4">Manage Certificates Page (Admin)</div>
);
// --- --------------------------- ---

function App() {
  return (
    // AuthProvider ควรจะอยู่ใน main.jsx เพื่อให้ครอบคลุม BrowserRouter ด้วย
    // ถ้ายังไม่ได้ย้ายไป main.jsx ให้ย้ายไปนะครับ ตามตัวอย่างก่อนหน้า
    // ถ้าอยู่ใน main.jsx แล้ว เอา <AuthProvider> ตรงนี้ออกได้
    <AuthProvider>
      <Toaster position="top-right" />
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Protected Route สำหรับ /app/* */}
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  {/* ใช้ Component ที่ import เข้ามา */}
                  <ProtectedLayout />
                </ProtectedRoute>
              }
            />

            {/* Route สำหรับหน้าแรกสุด (/) */}
            <Route path="/" element={<RootRedirect />} />

            {/* Fallback Route (404) */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}


// Component สำหรับ Redirect หน้าแรก (/)
function RootRedirect() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const targetPath = isAuthenticated ? "/app/dashboard" : "/login";
    navigate(targetPath, { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <progress className="progress w-56"></progress>
    </div>
  );
}

// Component หน้า 404
function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] text-center p-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="mb-6">ขออภัย ไม่พบหน้าที่คุณต้องการ</p>
      <button className="btn btn-primary" onClick={() => navigate("/")}>
        กลับหน้าหลัก
      </button>
    </div>
  );
}


export default App;