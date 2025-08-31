// src/pages/admin/AdminUserStatsPage.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import apiClient from "../../api/axiosConfig";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Download,
  Edit,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

// Debounce hook (สามารถย้ายไปไว้ในไฟล์ utils ได้)
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

function AdminUserStatsPage() {
  // --- State Variables ---
  const [statsData, setStatsData] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(50);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [selectedHourStatus, setSelectedHourStatus] = useState("all");
  const [selectedScholarshipStatus, setSelectedScholarshipStatus] =
    useState("all");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedAcademicYearName, setSelectedAcademicYearName] =
    useState("กำลังโหลด...");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false); // State สำหรับ Export Button
  const initialMount = useRef(true);

  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedScholarship, setSelectedScholarship] = useState("ยังไม่สมัคร");
  const [showModal, setShowModal] = useState(false);
  const [editingUserInfo, setEditingUserInfo] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
    } else {
      setPage(1);
    }
  }, [debouncedSearch]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        faculty: selectedFaculty === "all" ? undefined : selectedFaculty,
        hourStatus:
          selectedHourStatus === "all" ? undefined : selectedHourStatus,
        scholarshipStatus:
          selectedScholarshipStatus === "all"
            ? undefined
            : selectedScholarshipStatus,
        academicYearId: selectedAcademicYearId || undefined,
        search: debouncedSearch || undefined,
      };

      // console.log(">>> Sending API Params:", JSON.stringify(params, null, 2));

      const res = await apiClient.get("/admin/user-statistics", { params });

      setStatsData(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalItems(res.data.pagination?.totalItems || 0);

      // Set filter options only if they haven't been set before
      if (academicYears.length === 0 && res.data.filters?.academicYears) {
        setAcademicYears(res.data.filters.academicYears);
      }
      if (faculties.length === 0 && res.data.filters?.faculties) {
        setFaculties(res.data.filters.faculties);
      }

      if (res.data.filters?.selectedAcademicYear) {
        const currentSelectedYear = res.data.filters.selectedAcademicYear;
        setSelectedAcademicYearName(currentSelectedYear.name);
        if (!selectedAcademicYearId) {
          setSelectedAcademicYearId(currentSelectedYear.id);
        }
      }
    } catch (err) {
      console.error("Error fetching user statistics:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        "เกิดข้อผิดพลาดในการโหลดข้อมูลสถิติ";
      setError(errorMsg);
      setStatsData([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    limit,
    selectedFaculty,
    selectedHourStatus,
    selectedScholarshipStatus,
    selectedAcademicYearId,
    debouncedSearch,
    academicYears.length, // Include lengths to fetch options initially
    faculties.length, // Include lengths to fetch options initially
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const toggleRowExpansion = (userId) => {
    setExpandedRows(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleAcademicYearChange = (e) => {
    const newYearId = e.target.value;
    setSelectedAcademicYearId(newYearId);
    const year = academicYears.find((ay) => ay.id === newYearId);
    setSelectedAcademicYearName(year ? year.name : "ปีการศึกษาล่าสุด");
    setPage(1);
  };

  // --- CORRECTED Export Handler using Blob ---
  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    const params = new URLSearchParams();
    if (selectedAcademicYearId)
      params.append("academicYearId", selectedAcademicYearId);
    if (selectedFaculty !== "all") params.append("faculty", selectedFaculty);
    if (selectedHourStatus !== "all")
      params.append("hourStatus", selectedHourStatus);
    if (selectedScholarshipStatus !== "all")
      params.append("scholarshipStatus", selectedScholarshipStatus);

    const queryString = params.toString();
    const exportUrl = `/admin/user-statistics/export${
      queryString ? `?${queryString}` : ""
    }`;

    try {
      const response = await apiClient.get(exportUrl, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type:
          response.headers["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const contentDisposition = response.headers["content-disposition"];
      let filename = `user_statistics_${
        selectedAcademicYearName || "export"
      }_${Date.now()}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length === 2)
          filename = filenameMatch[1];
      }
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("ดาวน์โหลดไฟล์ Excel สำเร็จ");
    } catch (err) {
      console.error("Error exporting data:", err);
      let errorMsg = "เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ Excel";
      if (
        err.response &&
        err.response.data instanceof Blob &&
        err.response.data.type.includes("json")
      ) {
        try {
          const errorText = await err.response.data.text();
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorJson.message || errorMsg;
        } catch (parseError) {
          console.error("Could not parse error blob:", parseError);
        }
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsExporting(false);
    }
  };
  // --- END CORRECTED Export Handler ---

  const handleSaveScholarship = async () => {
    try {
      await apiClient.post("/admin/update-scholarship", {
        student_id: editingUserId,
        academic_year: selectedAcademicYearName,
        new_type: selectedScholarship,
      });

      toast.success(
        `อัปเดตสถานะทุนของ ${editingUserInfo?.name || "นักศึกษา"} เรียบร้อยแล้ว`
      );

      await fetchData(); // ✅ โหลดข้อมูลใหม่หลังอัปเดต

      setShowModal(false); // ✅ ปิด popup
    } catch (error) {
      console.error("Update error:", error);
      toast.error("เกิดข้อผิดพลาดในการอัปเดต");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* --- Header and Export Button --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-lg shadow-sm border p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            ข้อมูลสถิตินักศึกษา
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            ปีการศึกษา: <span className="font-medium text-gray-900">{selectedAcademicYearName}</span>
          </p>
        </div>
        {/* Updated Export Button */}
        <button
          className={`px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded shadow-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
            isExporting ? "cursor-not-allowed" : ""
          }`}
          onClick={handleExport}
          disabled={isLoading || totalItems === 0 || isExporting}
        >
          {isExporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {isExporting ? "กำลังดาวน์โหลด..." : "ดาวน์โหลด Excel"}
        </button>
      </div>

      {/* --- Filters --- */}
      <div className="p-6 bg-white rounded-lg shadow-sm border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        {/* Search Input */}
        <div className="form-control w-full lg:col-span-1">
          <label className="label pt-0 pb-2">
            <span className="label-text text-sm font-medium text-gray-700">
              ค้นหา
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="ชื่อ, รหัสนักศึกษา..."
              className="input w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-colors duration-200 pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </span>
          </div>
        </div>
        {/* Academic Year Filter */}
        <div className="form-control w-full">
          <label className="label pt-0 pb-2">
            <span className="label-text text-sm font-medium text-gray-700">
              ปีการศึกษา
            </span>
          </label>
          <select
            className="select w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-colors duration-200"
            value={selectedAcademicYearId}
            onChange={handleAcademicYearChange}
            disabled={isLoading || academicYears.length === 0}
          >
            <option value="">ปีล่าสุด</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name}
              </option>
            ))}
          </select>
        </div>
        {/* Faculty Filter */}
        <div className="form-control w-full">
          <label className="label pt-0 pb-2">
            <span className="label-text text-sm font-medium text-gray-700">
              คณะ
            </span>
          </label>
          <select
            className="select w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-colors duration-200"
            value={selectedFaculty}
            onChange={handleFilterChange(setSelectedFaculty)}
            disabled={isLoading || faculties.length === 0}
          >
            <option value="all">ทุกคณะ</option>
            {faculties.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        {/* Hour Status Filter */}
        <div className="form-control w-full">
          <label className="label pt-0 pb-2">
            <span className="label-text text-sm font-medium text-gray-700">
              สถานะชั่วโมง
            </span>
          </label>
          <select
            className="select w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-colors duration-200"
            value={selectedHourStatus}
            onChange={handleFilterChange(setSelectedHourStatus)}
            disabled={isLoading}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="completed">ครบ 36 ชม.</option>
            <option value="incomplete">ยังไม่ครบ</option>
          </select>
        </div>
        {/* Scholarship Status Filter */}
        <div className="form-control w-full">
          <label className="label pt-0 pb-2">
            <span className="label-text text-sm font-medium text-gray-700">
              สถานะทุน
            </span>
          </label>
          <select
            className="select w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-colors duration-200"
            value={selectedScholarshipStatus}
            onChange={handleFilterChange(setSelectedScholarshipStatus)}
            disabled={isLoading}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="applied">สมัครแล้ว</option>
            <option value="not_applied">ยังไม่สมัคร</option>
          </select>
        </div>
      </div>

      {/* --- Loading and Error Display --- */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Loader2 className="animate-spin w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-700 font-medium">กำลังโหลดข้อมูล...</p>
          <p className="text-gray-500 text-sm mt-1">กรุณารอสักครู่</p>
        </div>
      )}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">เกิดข้อผิดพลาด</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* --- Table --- */}
      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-3 text-left font-medium text-gray-700 text-sm">นักศึกษา</th>
                  <th className="p-3 text-center font-medium text-gray-700 text-sm">MOD LINK</th>
                  <th className="p-3 text-center font-medium text-gray-700 text-sm">ในระบบ</th>
                  <th className="p-3 text-center font-medium text-gray-900 text-sm">รวมชั่วโมง</th>
                  <th className="p-3 text-center font-medium text-gray-700 text-sm">สถานะทุน</th>
                  <th className="p-3 text-center font-medium text-gray-700 text-sm">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {statsData.length > 0 ? (
                  statsData.map((u) => (
                    <React.Fragment key={u.userId}>
                      <tr className="hover:bg-gray-50 cursor-pointer transition-colors duration-200 border-b border-gray-200" onClick={() => toggleRowExpansion(u.userId)}>
                        <td className="p-3 align-top">
                          <div className="font-medium text-gray-900 text-sm">
                            {u.name}
                          </div>
                          <div className="text-xs text-gray-600 font-medium bg-gray-100 inline-block px-2 py-0.5 rounded mt-1">
                            {u.username}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {u.faculty || "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {u.major || "-"}
                          </div>
                          {u.student_status && u.student_status !== "ปกติ" && u.student_status !== "normal" && (
                            <div className="text-xs text-orange-600 font-medium">
                              {u.student_status === "withdrawn" ? "ลาออก" :
                               u.student_status === "dropped" ? "ตกออก" :
                               u.student_status === "graduated" ? "สำเร็จการศึกษา" :
                               u.student_status === "on_leave" ? "ลาพัก" :
                               u.student_status === "expelled" ? "คัดชื่อออก" :
                               u.student_status === "transferred" ? "โอนย้ายหลักสูตร" :
                               u.student_status === "deceased" ? "เสียชีวิต" :
                               u.student_status}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-gray-900 text-sm font-medium">
                            {u.modLinkHours ?? 0}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-gray-900 text-sm font-medium">
                            {u.systemHours ?? 0}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-orange-600 text-base font-semibold">
                            {u.totalHours ?? 0}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded border ${
                                u.scholarshipStatusDisplay === "ยังไม่สมัคร"
                                  ? "bg-gray-50 text-gray-600 border-gray-200"
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                              }`}
                            >
                              {u.scholarshipStatusDisplay || "ยังไม่สมัคร"}
                            </span>
                            <button
                              className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-orange-600 transition-colors duration-200"
                              title="แก้ไขสถานะทุน"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingUserId(u.username);
                                setSelectedScholarship(
                                  u.scholarshipStatusDisplay || "ยังไม่สมัคร"
                                );
                                setEditingUserInfo(u);
                                setShowModal(true);
                              }}
                            >
                              <Edit size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 transition-colors duration-200">
                            {expandedRows[u.userId] ? (
                              <ChevronUp size={14} className="text-gray-600" />
                            ) : (
                              <ChevronDown size={14} className="text-gray-500" />
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedRows[u.userId] && (
                        <tr className="bg-gray-50 border-t border-gray-300">
                          <td colSpan={6} className="p-4">
                            <div className="text-sm">
                              <h4 className="font-medium text-gray-800 mb-3">
                                รายละเอียดชั่วโมงในระบบ
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="text-center p-2 bg-white rounded border border-gray-200">
                                  <div className="text-xs text-gray-600 mb-1">e-Learning</div>
                                  <div className="text-base font-medium text-gray-900">{u.eLearningHours ?? 0}</div>
                                  <div className="text-xs text-gray-500">ชั่วโมง</div>
                                </div>
                                <div className="text-center p-2 bg-white rounded border border-gray-200">
                                  <div className="text-xs text-gray-600 mb-1">บริจาคเลือด</div>
                                  <div className="text-base font-medium text-gray-900">{u.bloodDonateHours ?? 0}</div>
                                  <div className="text-xs text-gray-500">ชั่วโมง</div>
                                </div>
                                <div className="text-center p-2 bg-white rounded border border-gray-200">
                                  <div className="text-xs text-gray-600 mb-1">กอช.</div>
                                  <div className="text-base font-medium text-gray-900">{u.nsfHours ?? 0}</div>
                                  <div className="text-xs text-gray-500">ชั่วโมง</div>
                                </div>
                                <div className="text-center p-2 bg-white rounded border border-gray-200">
                                  <div className="text-xs text-gray-600 mb-1">AOM YOUNG</div>
                                  <div className="text-base font-medium text-gray-900">{u.aomYoungHours ?? 0}</div>
                                  <div className="text-xs text-gray-500">ชั่วโมง</div>
                                </div>
                                <div className="text-center p-2 bg-white rounded border border-gray-200">
                                  <div className="text-xs text-gray-600 mb-1">ต้นไม้ล้านต้น</div>
                                  <div className="text-base font-medium text-gray-900">{u.treeHours ?? 0}</div>
                                  <div className="text-xs text-gray-500">ชั่วโมง</div>
                                </div>
                                <div className="text-center p-2 bg-white rounded border border-gray-200">
                                  <div className="text-xs text-gray-600 mb-1">ศาสนสถาน</div>
                                  <div className="text-base font-medium text-gray-900">{u.religiousHours ?? 0}</div>
                                  <div className="text-xs text-gray-500">ชั่วโมง</div>
                                </div>
                                <div className="text-center p-2 bg-white rounded border border-gray-200">
                                  <div className="text-xs text-gray-600 mb-1">พัฒนาชุมชน</div>
                                  <div className="text-base font-medium text-gray-900">{u.socialHours ?? 0}</div>
                                  <div className="text-xs text-gray-500">ชั่วโมง</div>
                                </div>
                                <div className="text-center p-2 bg-orange-100 rounded border border-orange-200">
                                  <div className="text-xs text-orange-700 mb-1">รวมในระบบ</div>
                                  <div className="text-base font-semibold text-orange-800">{u.systemHours ?? 0}</div>
                                  <div className="text-xs text-orange-600">ชั่วโมง</div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center p-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center mb-4">
                          <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">ไม่พบข้อมูล</h3>
                        <p className="text-gray-500">ไม่พบนักศึกษาที่ตรงกับเงื่อนไขที่เลือก</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* --- Pagination --- */}
          {totalItems > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                แสดง <span className="font-medium text-gray-900">{totalItems.toLocaleString()}</span> รายการ | หน้า <span className="font-medium text-gray-900">{page}</span> จาก <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                  disabled={page === 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={16} /> ก่อนหน้า
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                  disabled={page === totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ถัดไป <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
          {totalItems > 0 && totalPages <= 1 && (
            <div className="text-center text-sm text-gray-600 px-6 py-4 bg-gray-50 border-t border-gray-200">
              พบ <span className="font-medium text-gray-900">{totalItems.toLocaleString()}</span> รายการทั้งหมด
            </div>
          )}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-orange-500 text-white p-6">
              <h2 className="text-xl font-semibold">
                แก้ไขสถานะทุน
              </h2>
              <div className="text-orange-100 text-sm mt-2">
                {editingUserInfo?.name} ({editingUserInfo?.username})
              </div>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลือกประเภททุน:
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-colors duration-200 text-sm"
                value={selectedScholarship}
                onChange={(e) => setSelectedScholarship(e.target.value)}
              >
                <option>ยังไม่สมัคร</option>
                <option>ลักษณะที่ 1</option>
                <option>ลักษณะที่ 2</option>
                <option>ลักษณะที่ 3</option>
              </select>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded transition-colors duration-200"
                  onClick={() => setShowModal(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded shadow-sm transition-colors duration-200"
                  onClick={handleSaveScholarship}
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserStatsPage;
