// tailwind.config.js
const defaultTheme = require("tailwindcss/defaultTheme"); // <--- เพิ่ม import นี้

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // เพิ่มส่วนนี้
      fontFamily: {
        // กำหนดให้ 'sans' (font ปกติ) ใช้ 'Sarabun' ก่อน แล้วค่อย fallback ไป font อื่นๆ
        sans: ["Sarabun", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("daisyui")],
  // daisyui config (ถ้ามี)
};