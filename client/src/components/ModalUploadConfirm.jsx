import React, { useRef } from "react";
import { Dialog } from "@headlessui/react";
import { UploadCloud, FileText, X, CheckCircle2 } from "lucide-react";
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
  const fileInputRef = useRef();

  const onDrop = (acceptedFiles) => {
    setPreviewFiles(acceptedFiles);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "image/*": [],
      "application/pdf": [],
    },
  });

  const removeFile = (index) => {
    setPreviewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("academic_year_id", academicYearId);
    formData.append("type", "Certificate");
    formData.append("certificate_type_id", certificateTypeId);
    previewFiles.forEach((file) => formData.append("files", file));

    try {
      const res = await apiClient.post("/submission", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.status === 200) {
        onUploaded(res.data.data[0]);
      } else {
        alert("อัปโหลดไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการอัปโหลด");
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
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
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <div
            {...getRootProps()}
            className="border-2 border-dashed border-orange-400 rounded p-6 text-center cursor-pointer hover:bg-orange-50"
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto mb-2 text-orange-500" size={40} />
            <p className="text-sm text-gray-600">
              ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์
            </p>
          </div>

          {previewFiles.length > 0 && (
            <div className="mt-4 space-y-3">
              {previewFiles.map((file, index) => {
                const url = URL.createObjectURL(file);
                return (
                  <div
                    key={index}
                    className="flex flex-col px-3 py-2 bg-gray-50 rounded border border-gray-200"
                  >
                    {file.type.startsWith("image/") ? (
                      <img
                        src={url}
                        alt={file.name}
                        className="w-full max-h-64 object-contain rounded"
                      />
                    ) : file.type === "application/pdf" ? (
                      <iframe
                        src={url}
                        title={file.name}
                        className="w-full h-64 rounded border"
                      />
                    ) : null}

                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-2">
                        <FileText className="text-orange-400" size={20} />
                        <span className="text-sm truncate max-w-[180px]">
                          {file.name}
                        </span>
                      </div>
                      <button
                        className="text-red-500 hover:text-red-600 text-sm"
                        onClick={() => removeFile(index)}
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              className="btn bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleSubmit}
              disabled={previewFiles.length === 0}
            >
              <CheckCircle2 size={16} className="mr-1" /> ยืนยันการส่ง
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default ModalUploadConfirm;