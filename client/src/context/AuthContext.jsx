// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
//import * as React from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [role, setRole] = useState(() => localStorage.getItem('userRole'));
  const navigate = useNavigate();

  useEffect(() => {
    if (token && !role) {
      const storedRole = localStorage.getItem('userRole');
      if (storedRole) setRole(storedRole);
      else console.warn('Token exists but role missing.');
    } else if (!token) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      setRole(null);
    }
  }, [token, role]);

  const login = (newToken, userRole) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('userRole', userRole);
    setToken(newToken);
    setRole(userRole);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    setToken(null);
    setRole(null);
    navigate('/login', { replace: true });
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, role, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};