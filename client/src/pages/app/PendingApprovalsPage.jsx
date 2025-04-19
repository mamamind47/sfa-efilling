import React, { useEffect, useState } from "react";
import apiClient from "../../api/axiosConfig";
import {
  Eye,
  CheckCircle2,
  XCircle,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function PendingApprovalsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState("Certificate");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories = [
    "Certificate",
    "BloodDonate",
    "NSF",
    "AOM YOUNG",
    "Others",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get("/submission/pending", {
          params: { category: filter, page: currentPage },
        });
        setSubmissions(res.data.submissions || []);
        setTotalPages(res.data.totalPages || 1);
      } catch (err) {
        console.error("โหลดข้อมูลล้มเหลว", err);
      }
    };
    fetchData();
  }, [filter, currentPage]);

  const filtered = Array.isArray(submissions)
    ? submissions
        .filter((s) => {
          const q = searchQuery.toLowerCase();
          return (
            s.users?.name?.toLowerCase().includes(q) ||
            s.users?.username?.toLowerCase().includes(q) ||
            s.users?.major?.toLowerCase().includes(q) ||
            s.certificate_type?.certificate_name?.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => {
          if (sortOption === "latest") {
            return new Date(b.created_at) - new Date(a.created_at);
          } else if (sortOption === "oldest") {
            return new Date(a.created_at) - new Date(b.created_at);
          } else if (sortOption === "type") {
            return a.type.localeCompare(b.type);
          } else if (sortOption === "user") {
            return a.users?.name.localeCompare(b.users?.name);
          }
          return 0;
        })
    : [];

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleReview = async (status, reason) => {
    setLoading(true);
    try {
      await apiClient.post("/submission/batch-review", {
        ids: selectedIds,
        status,
        rejection_reason: reason,
      });
      setSubmissions((prev) =>
        prev.filter((s) => !selectedIds.includes(s.submission_id))
      );
      setSelectedIds([]);
      setShowRejectPopup(false);
      setRejectionReason("");
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setLoading(false);
    }
  };

  const renderPreviewPanel = () => {
    if (!previewFiles.length || window.innerWidth < 768) return null;
    const currentFile = previewFiles[currentPreviewIndex];
    const fileSrc = `${import.meta.env.VITE_FILE_BASE_URL}${currentFile}`;
    const isImage = currentFile.match(/\.(jpg|jpeg|png|gif)$/i);
    const isPdf = currentFile.match(/\.pdf$/i);

    return (
      <div className="w-[30%] h-screen border-l bg-white shadow-lg z-40 flex flex-col fixed right-0 top-0">
        <div className="flex justify-between items-center p-4 border-b">
          <a
            href={fileSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            title="เปิดในแท็บใหม่"
          >
            <ExternalLink size={18} />
          </a>
          <div className="flex gap-2 items-center">
            <button
              className="btn btn-xs"
              onClick={() => setCurrentPreviewIndex((i) => (i > 0 ? i - 1 : i))}
              disabled={currentPreviewIndex === 0}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="btn btn-xs"
              onClick={() =>
                setCurrentPreviewIndex((i) =>
                  i < previewFiles.length - 1 ? i + 1 : i
                )
              }
              disabled={currentPreviewIndex === previewFiles.length - 1}
            >
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setPreviewFiles([])}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {isImage ? (
            <img src={fileSrc} alt="preview" className="w-full rounded" />
          ) : isPdf ? (
            <iframe
              src={fileSrc}
              title="PDF preview"
              className="w-full h-[80vh] border"
            ></iframe>
          ) : (
            <p className="text-gray-500">ไม่สามารถแสดงไฟล์นี้ได้</p>
          )}
        </div>
      </div>
    );
  };

  const renderRejectPopup = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-lg font-semibold mb-4">ระบุเหตุผลในการปฏิเสธ</h2>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="เหตุผล..."
        ></textarea>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="btn btn-ghost"
            onClick={() => setShowRejectPopup(false)}
          >
            ยกเลิก
          </button>
          <button
            className="btn bg-red-500 hover:bg-red-600 text-white"
            onClick={() => handleReview("rejected", rejectionReason)}
            disabled={!rejectionReason.trim() || loading}
          >
            ยืนยันการปฏิเสธ
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen">
      <div
        className={`flex-1 p-6 space-y-6 overflow-y-auto overflow-x-hidden ${
          previewFiles.length && window.innerWidth >= 768 ? "pr-[30%]" : ""
        }`}
      >
        <h1 className="text-2xl font-bold">รายการคำขอที่รออนุมัติ</h1>

        <div className="flex items-center flex-wrap gap-4">
          <input
            type="text"
            className="input input-bordered input-sm focus:outline-none focus:ring-0 focus:border-gray-300"
            placeholder="ค้นหา ชื่อ รหัส สาขา หัวข้อ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="select select-sm select-bordered focus:outline-none focus:ring-0 focus:border-gray-300"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="latest">ลำดับใหม่ก่อน</option>
            <option value="oldest">ลำดับเก่าก่อน</option>
            <option value="type">ประเภท</option>
            <option value="user">ผู้ส่ง</option>
          </select>

          <div className="tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`tab tab-bordered ${
                  filter === cat ? "tab-active text-orange-500" : ""
                }`}
                onClick={() => {
                  setFilter(cat);
                  setCurrentPage(1);
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

        {selectedIds.length > 0 && (
          <div className="flex gap-3">
            <button
              className="btn btn-sm bg-green-500 text-white"
              onClick={() => handleReview("approved")}
              disabled={loading}
            >
              <CheckCircle2 size={16} className="mr-1" /> อนุมัติรายการที่เลือก
            </button>
            <button
              className="btn btn-sm bg-red-500 text-white"
              onClick={() => setShowRejectPopup(true)}
              disabled={loading}
            >
              <XCircle size={16} className="mr-1" /> ปฏิเสธรายการที่เลือก
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th></th>
                <th className="w-[200px]">ชื่อ</th>
                <th>ประเภท</th>
                <th className="max-w-[120px] truncate">หัวข้อ</th>
                <th>ชั่วโมง</th>
                <th>ปีการศึกษา</th>
                <th>ไฟล์</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.submission_id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.submission_id)}
                      onChange={() => toggleSelect(s.submission_id)}
                    />
                  </td>
                  <td>
                    <div>
                      {s.users?.name || "-"}
                      <div className="text-xs text-gray-500 leading-4">
                        <div>{s.users?.username || "-"}</div>
                        <div>{s.users?.faculty || "-"}</div>
                        <div>{s.users?.major || "-"}</div>
                      </div>
                    </div>
                  </td>
                  <td>{s.type}</td>
                  <td>{s.certificate_type?.certificate_name || "-"}</td>
                  <td>{s.hours || "-"}</td>
                  <td>{s.academic_years?.year_name || "-"}</td>
                  <td>
                    {s.submission_files?.length > 0 ? (
                      <button
                        className="btn btn-xs px-2"
                        onClick={() => {
                          if (window.innerWidth < 768) {
                            const url = `${import.meta.env.VITE_FILE_BASE_URL}${
                              s.submission_files[0].file_path
                            }`;
                            window.open(url, "_blank");
                          } else {
                            setPreviewFiles(
                              s.submission_files.map((f) => f.file_path)
                            );
                            setCurrentPreviewIndex(0);
                          }
                        }}
                      >
                        <Eye size={14} />
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-center gap-3 my-4">
            <button
              className="btn btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              ก่อนหน้า
            </button>
            <span className="text-sm mt-1">
              หน้า {currentPage} / {totalPages}
            </span>
            <button
              className="btn btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
      {renderPreviewPanel()}
      {showRejectPopup && renderRejectPopup()}
    </div>
  );
}

export default PendingApprovalsPage;