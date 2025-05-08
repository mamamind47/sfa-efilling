// src/pages/app/UserSubmissionStatusPage.jsx
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import apiClient from "../../api/axiosConfig";
import { Eye, X, Loader2, AlertCircle } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/th";
import buddhistEra from "dayjs/plugin/buddhistEra";

dayjs.locale("th");
dayjs.extend(buddhistEra);

// --- Status Detail Popup Component ---
// (เหมือนเดิม - ควรแยก Component)
function StatusDetailPopup({ submission, onClose }) {
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
      return "bg-red-500 text-white border-none";
    if (stepNumber === currentStep)
      return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none";
    if (isActive) return "border-2 border-orange-400 text-orange-400";
    return "border border-gray-300 text-gray-400";
  };
  const getLineClass = (stepNumber, currentStatus) => {
    const statusMap = { submitted: 1, approved: 3, rejected: 2 };
    const currentStep = statusMap[currentStatus] || 1;
    if (currentStatus === "rejected" && stepNumber === 1)
      return "h-1 w-full bg-gradient-to-r from-yellow-400 to-orange-500 mx-1 md:mx-2";
    return stepNumber < currentStep
      ? "h-1 w-full bg-gradient-to-r from-yellow-400 to-orange-500 mx-1 md:mx-2"
      : "h-1 w-full bg-gray-200 mx-1 md:mx-2";
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
          รายละเอียดสถานะคำร้อง
        </h2>
        {/* Status Steps */}
        <div className="flex items-start justify-center mb-8 w-full px-2 md:px-4">
          <div className="flex flex-col items-center text-center w-1/3">
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold ${getStepClass(
                1,
                status
              )} mb-1`}
            >
              1
            </div>
            <div className="text-xs md:text-sm text-gray-600 leading-tight">
              ยื่นคำขอ
            </div>
          </div>
          <div
            className={`flex-1 mt-5 md:mt-6 ${getLineClass(1, status)}`}
          ></div>
          <div className="flex flex-col items-center text-center w-1/3">
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold ${getStepClass(
                2,
                status
              )} mb-1`}
            >
              2
            </div>
            <div className="text-xs md:text-sm text-gray-600 leading-tight">
              {status === "rejected" ? "ปฏิเสธ" : "ดำเนินการ"}
            </div>
          </div>
          <div
            className={`flex-1 mt-5 md:mt-6 ${getLineClass(2, status)}`}
          ></div>
          <div className="flex flex-col items-center text-center w-1/3">
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold ${getStepClass(
                3,
                status
              )} mb-1`}
            >
              3
            </div>
            <div className="text-xs md:text-sm text-gray-600 leading-tight">
              อนุมัติ
            </div>
          </div>
        </div>
        {/* Submission Details */}
        <div className="space-y-3 text-sm border-t pt-5 text-gray-700">
          <div className="flex justify-between">
            {" "}
            <strong className="text-gray-500">ID คำร้อง:</strong>{" "}
            <span className="font-mono text-xs">
              {submission.submission_id}
            </span>{" "}
          </div>
          <div className="flex justify-between">
            {" "}
            <strong className="text-gray-500">ประเภท:</strong>{" "}
            <span>{submission.type}</span>{" "}
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
        {/* Close button */}
        <div className="text-center mt-6 border-t pt-4">
          {" "}
          <button onClick={onClose} className="btn btn-sm btn-outline">
            ปิด
          </button>{" "}
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
            "ไม่สามารถโหลดข้อมูลคำร้องได้"
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

  const getDisplaySubmissionType = (type) => {
    switch (type) {
      case "NSF":
        return "ออมเงิน กอช.";
      case "BloodDonate":
        return "บริจาคโลหิต";
      case "Certificate":
        return "e-Learning";
      default:
        return type;
    }
  };
  const getStatusBadge = (sub) => {
    const status = sub.status_logs?.[0]?.status || sub.status || "submitted";
    switch (status) {
      case "approved":
        return (
          <span className="badge badge-success text-white badge-sm font-medium">
            อนุมัติแล้ว
          </span>
        );
      case "rejected":
        return (
          <span className="badge badge-error text-white badge-sm font-medium">
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">
        สถานะคำร้องของฉัน
      </h1>
      {!isLoading && currentYearName && (
        <p className="text-sm text-gray-600 -mt-4 md:-mt-5">
          ปีการศึกษา: {currentYearName}
        </p>
      )}
      {!isLoading && !currentYearName && submissions.length > 0 && (
        <p className="text-sm text-gray-600 -mt-4 md:-mt-5">
          กรุณาเลือกปีการศึกษา
        </p>
      )}

      {/* Academic Year Filter */}
      {availableSubmissionYears.length > 0 && (
        <div className="form-control w-full sm:w-auto sm:max-w-xs">
          <label className="label py-1">
            <span className="label-text text-sm">กรองตามปีการศึกษา</span>
          </label>
          <select
            className="select select-bordered select-sm md:select-md"
            value={selectedAcademicYearId}
            onChange={(e) => setSelectedAcademicYearId(e.target.value)}
            disabled={isLoading}
          >
            {availableSubmissionYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {" "}
                {ay.name}{" "}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-10">
          <Loader2 className="animate-spin inline-block w-8 h-8 text-blue-500" />
          <p className="mt-2 text-gray-600">กำลังโหลด...</p>
        </div>
      )}
      {/* Error State */}
      {error && !isLoading && (
        <div role="alert" className="alert alert-error text-white shadow-md">
          <AlertCircle />
          <span>{error}</span>
        </div>
      )}

      {/* --- Data Display Area --- */}
      {!isLoading && !error && (
        <>
          {/* ================================================== */}
          {/* Card Layout (Mobile / Small Screens)      */}
          {/* ================================================== */}
          <div className="space-y-3 md:hidden">
            {/* Message if no data for selected year or no submissions at all */}
            {selectedAcademicYearId &&
              filteredSubmissions.length === 0 &&
              !isLoading && (
                <div className="text-center p-6 text-gray-500 bg-white rounded-lg shadow">
                  ไม่พบคำร้องสำหรับปีการศึกษา {currentYearName || ""}
                </div>
              )}
            {!selectedAcademicYearId &&
              submissions.length === 0 &&
              !isLoading && (
                <div className="text-center p-6 text-gray-500 bg-white rounded-lg shadow">
                  คุณยังไม่มีการยื่นคำร้อง
                </div>
              )}

            {/* Render Cards if data exists for the selected year */}
            {filteredSubmissions.map((sub) => (
              <div
                key={sub.submission_id + "-card"}
                className="bg-white p-4 rounded-lg shadow border border-gray-200"
              >
                {/* Card Header: Type and Status */}
                <div className="flex justify-between items-center mb-2 pb-2 border-b">
                  <span className="font-semibold text-sm text-gray-800">
                    {getDisplaySubmissionType(sub.type)}
                  </span>
                  {getStatusBadge(sub)}
                </div>
                {/* Card Body */}
                <div className="text-sm text-gray-700 mb-1 truncate font-medium">
                  {/* Display Topic or other main identifier */}
                  {sub.certificate_type
                    ? `${sub.certificate_type.certificate_name}`
                    : sub.type === "BloodDonate"
                    ? "บริจาคโลหิต"
                    : "-"}
                </div>
                {sub.certificate_type && (
                  <div className="text-xs text-gray-500 mb-1">
                    ({sub.certificate_type.certificate_code})
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-3">
                  <span>
                    ส่งเมื่อ: {dayjs(sub.created_at).format("D MMM BBBB")}
                  </span>
                  {/* Optionally show hours if relevant */}
                  {sub.hours !== null && sub.hours !== undefined && (
                    <span className="mx-2">|</span>
                  )}
                  {sub.hours !== null && sub.hours !== undefined && (
                    <span>ชม.: {sub.hours}</span>
                  )}
                </div>
                {/* Card Footer: Action Button */}
                <div className="text-right mt-2">
                  <button
                    className="btn btn-xs btn-outline btn-info" // Use outline button for less emphasis
                    onClick={() => setStatusPopupDetail(sub)}
                    title="ดูรายละเอียดสถานะ"
                  >
                    <Eye size={14} className="mr-1" /> ดูรายละเอียด
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ==================================================== */}
          {/* Table Layout (Medium Screens and Up)        */}
          {/* ==================================================== */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
            <table className="table w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  {/* Adjust widths as needed for desktop */}
                  <th className="p-3 w-2/12">ประเภท</th>
                  <th className="p-3 w-4/12">หัวข้อ/รายละเอียด</th>
                  <th className="p-3 w-1/12 text-center">ชม.</th>
                  <th className="p-3 w-2/12">วันที่ส่ง</th>
                  <th className="p-3 w-2/12 text-center">สถานะ</th>
                  <th className="p-3 w-1/12 text-center"></th> {/* Action */}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Messages for empty states */}
                {!selectedAcademicYearId &&
                  submissions.length === 0 &&
                  !isLoading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center p-10 text-gray-500"
                      >
                        คุณยังไม่มีการยื่นคำร้อง
                      </td>
                    </tr>
                  )}
                {selectedAcademicYearId &&
                  filteredSubmissions.length === 0 &&
                  !isLoading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center p-10 text-gray-500"
                      >
                        ไม่พบคำร้องสำหรับปีการศึกษา {currentYearName || ""}
                      </td>
                    </tr>
                  )}

                {/* Render Table Rows */}
                {filteredSubmissions.map((sub) => (
                  <tr
                    key={sub.submission_id + "-row"}
                    className="hover:bg-gray-50 text-gray-800"
                  >
                    <td className="p-3 break-words">
                      {getDisplaySubmissionType(sub.type)}
                    </td>
                    <td className="p-3 break-words">
                      {sub.certificate_type
                        ? `${sub.certificate_type.certificate_name} (${sub.certificate_type.certificate_code})`
                        : "-"}
                    </td>
                    <td className="p-3 text-center tabular-nums">
                      {sub.hours ?? "-"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {dayjs(sub.created_at).format("D MMM BBBB HH:mm")}
                    </td>
                    <td className="p-3 text-center">{getStatusBadge(sub)}</td>
                    <td className="p-3 text-center">
                      <button
                        className="btn btn-xs btn-ghost text-blue-600 hover:bg-blue-50"
                        onClick={() => setStatusPopupDetail(sub)}
                        title="ดูรายละเอียดสถานะ"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div> // End of main container div
  );
}

export default UserSubmissionStatusPage;