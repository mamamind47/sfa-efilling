// src/pages/app/ManageAcademicYearPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/axiosConfig"; // ใช้ apiClient ที่ตั้งค่า Interceptor แล้ว
import { CalendarPlus, Pencil, X } from "lucide-react";

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
    if (!yearName || !startDate || !endDate)
      return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    if (!/^\d{4}$/.test(yearName))
      return alert("ชื่อปีการศึกษาต้องเป็นตัวเลข 4 หลักเท่านั้น");

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
        setEndDate(""); // <-- เรียกใช้ State Setters
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
    if (!selectedYear || !editYearName || !editStartDate || !editEndDate)
      return alert("ข้อมูลในฟอร์มแก้ไขไม่ครบถ้วน");
    if (!/^\d{4}$/.test(editYearName))
      return alert("ชื่อปีการศึกษาต้องเป็นตัวเลข 4 หลักเท่านั้น");

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
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center space-x-2 text-base-content">
        <CalendarPlus className="text-orange-500" size="24" />
        <span>จัดการปีการศึกษา</span>
      </h1>

      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body p-4 md:p-6">
          <h2 className="card-title text-lg mb-2">เพิ่มปีการศึกษา</h2>
          <form
            onSubmit={createAcademicYear}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
          >
            <div className="form-control w-full">
              <label className="label" htmlFor="year_name">
                <span className="label-text">ชื่อปีการศึกษา (เลข 4 หลัก)</span>
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
                className="input input-bordered w-full focus:outline-none focus:ring-0 focus:ring-offset-0"
                required
                pattern="\d{4}"
                inputMode="numeric"
              />
            </div>
            <div className="form-control w-full">
              <label className="label" htmlFor="start_date">
                <span className="label-text">วันเริ่มต้น</span>
              </label>
              <input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input input-bordered w-full focus:outline-none focus:ring-0 focus:ring-offset-0"
                required
              />
            </div>
            <div className="form-control w-full">
              <label className="label" htmlFor="end_date">
                <span className="label-text">วันสิ้นสุด</span>
              </label>
              <input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input input-bordered w-full focus:outline-none focus:ring-0 focus:ring-offset-0"
                required
              />
            </div>
            <button
              type="submit"
              className="btn bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-white md:col-span-3 w-full md:w-auto md:justify-self-end"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  กำลังสร้าง...
                </>
              ) : (
                "เพิ่มปีการศึกษา"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ----- แสดงข้อผิดพลาด ----- */}
      {error && (
        <div role="alert" className="alert alert-error mb-4">
          <X size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ----- ตารางแสดงปีการศึกษา ----- */}
      {isLoading ? (
        <div className="text-center p-10">
          <span className="loading loading-lg loading-spinner text-primary"></span>
        </div>
      ) : academicYears.length === 0 ? (
        <div className="text-center p-10 text-base-content/60">
          ยังไม่มีข้อมูลปีการศึกษา
        </div>
      ) : (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead className="bg-base-200">
                  <tr>
                    <th className="p-3">ปีการศึกษา</th>
                    <th className="p-3">วันเริ่มต้น</th>
                    <th className="p-3">วันสิ้นสุด</th>
                    <th className="p-3 text-center">สถานะ</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {academicYears.map((year) => {
                    const statusInfo = getStatusDisplay(
                      year.status,
                      year.start_date,
                      year.end_date
                    );
                    return (
                      <tr key={year.academic_year_id} className="hover">
                        <td className="p-3">{year.year_name}</td>
                        <td className="p-3">
                          {new Date(year.start_date).toLocaleDateString(
                            "en-GB"
                          )}
                        </td>
                        <td className="p-3">
                          {new Date(year.end_date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="p-3 text-center">
                          {" "}
                          <span className={statusInfo.className}>
                            {statusInfo.text}
                          </span>{" "}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => openModal(year)}
                            className="btn btn-ghost btn-sm text-orange-600 hover:bg-orange-100 px-2"
                          >
                            {" "}
                            <Pencil size="16" />{" "}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----- Modal แก้ไข ----- */}
      {isModalOpen && selectedYear && (
        <dialog
          id="edit_modal"
          className={`modal ${isModalOpen ? "modal-open" : ""}`}
        >
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              แก้ไขปีการศึกษา {editYearName}
            </h3>
            <form onSubmit={updateAcademicYear} className="space-y-3">
              <div className="form-control">
                <label className="label" htmlFor="editYearNameModal">
                  <span className="label-text">ชื่อปีการศึกษา</span>
                </label>
                <input
                  id="editYearNameModal"
                  type="text"
                  value={editYearName}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 4) setEditYearName(value);
                  }}
                  className="input input-bordered"
                  required
                  pattern="\d{4}"
                  inputMode="numeric"
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="editStartDateModal">
                  <span className="label-text">วันเริ่มต้น</span>
                </label>
                <input
                  id="editStartDateModal"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="input input-bordered"
                  required
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="editEndDateModal">
                  <span className="label-text">วันสิ้นสุด</span>
                </label>
                <input
                  id="editEndDateModal"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="input input-bordered"
                  required
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="editStatusModal">
                  <span className="label-text">สถานะ</span>
                </label>
                <select
                  id="editStatusModal"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="">ตามเวลาที่ตั้ง</option>{" "}
                  <option value="OPEN">เปิด</option>{" "}
                  <option value="CLOSED">ปิด</option>
                </select>
              </div>
              <div className="modal-action mt-6">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeModal}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-white"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    "บันทึก"
                  )}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            {" "}
            <button type="button" onClick={closeModal}>
              close
            </button>{" "}
          </form>
        </dialog>
      )}
    </div>
  );
}

export default ManageAcademicYearPage;
