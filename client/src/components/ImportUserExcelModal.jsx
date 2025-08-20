import React, { useState, useCallback, useMemo } from "react";
import { FileSpreadsheet, Loader2, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import apiClient from "../api/axiosConfig";
import { toast } from "react-hot-toast";

function ImportUserExcelModal({ isOpen, onClose, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [studentIds, setStudentIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setSelectedFile(null);
    setStudentIds([]);
    setSearchTerm("");
    setError(null);
  };

  const parseFile = useCallback((file) => {
    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const extractedIds = rows
          .slice(1) // skip header
          .map((r) => String(r[0] || "").trim())
          .filter((id) => /^\d{11}$/.test(id));

        setStudentIds(extractedIds);
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
      onSuccess?.(res.data);
      toast.success("อัปโหลดรายชื่อสำเร็จ");
      reset();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredIds = useMemo(() => {
    const q = searchTerm.trim();
    return studentIds.filter((id) => id.includes(q));
  }, [studentIds, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileSpreadsheet size={20} />
            อัปโหลดรายชื่อนักศึกษาจาก Excel
          </h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost">
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

        {studentIds.length > 0 && !loading && (
          <>
            <div className="flex justify-between items-center">
              <p className="font-semibold">
                รายชื่อนักศึกษาทั้งหมด ({filteredIds.length}/{studentIds.length}
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
                  </tr>
                </thead>
                <tbody>
                  {filteredIds.map((id) => (
                    <tr key={id}>
                      <td>{id}</td>
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