import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { UploadCloud, CheckCircle2, X, RotateCcw } from "lucide-react";
import apiClient from "../../api/axiosConfig";
import dayjs from "dayjs";
import "dayjs/locale/th";
import toast from "react-hot-toast";
dayjs.locale("th");

function SubmitSocialDevelopmentPage() {
  const { academic_year_id } = useParams();
  const navigate = useNavigate();

  const [acceptedFiles, setAcceptedFiles] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [hours, setHours] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [academicPeriod, setAcademicPeriod] = useState(null);
  const [socialSubmissions, setSocialSubmissions] = useState([]);

  const checkSubmissions = async () => {
    try {
      const res = await apiClient.get("/submission");
      const filtered = res.data.filter(
        (item) =>
          item.type === "social-development" &&
          item.academic_year_id === academic_year_id
      );
      setSocialSubmissions(filtered);
    } catch (err) {
      console.error("Error loading submissions", err);
    }
  };

  useEffect(() => {
    checkSubmissions();
  }, [academic_year_id]);

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

  const onDrop = (files) => {
    if (!agreed) return;

    const maxFiles = 10;
    const maxSizeMB = 10;
    const newFiles = [];

    if (acceptedFiles.length + files.length > maxFiles) {
      toast.error("อัปโหลดได้สูงสุดไม่เกิน 10 ไฟล์");
      return;
    }

    for (let file of files) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`ไฟล์ ${file.name} มีขนาดเกิน 10MB`);
        return;
      }
      newFiles.push(file);
    }

    setAcceptedFiles((prev) => [...prev, ...newFiles]);
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
    formData.append("type", "social-development");
    formData.append("hours", parseInt(hours));
    acceptedFiles.forEach((file) => formData.append("files", file));

    try {
      setUploading(true);
      await apiClient.post("/submission", formData);
      setShowSuccess(true);
      setAcceptedFiles([]);
      checkSubmissions();
    } catch {
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
      setUploading(false);
    }
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

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">
        อัปโหลดหลักฐานในการทำกิจกรรมทำนุบำรุงและพัฒนาโรงเรียนและชุมชน
      </h1>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
        โปรดอัปโหลดแบบฟอร์มรับรองการทำกิจกรรมพร้อมลายมือชื่อของผู้รับรอง
        พร้อมรูปถ่ายขณะทำกิจกรรม
        <br />
        {academicPeriod && (
          <p className="text-red-600 mt-2">
            * กิจกรรมที่ส่งต้องอยู่ในช่วงวันที่ {academicPeriod.start} ถึง{" "}
            {academicPeriod.end}
          </p>
        )}
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

      {socialSubmissions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-center text-gray-700">
            รายการที่เคยยื่นไปแล้วในปีการศึกษานี้
          </h2>
          <div className="space-y-4">
            {socialSubmissions.map((item) => (
              <div key={item.submission_id} className="border rounded p-3 bg-gray-50">
                <p>
                  <strong>รหัสคำขอ:</strong> {item.submission_id}
                </p>
                <p>
                  <strong>เวลาที่ส่ง:</strong>{" "}
                  {dayjs(item.created_at).format("D MMMM BBBB เวลา H:mm น.")}
                </p>
                <p>
                  <strong>สถานะ:</strong>{" "}
                  {item.status_logs?.[0]?.status === "approved"
                    ? "อนุมัติแล้ว"
                    : item.status_logs?.[0]?.status === "rejected"
                    ? "ปฏิเสธ"
                    : "กำลังตรวจสอบ"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SubmitSocialDevelopmentPage;
