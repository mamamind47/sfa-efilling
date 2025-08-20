import React, { useState } from "react";
import { UserPlus, Loader2, GraduationCap, Briefcase } from "lucide-react";
import apiClient from "../api/axiosConfig";
import { toast } from "react-hot-toast";

function AddUserModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState("student"); // 'student' or 'officer'
  const [studentId, setStudentId] = useState("");
  const [username, setUsername] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = () => {
    setStudentId("");
    setUsername("");
    setFirstname("");
    setLastname("");
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload =
        mode === "student"
          ? { studentId, role: "student" }
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserPlus size={20} />
            เพิ่มผู้ใช้ใหม่
          </h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost">
            ✕
          </button>
        </div>

        {/* สลับโหมด */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`btn btn-sm ${
              mode === "student"
                ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                : "bg-white text-black border border-orange-300 hover:bg-orange-50"
            }`}
            onClick={() => setMode("student")}
          >
            <GraduationCap size={16} className="mr-1" />
            นักศึกษา
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              mode === "officer"
                ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                : "bg-white text-black border border-orange-300 hover:bg-orange-50"
            }`}
            onClick={() => setMode("officer")}
          >
            <Briefcase size={16} className="mr-1" />
            บุคลากร
          </button>
        </div>

        {/* ฟอร์ม */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "student" ? (
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="รหัสนักศึกษา 11 หลัก"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              pattern="\d{11}"
            />
          ) : (
            <>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="ชื่อผู้ใช้ (ไม่ต้องใส่ @kmutt.ac.th)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="ชื่อ"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="นามสกุล"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  required
                />
              </div>
            </>
          )}


          <div className="flex justify-end">
            <button
              type="submit"
              className="btn bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
              disabled={loading}
            >
              {loading && <Loader2 className="animate-spin mr-2" size={16} />}
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddUserModal;