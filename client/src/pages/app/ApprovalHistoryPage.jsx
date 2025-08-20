// 📁 src/pages/ApprovalHistoryPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import apiClient from "../../api/axiosConfig";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

function ApprovalHistoryPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Certificate");
  const [sortOption, setSortOption] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openFiles, setOpenFiles] = useState(null);

  const categories = [
    "Certificate",
    "BloodDonate",
    "NSF",
    "AOM YOUNG",
    "Others",
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/submission/history", {
        params: {
          category: filter,
          page: currentPage,
          pageSize: 20,
          searchQuery,
          sortOption,
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
  }, [filter, currentPage, searchQuery, sortOption]);

  useEffect(() => {
    document.title = "ประวัติการอนุมัติ | Volunteer Student Loan e-Filling";
    fetchData();
  }, [fetchData]);

  const renderSkeletonRows = () =>
    Array.from({ length: 10 }).map((_, idx) => (
      <tr key={idx} className="animate-pulse">
        <td colSpan={10} className="p-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </td>
      </tr>
    ));

  const shouldShowTopic = !["BloodDonate", "NSF", "AOM YOUNG"].includes(filter);

  return (
    <div className="flex h-screen relative overflow-hidden">
      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto overflow-x-hidden">
        <h1 className="text-2xl font-bold">ประวัติการอนุมัติคำขอ</h1>

        {/* Filter UI */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center flex-wrap gap-3 md:gap-4 mb-4 p-4 bg-base-200 rounded-lg">
          <input
            type="text"
            className="input input-bordered input-sm w-full sm:w-auto flex-grow"
            placeholder="ค้นหา..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <select
            className="select select-sm select-bordered w-full sm:w-auto"
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="latest">ใหม่สุดก่อน</option>
            <option value="oldest">เก่าสุดก่อน</option>
          </select>
          <div className="tabs tabs-boxed bg-base-100 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`tab tab-sm sm:tab-md ${
                  filter === cat ? "tab-active !bg-green-600 text-white" : ""
                }`}
                onClick={() => {
                  setFilter(cat);
                  setCurrentPage(1);
                  setSearchQuery("");
                }}
              >
                {cat === "Certificate"
                  ? "เรียนออนไลน์"
                  : cat === "BloodDonate"
                  ? "บริจาคเลือด"
                  : cat === "NSF"
                  ? "ออมเงิน"
                  : cat === "AOM YOUNG"
                  ? "AOM YOUNG"
                  : "อื่นๆ"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="table table-zebra w-full text-sm">
            <thead className="bg-base-300">
              <tr>
                <th className="w-[12%]">ชื่อ</th>
                <th className="w-[8%]">ประเภท</th>
                {shouldShowTopic && <th className="w-[14%]">หัวข้อ</th>}
                <th className="w-[8%]">ปี</th>
                <th className="w-[10%] whitespace-nowrap">วันที่ยื่น</th>
                <th className="w-[10%] whitespace-nowrap">
                  วันที่อนุมัติ/ปฏิเสธ
                </th>
                <th className="w-[10%] whitespace-nowrap">สถานะ</th>
                <th className="w-[12%]">โดย</th>
                <th className="w-[18%]">เหตุผล</th>
                <th className="w-[8%]">ไฟล์</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                renderSkeletonRows()
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-5 text-gray-500">
                    ไม่พบข้อมูลที่ตรงเงื่อนไข
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.submission_id}>
                    <td>
                      {" "}
                      <button
                        className="font-medium text-blue-600 hover:underline"
                        onClick={() => {
                          setSearchQuery(s.users?.username || "");
                          setCurrentPage(1);
                        }}
                      >
                        {s.users?.name || "-"}
                      </button>
                      <div className="text-xs text-gray-500 leading-tight">
                        <div>{s.users?.username || "-"}</div>
                        <div>{s.users?.faculty || "-"}</div>
                      </div>
                    </td>
                    <td>
                      {s.type === "Certificate"
                        ? s.certificate_type?.category || "-"
                        : s.type}
                    </td>
                    {shouldShowTopic && (
                      <td>
                        {s.certificate_type?.certificate_name || s.topic || "-"}
                      </td>
                    )}
                    <td>{s.academic_years?.year_name || "-"}</td>
                    <td className="whitespace-nowrap">
                      {s.created_at
                        ? new Date(s.created_at).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap">
                      {s.status_logs?.[0]?.changed_at
                        ? new Date(
                            s.status_logs[0].changed_at
                          ).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="whitespace-nowrap">
                      {s.status === "approved" ? (
                        <span className="text-green-600 font-medium">
                          อนุมัติแล้ว
                        </span>
                      ) : (
                        <span className="text-red-500 font-medium">
                          ปฏิเสธแล้ว
                        </span>
                      )}
                    </td>
                    <td>{s.status_logs?.[0]?.changed_by_user?.name || "-"}</td>
                    <td>{s.status_logs?.[0]?.reason || "-"}</td>
                    <td>
                      {s.submission_files?.length > 0 ? (
                        <button
                          className="btn btn-xs btn-outline px-2"
                          onClick={() => setOpenFiles(s.submission_files)}
                          title={`ดูไฟล์ (${s.submission_files.length})`}
                        >
                          <Eye size={14} /> ({s.submission_files.length})
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-3 my-4">
          <button
            className="btn btn-sm btn-outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft size={16} /> ก่อนหน้า
          </button>
          <span className="text-sm">
            หน้า {currentPage} / {totalPages}
          </span>
          <button
            className="btn btn-sm btn-outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            ถัดไป <ChevronRight size={16} />
          </button>
        </div>
      </div>
      {/* Modal for attached files */}
      {openFiles && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-orange-600 flex items-center gap-2">
                <Eye size={20} /> รายการไฟล์แนบ
              </h3>
              <button
                className="btn btn-sm btn-ghost text-error"
                onClick={() => setOpenFiles(null)}
              >
                ✕
              </button>
            </div>
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {openFiles.map((file) => {
                const fileName = file.file_path.split("/").pop();
                return (
                  <li
                    key={file.id}
                    className="bg-base-200 rounded px-3 py-2 hover:bg-base-300 transition"
                  >
                    <a
                      href={`${import.meta.env.VITE_FILE_BASE_URL}${
                        file.file_path
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-medium hover:underline break-all"
                    >
                      🔗 {fileName}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default ApprovalHistoryPage;