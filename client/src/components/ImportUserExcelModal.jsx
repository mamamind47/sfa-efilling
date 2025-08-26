import React, { useState, useCallback, useMemo, useEffect } from "react";
import { FileSpreadsheet, Loader2, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import apiClient from "../api/axiosConfig";
import { toast } from "react-hot-toast";

function ImportUserExcelModal({ isOpen, onClose, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [studentData, setStudentData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setSelectedFile(null);
    setStudentData([]);
    setSearchTerm("");
    setError(null);
  };

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen, loading, onClose]);

  const parseFile = useCallback((file) => {
    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const extractedData = rows
          .slice(1) // skip header
          .map((r) => ({
            studentId: String(r[0] || "").trim(),
            scholarshipType: String(r[1] || "").trim()
          }))
          .filter((item) => /^\d{11}$/.test(item.studentId));

        setStudentData(extractedData);
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการอ่านไฟล์");
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("ไม่สามารถอ่านไฟล์ได้");
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (files.length > 0) {
        setSelectedFile(files[0]);
        parseFile(files[0]);
      }
    },
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await apiClient.post("/admin/users/import-excel", formData);
      console.log('Upload response:', res.data);
      const { added, updated, failed } = res.data;
      
      let message = "";
      if (added?.length > 0) message += `เพิ่มใหม่ ${added.length} รายการ `;
      if (updated?.length > 0) message += `อัปเดท ${updated.length} รายการ `;
      if (failed?.length > 0) message += `ไม่สำเร็จ ${failed.length} รายการ`;
      
      toast.success(message || "อัปโหลดเสร็จสิ้น");
      onSuccess?.(res.data);
      reset();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    const q = searchTerm.trim();
    return studentData.filter((item) => item.studentId.includes(q));
  }, [studentData, searchTerm]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileSpreadsheet size={20} />
            อัปโหลดรายชื่อนักศึกษาจาก Excel
          </h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost" disabled={loading}>
            <X size={16} />
          </button>
        </div>

        <div
          {...getRootProps()}
          className="border border-dashed p-6 rounded-lg cursor-pointer text-center"
        >
          <input {...getInputProps()} />
          <FileSpreadsheet className="mx-auto mb-2 text-orange-400" size={48} />
          <p>
            {selectedFile
              ? `ไฟล์ที่เลือก: ${selectedFile.name}`
              : isDragActive
              ? "วางไฟล์ที่นี่..."
              : "ลากไฟล์ Excel มาวาง หรือคลิกเพื่อเลือก"}
          </p>
        </div>

        {loading && (
          <div className="flex justify-center items-center gap-2 text-primary">
            <Loader2 className="animate-spin" /> กำลังประมวลผล...
          </div>
        )}

        {error && <div className="text-error text-sm">{error}</div>}

        {studentData.length > 0 && !loading && (
          <>
            <div className="flex justify-between items-center">
              <p className="font-semibold">
                รายชื่อนักศึกษาทั้งหมด ({filteredData.length}/{studentData.length}
                )
              </p>
              <input
                type="text"
                className="input input-sm input-bordered"
                placeholder="ค้นหารหัสนักศึกษา"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>รหัสนักศึกษา</th>
                    <th>ประเภททุน</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.studentId}>
                      <td>{item.studentId}</td>
                      <td>{item.scholarshipType || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                className="btn bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                onClick={handleUpload}
                disabled={loading}
              >
                {loading && <Loader2 className="animate-spin mr-1" size={16} />}
                ยืนยันการเพิ่มรายชื่อ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ImportUserExcelModal;