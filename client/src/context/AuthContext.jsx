// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(undefined);

const isTokenExpired = (token) => {
  try {
    const { exp } = jwtDecode(token);
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [role, setRole] = useState(() => localStorage.getItem('userRole'));
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      if (isTokenExpired(token)) {
        logout();
      } else {
        // Decode token to get user info
        try {
          const decoded = jwtDecode(token);
          setUser(decoded);
        } catch (error) {
          console.error('Error decoding token:', error);
        }

        if (!role) {
          const storedRole = localStorage.getItem('userRole');
          if (storedRole) setRole(storedRole);
          else console.warn('Token exists but role missing.');
        }
      }
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      setRole(null);
      setUser(null);
    }
  }, [token, role]);

  const login = (newToken, userRole) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('userRole', userRole);
    setToken(newToken);
    setRole(userRole);

    // Decode token to get user info
    try {
      const decoded = jwtDecode(newToken);
      setUser(decoded);
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    setToken(null);
    setRole(null);
    setUser(null);
    navigate('/login', { replace: true });
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, role, user, isAuthenticated, login, logout }}>
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