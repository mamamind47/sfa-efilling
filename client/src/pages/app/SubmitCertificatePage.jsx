// src/pages/app/SubmitCertificatePage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../../api/axiosConfig";
import { Upload, Search, Eye, X, RotateCcw } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/th";
import ModalUploadConfirm from "../../components/ModalUploadConfirm";
import exSET from "../../assets/SET.jpg";
dayjs.locale("th");

function SubmitCertificatePage() {
  const { academic_year_id } = useParams();
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [filteredTypes, setFilteredTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [statusPopup, setStatusPopup] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [academicPeriod, setAcademicPeriod] = useState(null);
  const [showSetModal, setShowSetModal] = useState(false);


  const fetchSubmissions = async () => {
    try {
      const res = await apiClient.get("/submission");
      setSubmissions(res.data);
    } catch (err) {
      console.error("โหลด submission ล้มเหลว", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [certRes, subRes] = await Promise.all([
          apiClient.get("/certificate"),
          apiClient.get("/submission"),
        ]);

        const activeTypes = certRes.data.filter((cert) => cert.is_active === 1);
        setCertificateTypes(activeTypes);
        setFilteredTypes(activeTypes);
        setSubmissions(subRes.data);
      } catch (err) {
        console.error("โหลดข้อมูลล้มเหลว", err);
        setError("ไม่สามารถโหลดข้อมูลได้");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = certificateTypes.filter(
      (type) =>
        type.certificate_code.toLowerCase().includes(query) ||
        type.certificate_name.toLowerCase().includes(query) ||
        type.category.toLowerCase().includes(query)
    );
    setFilteredTypes(filtered);
  }, [searchQuery, certificateTypes]);

  useEffect(() => {
    const fetchAcademicPeriod = async () => {
      try {
        const res = await apiClient.get("/academic");
        const year = res.data.find(
          (ay) => ay.academic_year_id === academic_year_id
        );
        if (year) {
          setAcademicPeriod({
            start: dayjs(year.start_date).format("D MMMM BBBB"),
            end: dayjs(year.end_date).format("D MMMM BBBB"),
          });
        }
      } catch (err) {
        console.error("Error loading academic year dates", err);
      }
    };
    fetchAcademicPeriod();
  }, [academic_year_id]);


  const handleUpload = (certificate_type_id) => {
    setUploadTarget(certificate_type_id);
    setShowUploadModal(true);
    setPreviewFiles([]);
  };

  const getSubmissionByType = (certId) => {
    return submissions.find(
      (sub) => sub?.certificate_type_id && sub.certificate_type_id === certId
    );
  };

  const handleUploaded = async () => {
    setShowUploadModal(false);
    setUploadTarget(null);
    setPreviewFiles([]);
    setStatusPopup(null); // ✅ ปิด popup สถานะเมื่ออัปโหลดเสร็จ
    await fetchSubmissions();
  };

  const renderStatusStep = (sub) => {
    const status = sub.status_logs?.[0]?.status || "submitted";
    const reason = sub.status_logs?.[0]?.reason || null;

    const stepClass = (step) => {
      const stepMap = {
        submitted: 1,
        review: 2,
        approved: 3,
        rejected: 2,
      };
      const current = stepMap[status] || 1;
      const isActive = step <= current;
      const gradStyle =
        step === current
          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none"
          : isActive
          ? "border-2 border-orange-400 text-orange-400"
          : "border border-gray-300 text-gray-400";
      return `w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${gradStyle}`;
    };

    const lineClass = (step) => {
      const stepMap = {
        submitted: 1,
        review: 2,
        approved: 3,
        rejected: 2,
      };
      const current = stepMap[status] || 1;
      return step < current
        ? "h-1 w-12 bg-gradient-to-r from-yellow-400 to-orange-500 mx-2"
        : "h-1 w-12 bg-gray-200 mx-2";
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-md relative">
          <button
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            onClick={() => setStatusPopup(null)}
          >
            <X size={20} />
          </button>

          <h2 className="text-lg font-semibold mb-4 text-center">สถานะคำขอ</h2>

          <div className="flex items-center justify-between px-4 mb-6">
            <div className="flex flex-col items-center">
              <div className={stepClass(1)}>1</div>
              <div className="mt-1 text-sm">ยื่นคำขอ</div>
            </div>
            <div className={lineClass(1)}></div>
            <div className="flex flex-col items-center">
              <div className={stepClass(2)}>2</div>
              <div className="mt-1 text-sm">รอดำเนินการ</div>
            </div>
            <div className={lineClass(2)}></div>
            <div className="flex flex-col items-center">
              <div className={stepClass(3)}>3</div>
              <div className="mt-1 text-sm">อนุมัติแล้ว</div>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-2">
            รหัสคำขอ: {sub.submission_id}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            เวลาที่ส่ง:{" "}
            {dayjs(sub.created_at).format("D MMMM BBBB เวลา H:mm น.")}
          </div>
          <div className="text-sm text-gray-600 mb-4">
            ใบรับรอง: {sub.certificate_type?.certificate_name || "-"} (
            {sub.certificate_type?.certificate_code || "-"})
          </div>

          {status === "rejected" && (
            <>
              <div className="mt-4 p-3 border border-red-400 text-red-600 rounded">
                <strong className="font-bold">เหตุผล:</strong>{" "}
                <span className="font-normal">{reason || "ไม่ระบุ"}</span>
              </div>
              <div className="text-center mt-4">
                <button
                  className="btn btn-outline btn-error group"
                  onClick={() => {
                    handleUpload(sub.certificate_type_id);
                    setStatusPopup(null); // ✅ ปิด popup ก่อนเปิด upload
                  }}
                >
                  <RotateCcw
                    size={16}
                    className="mr-1 group-hover:animate-spin"
                  />
                  อัปโหลดใหม่
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">รายการหัวข้อใบรับรองทั้งหมด</h1>

      <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-4 rounded text-sm space-y-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <span>
            ใบรับรองของ <strong>SET e-Learning</strong> จะต้องมีโลโก้ของ{" "}
            <strong>กยศ.</strong> เท่านั้น
          </span>
          <button
            onClick={() => setShowSetModal(true)}
            className="btn btn-xs btn-outline text-yellow-700 border-yellow-500 hover:bg-yellow-100 w-max"
          >
            ดูตัวอย่าง
          </button>
        </div>

        {academicPeriod && (
          <p className="text-red-600">
            * กิจกรรมที่ส่งต้องอยู่ในช่วงวันที่ {academicPeriod.start} ถึง{" "}
            {academicPeriod.end}
          </p>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="bg-base-100 p-4 rounded-lg shadow border max-w-xl">
        <label className="block text-sm font-medium mb-2">ค้นหาใบรับรอง</label>
        <div className="relative">
          <input
            type="text"
            className="input input-bordered w-full pl-10 focus:outline-none focus:ring-0"
            placeholder="ค้นหาใบรับรอง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={16}
          />
        </div>
      </div>

      <div className="bg-base-100 p-4 rounded-lg shadow border overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>หัวข้อ</th>
              <th>หมวดหมู่</th>
              <th>จำนวนชั่วโมง</th>
              <th className="text-center">สถานะ</th>
              <th className="text-center">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredTypes.map((type) => {
              if (!type?.certificate_type_id) return null;

              const sub = getSubmissionByType(type.certificate_type_id);
              const sameTypeApproved = submissions.find(
                (s) =>
                  s?.certificate_type_id &&
                  s.certificate_type_id === type.certificate_type_id &&
                  s.academic_year_id !== academic_year_id &&
                  s.status_logs?.[0]?.status === "approved"
              );
              if (sameTypeApproved) return null;

              const statusRaw = sub?.status_logs?.[0]?.status;
              const statusText =
                statusRaw === "approved" ? (
                  <span className="text-green-500 font-medium">
                    อนุมัติแล้ว
                  </span>
                ) : statusRaw === "rejected" ? (
                  <span className="text-red-500 font-medium">ถูกปฏิเสธ</span>
                ) : statusRaw === "submitted" ? (
                  "กำลังตรวจสอบ"
                ) : (
                  "-"
                );

              return (
                <tr key={type.certificate_type_id}>
                  <td>{type.certificate_code}</td>
                  <td>{type.certificate_name}</td>
                  <td>{type.category}</td>
                  <td>{type.hours} ชั่วโมง</td>
                  <td className="text-center align-middle">{statusText}</td>
                  <td className="text-center align-middle">
                    {!sub ? (
                      <button
                        className="btn btn-sm bg-orange-500 hover:bg-orange-600 text-white border-none"
                        onClick={() => handleUpload(type.certificate_type_id)}
                        disabled={
                          uploadingId === type.certificate_type_id || loading
                        }
                      >
                        <Upload size={16} /> อัปโหลด
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatusPopup(sub)}
                        className="btn btn-sm bg-white hover:bg-gray-100 border-gray-300"
                      >
                        <Eye className="text-yellow-500 mr-1" size={16} />{" "}
                        ดูสถานะ
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {statusPopup && renderStatusStep(statusPopup)}

      {showSetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowSetModal(false)}
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold">
              ตัวอย่างใบรับรอง SET ที่ถูกต้อง
            </h3>
            <img
              src={exSET}
              alt="ตัวอย่างใบรับรอง"
              className="w-full mt-4 rounded border"
            />
            <div className="text-right mt-4">
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowSetModal(false)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalUploadConfirm
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        certificateTypeId={uploadTarget}
        academicYearId={academic_year_id}
        onUploaded={handleUploaded}
        previewFiles={previewFiles}
        setPreviewFiles={setPreviewFiles}
      />
    </div>
  );
  
}

export default SubmitCertificatePage;
