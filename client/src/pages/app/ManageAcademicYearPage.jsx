// src/pages/app/ManageAcademicYearPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/axiosConfig";
import { Calendar, CalendarPlus, Pencil, X, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // ยังคงใช้ Base URL สำหรับบางกรณีได้

function ManageAcademicYearPage() {
  // --- State Variables (เพิ่มส่วนที่ขาดหายไปกลับเข้ามา) ---
  const [academicYears, setAcademicYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // <-- ตัวนี้ที่ Error บอกว่าหาไม่เจอ
  const [error, setError] = useState(null);
  const [yearName, setYearName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [editYearName, setEditYearName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  // --- ------------------------------------------ ---

  // --- API Functions (ใส่โค้ดเต็ม) ---
  const fetchAcademicYears = useCallback(async () => {
    setIsLoading(true); // <-- เรียกใช้ setIsLoading
    setError(null);
    try {
      const response = await apiClient.get("/academic"); // ใช้ apiClient
      const sortedYears = response.data.sort((a, b) =>
        b.year_name.localeCompare(a.year_name)
      );
      setAcademicYears(sortedYears); // <-- เรียกใช้ setAcademicYears
    } catch (err) {
      // Interceptor จัดการ 401/403 แล้ว
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error("❌ Error fetching academic years:", err);
        setError(
          err.response?.data?.error ||
            err.message ||
            "ไม่สามารถโหลดข้อมูลปีการศึกษาได้"
        ); // <-- เรียกใช้ setError
      }
    } finally {
      setIsLoading(false); // <-- เรียกใช้ setIsLoading
    }
  }, []); // useCallback dependency ควรว่างเปล่า ถ้าข้างในไม่ได้ใช้ props/state ที่เปลี่ยนได้

  const createAcademicYear = async (event) => {
    event.preventDefault();
    if (!yearName || !startDate || !endDate) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (!/^\d{4}$/.test(yearName)) {
      toast.error("ชื่อปีการศึกษาต้องเป็นตัวเลข 4 หลักเท่านั้น");
      return;
    }

    setIsCreating(true); // <-- เรียกใช้ setIsCreating
    setError(null); // <-- เรียกใช้ setError
    try {
      // ใช้ apiClient.post
      const response = await apiClient.post("/academic", {
        year_name: yearName,
        start_date: startDate,
        end_date: endDate,
        status: null,
      });
      if (response.status === 200 || response.status === 201) {
        await fetchAcademicYears();
        setYearName("");
        setStartDate("");
        setEndDate("");
        toast.success("เพิ่มปีการศึกษาสำเร็จ");
      } else {
        throw new Error(response.data?.error || "สร้างปีการศึกษาไม่สำเร็จ");
      }
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error("❌ Error creating academic year:", err);
        setError(
          err.response?.data?.error ||
            err.message ||
            "เกิดข้อผิดพลาดในการสร้างปีการศึกษา"
        ); // <-- เรียกใช้ setError
      }
    } finally {
      setIsCreating(false);
    } // <-- เรียกใช้ setIsCreating
  };

  const updateAcademicYear = async (event) => {
    event.preventDefault();
    if (!selectedYear || !editYearName || !editStartDate || !editEndDate) {
      toast.error("ข้อมูลในฟอร์มแก้ไขไม่ครบถ้วน");
      return;
    }
    if (!/^\d{4}$/.test(editYearName)) {
      toast.error("ชื่อปีการศึกษาต้องเป็นตัวเลข 4 หลักเท่านั้น");
      return;
    }

    setIsUpdating(true); // <-- เรียกใช้ setIsUpdating
    setError(null); // <-- เรียกใช้ setError
    try {
      // ใช้ apiClient.put
      const response = await apiClient.put(
        `/academic/${selectedYear.academic_year_id}`,
        {
          year_name: editYearName,
          start_date: editStartDate,
          end_date: editEndDate,
          status: editStatus === "" ? null : editStatus,
        }
      );
      if (response.status === 200) {
        await fetchAcademicYears();
        toast.success("แก้ไขปีการศึกษาสำเร็จ");
        closeModal();
      } else {
        throw new Error(response.data?.error || "อัปเดตปีการศึกษาไม่สำเร็จ");
      }
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error("❌ Error updating academic year:", err);
        setError(
          err.response?.data?.error ||
            err.message ||
            "เกิดข้อผิดพลาดในการอัปเดตปีการศึกษา"
        ); // <-- เรียกใช้ setError
      }
    } finally {
      setIsUpdating(false);
    } // <-- เรียกใช้ setIsUpdating
  };

  // --- Modal Functions (เพิ่มกลับเข้ามา) ---
  const openModal = (year) => {
    setSelectedYear({ ...year }); // <-- เรียกใช้ setSelectedYear
    setEditYearName(year.year_name); // <-- เรียกใช้ setEditYearName
    setEditStartDate(
      year.start_date
        ? new Date(year.start_date).toISOString().split("T")[0]
        : ""
    ); // <-- เรียกใช้ setEditStartDate
    setEditEndDate(
      year.end_date ? new Date(year.end_date).toISOString().split("T")[0] : ""
    ); // <-- เรียกใช้ setEditEndDate
    setEditStatus(year.status ?? ""); // <-- เรียกใช้ setEditStatus
    setIsModalOpen(true); // <-- เรียกใช้ setIsModalOpen
  };
  const closeModal = () => {
    setIsModalOpen(false); // <-- เรียกใช้ setIsModalOpen
    setSelectedYear(null); // <-- เรียกใช้ setSelectedYear
    setEditYearName("");
    setEditStartDate("");
    setEditEndDate("");
    setEditStatus(""); // <-- เรียกใช้ State Setters
  };

  // --- Load initial data (เรียก fetchAcademicYears) ---
  useEffect(() => {
    document.title = "จัดการปีการศึกษา | Volunteer Student Loan e-Filling";
    fetchAcademicYears();
  }, [fetchAcademicYears]); // ใส่ fetchAcademicYears ที่ห่อด้วย useCallback แล้ว

  // --- Helper Function แสดงสถานะ (เพิ่มกลับเข้ามา) ---
  const getStatusDisplay = (status, startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const isWithinDateRange = start <= now && now <= end;

    if (status === "OPEN") {
      return { text: "เปิด", className: "badge badge-success text-white" };
    } else if (status === "CLOSED") {
      return { text: "ปิด", className: "badge badge-error text-white" };
    } else {
      return {
        text: isWithinDateRange ? "เปิด (ตามเวลา)" : "ปิด (ตามเวลา)",
        className: "badge bg-gray-400 border-gray-400 text-white",
      };
    }
  };

  // --- Render JSX (เพิ่มกลับเข้ามา) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full mb-3 shadow-lg">
            <Calendar className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            จัดการปีการศึกษา
          </h1>
          <p className="text-gray-600 text-sm max-w-xl mx-auto">
            เพิ่ม แก้ไข และควบคุมสถานะปีการศึกษาสำหรับระบบยื่นใบรับรองจิตอาสา
          </p>
        </div>

        {/* Add Academic Year Form */}
        <div className="bg-white rounded-xl shadow-md border border-orange-100 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <CalendarPlus className="text-orange-500" size={20} />
            <h2 className="text-base font-medium text-gray-800">เพิ่มปีการศึกษาใหม่</h2>
          </div>
          
          <form onSubmit={createAcademicYear} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อปีการศึกษา
                </label>
                <input
                  id="year_name"
                  type="text"
                  placeholder="เช่น 2567"
                  value={yearName}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 4) setYearName(value);
                  }}
                  className="w-full px-3 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-sm"
                  required
                  pattern="\d{4}"
                  inputMode="numeric"
                />
                <p className="mt-1 text-xs text-gray-500">ตัวเลข 4 หลัก</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่เริ่มต้น
                </label>
                <input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่สิ้นสุด
                </label>
                <input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-sm"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn btn-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-none shadow-md hover:shadow-lg transition-all duration-300 px-6"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    กำลังสร้าง...
                  </>
                ) : (
                  <>
                    <CalendarPlus size={16} />
                    เพิ่มปีการศึกษา
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
            <X size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Academic Years Table */}
        <div className="bg-white rounded-xl shadow-md border border-orange-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <Calendar className="mr-2" size={20} />
              รายการปีการศึกษา
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                <p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : academicYears.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-gray-400" size={24} />
                </div>
                <p className="text-gray-500 text-sm">ยังไม่มีข้อมูลปีการศึกษา</p>
                <p className="text-gray-400 text-xs mt-1">เพิ่มปีการศึกษาแรกเพื่อเริ่มต้นใช้งาน</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ปีการศึกษา
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่เริ่มต้น
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่สิ้นสุด
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {academicYears.map((year) => {
                    const statusInfo = getStatusDisplay(
                      year.status,
                      year.start_date,
                      year.end_date
                    );
                    return (
                      <tr key={year.academic_year_id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                              <Calendar className="text-orange-600" size={16} />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {year.year_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(year.start_date).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(year.end_date).toLocaleDateString("th-TH", {
                            year: "numeric", 
                            month: "short",
                            day: "numeric"
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            year.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                            year.status === 'CLOSED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {year.status === 'OPEN' && <CheckCircle size={12} className="mr-1" />}
                            {year.status === 'CLOSED' && <XCircle size={12} className="mr-1" />}
                            {!year.status && <Clock size={12} className="mr-1" />}
                            {statusInfo.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => openModal(year)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-orange-600 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                          >
                            <Pencil size={14} className="mr-1" />
                            แก้ไข
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {isModalOpen && selectedYear && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <Pencil className="mr-2" size={20} />
                    แก้ไขปีการศึกษา {editYearName}
                  </h3>
                  <button 
                    onClick={closeModal} 
                    className="text-white/80 hover:text-white transition-colors"
                    disabled={isUpdating}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <form onSubmit={updateAcademicYear} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ชื่อปีการศึกษา
                    </label>
                    <input
                      id="editYearNameModal"
                      type="text"
                      value={editYearName}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value.length <= 4) setEditYearName(value);
                      }}
                      className="w-full px-3 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-sm"
                      required
                      pattern="\d{4}"
                      inputMode="numeric"
                      disabled={isUpdating}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      วันที่เริ่มต้น
                    </label>
                    <input
                      id="editStartDateModal"
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-sm"
                      required
                      disabled={isUpdating}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      วันที่สิ้นสุด
                    </label>
                    <input
                      id="editEndDateModal"
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-sm"
                      required
                      disabled={isUpdating}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      สถานะ
                    </label>
                    <select
                      id="editStatusModal"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white transition-all duration-300 text-sm"
                      disabled={isUpdating}
                    >
                      <option value="">ตามเวลาที่ตั้ง</option>
                      <option value="OPEN">เปิด</option>
                      <option value="CLOSED">ปิด</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                      disabled={isUpdating}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm font-medium whitespace-nowrap flex items-center justify-center"
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <Pencil size={14} className="mr-1" />
                          บันทึกการแก้ไข
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageAcademicYearPage;
