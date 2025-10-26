import React, { useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import apiClient from "../api/axiosConfig";

const DocumentUploadForm = ({ projectId, role, hasExistingFiles = false, onSuccess, onCancel }) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState({
    photos: [],
    certificate: null,
    others: []
  });

  const handlePhotoChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => file.type.startsWith('image/'));

    if (validFiles.length !== selectedFiles.length) {
      toast.error("รองรับเฉพาะไฟล์รูปภาพเท่านั้น");
    }

    setFiles(prev => ({
      ...prev,
      photos: [...prev.photos, ...validFiles].slice(0, 5)
    }));
  };

  const handleCertificateChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/', 'application/pdf'];
      const isValid = validTypes.some(type => file.type.startsWith(type));

      if (!isValid) {
        toast.error("รองรับเฉพาะไฟล์รูปภาพและ PDF เท่านั้น");
        return;
      }

      setFiles(prev => ({ ...prev, certificate: file }));
    }
  };

  const handleOtherFilesChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validTypes = ['image/', 'application/pdf'];
    const validFiles = selectedFiles.filter(file =>
      validTypes.some(type => file.type.startsWith(type))
    );

    if (validFiles.length !== selectedFiles.length) {
      toast.error("รองรับเฉพาะไฟล์รูปภาพและ PDF เท่านั้น");
    }

    setFiles(prev => ({
      ...prev,
      others: [...prev.others, ...validFiles]
    }));
  };

  const removePhoto = (index) => {
    setFiles(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const removeCertificate = () => {
    setFiles(prev => ({ ...prev, certificate: null }));
  };

  const removeOtherFile = (index) => {
    setFiles(prev => ({
      ...prev,
      others: prev.others.filter((_, i) => i !== index)
    }));
  };

  const validateFiles = () => {
    // ถ้าเคยอัปโหลดแล้ว ให้เช็คแค่ว่ามีไฟล์อัปโหลดอย่างน้อย 1 ชิ้น
    if (hasExistingFiles) {
      const hasAnyFile = files.photos.length > 0 || files.certificate || files.others.length > 0;
      if (!hasAnyFile) {
        toast.error("กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์");
        return false;
      }
      return true;
    }

    // ครั้งแรก: บังคับตามเดิม
    if (files.photos.length < 5) {
      toast.error("กรุณาอัปโหลดรูปภาพกิจกรรมอย่างน้อย 5 ภาพ");
      return false;
    }

    // Admin doesn't need certificate
    if (role !== 'admin' && !files.certificate) {
      toast.error("กรุณาอัปโหลดเอกสารรับรอง (กยศ.002 หรือ กยศ.003)");
      return false;
    }

    return true;
  };

  const handleUpload = async () => {
    if (!validateFiles()) {
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      // Add photos
      files.photos.forEach(file => {
        formData.append("photos", file);
      });

      // Add certificate
      if (files.certificate) {
        formData.append("certificate", files.certificate);
      }

      // Add other files
      files.others.forEach(file => {
        formData.append("others", file);
      });

      await apiClient.post(`/projects/${projectId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("อัปโหลดเอกสารสำเร็จ");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการอัปโหลดเอกสาร");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="divider text-sm font-semibold">อัปโหลดเอกสาร</div>

      {/* 1. รูปภาพกิจกรรม (บังคับ 5 ภาพ) */}
      <div className="form-control">
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-xs font-semibold">
            รูปภาพขณะทำกิจกรรม {!hasExistingFiles && (
              <span className="text-error">* (5 ภาพ)</span>
            )}
          </label>
          <span className="text-[10px] text-gray-500">{files.photos.length}/5</span>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
            id="photo-upload"
            disabled={uploading || files.photos.length >= 5}
          />
          <label htmlFor="photo-upload" className="cursor-pointer">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-1.5" />
            <p className="text-xs text-gray-600">
              {files.photos.length >= 5 ? "อัปโหลดครบแล้ว" : "คลิกเพื่อเลือกรูปภาพ"}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">รองรับไฟล์รูปภาพเท่านั้น</p>
          </label>
        </div>

        {files.photos.length > 0 && (
          <div className="mt-4 grid grid-cols-5 gap-3">
            {files.photos.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`รูปที่ ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 btn btn-circle btn-sm btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. เอกสารรับรอง (บังคับสำหรับนักศึกษา) */}
      <div className="form-control">
        <label className="block text-xs font-semibold mb-1.5">
          เอกสารรับรอง กยศ.002 / กยศ.003 {!hasExistingFiles && role !== 'admin' && <span className="text-error">*</span>}
        </label>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors cursor-pointer">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleCertificateChange}
            className="hidden"
            id="certificate-upload"
            disabled={uploading}
          />
          <label htmlFor="certificate-upload" className="cursor-pointer">
            <FileText className="mx-auto h-8 w-8 text-gray-400 mb-1.5" />
            <p className="text-xs text-gray-600">
              {files.certificate ? "เปลี่ยนเอกสาร" : "คลิกเพื่อเลือกเอกสาร"}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">รองรับไฟล์รูปภาพและ PDF</p>
          </label>
        </div>

        {files.certificate && (
          <div className="alert shadow-sm mt-2 py-2">
            <div>
              <FileText className="h-5 w-5" />
              <span className="text-xs">{files.certificate.name}</span>
            </div>
            <button
              type="button"
              onClick={removeCertificate}
              className="btn btn-ghost btn-xs btn-circle"
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. เอกสารอื่นๆ (ไม่บังคับ) */}
      <div className="form-control">
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-xs font-semibold">
            เอกสารอื่นๆ (ถ้ามี)
          </label>
          {files.others.length > 0 && (
            <span className="text-[10px] text-gray-500">{files.others.length} ไฟล์</span>
          )}
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleOtherFilesChange}
            className="hidden"
            id="other-files-upload"
            disabled={uploading}
          />
          <label htmlFor="other-files-upload" className="cursor-pointer">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-1.5" />
            <p className="text-xs text-gray-600">คลิกเพื่อเลือกเอกสาร</p>
            <p className="text-[10px] text-gray-500 mt-0.5">รองรับไฟล์รูปภาพและ PDF</p>
          </label>
        </div>

        {files.others.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {files.others.map((file, index) => (
              <div key={index} className="alert shadow-sm py-2">
                <div>
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeOtherFile(index)}
                  className="btn btn-ghost btn-xs btn-circle"
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-sm btn-ghost"
          disabled={uploading}
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleUpload}
          className="btn btn-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 hover:from-orange-600 hover:to-amber-600"
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-1" />
              กำลังอัปโหลด...
            </>
          ) : (
            "อัปโหลดเอกสาร"
          )}
        </button>
      </div>
    </div>
  );
};

export default DocumentUploadForm;
