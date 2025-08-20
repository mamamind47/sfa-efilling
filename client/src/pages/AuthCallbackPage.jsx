// src/pages/AuthCallbackPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "axios";

const AuthCallbackPage = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const effectRan = useRef(false);

  const backendCallbackUrl = `${
    import.meta.env.VITE_API_BASE_URL
  }/auth/callback`;
  const adfsLogoutUrl = import.meta.env.VITE_ADFS_LOGOUT_URL;

  useEffect(() => {
    if (effectRan.current === true) return;

    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const adfsError = params.get("error");

    if (adfsError) {
      setError(`ADFS Error: ${params.get("error_description") || adfsError}`);
      setIsLoading(false);
      return;
    }

    if (code) {
      setIsLoading(true);
      axios
        .post(backendCallbackUrl, { code })
        .then((response) => {
          const { token, role } = response.data;
          if (token && role) {
            login(token, role);
            navigate("/app/dashboard", { replace: true });
          } else {
            throw new Error("Backend response missing token or role.");
          }
        })
        .catch((err) => {
          console.error("Callback Error:", err);
          const isForbidden = err.response?.status === 403;
          const msg = isForbidden
            ? "Unauthorized Access: You are currently unauthorized to access the system. Please contact 024709982 for support."
            : err.response?.data?.message || err.message || "Unknown error";

          setError(msg);
          setIsLoading(false);
        });
    } else {
      setError("Authorization code not found.");
      setIsLoading(false);
    }

    return () => {
      effectRan.current = true;
    };
  }, [location, navigate, login, backendCallbackUrl]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)] p-4 bg-gray-50">
      {isLoading && (
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-lg">กำลังประมวลผลการเข้าสู่ระบบ...</p>
        </div>
      )}

      {error && (
        <div className="bg-white shadow-xl rounded-2xl p-8 max-w-lg w-full text-center border border-red-200 animate-fade-in space-y-4">
          <div className="flex justify-center mb-2">
            <div className="bg-red-100 text-red-600 rounded-full p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M12 5.5a7.5 7.5 0 110 15 7.5 7.5 0 010-15z"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold text-red-600">
            ขออภัย ท่านไม่มีสิทธิ์เข้าใช้งานระบบ
          </h2>

          <p className="text-sm text-gray-700">
            ระบบนี้สำหรับนักศึกษาทุนกู้ยืมเงินจากกองทุนเงินให้กู้ยืมเพื่อการศึกษาเท่านั้น
            <br/>หากท่านไม่สามารถเข้าสู่ระบบได้ โปรดติดต่อ <strong>024709982</strong>
          </p>

          <p className="text-xs text-gray-500 mt-3">
            Unauthorized Access: Access to this system is restricted to students
            applying for loans from the Student Loan Fund.
          </p>

          <div className="mt-6">
            <button
              onClick={() => {
                const logoutWindow = window.open(adfsLogoutUrl, "_blank", "width=500,height=600");
                setTimeout(() => {
                  logoutWindow?.close();
                  navigate("/login", { replace: true });
                }, 1000);
              }}
              className="btn bg-red-500 hover:bg-red-600 text-white px-6 rounded-lg shadow"
            >
              เข้าสู่ระบบด้วยบัญชีอื่น / Login with another account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthCallbackPage;