// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    // ใช้ class จาก Svelte เดิมได้เลย เพราะ DaisyUI ก็คือ Tailwind
    <footer className="bg-gray-900 text-white text-sm py-2 px-4 flex justify-between items-center w-full mt-auto">
      {/* ข้อความชิดซ้าย */}
      <div className="text-left">
        {/* ใช้ class hidden md:block สำหรับ Desktop */}
        <p className="hidden md:block">
          © 2025 กลุ่มงานช่วยเหลือทางการเงินแก่นักศึกษา
          มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
        </p>
        {/* ใช้ class md:hidden สำหรับ Mobile */}
        <p className="md:hidden">
          © 2025 กลุ่มงานช่วยเหลือทางการเงินแก่นักศึกษา
        </p>
        <p className="md:hidden">มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี</p>
      </div>

      {/* ข้อความชิดขวา (ซ่อนในมือถือ) */}
      <div className="text-right hidden md:block">
        <p>
          Build with ❤️ by <a href='https://instagram.com/badee.md' target='_blank'>Badeesorn</a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;