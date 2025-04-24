import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { GraduationCap } from "lucide-react";
import logo from "../assets/SL_e-Filling.png";
import KMUTT from "../assets/KMUTT.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const authUrlBase = import.meta.env.VITE_AUTH_URL;
  const clientId = import.meta.env.VITE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_REDIRECT_URI;
  const authorizeUrl = `${authUrlBase}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid`;

  const handleLoginClick = () => {
    window.location.href = authorizeUrl;
  };

  useEffect(() => {
    document.title = "เข้าสู่ระบบ | Volunteer Student Loan e-Filling";
    if (isAuthenticated) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-white via-pink-50 to-yellow-50 px-6 sm:px-0">
      <div className="bg-white shadow-2xl rounded-2xl p-10 md:p-12 w-full max-w-lg text-center space-y-6">
        {/* โลโก้ */}
        <div className="flex items-center justify-center space-x-4">
          <img
            src={KMUTT}
            alt="KMUTT Logo"
            className="w-16 md:w-20"
          />
          <img src={logo} alt="SL e-Filling Logo" className="w-36 md:w-44" />
        </div>

        {/* หัวข้อ */}
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
          กรุณาเข้าสู่ระบบเพื่อใช้งาน
        </h1>

        {/* ปุ่ม login */}
        <button
          onClick={handleLoginClick}
          className="relative w-full px-5 py-3 rounded-lg bg-white border border-gray-300 text-black font-bold text-base hover:bg-gray-100 transition"
        >
          {/* ไอคอนชิดซ้าย */}
          <span className="absolute left-5 top-1/2 -translate-y-1/2">
            <GraduationCap className="w-5 h-5" />
          </span>

          {/* ข้อความตรงกลาง */}
          <span className="block text-center w-full">
            Log in with KMUTT Account
          </span>
        </button>
      </div>
    </div>
  );
};

export default LoginPage;