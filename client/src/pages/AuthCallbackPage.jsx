// src/pages/AuthCallbackPage.jsx
import React, { useEffect, useState, useRef } from "react"; // <--- เพิ่ม useRef
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

  useEffect(() => {
    if (
      effectRan.current === true /* || process.env.NODE_ENV !== 'development' */
    ) {
      return;
    }

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
          setError(
            `Login Failed: ${
              err.response?.data?.message || err.message || "Unknown error"
            }`
          );
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
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)] p-4">
      {isLoading && (
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-lg">กำลังประมวลผลการเข้าสู่ระบบ...</p>
        </div>
      )}
      {error && (
        <div role="alert" className="alert alert-error max-w-md shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-bold">เกิดข้อผิดพลาด!</h3>
            <div className="text-xs">{error}</div>
          </div>
          <Link to="/login">
            <button className="btn btn-sm btn-ghost">กลับหน้า Login</button>
          </Link>
        </div>
      )}
    </div>
  );
};


export default AuthCallbackPage;