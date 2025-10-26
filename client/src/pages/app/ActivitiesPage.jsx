import React from "react";
import { Calendar } from "lucide-react";

const ActivitiesPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow border border-orange-100 p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Calendar className="w-16 h-16 text-orange-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              สมัครกิจกรรม
            </h1>
            <p className="text-gray-600 mb-4">
              หน้านี้กำลังอยู่ระหว่างการพัฒนา
            </p>
            <p className="text-sm text-gray-500">
              ฟีเจอร์การสมัครเข้าร่วมกิจกรรมที่มหาวิทยาลัยจัดให้จะเปิดให้ใช้งานในเร็วๆ นี้
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitiesPage;
