// 📁 src/pages/ApprovalHistoryPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../../api/axiosConfig";
import { 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  X,
  Download
} from "lucide-react";
import toast from "react-hot-toast";

function ApprovalHistoryPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [sortOption, setSortOption] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [academicYears, setAcademicYears] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRows, setExpandedRows] = useState({});
  const [previewFiles, setPreviewFiles] = useState([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [isPreviewDrawerOpen, setIsPreviewDrawerOpen] = useState(false);

  const categories = [
    { value: "ALL", label: "ทั้งหมด" },
    { value: "Certificate", label: "เรียนออนไลน์/e-Learning" },
    { value: "BloodDonate", label: "บริจาคเลือด" },
    { value: "NSF", label: "ออมเงิน" },
    { value: "AOM YOUNG", label: "AOM YOUNG" },
    { value: "ต้นไม้ล้านต้น ล้านความดี", label: "ต้นไม้ล้านต้น ล้านความดี" },
    { value: "religious", label: "พัฒนาศาสนสถาน" },
    { value: "social-development", label: "พัฒนาชุมชน" },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setIsPreviewDrawerOpen(false);
    try {
      const res = await apiClient.get("/submission/history", {
        params: {
          category: filter,
          page: currentPage,
          pageSize: 20,
          searchQuery,
          sortOption,
          status: statusFilter,
          academicYear: academicYearFilter,
        },
      });
      setSubmissions(res.data.submissions || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error(
        "ไม่สามารถโหลดข้อมูลได้: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setLoading(false);
    }
  }, [filter, currentPage, searchQuery, sortOption, statusFilter, academicYearFilter]);

  const downloadExcel = async () => {
    try {
      const response = await apiClient.get("/submission/history/export", {
        params: {
          category: filter,
          searchQuery,
          sortOption,
          status: statusFilter,
          academicYear: academicYearFilter,
        },
        responseType: 'blob',
      });

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ประวัติการอนุมัติ_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('ดาวน์โหลดไฟล์ Excel สำเร็จ');
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์');
    }
  };

  const fetchAcademicYears = useCallback(async () => {
    try {
      const res = await apiClient.get("/admin/academic-years");
      const years = res.data || [];
      setAcademicYears(years);
      // Set default to latest year (first in the list since it's ordered by year_name desc)
      if (years.length > 0 && !academicYearFilter) {
        setAcademicYearFilter(years[0].academic_year_id.toString());
      }
    } catch (err) {
      console.error("Failed to fetch academic years:", err);
    }
  }, [academicYearFilter]);

  // Reset currentPage when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, statusFilter, academicYearFilter, searchQuery]);

  useEffect(() => {
    document.title = "ประวัติการอนุมัติ | Volunteer Student Loan e-Filling";
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    // Only fetch data if academicYearFilter has been set
    if (academicYearFilter) {
      fetchData();
    }
  }, [fetchData, academicYearFilter]);

  const toggleRowExpansion = (submissionId) => {
    setExpandedRows(prev => ({
      ...prev,
      [submissionId]: !prev[submissionId]
    }));
  };

  // Preview Drawer functions
  const openPreviewDrawer = (files) => {
    if (!files || files.length === 0) return;
    setPreviewFiles(files.map((f) => f.file_path));
    setCurrentPreviewIndex(0);
    setIsPreviewDrawerOpen(true);
  };

  const closePreviewDrawer = () => {
    setIsPreviewDrawerOpen(false);
  };

  const renderPreviewDrawer = () => {
    if (!isPreviewDrawerOpen || !previewFiles.length) return null;
    const currentFile = previewFiles[currentPreviewIndex];
    const fileSrc = `${import.meta.env.VITE_FILE_BASE_URL}${currentFile}`;
    const isImage = currentFile.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = currentFile.match(/\.pdf$/i);

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={closePreviewDrawer}
      >
        <div
          className={`fixed top-0 right-0 h-full w-full md:w-[40%] lg:w-[35%] bg-white shadow-lg z-51 transform transition-transform duration-300 ease-in-out ${
            isPreviewDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-xs btn-outline"
                  onClick={() =>
                    setCurrentPreviewIndex((i) => (i > 0 ? i - 1 : i))
                  }
                  disabled={currentPreviewIndex === 0}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm">
                  {currentPreviewIndex + 1} / {previewFiles.length}
                </span>
                <button
                  className="btn btn-xs btn-outline"
                  onClick={() =>
                    setCurrentPreviewIndex((i) =>
                      i < previewFiles.length - 1 ? i + 1 : i
                    )
                  }
                  disabled={currentPreviewIndex === previewFiles.length - 1}
                >
                  <ChevronRight size={16} />
                </button>
                <a
                  href={fileSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-xs btn-outline"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <button
                className="btn btn-xs btn-ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  closePreviewDrawer();
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 p-4 bg-gray-100 overflow-auto">
              {isImage ? (
                <img
                  src={fileSrc}
                  alt="Preview"
                  className="w-full h-auto max-h-full object-contain"
                />
              ) : isPdf ? (
                <iframe
                  src={fileSrc}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <p className="mb-4">ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้</p>
                  <a
                    href={fileSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    เปิดในแท็บใหม่
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const shouldShowTopic = !["BloodDonate", "NSF", "AOM YOUNG"].includes(filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow border border-blue-100">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  ประวัติการอนุมัติคำขอ
                </h1>
                <p className="text-blue-100 mt-1 text-sm">ตรวจสอบประวัติการอนุมัติและปฏิเสธคำขอทั้งหมด</p>
              </div>
              <button
                onClick={downloadExcel}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลด Excel
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
                  <Search className="w-3 h-3" />
                  ค้นหา
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ชื่อ, รหัสนักศึกษา, สาขา..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
                  <Filter className="w-3 h-3" />
                  ประเภท
                </label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setSearchQuery("");
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">สถานะ</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                  }}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="rejected">ปฏิเสธแล้ว</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">ปีการศึกษา</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={academicYearFilter}
                  onChange={(e) => {
                    setAcademicYearFilter(e.target.value);
                  }}
                >
                  {academicYears.map((year) => (
                    <option key={year.academic_year_id} value={year.academic_year_id}>
                      {year.year_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">เรียงลำดับ</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value);
                  }}
                >
                  <option value="latest">ล่าสุดก่อน</option>
                  <option value="oldest">เก่าสุดก่อน</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700 text-sm">ชื่อ</th>
                  <th className="text-left p-3 font-medium text-gray-700 text-sm">ประเภท</th>
                  {shouldShowTopic && <th className="text-left p-3 font-medium text-gray-700 text-sm">หัวข้อ</th>}
                  <th className="text-left p-3 font-medium text-gray-700 text-sm">ชั่วโมง</th>
                  <th className="text-left p-3 font-medium text-gray-700 text-sm">วันที่ยื่น</th>
                  <th className="text-left p-3 font-medium text-gray-700 text-sm">วันที่พิจารณา</th>
                  <th className="text-left p-3 font-medium text-gray-700 text-sm">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-gray-100 animate-pulse">
                      <td colSpan="7" className="p-3">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-6 text-gray-500">
                      <div className="flex flex-col items-center space-y-2">
                        <Search className="w-8 h-8 text-gray-300" />
                        <div>
                          <div className="font-medium">ไม่พบข้อมูล</div>
                          <div className="text-sm">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  submissions.map((s) => (
                    <React.Fragment key={s.submission_id}>
                      <tr 
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 cursor-pointer`}
                        onClick={() => toggleRowExpansion(s.submission_id)}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <ChevronDown 
                              className={`w-3 h-3 transition-transform text-gray-400 ${
                                expandedRows[s.submission_id] ? 'rotate-180' : ''
                              }`} 
                            />
                            <div>
                              <button
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchQuery(s.users?.username || "");
                                }}
                              >
                                {s.users?.name || "-"}
                              </button>
                              <div className="text-xs text-gray-500 mt-1">
                                <div>{s.users?.username || "-"}</div>
                                <div>{s.users?.faculty || "-"}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          {s.type === "Certificate"
                            ? s.certificate_type?.category || "-"
                            : s.type}
                        </td>
                        {shouldShowTopic && (
                          <td className="p-3 max-w-xs text-sm">
                            <div className="truncate" title={s.certificate_type?.certificate_name || s.topic || "-"}>
                              {s.certificate_type?.certificate_name || s.topic || "-"}
                            </div>
                          </td>
                        )}
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {s.hours || s.hours_requested || "-"}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap text-sm">
                          {s.created_at
                            ? new Date(s.created_at).toLocaleDateString("th-TH", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>
                        <td className="p-3 whitespace-nowrap text-sm">
                          {s.status_logs?.[0]?.changed_at
                            ? new Date(s.status_logs[0].changed_at).toLocaleDateString("th-TH", {
                                day: "numeric",
                                month: "short", 
                                year: "numeric",
                              })
                            : "-"}
                        </td>
                        <td className="p-3">
                          {s.status === "approved" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              อนุมัติแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <XCircle className="w-3 h-3" />
                              ปฏิเสธแล้ว
                            </span>
                          )}
                        </td>
                      </tr>
                      {expandedRows[s.submission_id] && (
                        <tr>
                          <td colSpan={shouldShowTopic ? "7" : "6"} className="p-0 bg-gradient-to-r from-gray-50 to-blue-50">
                            <div className="mx-3 my-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2">
                                <h3 className="font-medium text-sm flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  รายละเอียดการพิจารณา
                                </h3>
                              </div>
                              
                              <div className="p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                  {/* Card 1: Approved By */}
                                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-blue-800 text-sm">ผู้พิจารณา</h4>
                                      </div>
                                    </div>
                                    <p className="text-blue-900 font-medium text-sm">
                                      {s.status_logs?.[0]?.changed_by_user?.name || "ระบบอัตโนมัติ"}
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                      {s.status_logs?.[0]?.changed_at ? 
                                        new Date(s.status_logs[0].changed_at).toLocaleDateString("th-TH", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit"
                                        }) : "-"
                                      }
                                    </p>
                                  </div>

                                  {/* Card 2: Files */}
                                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                                        <Eye className="w-3 h-3 text-white" />
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-orange-800 text-sm">ไฟล์แนบ</h4>
                                      </div>
                                    </div>
                                    <div>
                                      {s.submission_files?.length > 0 ? (
                                        <button
                                          className="w-full bg-white hover:bg-orange-50 border border-orange-300 text-orange-700 font-medium py-1.5 px-3 rounded-md transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openPreviewDrawer(s.submission_files);
                                          }}
                                          title={`ดูไฟล์ (${s.submission_files.length})`}
                                        >
                                          <Eye size={14} />
                                          <span>ดูไฟล์ ({s.submission_files.length})</span>
                                        </button>
                                      ) : (
                                        <div className="text-center py-1">
                                          <span className="text-orange-600 text-sm">ไม่มีไฟล์</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Card 3: Status/Reason */}
                                  {s.status === 'rejected' ? (
                                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                          <XCircle className="w-3 h-3 text-white" />
                                        </div>
                                        <div>
                                          <h4 className="font-medium text-red-800 text-sm">เหตุผลการปฏิเสธ</h4>
                                        </div>
                                      </div>
                                      <div className="bg-white rounded-md p-2 border border-red-200">
                                        <p className="text-red-800 text-sm leading-relaxed">
                                          {s.status_logs?.[0]?.reason || "ไม่ระบุเหตุผล"}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                          <CheckCircle className="w-3 h-3 text-white" />
                                        </div>
                                        <div>
                                          <h4 className="font-medium text-green-800 text-sm">สถานะการอนุมัติ</h4>
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <span className="inline-flex items-center gap-1 bg-green-500 text-white font-medium px-3 py-1 rounded-md text-sm">
                                          <CheckCircle className="w-3 h-3" />
                                          อนุมัติแล้ว
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Additional Info Row */}
                                <div className="mt-3 pt-2 border-t border-gray-200">
                                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>ยื่นเมื่อ: {s.created_at ? 
                                        new Date(s.created_at).toLocaleDateString("th-TH", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric"
                                        }) : "-"
                                      }</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span>ID: {s.submission_id}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {submissions.length > 0 && totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 py-4">
            <button
              className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3 h-3" />
              ก่อนหน้า
            </button>
            
            <span className="text-gray-600 bg-white px-3 py-2 rounded-md border border-gray-200 text-sm">
              หน้า {currentPage} / {totalPages}
            </span>
            
            <button
              className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              ถัดไป
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      {/* Preview Drawer */}
      {isPreviewDrawerOpen && renderPreviewDrawer()}

    </div>
  );
}

export default ApprovalHistoryPage;