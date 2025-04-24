// src/pages/admin/AdminUserStatsPage.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import apiClient from "../../api/axiosConfig";
import { Search, ChevronLeft, ChevronRight, Loader2, AlertCircle, Download } from "lucide-react";

// Debounce hook (สามารถย้ายไปไว้ในไฟล์ utils ได้)
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to clear the timeout if value changes before delay finishes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Only re-call effect if value or delay changes

  return debouncedValue;
}


function AdminUserStatsPage() {
  // --- State Variables ---
  const [statsData, setStatsData] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(50); // ตั้งค่า default limit

  // Filter State
  const [search, setSearch] = useState(""); // State สำหรับ Input ค้นหาทันที
  const debouncedSearch = useDebounce(search, 500); // ค่าค้นหาที่จะใช้เรียก API (หน่วง 500ms)

  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [selectedHourStatus, setSelectedHourStatus] = useState("all"); // 'all', 'completed', 'incomplete'
  const [selectedScholarshipStatus, setSelectedScholarshipStatus] = useState("all"); // 'all', 'applied', 'not_applied'
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(""); // ID ปีการศึกษา, "" = ล่าสุด/default
  const [selectedAcademicYearName, setSelectedAcademicYearName] = useState("กำลังโหลด..."); // ชื่อปีที่เลือก

  // Loading and Error State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ref to prevent initial effect run for debounced search
  const initialMount = useRef(true);

   // Effect to reset page when debounced search term changes
   useEffect(() => {
    // Don't reset page on the very first render when debouncedSearch initializes
    if (initialMount.current) {
        initialMount.current = false;
    } else {
        // console.log("Debounced search changed, resetting page:", debouncedSearch);
        setPage(1); // Reset page when the actual search term used for API call changes
    }
   }, [debouncedSearch]); // Depend only on the debounced value

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    // console.log(`Workspaceing data: page=${page}, year=${selectedAcademicYearId}, faculty=${selectedFaculty}, hour=${selectedHourStatus}, scholarship=${selectedScholarshipStatus}, search=${debouncedSearch}`);
    try {
    const params = {
      page,
      limit,
      // ถ้า selectedFaculty เป็น "all" จะส่ง undefined (ไม่ส่ง parameter นี้ไป)
      // ถ้าเลือกคณะอื่น จะส่งชื่อคณะนั้นๆ ไป
      faculty: selectedFaculty === "all" ? undefined : selectedFaculty,
      hourStatus: selectedHourStatus === "all" ? undefined : selectedHourStatus,
      scholarshipStatus:
        selectedScholarshipStatus === "all"
          ? undefined
          : selectedScholarshipStatus,
      // ถ้า selectedAcademicYearId เป็น "" (คือ "ปีล่าสุด") จะส่ง undefined
      // ถ้าเลือกปีอื่น จะส่ง ID ของปีนั้นๆ ไป
      academicYearId: selectedAcademicYearId || undefined,
      search: debouncedSearch || undefined,
    };

    // เรียก API พร้อม params ที่สร้างขึ้น
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

       // Update selected year name/ID based on response (handles default case correctly)
       if (res.data.filters?.selectedAcademicYear) {
         const currentSelectedYear = res.data.filters.selectedAcademicYear;
         setSelectedAcademicYearName(currentSelectedYear.name);
         // Only set the ID from the API if the user hasn't explicitly chosen one yet
         if (!selectedAcademicYearId) {
            setSelectedAcademicYearId(currentSelectedYear.id);
         }
       }

    } catch (err) {
      console.error("Error fetching user statistics:", err);
      const errorMsg = err.response?.data?.error || err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลสถิติ";
      setError(errorMsg);
      // Clear data on error to avoid showing stale data
      setStatsData([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
    // Dependencies for useCallback - should include all state values used inside
  }, [page, limit, selectedFaculty, selectedHourStatus, selectedScholarshipStatus, selectedAcademicYearId, debouncedSearch, academicYears.length, faculties.length]);

  // useEffect to trigger fetchData when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData is memoized by useCallback

  // --- Handlers ---
  // Generic handler for simple select changes
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1); // Reset page to 1 on any filter change
  };

  // Specific handler for academic year to update both ID and Name state
  const handleAcademicYearChange = (e) => {
    const newYearId = e.target.value;
    setSelectedAcademicYearId(newYearId);
    // Find the name corresponding to the selected ID
    const year = academicYears.find(ay => ay.id === newYearId);
    setSelectedAcademicYearName(year ? year.name : "ปีการศึกษาล่าสุด"); // Update display name
    setPage(1); // Reset page
  };

   // --- Export Handler ---
   const handleExport = () => {
    // console.log("Initiating export...");
    const params = new URLSearchParams();
    // Append ONLY filter parameters relevant to the export
    // (No pagination, no search for export as requested)
    if (selectedAcademicYearId) params.append('academicYearId', selectedAcademicYearId);
    if (selectedFaculty !== 'all') params.append('faculty', selectedFaculty);
    if (selectedHourStatus !== 'all') params.append('hourStatus', selectedHourStatus);
    if (selectedScholarshipStatus !== 'all') params.append('scholarshipStatus', selectedScholarshipStatus);

    // Construct the full URL to the export endpoint
    // Make sure baseURL is configured correctly in your axios instance
    // or replace with the actual API base URL string
    const apiBaseUrl = apiClient.defaults.baseURL || '/api'; // Provide a fallback base URL
    const exportUrl = `${apiBaseUrl}/admin/user-statistics/export?${params.toString()}`;

    // console.log("Export URL:", exportUrl);

    // Open the URL in a new tab/window to trigger the download
    window.open(exportUrl, '_blank');
    // Alternatively, for same-window download (might not work everywhere):
    // window.location.href = exportUrl;
  };


  // --- Render ---
  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen"> {/* Added background and min height */}
      {/* --- Header and Export Button --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ข้อมูลสถิตินักศึกษา</h1>
          <p className="text-sm text-gray-600">ปีการศึกษา: {selectedAcademicYearName}</p>
        </div>
        <button
            className="btn btn-success btn-sm text-white shadow hover:bg-green-700" // Added styling
            onClick={handleExport}
            disabled={isLoading || totalItems === 0} // Disable if loading or truly no items match filters
        >
           <Download size={16} className="mr-1"/> ดาวน์โหลด Excel
        </button>
      </div>


      {/* --- Filters --- */}
      <div className="p-4 bg-white rounded-lg shadow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
         {/* Search Input */}
         <div className="form-control w-full lg:col-span-1">
            <label className="label pt-0 pb-1"><span className="label-text text-xs font-medium text-gray-700">ค้นหา</span></label>
             <div className="relative">
                <input
                    type="text"
                    placeholder="ชื่อ, รหัสนักศึกษา..."
                    className="input input-bordered input-sm w-full pr-10 focus:ring-indigo-500 focus:border-indigo-500" // Added focus style
                    value={search}
                    onChange={(e) => setSearch(e.target.value)} // Updates 'search' state immediately
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                 <Search size={16} className="text-gray-400" />
                </span>
            </div>
         </div>

         {/* Academic Year Filter */}
         <div className="form-control w-full">
            <label className="label pt-0 pb-1"><span className="label-text text-xs font-medium text-gray-700">ปีการศึกษา</span></label>
            <select className="select select-bordered select-sm focus:ring-indigo-500 focus:border-indigo-500" value={selectedAcademicYearId} onChange={handleAcademicYearChange} disabled={isLoading || academicYears.length === 0} >
                <option value="">ปีล่าสุด</option>
                {academicYears.map((ay) => ( <option key={ay.id} value={ay.id}> {ay.name} </option> ))}
            </select>
         </div>

        {/* Faculty Filter */}
        <div className="form-control w-full">
            <label className="label pt-0 pb-1"><span className="label-text text-xs font-medium text-gray-700">คณะ</span></label>
            <select className="select select-bordered select-sm focus:ring-indigo-500 focus:border-indigo-500" value={selectedFaculty} onChange={handleFilterChange(setSelectedFaculty)} disabled={isLoading || faculties.length === 0} >
                <option value="all">ทุกคณะ</option>
                {faculties.map((f) => ( <option key={f} value={f}> {f} </option> ))}
            </select>
        </div>

        {/* Hour Status Filter */}
        <div className="form-control w-full">
            <label className="label pt-0 pb-1"><span className="label-text text-xs font-medium text-gray-700">สถานะชั่วโมง</span></label>
            <select className="select select-bordered select-sm focus:ring-indigo-500 focus:border-indigo-500" value={selectedHourStatus} onChange={handleFilterChange(setSelectedHourStatus)} disabled={isLoading} >
                <option value="all">ทุกสถานะ</option>
                <option value="completed">ครบ 36 ชม.</option>
                <option value="incomplete">ยังไม่ครบ</option>
            </select>
        </div>

        {/* Scholarship Status Filter */}
        <div className="form-control w-full">
             <label className="label pt-0 pb-1"><span className="label-text text-xs font-medium text-gray-700">สถานะทุน</span></label>
            <select className="select select-bordered select-sm focus:ring-indigo-500 focus:border-indigo-500" value={selectedScholarshipStatus} onChange={handleFilterChange(setSelectedScholarshipStatus)} disabled={isLoading} >
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
         <div role="alert" className="alert alert-error text-white my-4 shadow-md"> {/* Added shadow */}
           <AlertCircle size={20} /> {/* Slightly larger icon */}
           <span className="font-semibold">เกิดข้อผิดพลาด:</span>
           <span className="ml-2">{error}</span>
         </div>
      )}

      {/* --- Table --- */}
      {/* Only render table and pagination when not loading and no error */}
      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow"> {/* Added container */}
          <div className="overflow-x-auto">
            <table className="table w-full text-sm"> {/* Removed table-zebra for cleaner look maybe? */}
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs"> {/* Adjusted header style */}
                <tr>
                  <th className="p-3 text-left">นักศึกษา</th> {/* Align left */}
                  <th className="p-3 text-center">MODLINK</th>
                  <th className="p-3 text-center">e-Learning</th>
                  <th className="p-3 text-center">บริจาคเลือด</th>
                  <th className="p-3 text-center">กอช.</th>
                  <th className="p-3 text-center">AOM YOUNG</th>
                  <th className="p-3 text-center">อื่นๆ (ชม.)</th>
                  <th className="p-3 text-center font-bold">รวม (ชม.)</th>
                  <th className="p-3 text-center">สถานะทุน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200"> {/* Added divider */}
                {statsData.length > 0 ? (
                  statsData.map((u) => (
                    <tr key={u.userId} className="hover:bg-gray-50">
                      {/* Merged Column */}
                      <td className="p-3 align-top">
                        <div className="font-medium text-gray-900">{u.name}</div> {/* Changed text color */}
                        <div className="text-xs text-gray-500">{u.username}</div>
                        <div className="text-xs text-gray-500">{u.faculty || "-"}</div>
                        <div className="text-xs text-gray-500">{u.major || "-"}</div>
                      </td>
                      {/* Hour and Status Columns */}
                      <td className="p-3 text-center tabular-nums">{u.modLinkHours ?? 0}</td> {/* Use tabular-nums for number alignment */}
                      <td className="p-3 text-center tabular-nums">{u.eLearningHours ?? 0}</td>
                      <td className="p-3 text-center tabular-nums">{u.bloodDonateHours ?? 0}</td>
                      <td className="p-3 text-center tabular-nums">{u.nsfHours ?? 0}</td>
                      <td className="p-3 text-center tabular-nums">{u.aomYoungHours ?? 0}</td>
                      <td className="p-3 text-center tabular-nums">{u.otherHours ?? 0}</td>
                      <td className="p-3 text-center tabular-nums font-semibold text-gray-800">{u.totalHours ?? 0}</td> {/* Made total bold */}
                      <td className="p-3 text-center">
                        {u.scholarshipApplied ? (
                           <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">สมัครแล้ว</span>
                        ) : (
                           <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600">ยังไม่สมัคร</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center p-10 text-gray-500">
                      ไม่พบข้อมูลนักศึกษาที่ตรงกับเงื่อนไขการค้นหาและตัวกรอง
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* --- Pagination --- */}
          {/* Only show pagination if there are items and more than one page */}
          {totalItems > 0 && totalPages > 1 && (
             <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 py-3 border-t border-gray-200 text-sm"> {/* Added padding and border */}
                <div className="text-gray-600">
                    หน้า {page} / {totalPages} (พบ {totalItems.toLocaleString()} รายการ) {/* Added number formatting */}
                </div>
                <div className="join">
                    <button className="join-item btn btn-sm btn-outline disabled:opacity-50" disabled={page === 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))} > {/* Improved disabled style */}
                        <ChevronLeft size={16} /> ก่อนหน้า
                    </button>
                    {/* Optional: Page number input or list */}
                    <button className="join-item btn btn-sm btn-outline disabled:opacity-50" disabled={page === totalPages || isLoading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} >
                        ถัดไป <ChevronRight size={16} />
                    </button>
                </div>
            </div>
          )}
          {/* Show item count even if only one page */}
           {totalItems > 0 && totalPages <= 1 && (
             <div className="text-center text-sm text-gray-600 px-4 py-3 border-t border-gray-200">
                พบ {totalItems.toLocaleString()} รายการ
             </div>
           )}
        </div> // End of table container
      )} {/* End of !isLoading && !error block */}
    </div> // End of main container div
  );
}

export default AdminUserStatsPage;