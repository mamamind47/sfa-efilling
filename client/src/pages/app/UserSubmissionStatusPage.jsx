// src/pages/app/UserSubmissionStatusPage.jsx
import React, {
  useEffect,
  useState,
  useMemo,
} from "react";
import apiClient from "../../api/axiosConfig";
import { 
  Eye, 
  X, 
  Loader2, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText,
  Calendar
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/th";
import buddhistEra from "dayjs/plugin/buddhistEra";
import { getSubmissionStatusConfig } from "../../utils/submissionUtils";

dayjs.locale("th");
dayjs.extend(buddhistEra);

// --- Status Detail Popup Component ---
// (เหมือนเดิม - ควรแยก Component)
function StatusDetailPopup({ submission, onClose }) {
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [onClose]);

  if (!submission) return null;
  const currentStatusInfo = submission.status_logs?.[0];
  const status = currentStatusInfo?.status || submission.status || "submitted";
  const reason =
    currentStatusInfo?.reason || submission.rejection_reason || null;
  const statusTime = currentStatusInfo?.changed_at;
  const getStepClass = (stepNumber, currentStatus) => {
    const statusMap = { submitted: 1, approved: 3, rejected: 2 };
    const currentStep = statusMap[currentStatus] || 1;
    const isActive = stepNumber <= currentStep;
    if (currentStatus === "rejected" && stepNumber === 2)
      return "bg-gradient-to-br from-red-400 to-rose-600 text-white border-none shadow-lg";
    if (stepNumber === currentStep)
      return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none";
    if (isActive) return "border-2 border-orange-400 text-orange-400";
    return "border border-gray-300 text-gray-400";
  };
  const getLineClass = (stepNumber, currentStatus) => {
    const statusMap = { submitted: 1, approved: 3, rejected: 2 };
    const currentStep = statusMap[currentStatus] || 1;
    if (currentStatus === "rejected" && stepNumber === 1)
      return "h-2 w-full bg-gradient-to-r from-yellow-400 to-red-400 rounded-full";
    if (currentStatus === "rejected" && stepNumber === 2)
      return "h-2 w-full bg-gray-300 rounded-full";
    return stepNumber < currentStep
      ? "h-2 w-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
      : "h-2 w-full bg-gray-300 rounded-full";
  };
  const getStatusText = (statusValue) => {
    switch (statusValue) {
      case "approved":
        return "อนุมัติแล้ว";
      case "rejected":
        return "ถูกปฏิเสธ";
      default:
        return "กำลังตรวจสอบ/รอดำเนินการ";
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
      <div className="bg-white p-5 md:p-6 rounded-lg w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-semibold mb-6 text-center text-gray-800 border-b pb-3">
          รายละเอียดสถานะคำขอ
        </h2>
        {/* Status Steps */}
        <div className="flex items-center justify-center mb-8 w-full px-2 md:px-4">
          <div className="flex flex-col items-center text-center">
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold ${getStepClass(
                1,
                status
              )} mb-2`}
            >
              1
            </div>
            <div className="text-xs md:text-sm text-gray-600 leading-tight whitespace-nowrap">
              ยื่นคำขอ
            </div>
          </div>
          <div className={`flex-1 ${getLineClass(1, status)} mx-2 md:mx-4`}></div>
          <div className="flex flex-col items-center text-center">
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold ${getStepClass(
                2,
                status
              )} mb-2`}
            >
              2
            </div>
            <div className="text-xs md:text-sm text-gray-600 leading-tight whitespace-nowrap">
              {status === "rejected" ? "ปฏิเสธ" : "ดำเนินการ"}
            </div>
          </div>
          <div className={`flex-1 ${getLineClass(2, status)} mx-2 md:mx-4`}></div>
          <div className="flex flex-col items-center text-center">
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold ${getStepClass(
                3,
                status
              )} mb-2`}
            >
              3
            </div>
            <div className="text-xs md:text-sm text-gray-600 leading-tight whitespace-nowrap">
              อนุมัติ
            </div>
          </div>
        </div>
        {/* Submission Details */}
        <div className="space-y-3 text-sm border-t pt-5 text-gray-700">
          <div className="flex justify-between">
            {" "}
            <strong className="text-gray-500">ID คำขอ:</strong>{" "}
            <span className="font-mono text-xs">
              {submission.submission_id}
            </span>{" "}
          </div>
          <div className="flex justify-between">
            {" "}
            <strong className="text-gray-500">ประเภท:</strong>{" "}
            <span>{submission.type_display_name || submission.type}</span>{" "}
          </div>
          {submission.certificate_type && (
            <div className="flex justify-between">
              {" "}
              <strong className="text-gray-500">หัวข้อ:</strong>{" "}
              <span className="text-right">
                {submission.certificate_type.certificate_name} (
                {submission.certificate_type.certificate_code})
              </span>{" "}
            </div>
          )}
          <div className="flex justify-between">
            {" "}
            <strong className="text-gray-500">ชั่วโมงที่อนุมัติ:</strong>{" "}
            <span>{submission.hours ?? "-"}</span>{" "}
          </div>
          <div className="flex justify-between">
            {" "}
            <strong className="text-gray-500">วันที่ยื่นคำขอ:</strong>{" "}
            <span>
              {dayjs(submission.created_at).format("D MMMM BBBB เวลา HH:mm น.")}
            </span>{" "}
          </div>
          {statusTime && (
            <div className="flex justify-between">
              {" "}
              <strong className="text-gray-500">วันที่อัปเดตสถานะ:</strong>{" "}
              <span>
                {dayjs(statusTime).format("D MMMM BBBB เวลา HH:mm น.")}
              </span>{" "}
            </div>
          )}
          <div className="flex justify-between items-center">
            {" "}
            <strong className="text-gray-500">สถานะปัจจุบัน:</strong>{" "}
            <span
              className={`font-semibold py-1 px-2 rounded text-xs ${
                status === "approved"
                  ? "text-green-700 bg-green-100"
                  : status === "rejected"
                  ? "text-red-700 bg-red-100"
                  : "text-yellow-700 bg-yellow-100"
              }`}
            >
              {getStatusText(status)}
            </span>{" "}
          </div>
          {status === "rejected" && reason && (
            <div className="mt-4 p-3 border border-red-200 bg-red-50 text-red-800 rounded">
              <strong className="font-bold block mb-1 text-sm">
                เหตุผลที่ถูกปฏิเสธ:
              </strong>
              <p className="whitespace-pre-wrap text-sm">{reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main Page Component ---
function UserSubmissionStatusPage() {
  // --- State Variables ---
  const [submissions, setSubmissions] = useState([]);
  const [availableSubmissionYears, setAvailableSubmissionYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusPopupDetail, setStatusPopupDetail] = useState(null);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchSubmissionsData = async () => {
      setIsLoading(true);
      setError(null);
      setAvailableSubmissionYears([]);
      try {
        const subRes = await apiClient.get("/submission");
        const fetchedSubmissions = subRes.data || [];
        setSubmissions(fetchedSubmissions);

        if (fetchedSubmissions.length > 0) {
          const yearMap = new Map();
          const sortedSubmissions = [...fetchedSubmissions].sort(
            (a, b) => dayjs(b.created_at).unix() - dayjs(a.created_at).unix()
          );
          sortedSubmissions.forEach((sub) => {
            if (
              sub.academic_years &&
              sub.academic_year_id &&
              !yearMap.has(sub.academic_year_id)
            ) {
              yearMap.set(sub.academic_year_id, {
                id: sub.academic_year_id,
                name: sub.academic_years.year_name || "N/A",
              });
            }
          });
          const uniqueYears = Array.from(yearMap.values()).sort((a, b) =>
            b.name.localeCompare(a.name)
          );
          setAvailableSubmissionYears(uniqueYears);
          // Set default selected year only if it's currently empty or invalid
          if (
            uniqueYears.length > 0 &&
            (!selectedAcademicYearId || !yearMap.has(selectedAcademicYearId))
          ) {
            setSelectedAcademicYearId(uniqueYears[0].id);
          } else if (uniqueYears.length === 0) {
            setSelectedAcademicYearId("");
          }
        } else {
          setAvailableSubmissionYears([]);
          setSelectedAcademicYearId("");
        }
      } catch (err) {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล:", err);
        setError(
          err.response?.data?.error ||
            err.message ||
            "ไม่สามารถโหลดข้อมูลคำขอได้"
        );
        setSubmissions([]);
        setAvailableSubmissionYears([]);
        setSelectedAcademicYearId("");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubmissionsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Filtering and Display Logic ---
  const filteredSubmissions = useMemo(() => {
    if (!selectedAcademicYearId) return [];
    return submissions.filter(
      (sub) => sub.academic_year_id === selectedAcademicYearId
    );
  }, [submissions, selectedAcademicYearId]);

  const getStatusBadge = (sub) => {
    const status = sub.status_logs?.[0]?.status || sub.status || "submitted";
    switch (status) {
      case "approved":
        return (
          <span className="badge bg-green-600 text-white badge-sm font-medium border-0">
            อนุมัติแล้ว
          </span>
        );
      case "rejected":
        return (
          <span className="badge bg-red-600 text-white badge-sm font-medium border-0">
            ถูกปฏิเสธ
          </span>
        );
      default:
        return (
          <span className="badge badge-warning text-black badge-sm font-medium">
            รอดำเนินการ
          </span>
        );
    }
  };
  const currentYearName = useMemo(() => {
    const foundYear = availableSubmissionYears.find(
      (y) => y.id === selectedAcademicYearId
    );
    return foundYear ? foundYear.name : "";
  }, [selectedAcademicYearId, availableSubmissionYears]);

  // --- Render Page ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow border border-blue-100">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-t-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-bold">
                  สถานะคำขอของฉัน
                </h1>
                <p className="text-blue-100 mt-1 text-sm">
                  ตรวจสอบสถานะและความคืบหน้าการยื่นกิจกรรมจิตอาสาทั้งหมด
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            {!isLoading && currentYearName && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <Calendar className="w-4 h-4" />
                <span>ปีการศึกษา: <span className="font-medium">{currentYearName}</span></span>
              </div>
            )}
            {!isLoading && !currentYearName && submissions.length > 0 && (
              <p className="text-sm text-gray-600 mb-4">
                กรุณาเลือกปีการศึกษา
              </p>
            )}

            {/* Academic Year Filter */}
            {availableSubmissionYears.length > 0 && (
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
                  <Calendar className="w-3 h-3" />
                  เลือกปีการศึกษา
                </label>
                <select
                  className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedAcademicYearId}
                  onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                  disabled={isLoading}
                >
                  {availableSubmissionYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center">
              <Loader2 className="animate-spin inline-block w-8 h-8 text-blue-500 mb-4" />
              <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-white rounded-lg shadow border border-red-200 p-4">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

      {/* --- Data Display Area --- */}
      {!isLoading && !error && (
        <>
          {/* Card Layout (Mobile / Small Screens) */}
          <div className="space-y-4 md:hidden">
            {/* Message if no data for selected year or no submissions at all */}
            {selectedAcademicYearId &&
              filteredSubmissions.length === 0 &&
              !isLoading && (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">ไม่พบคำร้องสำหรับปีการศึกษา</p>
                  <p className="text-gray-400 text-sm">{currentYearName || ""}</p>
                </div>
              )}
            {!selectedAcademicYearId &&
              submissions.length === 0 &&
              !isLoading && (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">คุณยังไม่มีการยื่นคำร้อง</p>
                  <p className="text-gray-400 text-sm">เมื่อยื่นคำร้องแล้ว จะแสดงสถานะที่นี่</p>
                </div>
              )}

            {/* Render Cards if data exists for the selected year */}
            {filteredSubmissions.map((sub) => {
              const status = sub.status_logs?.[0]?.status || sub.status || "submitted";
              return (
                <div
                  key={sub.submission_id + "-card"}
                  className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow"
                >
                  {/* Card Header: Type and Status */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {status === "approved" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : status === "rejected" ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="font-semibold text-sm text-gray-800">
                        {sub.type_display_name || sub.type}
                      </span>
                    </div>
                    {getStatusBadge(sub)}
                  </div>
                  {/* Card Body */}
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-700 font-medium">
                      {sub.certificate_type
                        ? sub.certificate_type.certificate_name
                        : sub.type_display_name || sub.type}
                    </div>
                    {sub.certificate_type && (
                      <div className="text-xs text-gray-500">
                        รหัส: {sub.certificate_type.certificate_code}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{dayjs(sub.created_at).format("D MMM BBBB")}</span>
                      </div>
                      {sub.hours !== null && sub.hours !== undefined && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                          {sub.hours} ชั่วโมง
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Card Footer: Action Button */}
                  <div className="pt-3 border-t border-gray-100">
                    <button
                      className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      onClick={() => setStatusPopupDetail(sub)}
                      title="ดูรายละเอียดสถานะ"
                    >
                      <Eye size={14} />
                      ดูรายละเอียด
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Layout (Medium Screens and Up) */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700 text-sm">ประเภท</th>
                    <th className="text-left p-3 font-medium text-gray-700 text-sm">หัวข้อ/รายละเอียด</th>
                    <th className="text-center p-3 font-medium text-gray-700 text-sm">ชั่วโมง</th>
                    <th className="text-left p-3 font-medium text-gray-700 text-sm">วันที่ยื่น</th>
                    <th className="text-center p-3 font-medium text-gray-700 text-sm">สถานะ</th>
                    <th className="text-center p-3 font-medium text-gray-700 text-sm">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Messages for empty states */}
                  {!selectedAcademicYearId &&
                    submissions.length === 0 &&
                    !isLoading && (
                      <tr>
                        <td colSpan={6} className="text-center p-10">
                          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">คุณยังไม่มีการยื่นคำร้อง</p>
                          <p className="text-gray-400 text-sm">เมื่อยื่นคำร้องแล้ว จะแสดงสถานะที่นี่</p>
                        </td>
                      </tr>
                    )}
                  {selectedAcademicYearId &&
                    filteredSubmissions.length === 0 &&
                    !isLoading && (
                      <tr>
                        <td colSpan={6} className="text-center p-10">
                          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">ไม่พบคำร้องสำหรับปีการศึกษา</p>
                          <p className="text-gray-400 text-sm">{currentYearName || ""}</p>
                        </td>
                      </tr>
                    )}

                  {/* Render Table Rows */}
                  {filteredSubmissions.map((sub) => {
                    const status = sub.status_logs?.[0]?.status || sub.status || "submitted";
                    return (
                      <tr
                        key={sub.submission_id + "-row"}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {status === "approved" ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : status === "rejected" ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-yellow-500" />
                            )}
                            <span className="text-gray-800 font-medium">
                              {sub.type_display_name || sub.type}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="text-gray-800 font-medium">
                              {sub.certificate_type?.certificate_name || "-"}
                            </div>
                            {sub.certificate_type && (
                              <div className="text-xs text-gray-500 mt-1">
                                รหัส: {sub.certificate_type.certificate_code}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {sub.hours ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {sub.hours}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{dayjs(sub.created_at).format("D MMM BBBB")}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(sub)}</td>
                        <td className="p-3 text-center">
                          <button
                            className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                            onClick={() => setStatusPopupDetail(sub)}
                            title="ดูรายละเอียดสถานะ"
                          >
                            <Eye size={14} className="mr-1" />
                            ดูรายละเอียด
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

        {/* --- Status Detail Modal --- */}
        {statusPopupDetail && (
          <StatusDetailPopup
            submission={statusPopupDetail}
            onClose={() => setStatusPopupDetail(null)}
          />
        )}
      </div>
    </div>
  );
}

export default UserSubmissionStatusPage;