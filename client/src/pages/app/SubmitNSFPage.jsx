// src/pages/app/SubmitNSFPage.jsx
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { UploadCloud, CheckCircle2, X, RotateCcw } from "lucide-react";
import apiClient from "../../api/axiosConfig";
import dayjs from "dayjs";
import "dayjs/locale/th";
dayjs.locale("th");

function SubmitNSFPage() {
  const { academic_year_id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const [acceptedFiles, setAcceptedFiles] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [hours, setHours] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const checkExistingSubmission = async () => {
      try {
        const res = await apiClient.get("/submission");
        const existing = res.data.find(
          (item) =>
            item.type === "NSF" && item.academic_year_id === academic_year_id
        );
        if (existing) {
          setAlreadySubmitted(true);
          setSubmittedData(existing);
        }
      } catch (err) {
        console.error("Error checking submissions", err);
      }
    };
    checkExistingSubmission();
  }, [academic_year_id]);

  const onDrop = (files) => {
    if (agreed) {
      setAcceptedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index) => {
    setAcceptedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "application/pdf": [],
    },
    multiple: true,
    disabled: !agreed,
  });

  const handleUpload = async () => {
    if (!agreed || acceptedFiles.length === 0) return;

    const formData = new FormData();
    formData.append("academic_year_id", academic_year_id);
    formData.append("type", "NSF");
    formData.append("hours", parseInt(hours));
    acceptedFiles.forEach((file) => formData.append("files", file));

    try {
      setUploading(true);
      await apiClient.post("/submission", formData);
      setShowSuccess(true);
      setAlreadySubmitted(false);
      setAcceptedFiles([]);
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
      setUploading(false);
    }
  };

  const renderProgress = () => {
    const status = submittedData?.status_logs?.[0]?.status || "submitted";
    const stepMap = {
      submitted: 1,
      review: 2,
      approved: 3,
      rejected: 2,
    };
    const current = stepMap[status];

    const stepClass = (step) => {
      const active = step <= current;
      return `w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
        step === current
          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
          : active
          ? "border-2 border-orange-400 text-orange-400"
          : "border border-gray-300 text-gray-400"
      }`;
    };

    const lineClass = (step) => {
      return step < current
        ? "h-1 w-10 bg-gradient-to-r from-yellow-400 to-orange-500"
        : "h-1 w-10 bg-gray-200";
    };

    return (
      <div className="mt-6 text-sm text-center space-y-4">
        <h3 className="font-semibold text-base text-center">สถานะคำขอ</h3>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className={stepClass(1)}>1</div>
            <div className="mt-1 text-xs">ยื่นคำขอ</div>
          </div>
          <div className={lineClass(1)}></div>
          <div className="flex flex-col items-center">
            <div className={stepClass(2)}>2</div>
            <div className="mt-1 text-xs">รอดำเนินการ</div>
          </div>
          <div className={lineClass(2)}></div>
          <div className="flex flex-col items-center">
            <div className={stepClass(3)}>3</div>
            <div className="mt-1 text-xs">อนุมัติแล้ว</div>
          </div>
        </div>

        <div className="text-gray-600 mt-4 space-y-1 text-left">
          <p>
            <span className="font-medium">รหัสคำขอ:</span>{" "}
            {submittedData?.submission_id || "-"}
          </p>
          <p>
            <span className="font-medium">จำนวนชั่วโมงที่ส่ง:</span>{" "}
            {submittedData?.hours_requested || hours} ชั่วโมง
          </p>
          {submittedData?.status_logs?.[0]?.status === "approved" && (
            <p>
              <span className="font-medium">จำนวนที่อนุมัติ:</span>{" "}
              {submittedData?.hours || "-"} ชั่วโมง
            </p>
          )}
          <p>
            <span className="font-medium">เวลาที่ส่ง:</span>{" "}
            {dayjs(submittedData?.created_at).format(
              "D MMMM BBBB เวลา H:mm น."
            )}
          </p>
          {submittedData?.status_logs?.[0]?.status === "rejected" && (
            <div className="text-center mt-6 space-y-3">
              <div className="border border-red-400 bg-red-50 text-red-600 p-3 rounded">
                <p>
                  <span className="font-semibold">เหตุผลที่ปฏิเสธ:</span>{" "}
                  {submittedData.status_logs?.[0]?.reason || "ไม่ระบุ"}
                </p>
              </div>
              <button
                className="btn btn-outline border-red-500 text-red-500 hover:border-red-600 transition-none"
                onClick={() => {
                  setAlreadySubmitted(false);
                  setAcceptedFiles([]);
                  setShowSuccess(false);
                }}
              >
                <RotateCcw
                  size={16}
                  className="mr-1 group-hover:animate-spin transition-transform"
                />
                อัปโหลดใหม่
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (showSuccess) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-6 text-center">
        <h2 className="text-xl font-semibold text-green-600">
          ส่งคำขอเรียบร้อยแล้ว
        </h2>
        <p className="text-gray-600">ระบบได้รับคำขอของคุณแล้ว</p>
        <button
          className="btn bg-orange-500 hover:bg-orange-600 text-white mt-4"
          onClick={() => navigate("/app/submit/select")}
        >
          กลับไปหน้าเลือกหัวข้อ
        </button>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-6 text-center">
        <h2 className="text-xl font-semibold text-red-600">
          คุณได้ส่งคำขอสำหรับออมเงิน กอช. ในปีการศึกษานี้แล้ว
        </h2>
        <p className="text-gray-600">ระบบอนุญาตให้ส่งได้เพียงครั้งเดียวต่อปี</p>
        <button
          className="btn bg-orange-500 hover:bg-orange-600 text-white mt-4"
          onClick={() => navigate("/app/submit/select")}
        >
          กลับไปหน้าเลือกหัวข้อ
        </button>

        {submittedData && renderProgress()}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">
        อัปโหลดเอกสารออมเงิน กอช.
      </h1>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
        โปรดอัปโหลดเกียรติบัตร (ถ้ามี) และรายการเดินบัญชี (Statement)
        ที่ดาวน์โหลดจากระบบของ กอช.
        <br />
        การส่งขออนุมัติชั่วโมงจิตอาสาสามารถทำได้ครั้งเดียวต่อปีการศึกษาเท่านั้น
        <br />
        (สามารถออมได้เดือนละ 1 ครั้ง
        โปรดทำให้ครบครั้งที่คาดว่าจะทำทั้งปีแล้วอัปโหลดทีเดียว)
        <br />
        หากมีการอนุมัติแล้วจะไม่สามารถส่งเพิ่มได้อีก
        <br />
        <strong>วิธีการคำนวณชั่วโมง:</strong> ออม 1 ครั้ง เท่ากับ 1 ชั่วโมง
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={agreed}
          onChange={() => setAgreed(!agreed)}
        />
        <label className="text-sm">ฉันรับทราบ</label>
      </div>

      <div>
        <label className="block text-sm mb-1">จำนวนชั่วโมง</label>
        <input
          type="number"
          className="input input-bordered w-full max-w-xs focus:outline-none"
          value={hours}
          min={0}
          onChange={(e) => setHours(e.target.value)}
          disabled={!agreed}
        />
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded p-6 text-center cursor-pointer ${
          agreed
            ? "border-orange-400 hover:bg-orange-50"
            : "border-gray-300 cursor-not-allowed bg-gray-100"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud
          className={`mx-auto mb-2 ${
            agreed ? "text-orange-500" : "text-gray-400"
          }`}
          size={40}
        />
        <p className="text-sm text-gray-600">
          {agreed
            ? "ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์"
            : "กรุณากดยอมรับก่อนจึงจะสามารถอัปโหลดได้"}
        </p>
      </div>

      {acceptedFiles.length > 0 && (
        <div className="space-y-3 max-h-64 overflow-auto">
          {acceptedFiles.map((file, index) => {
            const url = URL.createObjectURL(file);
            return (
              <div
                key={index}
                className="relative flex flex-col border p-2 rounded text-sm bg-gray-50"
              >
                <button
                  className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                  onClick={() => removeFile(index)}
                >
                  <X size={16} />
                </button>
                {file.type.includes("image") ? (
                  <img
                    src={url}
                    alt={file.name}
                    className="w-full h-auto rounded"
                  />
                ) : file.type.includes("pdf") ? (
                  <iframe
                    src={url}
                    title={file.name}
                    className="w-full h-40 border rounded"
                  />
                ) : (
                  <div>{file.name}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        className="btn bg-orange-500 hover:bg-orange-600 text-white"
        onClick={handleUpload}
        disabled={!agreed || acceptedFiles.length === 0 || uploading}
      >
        <CheckCircle2 size={16} className="mr-1" /> ยืนยันการส่ง
      </button>
    </div>
  );
}

export default SubmitNSFPage;
