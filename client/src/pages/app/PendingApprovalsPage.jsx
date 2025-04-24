import React, { useEffect, useState, useCallback, useMemo } from "react";
import apiClient from "../../api/axiosConfig";
import {
  Eye,
  CheckCircle2,
  XCircle,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Edit,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

function PendingApprovalsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState("Certificate");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingIndividual, setLoadingIndividual] = useState(false);

  // State for Preview Drawer
  const [previewFiles, setPreviewFiles] = useState([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [isPreviewDrawerOpen, setIsPreviewDrawerOpen] = useState(false);

  // State สำหรับ Popup ปฏิเสธ (Batch)
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // State สำหรับ Modal ตรวจสอบรายตัว
  const [reviewingSubmission, setReviewingSubmission] = useState(null);
  const [individualStatus, setIndividualStatus] = useState(null);
  const [individualReason, setIndividualReason] = useState("");
  const [individualHours, setIndividualHours] = useState(""); // This will hold the value to be approved

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories = [
    "Certificate",
    "BloodDonate",
    "NSF",
    "AOM YOUNG",
    "Others",
  ];

  const fetchData = useCallback(async () => {
    setIsPreviewDrawerOpen(false);
    setReviewingSubmission(null);
    try {
      const res = await apiClient.get("/submission/pending", {
        params: { category: filter, page: currentPage, limit: 20 },
      });
      setSubmissions(res.data.submissions || []);
      setTotalPages(res.data.totalPages || 1);
      setSelectedIds([]);
    } catch (err) {
      console.error("โหลดข้อมูลล้มเหลว", err);
      toast.error(
        "ไม่สามารถโหลดข้อมูลได้: " + (err.response?.data?.error || err.message)
      );
      setSubmissions([]);
      setTotalPages(1);
    }
  }, [filter, currentPage]);

  useEffect(() => {
    document.title = "รายการรออนุมัติ | Volunteer Student Loan e-Filling";
    fetchData();
  }, [fetchData]);

  // --- Filtering and Sorting ---
  const filtered = useMemo(
    () =>
      Array.isArray(submissions)
        ? submissions
            .filter((s) => {
              const q = searchQuery.toLowerCase();
              return (
                s.users?.name?.toLowerCase().includes(q) ||
                s.users?.username?.toLowerCase().includes(q) ||
                s.users?.major?.toLowerCase().includes(q) ||
                s.certificate_type?.certificate_name
                  ?.toLowerCase()
                  .includes(q) ||
                (s.type === "Certificate" &&
                  s.certificate_type?.category?.toLowerCase().includes(q)) ||
                s.topic?.toLowerCase().includes(q)
              );
            })
            .sort((a, b) => {
              // ... (sorting logic remains the same)
              if (sortOption === "latest") {
                return new Date(b.created_at) - new Date(a.created_at);
              } else if (sortOption === "oldest") {
                return new Date(a.created_at) - new Date(b.created_at);
              } else if (sortOption === "type") {
                const typeA =
                  a.type === "Certificate"
                    ? a.certificate_type?.category || "หมวดหมู่?"
                    : a.type;
                const typeB =
                  b.type === "Certificate"
                    ? b.certificate_type?.category || "หมวดหมู่?"
                    : b.type;
                return (typeA || "").localeCompare(typeB || "");
              } else if (sortOption === "user") {
                return (a.users?.name || "").localeCompare(b.users?.name || "");
              }
              return 0;
            })
        : [],
    [submissions, searchQuery, sortOption]
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // --- Batch Review ---
  const canBatchReview = useMemo(
    () =>
      selectedIds.length > 0 &&
      selectedIds.every((id) => {
        const sub = submissions.find((s) => s.submission_id === id);
        return sub?.type === "Certificate";
      }),
    [selectedIds, submissions]
  );

  const handleBatchReview = async (status, reason = null) => {
    // ... (batch review logic remains the same)
    if (!canBatchReview) {
      toast.error(
        "การดำเนินการหลายรายการรองรับเฉพาะประเภท Certificate เท่านั้น"
      );
      return;
    }
    setLoadingBatch(true);
    try {
      await apiClient.post("/submission/batch-review", {
        ids: selectedIds,
        status,
        rejection_reason: status === "rejected" ? reason : null,
      });
      toast.success(
        `ดำเนินการ ${selectedIds.length} รายการ (${status}) สำเร็จ`
      );
      setShowRejectPopup(false);
      setRejectionReason("");
      await fetchData();
    } catch (err) {
      console.error("Batch review error:", err);
      toast.error(
        "เกิดข้อผิดพลาด (Batch): " + (err.response?.data?.error || err.message)
      );
    } finally {
      setLoadingBatch(false);
    }
  };

  // --- Individual Review ---
  const openIndividualReviewModal = (submission) => {
    setReviewingSubmission(submission);
    setIndividualStatus(null);
    setIndividualReason("");
    // **MODIFICATION**: Pre-fill hours with hours_requested (fallback to hours if needed)
    const requestedHours = submission.hours_requested ?? submission.hours ?? "";
    setIndividualHours(String(requestedHours)); // Ensure it's a string for the input
    setIsPreviewDrawerOpen(false);
  };

  const closeIndividualReviewModal = () => {
    setReviewingSubmission(null);
  };

  const handleIndividualReview = async () => {
    if (!reviewingSubmission || !individualStatus) return;

    const submissionId = reviewingSubmission.submission_id;
    const isCertificate = reviewingSubmission.type === "Certificate";

    // --- Validation ---
    if (individualStatus === "rejected" && !individualReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการปฏิเสธ");
      return;
    }

    let finalApprovedHours = null;
    if (individualStatus === "approved" && !isCertificate) {
      // **MODIFICATION**: Ensure individualHours is a valid non-negative number
      if (
        individualHours === "" ||
        isNaN(parseInt(individualHours)) ||
        parseInt(individualHours) < 0
      ) {
        toast.error(
          "กรุณาระบุจำนวนชั่วโมงที่อนุมัติเป็นตัวเลขจำนวนเต็มบวก หรือ 0"
        );
        return;
      }
      finalApprovedHours = parseInt(individualHours); // Get the final hours from state
    }
    // --- End Validation ---

    setLoadingIndividual(true);
    try {
      let payload = {
        status: individualStatus,
        rejection_reason:
          individualStatus === "rejected" ? individualReason : null,
      };

      // **MODIFICATION**: Add the final approved hours to the payload if applicable
      if (individualStatus === "approved" && !isCertificate) {
        payload.hours = finalApprovedHours; // Send the validated hours
      }

      await apiClient.put(`/submission/${submissionId}/review`, payload);
      toast.success(
        `รายการ ${submissionId} ได้รับการ ${
          individualStatus === "approved" ? "อนุมัติ" : "ปฏิเสธ"
        } แล้ว`
      );
      closeIndividualReviewModal();
      await fetchData();
    } catch (err) {
      console.error("Individual review error:", err);
      toast.error(
        `เกิดข้อผิดพลาด: ${err.response?.data?.error || err.message}`
      );
    } finally {
      setLoadingIndividual(false);
    }
  };

  // --- Preview Drawer ---
  const openPreviewDrawer = (files) => {
    if (!files || files.length === 0) return;
    setPreviewFiles(files.map((f) => f.file_path));
    setCurrentPreviewIndex(0);
    setIsPreviewDrawerOpen(true);
    setReviewingSubmission(null);
  };

  const closePreviewDrawer = () => {
    setIsPreviewDrawerOpen(false);
  };

  // --- Render Functions ---

  const renderPreviewDrawer = () => {
    // ... (Drawer rendering logic remains the same)
    if (!isPreviewDrawerOpen || !previewFiles.length) return null;

    const currentFile = previewFiles[currentPreviewIndex];
    const fileSrc = `${import.meta.env.VITE_FILE_BASE_URL}${currentFile}`;
    const isImage = currentFile.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = currentFile.match(/\.pdf$/i);

    return (
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[40%] lg:w-[35%] bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          isPreviewDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-3 border-b sticky top-0 bg-white z-10">
            <div className="flex gap-2 items-center">
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
                className="btn btn-ghost btn-xs ml-2"
                title="เปิดในแท็บใหม่"
              >
                <ExternalLink size={16} />
              </a>
            </div>

            <button
              className="btn btn-ghost btn-sm"
              onClick={closePreviewDrawer}
            >
              <X size={20} />
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {isImage ? (
              <img
                src={fileSrc}
                alt="preview"
                className="w-full h-auto rounded object-contain"
              />
            ) : isPdf ? (
              <iframe
                src={fileSrc}
                title="PDF preview"
                className="w-full h-[90vh] border-none"
              ></iframe>
            ) : (
              <div className="text-center p-5">
                <p className="text-gray-600">
                  ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้
                </p>
                <a
                  href={fileSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-link mt-2"
                >
                  ดาวน์โหลดไฟล์เพื่อเปิดดู
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBatchRejectPopup = () => {
    // ... (Popup rendering logic remains the same)
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-lg font-semibold mb-4">
            ระบุเหตุผลในการปฏิเสธ (สำหรับ Certificate ที่เลือก)
          </h2>
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
              disabled={loadingBatch}
            >
              ยกเลิก
            </button>
            <button
              className="btn bg-red-500 hover:bg-red-600 text-white"
              onClick={() => handleBatchReview("rejected", rejectionReason)}
              disabled={!rejectionReason.trim() || loadingBatch}
            >
              {loadingBatch ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                "ยืนยันการปฏิเสธ"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderIndividualReviewPopup = () => {
    if (!reviewingSubmission) return null;
    const isCert = reviewingSubmission.type === "Certificate";
    // **MODIFICATION**: Get the originally requested hours for placeholder/label
    const requestedHoursDisplay =
      reviewingSubmission.hours_requested ?? reviewingSubmission.hours ?? "-";

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h2 className="text-xl font-semibold">ตรวจสอบรายการ</h2>
            <button
              className="btn btn-ghost btn-sm"
              onClick={closeIndividualReviewModal}
              disabled={loadingIndividual}
            >
              <X size={20} />
            </button>
          </div>

          {/* Submission Details */}
          <div className="mb-4 space-y-1 text-sm">
            <p>
              <strong>ผู้ส่ง:</strong> {reviewingSubmission.users?.name} (
              {reviewingSubmission.users?.username})
            </p>
            <p>
              <strong>ประเภท:</strong>{" "}
              {reviewingSubmission.type === "Certificate"
                ? reviewingSubmission.certificate_type?.category || "หมวดหมู่?"
                : reviewingSubmission.type}
            </p>
            {reviewingSubmission.certificate_type?.certificate_name && (
              <p>
                <strong>หัวข้อ:</strong>{" "}
                {reviewingSubmission.certificate_type.certificate_name}
              </p>
            )}
            {reviewingSubmission.topic && (
              <p>
                <strong>รายละเอียด/หัวข้อ:</strong> {reviewingSubmission.topic}
              </p>
            )}
            {/* **MODIFICATION**: Display hours_requested here */}
            <p>
              <strong>ชั่วโมงที่ยื่น:</strong> {requestedHoursDisplay}
            </p>
            <p>
              <strong>ปีการศึกษา:</strong>{" "}
              {reviewingSubmission.academic_years?.year_name || "-"}
            </p>
          </div>

          {/* Action Selection */}
          <div className="mb-4">
            <label className="label font-semibold">การดำเนินการ:</label>
            <div className="flex gap-4">
              <button /* ... Approve Button ... */
                className={`btn btn-sm flex-1 ${
                  individualStatus === "approved"
                    ? "btn-success text-white"
                    : "btn-outline btn-success"
                }`}
                onClick={() => setIndividualStatus("approved")}
                disabled={loadingIndividual}
              >
                <CheckCircle2 size={16} /> อนุมัติ
              </button>
              <button /* ... Reject Button ... */
                className={`btn btn-sm flex-1 ${
                  individualStatus === "rejected"
                    ? "btn-error text-white"
                    : "btn-outline btn-error"
                }`}
                onClick={() => setIndividualStatus("rejected")}
                disabled={loadingIndividual}
              >
                <XCircle size={16} /> ปฏิเสธ
              </button>
            </div>
          </div>

          {/* Conditional Inputs */}
          {individualStatus === "approved" && !isCert && (
            <div className="mb-4">
              {/* **MODIFICATION**: Updated label and placeholder */}
              <label className="label font-semibold" htmlFor="approvedHours">
                จำนวนชั่วโมงที่อนุมัติ:
                <span className="text-xs font-normal text-gray-500 ml-2">
                  (ค่าที่ยื่น: {requestedHoursDisplay})
                </span>
              </label>
              <input
                id="approvedHours"
                type="number"
                min="0"
                className="input input-bordered w-full"
                value={individualHours} // State holds the value to be approved
                onChange={(e) => setIndividualHours(e.target.value)}
                placeholder={`ระบุจำนวนชั่วโมง (ค่าเดิม: ${requestedHoursDisplay})`} // Informative placeholder
                disabled={loadingIndividual}
                required
              />
            </div>
          )}
          {individualStatus === "rejected" && (
            <div className="mb-4">
              <label className="label font-semibold" htmlFor="rejectionReason">
                เหตุผลในการปฏิเสธ:
              </label>
              <textarea /* ... Rejection Reason ... */
                id="rejectionReason"
                className="textarea textarea-bordered w-full"
                rows={3}
                value={individualReason}
                onChange={(e) => setIndividualReason(e.target.value)}
                placeholder="ระบุเหตุผล..."
                disabled={loadingIndividual}
                required
              ></textarea>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="mt-6 pt-4 border-t flex justify-end gap-2">
            <button
              className="btn btn-ghost"
              onClick={closeIndividualReviewModal}
              disabled={loadingIndividual}
            >
              ยกเลิก
            </button>
            <button
              className="btn btn-primary"
              onClick={handleIndividualReview}
              // **MODIFICATION**: Simplified disabled logic (validation happens inside handler now)
              disabled={!individualStatus || loadingIndividual}
            >
              {loadingIndividual ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                "ยืนยัน"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Column Visibility & Colspan ---
  const showTypeColumn = !["BloodDonate", "NSF", "AOM YOUNG"].includes(filter);
  const showTopicColumn = !["BloodDonate", "NSF", "AOM YOUNG"].includes(filter);
  const showHoursColumn = filter !== "Certificate";
  const showActionsColumn = filter !== "Certificate";

  const calculateColspan = () => {
    let count = 3; // Base: Checkbox, Name, Year, Files
    if (showTypeColumn) count++;
    if (showTopicColumn) count++;
    if (showHoursColumn) count++;
    if (showActionsColumn) count++;
    return count;
  };
  const tableColspan = useMemo(calculateColspan, [
    showTypeColumn,
    showTopicColumn,
    showHoursColumn,
    showActionsColumn,
  ]);

  // --- Main Render ---
  return (
    <div className="flex h-screen relative overflow-hidden">
      <Toaster position="top-center" reverseOrder={false} />
      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto overflow-x-hidden">
        {/* ... (Header, Filters, Search, Tabs remain the same) ... */}
        <h1 className="text-2xl font-bold">รายการคำขอที่รออนุมัติ</h1>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center flex-wrap gap-3 md:gap-4 mb-4 p-4 bg-base-200 rounded-lg">
          {/* Search Input */}
          <input
            type="text"
            className="input input-bordered input-sm focus:outline-none focus:ring-0 focus:border-gray-300 w-full sm:w-auto flex-grow"
            placeholder="ค้นหา ชื่อ รหัส สาขา หัวข้อ หมวดหมู่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {/* Sort Select */}
          <select
            className="select select-sm select-bordered focus:outline-none focus:ring-0 focus:border-gray-300 w-full sm:w-auto"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="latest">ใหม่สุดก่อน</option>
            <option value="oldest">เก่าสุดก่อน</option>
            <option value="type">ประเภท/หมวดหมู่</option>
            <option value="user">ผู้ส่ง</option>
          </select>

          {/* Tabs */}
          <div className="tabs tabs-boxed bg-base-100 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`tab tab-sm sm:tab-md ${
                  filter === cat ? "tab-active !bg-orange-500 text-white" : ""
                }`}
                onClick={() => {
                  if (filter !== cat) {
                    setFilter(cat);
                    setCurrentPage(1);
                    setSearchQuery("");
                  }
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

        {/* Batch Action Buttons */}
        {selectedIds.length > 0 && filter === "Certificate" && (
          <div className="flex gap-3 items-center mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            {/* ... batch buttons ... */}
            <span className="text-sm font-medium text-blue-700">
              เลือก {selectedIds.length} รายการ
            </span>
            <button
              className="btn btn-sm bg-green-500 hover:bg-green-600 text-white"
              onClick={() => handleBatchReview("approved")}
              disabled={!canBatchReview || loadingBatch}
              title={
                canBatchReview
                  ? "อนุมัติ Certificate ที่เลือก"
                  : "เลือกเฉพาะ Certificate เพื่อใช้การอนุมัติหลายรายการ"
              }
            >
              <CheckCircle2 size={16} className="mr-1" /> อนุมัติ{" "}
              {canBatchReview ? `(${selectedIds.length})` : ""}
              {loadingBatch && (
                <span className="loading loading-spinner loading-xs ml-2"></span>
              )}
            </button>
            <button
              className="btn btn-sm bg-red-500 hover:bg-red-600 text-white"
              onClick={() => setShowRejectPopup(true)}
              disabled={!canBatchReview || loadingBatch}
              title={
                canBatchReview
                  ? "ปฏิเสธ Certificate ที่เลือก"
                  : "เลือกเฉพาะ Certificate เพื่อใช้การปฏิเสธหลายรายการ"
              }
            >
              <XCircle size={16} className="mr-1" /> ปฏิเสธ{" "}
              {canBatchReview ? `(${selectedIds.length})` : ""}
              {loadingBatch && (
                <span className="loading loading-spinner loading-xs ml-2"></span>
              )}
            </button>
            {!canBatchReview && selectedIds.length > 0 && (
              <span className="text-xs text-orange-600 italic">
                การดำเนินการหลายรายการใช้ได้กับ Certificate เท่านั้น
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="table table-zebra w-full text-sm">
            {/* Table Head */}
            <thead className="bg-base-300">
              <tr>
                <th className="p-2 w-10">
                  {/* Checkbox Column Header */}
                  {filter === "Certificate" && filtered.length > 0 && (
                    <input /* ... checkbox props ... */
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={
                        selectedIds.length ===
                          filtered.filter((s) => s.type === "Certificate")
                            .length && selectedIds.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(
                            filtered
                              .filter((s) => s.type === "Certificate")
                              .map((s) => s.submission_id)
                          );
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      title="เลือกทั้งหมด (เฉพาะ Certificate)"
                    />
                  )}
                </th>
                {/* Ensure no extra space/newline before this th */}
                <th className="p-2 min-w-[180px]">ชื่อ-ข้อมูลผู้ส่ง</th>
                {/* Ensure no extra space/newline around conditional th */}
                {showTypeColumn && <th className="p-2">ประเภท/หมวดหมู่</th>}
                {showTopicColumn && (
                  <th className="p-2 max-w-[200px]">หัวข้อ/รายละเอียด</th>
                )}
                {showHoursColumn && <th className="p-2">ชม.ที่ยื่น</th>}
                {/* Ensure no extra space/newline before this th */}
                <th className="p-2">ปีการศึกษา</th>
                {/* Ensure no extra space/newline before this th */}
                <th className="p-2">ไฟล์แนบ</th>
                {/* Ensure no extra space/newline around conditional th */}
                {showActionsColumn && <th className="p-2">ดำเนินการ</th>}
              </tr>
            </thead>
            {/* End Table Head */}
            <tbody>
              {filtered.length === 0 && !loadingBatch && !loadingIndividual && (
                <tr>
                  <td
                    colSpan={tableColspan}
                    className="text-center p-5 text-gray-500"
                  >
                    ไม่พบข้อมูลที่รออนุมัติตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr key={s.submission_id} className="hover">
                  <td className="p-2">
                    {" "}
                    {/* Checkbox */}
                    {s.type === "Certificate" ? (
                      <input /* ... row checkbox ... */
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedIds.includes(s.submission_id)}
                        onChange={() => toggleSelect(s.submission_id)}
                        disabled={loadingBatch}
                      />
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="p-2">
                    {" "}
                    {/* User Info */}
                    <div className="font-medium">{s.users?.name || "-"}</div>
                    <div className="text-xs text-gray-500 leading-tight">
                      <div>{s.users?.username || "-"}</div>
                      <div>{s.users?.faculty || "-"}</div>
                      <div>{s.users?.major || "-"}</div>
                    </div>
                  </td>
                  {showTypeColumn && (
                    <td className="p-2">
                      {" "}
                      {/* Type/Category */}
                      {s.type === "Certificate"
                        ? s.certificate_type?.category || (
                            <span className="text-gray-400 italic">
                              ไม่มีหมวดหมู่
                            </span>
                          )
                        : s.type}
                    </td>
                  )}
                  {showTopicColumn && (
                    <td
                      className="p-2 max-w-[200px] truncate"
                      title={
                        s.certificate_type?.certificate_name || s.topic || "-"
                      }
                    >
                      {" "}
                      {/* Topic */}
                      {s.certificate_type?.certificate_name || s.topic || "-"}
                    </td>
                  )}
                  {/* **MODIFICATION**: Display hours_requested in the table */}
                  {showHoursColumn && (
                    <td className="p-2">
                      {s.hours_requested ?? s.hours ?? "-"}{" "}
                      {/* Prioritize hours_requested */}
                    </td>
                  )}
                  <td className="p-2">{s.academic_years?.year_name || "-"}</td>{" "}
                  {/* Academic Year */}
                  <td className="p-2">
                    {" "}
                    {/* Files */}
                    {s.submission_files?.length > 0 ? (
                      <button
                        className="btn btn-xs btn-outline px-2"
                        onClick={() => openPreviewDrawer(s.submission_files)}
                        title={`ดูไฟล์ (${s.submission_files.length})`}
                      >
                        <Eye size={14} /> ({s.submission_files.length})
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  {showActionsColumn && (
                    <td className="p-2">
                      {" "}
                      {/* Actions */}
                      {s.type !== "Certificate" ? (
                        <button
                          className="btn btn-xs btn-outline btn-info"
                          onClick={() => openIndividualReviewModal(s)}
                          disabled={loadingIndividual || loadingBatch}
                          title="ตรวจสอบรายการนี้"
                        >
                          <Edit size={14} /> ตรวจสอบ
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={tableColspan}>
                  {" "}
                  {/* Pagination */}
                  {/* ... (Pagination remains the same) ... */}
                  <div className="flex justify-center items-center gap-3 my-4">
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={
                        currentPage === 1 || loadingBatch || loadingIndividual
                      }
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft size={16} /> ก่อนหน้า
                    </button>
                    <span className="text-sm">
                      หน้า {currentPage} / {totalPages}
                    </span>
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={
                        currentPage === totalPages ||
                        loadingBatch ||
                        loadingIndividual
                      }
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      ถัดไป <ChevronRight size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>{" "}
      {/* End Main Content Area */}
      {/* Side Preview Drawer */}
      {renderPreviewDrawer()}
      {isPreviewDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={closePreviewDrawer}
        ></div>
      )}
      {/* Modals */}
      {showRejectPopup && renderBatchRejectPopup()}
      {reviewingSubmission && renderIndividualReviewPopup()}
    </div>
  );
}

export default PendingApprovalsPage;