import React, { useState, useEffect } from "react";
import { UserPlus, Loader2, GraduationCap, Briefcase, X } from "lucide-react";
import apiClient from "../api/axiosConfig";
import { toast } from "react-hot-toast";

function AddUserModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState("student"); // 'student' or 'officer'
  const [studentId, setStudentId] = useState("");
  const [username, setUsername] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [scholarshipType, setScholarshipType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = () => {
    setStudentId("");
    setUsername("");
    setFirstname("");
    setLastname("");
    setScholarshipType("");
    setError(null);
  };

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen, loading, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload =
        mode === "student"
          ? { 
              studentId, 
              role: "student",
              scholarship_type: scholarshipType || null
            }
          : {
              username,
              firstname,
              lastname,
              role: "admin",
            };

      const res = await apiClient.post("/admin/users/add", payload);
      onSuccess?.(res.data);
      toast.success("เพิ่มผู้ใช้สำเร็จ");
      resetForm();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      if (msg.includes("มีผู้ใช้นี้อยู่ในระบบแล้ว")) {
        toast.error("มีผู้ใช้นี้อยู่ในระบบแล้ว");
      } else {
        toast.error(`เกิดข้อผิดพลาด: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <UserPlus className="mr-2" size={20} />
              เพิ่มผู้ใช้ใหม่
            </h2>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white transition-colors"
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-6">

          {/* Mode Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">เลือกประเภทผู้ใช้</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="userType"
                  value="student"
                  checked={mode === 'student'}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                />
                <div className="flex items-center space-x-2">
                  <GraduationCap size={16} className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-900">นักศึกษา</span>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="userType"
                  value="officer"
                  checked={mode === 'officer'}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                />
                <div className="flex items-center space-x-2">
                  <Briefcase size={16} className="text-purple-500" />
                  <span className="text-sm font-medium text-gray-900">บุคลากร</span>
                </div>
              </label>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "student" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    รหัสนักศึกษา
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    placeholder="กรอกรหัสนักศึกษา 11 หลัก"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                    pattern="\d{11}"
                    maxLength={11}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ระบบจะดึงข้อมูลจาก SSO ของ KMUTT โดยอัตโนมัติ
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภททุน
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm appearance-none bg-white"
                    value={scholarshipType}
                    onChange={(e) => setScholarshipType(e.target.value)}
                  >
                    <option value="">เลือกประเภททุน</option>
                    <option value="TYPE1">ลักษณะที่ 1</option>
                    <option value="TYPE2">ลักษณะที่ 2</option>
                    <option value="TYPE3">ลักษณะที่ 3</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อผู้ใช้
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    placeholder="ชื่อผู้ใช้ (ไม่ต้องใส่ @kmutt.ac.th)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ระบบจะเพิ่ม @kmutt.ac.th ให้โดยอัตโนมัติ
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ชื่อ
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      placeholder="ชื่อจริง"
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      นามสกุล
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      placeholder="นามสกุลจริง"
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                disabled={loading}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm font-medium whitespace-nowrap flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={14} />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <UserPlus size={14} className="mr-1" />
                    บันทึก
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddUserModal;