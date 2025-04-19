// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
 


const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // จำหน้าที่พยายามเข้า (location.pathname) เพื่อ redirect กลับมาหลัง login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children; // แสดง children ( ProtectedLayout ในกรณีนี้)
};

export default ProtectedRoute;