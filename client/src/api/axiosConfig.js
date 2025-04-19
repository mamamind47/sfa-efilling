// src/api/axiosConfig.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, 
});

// สร้าง Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    // ดึง Token จาก localStorage ก่อนส่งทุก Request
    const token = localStorage.getItem('authToken');
    if (token) {
      // ถ้ามี Token ให้ใส่ใน Authorization Header
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config; // คืนค่า config ที่แก้ไขแล้ว
  },
  (error) => {
    // ทำอะไรบางอย่างถ้าเกิด Error ตอนสร้าง Request
    return Promise.reject(error);
  }
);

// Optional: Response Interceptor สำหรับจัดการ Error ทั่วไป เช่น 401
apiClient.interceptors.response.use(
  (response) => response, // ถ้า Response สำเร็จ ก็ส่งต่อไปเลย
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // ถ้าเจอ 401 หรือ 403 อาจจะลบ Token เก่าทิ้ง แล้ว redirect ไปหน้า Login
      console.error("Unauthorized or Forbidden response, logging out.");
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      // ใช้ window.location เพราะใช้ hook useNavigate นอก Component ไม่ได้
      window.location.href = '/login';
    }
    // คืนค่า Error ให้ .catch() ทำงานต่อใน Component
    return Promise.reject(error);
  }
);


export default apiClient; // Export instance ที่ตั้งค่าแล้ว