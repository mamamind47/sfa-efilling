import React, { useState, useCallback } from "react"; // เพิ่ม useCallback ถ้าต้องการ
import { Dialog } from "@headlessui/react";
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle, // เพิ่ม icon สำหรับ error
  Loader2, // หรือใช้ loading spinner จาก DaisyUI/Tailwind
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import apiClient from "../api/axiosConfig";

function ModalUploadConfirm({
  isOpen,
  onClose,
  onUploaded,
  certificateTypeId,
  academicYearId,
  previewFiles,
  setPreviewFiles,
}) {
  const [isUploading, setIsUploading] = useState(false); // State สำหรับจัดการสถานะ Loading
  const [error, setError] = useState(null); // State สำหรับเก็บข้อความ Error

  // ใช้ useCallback ถ้ามีการส่ง onDrop ไปยัง component ลูก หรือเพื่อ optimization เล็กน้อย
  const onDrop = useCallback(
    (acceptedFiles) => {
      setPreviewFiles(acceptedFiles);
      setError(null); // ล้าง error เมื่อเลือกไฟล์ใหม่
    },
    [setPreviewFiles]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
      "application/pdf": [".pdf"],
    },
  });

  const removeFile = (index) => {
    setPreviewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (isUploading) return; // ไม่ให้ปิดขณะกำลังอัปโหลด
    setError(null); // ล้าง error เมื่อปิด
    onClose();
  };

  const handleSubmit = async () => {
    if (isUploading || previewFiles.length === 0) return; // ป้องกันการส่งซ้ำ หรือไม่มีไฟล์

    setIsUploading(true);
    setError(null); // ล้าง error ก่อนส่ง

    const formData = new FormData();
    formData.append("academic_year_id", academicYearId);
    formData.append("type", "Certificate");
    formData.append("certificate_type_id", certificateTypeId);
    previewFiles.forEach((file) => formData.append("files", file)); // 'files' ต้องตรงกับ backend (multer)

    try {
      const res = await apiClient.post("/submission", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // โดยทั่วไป API ที่สร้างข้อมูลสำเร็จจะคืน status 201 Created
      // แต่ถ้า backend คืน 200 ก็ใช้ได้
      if (res.status === 200 || res.status === 201) {
        onUploaded(); // เรียก callback เมื่อสำเร็จ (Parent component จะจัดการปิด modal และ fetch ข้อมูลใหม่)
      } else {
        // กรณี status อื่นๆ ที่ไม่ใช่ error แต่ไม่สำเร็จตามที่คาดหวัง
        console.warn("Upload completed with status:", res.status, res.data);
        setError(`อัปโหลดไม่สำเร็จ (สถานะ: ${res.status}), โปรดลองอีกครั้ง`);
      }
    } catch (err) {
      console.error("❌ Error uploading files:", err);
      // จัดการ ACTIVITY_LIMIT_EXCEEDED error แยกต่างหาก
      if (err.response?.data?.code === "ACTIVITY_LIMIT_EXCEEDED") {
        const details = err.response.data.details;
        setError(
          `เกินลิมิตแล้ว: ปัจจุบัน ${details.current}/${details.limit} ชั่วโมง หากส่ง ${details.requested} ชั่วโมง จะเป็น ${details.totalAfter} ชั่วโมง`
        );
      } else {
        // พยายามแสดงข้อความ error จาก backend ถ้ามี
        const errorMsg =
          err.response?.data?.error ||
          "เกิดข้อผิดพลาดในการอัปโหลด โปรดตรวจสอบการเชื่อมต่อ หรือไฟล์อีกครั้ง";
        setError(errorMsg);
      }
    } finally {
      setIsUploading(false); // คืนค่า loading state เสมอ ไม่ว่าจะสำเร็จหรือล้มเหลว
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-black bg-opacity-30"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded bg-white p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              อัปโหลดไฟล์ใบรับรอง
            </Dialog.Title>
            <button
              onClick={handleClose}
              disabled={isUploading} // Disable ปุ่มปิดขณะอัปโหลด
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* Dropzone Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded p-6 text-center cursor-pointer ${
              isUploading
                ? "bg-gray-100 border-gray-300 cursor-not-allowed" // ทำให้ดู inactive ตอนอัปโหลด
                : "border-orange-400 hover:bg-orange-50"
            }`}
          >
            <input {...getInputProps()} disabled={isUploading} />{" "}
            {/* Disable input ด้วย */}
            <UploadCloud className="mx-auto mb-2 text-orange-500" size={40} />
            <p className="text-sm text-gray-600">
              {isUploading
                ? "กำลังอัปโหลดไฟล์..."
                : "ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              (ไฟล์รูปภาพ หรือ PDF เท่านั้น)
            </p>
          </div>

          {/* Preview Files Area */}
          {previewFiles.length > 0 && (
            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-2">
              {" "}
              {/* จำกัดความสูง + scroll */}
              <p className="text-sm font-medium mb-2">ไฟล์ที่เลือก:</p>
              {previewFiles.map((file, index) => {
                // สร้าง URL ชั่วคราวสำหรับ preview
                const url = URL.createObjectURL(file);
                // เก็บ URL ไว้เพื่อ revoke ทีหลัง (ถ้าจำเป็น)
                // อาจจะใส่ใน useEffect cleanup ของ component นี้ หรือเมื่อ removeFile

                return (
                  <div
                    key={index}
                    className="flex flex-col px-3 py-2 bg-gray-50 rounded border border-gray-200"
                  >
                    {/* Preview Image/PDF */}
                    {file.type.startsWith("image/") ? (
                      <img
                        src={url}
                        alt={file.name}
                        className="w-full max-h-48 object-contain rounded mb-2" // ลดขนาด preview image
                        // ควร revoke URL เมื่อ component unmount หรือ file ถูกลบ
                        onLoad={() => URL.revokeObjectURL(url)} // Revoke หลังโหลดเสร็จ (อาจไม่ครอบคลุมทุกกรณี)
                      />
                    ) : file.type === "application/pdf" ? (
                      <iframe
                        src={url}
                        title={file.name}
                        className="w-full h-48 rounded border mb-2"
                      />
                    ) : (
                      <div className="text-center text-sm text-gray-500 py-4">
                        (ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้)
                      </div>
                    )}

                    {/* File Info & Remove Button */}
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText
                          className="text-orange-400 flex-shrink-0"
                          size={20}
                        />
                        <span className="text-sm truncate" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500 ml-1 flex-shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        className="text-red-500 hover:text-red-600 text-sm disabled:opacity-50 flex-shrink-0 ml-2"
                        onClick={() => removeFile(index)}
                        disabled={isUploading} // Disable ปุ่มลบขณะอัปโหลด
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Message Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end mt-6 space-x-3">
            <button
              className="btn btn-ghost" // ปุ่มยกเลิก
              onClick={handleClose}
              disabled={isUploading} // Disable ขณะอัปโหลด
            >
              ยกเลิก
            </button>
            <button
              className="btn bg-orange-500 hover:bg-orange-600 text-white" // ปุ่มยืนยัน
              onClick={handleSubmit}
              disabled={isUploading || previewFiles.length === 0} // Disable ขณะอัปโหลด หรือ ไม่มีไฟล์
            >
              {isUploading ? (
                <>
                  {/* ใช้ Loader2 หรือ spinner อื่นๆ */}
                  <Loader2 size={16} className="animate-spin mr-2" />
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="mr-1" />
                  ยืนยันการส่ง
                </>
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default ModalUploadConfirm;
