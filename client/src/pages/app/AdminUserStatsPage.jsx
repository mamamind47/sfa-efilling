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
  const [limit, setLimit] = useState(50);
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

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* --- Header and Export Button --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            ข้อมูลสถิตินักศึกษา
          </h1>
          <p className="text-sm text-gray-600">
            ปีการศึกษา: {selectedAcademicYearName}
          </p>
        </div>
        {/* Updated Export Button */}
        <button
          className={`btn btn-success btn-sm text-white shadow hover:bg-green-700 ${
            isExporting ? "loading" : ""
          }`} // Use loading class
          onClick={handleExport}
          disabled={isLoading || totalItems === 0 || isExporting} // Disable while loading, no items, or exporting
        >
          {isExporting ? (
            <Loader2 size={16} className="animate-spin mr-1" />
          ) : (
            <Download size={16} className="mr-1" />
          )}
          {isExporting ? "กำลังดาวน์โหลด..." : "ดาวน์โหลด Excel"}
        </button>
      </div>

      {/* --- Filters --- */}
      <div className="p-4 bg-white rounded-lg shadow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        {/* Search Input */}
        <div className="form-control w-full lg:col-span-1">
          <label className="label pt-0 pb-1">
            <span className="label-text text-xs font-medium text-gray-700">
              ค้นหา
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="ชื่อ, รหัสนักศึกษา..."
              className="input input-bordered input-sm w-full pr-10 focus:ring-indigo-500 focus:border-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {" "}
              <Search size={16} className="text-gray-400" />{" "}
            </span>
          </div>
        </div>
        {/* Academic Year Filter */}
        <div className="form-control w-full">
          <label className="label pt-0 pb-1">
            <span className="label-text text-xs font-medium text-gray-700">
              ปีการศึกษา
            </span>
          </label>
          <select
            className="select select-bordered select-sm focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedAcademicYearId}
            onChange={handleAcademicYearChange}
            disabled={isLoading || academicYears.length === 0}
          >
            <option value="">ปีล่าสุด</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {" "}
                {ay.name}{" "}
              </option>
            ))}
          </select>
        </div>
        {/* Faculty Filter */}
        <div className="form-control w-full">
          <label className="label pt-0 pb-1">
            <span className="label-text text-xs font-medium text-gray-700">
              คณะ
            </span>
          </label>
          <select
            className="select select-bordered select-sm focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedFaculty}
            onChange={handleFilterChange(setSelectedFaculty)}
            disabled={isLoading || faculties.length === 0}
          >
            <option value="all">ทุกคณะ</option>
            {faculties.map((f) => (
              <option key={f} value={f}>
                {" "}
                {f}{" "}
              </option>
            ))}
          </select>
        </div>
        {/* Hour Status Filter */}
        <div className="form-control w-full">
          <label className="label pt-0 pb-1">
            <span className="label-text text-xs font-medium text-gray-700">
              สถานะชั่วโมง
            </span>
          </label>
          <select
            className="select select-bordered select-sm focus:ring-indigo-500 focus:border-indigo-500"
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
          <label className="label pt-0 pb-1">
            <span className="label-text text-xs font-medium text-gray-700">
              สถานะทุน
            </span>
          </label>
          <select
            className="select select-bordered select-sm focus:ring-indigo-500 focus:border-indigo-500"
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
        <div className="text-center py-10">
          <Loader2 className="animate-spin inline-block w-8 h-8 text-blue-500" />
          <p className="text-gray-500 mt-2">กำลังโหลดข้อมูล...</p>
        </div>
      )}
      {error && !isLoading && (
        <div
          role="alert"
          className="alert alert-error text-white my-4 shadow-md"
        >
          <AlertCircle size={20} />
          <span className="font-semibold">เกิดข้อผิดพลาด:</span>
          <span className="ml-2">{error}</span>
        </div>
      )}

      {/* --- Table --- */}
      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="p-3 text-left">นักศึกษา</th>
                  <th className="p-3 text-center">MODLINK</th>
                  <th className="p-3 text-center">e-Learning</th>
                  <th className="p-3 text-center">บริจาคเลือด</th>
                  <th className="p-3 text-center">กอช.</th>
                  <th className="p-3 text-center">AOM YOUNG</th>
                  <th className="p-3 text-center">อื่นๆ (ชม.)</th>
                  <th className="p-3 text-center font-bold">รวม (ชม.)</th>
                  <th className="p-3 text-center">สถานะทุน/ประเภท</th>{" "}
                  {/* Changed Header */}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {statsData.length > 0 ? (
                  statsData.map((u) => (
                    <tr key={u.userId} className="hover:bg-gray-50">
                      <td className="p-3 align-top">
                        <div className="font-medium text-gray-900">
                          {u.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {u.username}
                        </div>
                        <div className="text-xs text-gray-500">
                          {u.faculty || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {u.major || "-"}
                        </div>
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        {u.modLinkHours ?? 0}
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        {u.eLearningHours ?? 0}
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        {u.bloodDonateHours ?? 0}
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        {u.nsfHours ?? 0}
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        {u.aomYoungHours ?? 0}
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        {u.otherHours ?? 0}
                      </td>
                      <td className="p-3 text-center tabular-nums font-semibold text-gray-800">
                        {u.totalHours ?? 0}
                      </td>
                      {/* ***** CORRECTED SCHOLARSHIP DISPLAY ***** */}
                      <td className="p-3 text-center">
                        {u.scholarshipStatusDisplay === "ยังไม่สมัคร" ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600">
                            {u.scholarshipStatusDisplay}
                          </span>
                        ) : (
                          // If it's not "ยังไม่สมัคร", display the type with a different style
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {u.scholarshipStatusDisplay}{" "}
                            {/* Display the actual type */}
                          </span>
                        )}
                      </td>
                      {/* ***** END CORRECTION ***** */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    {" "}
                    <td colSpan={9} className="text-center p-10 text-gray-500">
                      {" "}
                      ไม่พบข้อมูลนักศึกษาที่ตรงกับเงื่อนไขการค้นหาและตัวกรอง{" "}
                    </td>{" "}
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* --- Pagination --- */}
          {totalItems > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 py-3 border-t border-gray-200 text-sm">
              <div className="text-gray-600">
                {" "}
                หน้า {page} / {totalPages} (พบ {totalItems.toLocaleString()}{" "}
                รายการ){" "}
              </div>
              <div className="join">
                <button
                  className="join-item btn btn-sm btn-outline disabled:opacity-50"
                  disabled={page === 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {" "}
                  <ChevronLeft size={16} /> ก่อนหน้า{" "}
                </button>
                <button
                  className="join-item btn btn-sm btn-outline disabled:opacity-50"
                  disabled={page === totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {" "}
                  ถัดไป <ChevronRight size={16} />{" "}
                </button>
              </div>
            </div>
          )}
          {totalItems > 0 && totalPages <= 1 && (
            <div className="text-center text-sm text-gray-600 px-4 py-3 border-t border-gray-200">
              {" "}
              พบ {totalItems.toLocaleString()} รายการ{" "}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminUserStatsPage;
