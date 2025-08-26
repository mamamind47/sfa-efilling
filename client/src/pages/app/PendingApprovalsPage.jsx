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
  ClipboardCheck,
  Search,
  Filter,
  Calendar,
  Users,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

function PendingApprovalsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState("ALL_NON_CERTIFICATE");
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
  const [individualHours, setIndividualHours] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(50);



  const fetchData = useCallback(async () => {
    setIsPreviewDrawerOpen(false);
    setReviewingSubmission(null);
    try {
      const res = await apiClient.get("/submission/pending", {
        params: {
          category: filter === "ALL_NON_CERTIFICATE" ? "Others" : filter,
          page: currentPage,
          pageSize: pageSize,
          searchQuery: searchQuery,
          sortOption: sortOption,
        },
      });
      setSubmissions(res.data.submissions || []);
      setTotalPages(res.data.totalPages || 1);
      setSelectedIds([]); // Clear selections on new data load
    } catch (err) {
      console.error("โหลดข้อมูลล้มเหลว", err);
      toast.error(
        "ไม่สามารถโหลดข้อมูลได้: " + (err.response?.data?.error || err.message)
      );
      setSubmissions([]);
      setTotalPages(1);
    }
  }, [filter, currentPage, pageSize, searchQuery, sortOption]);

  useEffect(() => {
    document.title = "รายการรออนุมัติ | Volunteer Student Loan e-Filling";
    fetchData();
  }, [fetchData]); 

  // --- Filtering and Sorting ---
  // REMOVED: const filtered = useMemo(...) as backend handles this now

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
        const sub = submissions.find((s) => s.submission_id === id); // Use submissions directly
        return sub?.type === "Certificate";
      }),
    [selectedIds, submissions]
  );

  const handleBatchReview = async (status, reason = null) => {
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
      await fetchData(); // Refetch data
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
    const requestedHours = submission.hours_requested ?? submission.hours ?? "";
    setIndividualHours(String(requestedHours));
    setIsPreviewDrawerOpen(false);
  };

  const closeIndividualReviewModal = () => {
    setReviewingSubmission(null);
  };

  const handleIndividualReview = async () => {
    if (!reviewingSubmission || !individualStatus) return;

    const submissionId = reviewingSubmission.submission_id;
    const isCertificate = reviewingSubmission.type === "Certificate";

    if (individualStatus === "rejected" && !individualReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการปฏิเสธ");
      return;
    }

    let finalApprovedHours = null;
    if (individualStatus === "approved" && !isCertificate) {
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
      finalApprovedHours = parseInt(individualHours);
    }

    setLoadingIndividual(true);
    try {
      let payload = {
        status: individualStatus,
        rejection_reason:
          individualStatus === "rejected" ? individualReason : null,
      };

      if (individualStatus === "approved" && !isCertificate) {
        payload.hours = finalApprovedHours;
      }

      await apiClient.put(`/submission/${submissionId}/review`, payload);
      toast.success(
        `รายการ ${submissionId} ได้รับการ ${
          individualStatus === "approved" ? "อนุมัติ" : "ปฏิเสธ"
        } แล้ว`
      );
      closeIndividualReviewModal();
      await fetchData(); // Refetch data
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
    if (!isPreviewDrawerOpen || !previewFiles.length) return null;
    const currentFile = previewFiles[currentPreviewIndex];
    const fileSrc = `${import.meta.env.VITE_FILE_BASE_URL}${currentFile}`;
    const isImage = currentFile.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = currentFile.match(/\.pdf$/i);

    return (
      // เพิ่ม div นี้เข้ามาเพื่อทำเป็นฉากหลัง (Backdrop)
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50" // ครอบคลุมเต็มจอ, สีดำโปร่งแสง, Z-index ควรสูงกว่าเนื้อหาหลัก แต่ต่ำกว่า popup อื่นๆ (Reject/Individual modal ใช้ z-[60])
        onClick={closePreviewDrawer} // เมื่อคลิกที่ฉากหลัง ให้ปิด Drawer
      >
        {/* div เนื้อหา Drawer เดิม ถูกย้ายมาอยู่ข้างในนี้ */}
        <div
          className={`fixed top-0 right-0 h-full w-full md:w-[40%] lg:w-[35%] bg-white shadow-lg z-51 transform transition-transform duration-300 ease-in-out ${
            // เพิ่ม Z-index ให้สูงกว่าฉากหลังเล็กน้อย
            isPreviewDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()} // สำคัญ: เมื่อคลิกที่เนื้อหา Drawer ให้หยุดการส่ง event ไปยัง Backdrop
        >
          {/* เนื้อหาภายใน Drawer เดิม */}
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-3 border-b sticky top-0 bg-white z-10">
              <div className="flex gap-2 items-center">
                {/* ปุ่มเปลี่ยนไฟล์ */}
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
                {/* ปุ่มเปิดในแท็บใหม่ */}
                <a
                  href={fileSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-xs ml-2"
                  title="เปิดในแท็บใหม่"
                  // ไม่ต้องใส่ stopPropagation ตรงนี้ก็ได้ เพราะ click บน link มักจะไม่ propagate ขึ้นไปถึง backdrop อยู่แล้ว
                >
                  <ExternalLink size={16} />
                </a>
              </div>
              {/* ปุ่มปิด Drawer */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  closePreviewDrawer();
                }} // ใส่ stopPropagation ที่ปุ่มปิดด้วยก็ดี
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {/* เนื้อหาแสดงไฟล์ (รูปภาพ/PDF) */}
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
      </div>
      // สิ้นสุด div Backdrop
    );
  };

  const renderBatchRejectPopup = () => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowRejectPopup(false);
      }
    };
    
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
        onClick={() => setShowRejectPopup(false)}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-orange-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center space-x-2">
                <XCircle className="h-5 w-5" />
                <span>ปฏิเสธคำขอ</span>
              </h2>
              <button
                className="text-white hover:text-gray-200 transition-colors"
                onClick={() => setShowRejectPopup(false)}
                disabled={loadingBatch}
              >
                <X size={24} />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-gray-700">
              กรุณาระบุเหตุผลในการปฏิเสธสำหรับ Certificate ที่เลือก
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เหตุผลในการปฏิเสธ *
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-none"
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="ระบุเหตุผลที่ชัดเจน..."
                disabled={loadingBatch}
                autoFocus
              />
            </div>
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
            <button
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
              onClick={() => setShowRejectPopup(false)}
              disabled={loadingBatch}
            >
              ยกเลิก
            </button>
            <button
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleBatchReview("rejected", rejectionReason)}
              disabled={!rejectionReason.trim() || loadingBatch}
            >
              {loadingBatch ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <XCircle size={16} />
              )}
              <span>ยืนยันการปฏิเสธ</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderIndividualReviewPopup = () => {
    if (!reviewingSubmission) return null;
    const isCert = reviewingSubmission.type === "Certificate";
    const requestedHoursDisplay =
      reviewingSubmission.hours_requested ?? reviewingSubmission.hours ?? "-";
      
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeIndividualReviewModal();
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
        onClick={closeIndividualReviewModal}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-orange-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center space-x-2">
                <Edit className="h-5 w-5" />
                <span>ตรวจสอบรายการ</span>
              </h2>
              <button
                className="text-white hover:text-gray-200 transition-colors"
                onClick={closeIndividualReviewModal}
                disabled={loadingIndividual}
              >
                <X size={24} />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">

              {/* Submission Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  <span>รายละเอียดคำขอ</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">ผู้ส่งคำขอ</label>
                      <p className="text-gray-900 font-medium">
                        {reviewingSubmission.users?.name} ({reviewingSubmission.users?.username})
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">ประเภทกิจกรรม</label>
                      <p className="text-gray-900">
                        {reviewingSubmission.type === "Certificate"
                          ? reviewingSubmission.certificate_type?.category || "หมวดหมู่?"
                          : reviewingSubmission.type === "religious" 
                          ? "พัฒนาศาสนสถาน"
                          : reviewingSubmission.type === "social-development"
                          ? "พัฒนาชุมชน"
                          : reviewingSubmission.type}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">ชั่วโมงที่ยื่น</label>
                      <p className="text-gray-900 font-semibold">
                        {requestedHoursDisplay} {requestedHoursDisplay !== "-" && "ชั่วโมง"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {(reviewingSubmission.certificate_type?.certificate_name || reviewingSubmission.topic) && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">หัวข้อ/รายละเอียด</label>
                        <p className="text-gray-900">
                          {reviewingSubmission.certificate_type?.certificate_name || reviewingSubmission.topic}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">ปีการศึกษา</label>
                      <p className="text-gray-900">
                        {reviewingSubmission.academic_years?.year_name || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Selection */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  การดำเนินการ
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={`flex items-center justify-center space-x-2 p-4 rounded-lg border-2 transition-all ${
                      individualStatus === "approved"
                        ? "bg-green-500 border-green-500 text-white shadow-lg"
                        : "bg-white border-gray-300 text-gray-700 hover:border-green-400 hover:bg-green-50"
                    }`}
                    onClick={() => setIndividualStatus("approved")}
                    disabled={loadingIndividual}
                  >
                    <CheckCircle2 size={20} />
                    <span className="font-medium">อนุมัติ</span>
                  </button>
                  
                  <button
                    className={`flex items-center justify-center space-x-2 p-4 rounded-lg border-2 transition-all ${
                      individualStatus === "rejected"
                        ? "bg-red-500 border-red-500 text-white shadow-lg"
                        : "bg-white border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50"
                    }`}
                    onClick={() => setIndividualStatus("rejected")}
                    disabled={loadingIndividual}
                  >
                    <XCircle size={20} />
                    <span className="font-medium">ปฏิเสธ</span>
                  </button>
                </div>
              </div>

              {/* Approved Hours Input */}
              {individualStatus === "approved" && !isCert && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="approvedHours">
                    จำนวนชั่วโมงที่อนุมัติ *
                    <span className="text-xs text-gray-500 ml-2">
                      (ค่าที่ยื่น: {requestedHoursDisplay} ชั่วโมง)
                    </span>
                  </label>
                  <input
                    id="approvedHours"
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    value={individualHours}
                    onChange={(e) => setIndividualHours(e.target.value)}
                    placeholder={`ระบุจำนวนชั่วโมง (ค่าเดิม: ${requestedHoursDisplay})`}
                    disabled={loadingIndividual}
                    required
                  />
                </div>
              )}
              
              {/* Rejection Reason */}
              {individualStatus === "rejected" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="rejectionReason">
                    เหตุผลในการปฏิเสธ *
                  </label>
                  <textarea
                    id="rejectionReason"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-none"
                    rows={4}
                    value={individualReason}
                    onChange={(e) => setIndividualReason(e.target.value)}
                    placeholder="ระบุเหตุผลที่ชัดเจน..."
                    disabled={loadingIndividual}
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
              onClick={closeIndividualReviewModal}
              disabled={loadingIndividual}
            >
              ยกเลิก
            </button>
            <button
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                individualStatus === "approved" 
                  ? "bg-green-500 hover:bg-green-600 text-white" 
                  : individualStatus === "rejected"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
              onClick={handleIndividualReview}
              disabled={!individualStatus || loadingIndividual}
            >
              {loadingIndividual ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : individualStatus === "approved" ? (
                <CheckCircle2 size={16} />
              ) : individualStatus === "rejected" ? (
                <XCircle size={16} />
              ) : (
                <Edit size={16} />
              )}
              <span>
                {individualStatus === "approved" ? "ยืนยันการอนุมัติ" : 
                 individualStatus === "rejected" ? "ยืนยันการปฏิเสธ" : "ยืนยัน"}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Column Visibility & Colspan ---
  const showTypeColumn = ![
    "BloodDonate",
    "NSF",
    "AOM YOUNG",
    "ต้นไม้ล้านต้น ล้านความดี",
    "religious",
    "social-development",
  ].includes(filter);
  const showTopicColumn = ![
    "BloodDonate",
    "NSF",
    "AOM YOUNG",
    "ต้นไม้ล้านต้น ล้านความดี",
    "religious",
    "social-development",
  ].includes(filter);
  const showHoursColumn = !["Certificate"].includes(filter);
  const showActionsColumn = !["Certificate"].includes(filter);

  const calculateColspan = () => {
    let count = 3;
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

  // --- "Select All" Checkbox Logic ---
  const certificateSubmissionsOnPage = useMemo(
    () => submissions.filter((s) => s.type === "Certificate"),
    [submissions]
  );

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-center space-x-3">
            <ClipboardCheck className="h-6 w-6" />
            <h1 className="text-2xl font-bold">รายการคำขอที่รออนุมัติ</h1>
          </div>
          <p className="text-center text-orange-100 mt-2">จัดการและตรวจสอบคำขอจิตอาสาที่รออนุมัติ</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Search and Filters Section */}
        <div className="bg-white rounded-lg shadow-md border border-orange-100 p-5">
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-800">ค้นหาและกรองข้อมูล</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ค้นหา
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  placeholder="ค้นหา ชื่อ รหัส สาขา หัวข้อ หมวดหมู่..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            {/* Sort Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                เรียงตาม
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors bg-white"
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="latest">ใหม่สุดก่อน</option>
                <option value="oldest">เก่าสุดก่อน</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="inline h-4 w-4 mr-1" />
                หมวดหมู่
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors bg-white"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setCurrentPage(1);
                  setSearchQuery(""); // Reset search on filter change
                }}
              >
                <option value="ALL_NON_CERTIFICATE">ทั้งหมด (ยกเว้นเรียนออนไลน์)</option>
                <option value="Certificate">เรียนออนไลน์/e-Learning</option>
                <option value="BloodDonate">บริจาคเลือด</option>
                <option value="NSF">ออมเงิน</option>
                <option value="AOM YOUNG">AOM YOUNG</option>
                <option value="ต้นไม้ล้านต้น ล้านความดี">ต้นไม้ล้านต้น ล้านความดี</option>
                <option value="religious">พัฒนาศาสนสถาน</option>
                <option value="social-development">พัฒนาชุมชน</option>
              </select>
            </div>
          </div>
        </div>

        {/* Batch Action Buttons */}
        {selectedIds.length > 0 && filter === "Certificate" && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">
                  เลือก {selectedIds.length} รายการแล้ว
                </span>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleBatchReview("approved")}
                  disabled={!canBatchReview || loadingBatch}
                  title={
                    canBatchReview
                      ? "อนุมัติ Certificate ที่เลือก"
                      : "เลือกเฉพาะ Certificate เพื่อใช้การอนุมัติหลายรายการ"
                  }
                >
                  {loadingBatch ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span className="font-medium">
                    อนุมัติ {canBatchReview ? `(${selectedIds.length})` : ""}
                  </span>
                </button>
                
                <button
                  className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setShowRejectPopup(true)}
                  disabled={!canBatchReview || loadingBatch}
                  title={
                    canBatchReview
                      ? "ปฏิเสธ Certificate ที่เลือก"
                      : "เลือกเฉพาะ Certificate เพื่อใช้การปฏิเสธหลายรายการ"
                  }
                >
                  {loadingBatch ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  <span className="font-medium">
                    ปฏิเสธ {canBatchReview ? `(${selectedIds.length})` : ""}
                  </span>
                </button>
              </div>
            </div>
            
            {!canBatchReview && selectedIds.length > 0 && (
              <div className="mt-3 p-3 bg-orange-100 border border-orange-200 rounded-lg">
                <span className="text-sm text-orange-700 font-medium">
                  💡 การดำเนินการหลายรายการใช้ได้กับ Certificate เท่านั้น
                </span>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md border border-orange-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold w-10">
                    {filter === "Certificate" &&
                      certificateSubmissionsOnPage.length > 0 && (
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-orange-600 bg-white border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                          checked={
                            certificateSubmissionsOnPage.length > 0 &&
                            selectedIds.length ===
                              certificateSubmissionsOnPage.length &&
                            certificateSubmissionsOnPage.every((s) =>
                              selectedIds.includes(s.submission_id)
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(
                                certificateSubmissionsOnPage.map(
                                  (s) => s.submission_id
                                )
                              );
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          title="เลือกทั้งหมด (เฉพาะ Certificate ในหน้านี้)"
                        />
                      )}
                  </th>
                  <th className="px-3 py-3 text-left font-semibold min-w-[180px]">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>ผู้ส่งคำขอ</span>
                    </div>
                  </th>
                  {showTypeColumn && (
                    <th className="px-3 py-3 text-left font-semibold">
                      ประเภท/หมวดหมู่
                    </th>
                  )}
                  {showTopicColumn && (
                    <th className="px-3 py-3 text-left font-semibold max-w-[180px]">
                      หัวข้อ/รายละเอียด
                    </th>
                  )}
                  <th className="px-3 py-3 text-left font-semibold">
                    ชั่วโมง
                  </th>
                  {filter !== "Certificate" && (
                    <th className="px-3 py-3 text-left font-semibold">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>ปีการศึกษา</span>
                      </div>
                    </th>
                  )}
                  <th className="px-3 py-3 text-left font-semibold">
                    ส่งเมื่อ
                  </th>
                  <th className="px-3 py-3 text-left font-semibold">
                    ไฟล์แนบ
                  </th>
                  {showActionsColumn && (
                    <th className="px-3 py-3 text-left font-semibold">
                      ดำเนินการ
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {submissions.length === 0 &&
                  !loadingBatch &&
                  !loadingIndividual && (
                    <tr>
                      <td
                        colSpan={tableColspan}
                        className="px-3 py-10 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <ClipboardCheck className="h-10 w-10 text-gray-300" />
                          <p className="font-medium">ไม่พบข้อมูลที่รออนุมัติ</p>
                          <p className="text-sm">ตามเงื่อนไขที่เลือก</p>
                        </div>
                      </td>
                    </tr>
                  )}
                {submissions.map((s, index) => (
                  <tr 
                    key={s.submission_id} 
                    className={`hover:bg-orange-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-3">
                      {s.type === "Certificate" ? (
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                          checked={selectedIds.includes(s.submission_id)}
                          onChange={() => toggleSelect(s.submission_id)}
                          disabled={loadingBatch}
                        />
                      ) : (
                        <span className="text-gray-300 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        <button
                          className="font-semibold text-orange-600 hover:text-orange-800 hover:underline transition-colors text-sm"
                          onClick={() => {
                            setSearchQuery(s.users?.username || "");
                            setCurrentPage(1);
                          }}
                        >
                          {s.users?.name || "-"}
                        </button>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <div className="font-mono">{s.users?.username || "-"}</div>
                          <div>{s.users?.faculty || "-"}</div>
                          <div className="text-gray-500 truncate max-w-[140px]">{s.users?.major || "-"}</div>
                        </div>
                      </div>
                    </td>
                    {showTypeColumn && (
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {s.type === "Certificate" ? (
                            s.certificate_type?.category || "ไม่มีหมวดหมู่"
                          ) : s.type === "religious" ? (
                            "พัฒนาศาสนสถาน"
                          ) : s.type === "social-development" ? (
                            "พัฒนาชุมชน"
                          ) : (
                            s.type
                          )}
                        </span>
                      </td>
                    )}
                    {showTopicColumn && (
                      <td 
                        className="px-3 py-3 max-w-[180px]" 
                        title={s.certificate_type?.certificate_name || s.topic || "-"}
                      >
                        <div className="text-sm text-gray-900 truncate">
                          {s.certificate_type?.certificate_name || s.topic || "-"}
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                        {s.type === "Certificate"
                          ? s.certificate_type?.hours ?? "-"
                          : s.hours_requested ?? s.hours ?? "-"}
                        {(s.type !== "Certificate" && (s.hours_requested || s.hours)) && " ชม."}
                      </span>
                    </td>
                    {s.type !== "Certificate" && (
                      <td className="px-3 py-3">
                        <span className="text-sm text-gray-900">
                          {s.academic_years?.year_name || "-"}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <span className="text-sm text-gray-600">
                        {new Date(s.created_at).toLocaleString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {s.submission_files?.length > 0 ? (
                        <button
                          className="flex items-center space-x-1 text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors text-sm"
                          onClick={() => openPreviewDrawer(s.submission_files)}
                          title={`ดูไฟล์ (${s.submission_files.length})`}
                        >
                          <Eye size={14} />
                          <span>({s.submission_files.length})</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    {showActionsColumn && (
                      <td className="px-3 py-3">
                        {!["Certificate"].includes(s.type) ? (
                          <button
                            className="flex items-center space-x-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => openIndividualReviewModal(s)}
                            disabled={loadingIndividual || loadingBatch}
                            title="ตรวจสอบรายการนี้"
                          >
                            <Edit size={14} />
                            <span>ตรวจสอบ</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
          
          {/* Pagination */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                หน้า {currentPage} จาก {totalPages}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={
                    currentPage === 1 || loadingBatch || loadingIndividual
                  }
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft size={16} />
                  <span>ก่อนหน้า</span>
                </button>
                
                <span className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">
                  {currentPage}
                </span>
                
                <button
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={
                    currentPage === totalPages ||
                    loadingBatch ||
                    loadingIndividual
                  }
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <span>ถัดไป</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {isPreviewDrawerOpen && renderPreviewDrawer()}
      {showRejectPopup && renderBatchRejectPopup()}
      {reviewingSubmission && renderIndividualReviewPopup()}
    </div>
  );
}

export default PendingApprovalsPage;