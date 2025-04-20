import React, { useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "../../api/axiosConfig";
import { Upload, CheckCircle, Search, FileSpreadsheet, X } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";

function UploadScholarshipPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [allParsedData, setAllParsedData] = useState([]);
  const [headers, setHeaders] = useState(["รหัสนักศึกษา", "สถานะผู้ใช้งาน"]);
  const [parsedRowCount, setParsedRowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadResponse, setUploadResponse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [activeStatusMap, setActiveStatusMap] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const res = await apiClient.get("/academic");
        const sorted = [...res.data].sort((a, b) =>
          b.year_name.localeCompare(a.year_name)
        );
        setAcademicYears(sorted);
        if (sorted.length > 0) setSelectedYear(sorted[0].year_name);
      } catch (err) {
        console.error("โหลดปีการศึกษาล้มเหลว", err);
      }
    };
    fetchAcademicYears();
  }, []);

  const resetState = () => {
    setSelectedFile(null);
    setAllParsedData([]);
    setParsedRowCount(0);
    setError(null);
    setUploadResponse(null);
    setSearchTerm("");
    setActiveStatusMap({});
  };

  const parseFileForPreview = useCallback((file) => {
    setIsLoading(true);
    const reader = new FileReader();
    const fileExtension = file.name.split(".").pop().toLowerCase();
    const isExcel = ["xlsx", "xls"].includes(fileExtension);

    reader.onload = async (e) => {
      try {
        let dataRows = [];
        if (isExcel) {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range: 5,
            blankrows: false,
          });

          const rows = rawData
            .map((rowArray) => {
              const studentId = String(rowArray[2] || "").trim();
              if (!studentId) return null;
              return { student_id: studentId };
            })
            .filter((row) => row !== null);

          setParsedRowCount(rows.length);
          setAllParsedData(rows);

          // Query active statuses
          const studentIds = rows.map((r) => r.student_id);
          const res = await apiClient.post("/admin/active-students", {
            studentIds,
          });
          const map = {};
          res.data.forEach((r) => {
            map[r.user_id] = r.isActive;
          });
          setActiveStatusMap(map);
        }
      } catch (parseError) {
        setError(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${parseError.message}`);
        setSelectedFile(null);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError("ไม่สามารถอ่านไฟล์ได้");
      setIsLoading(false);
      setSelectedFile(null);
    };

    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        setUploadResponse(null);
        setError(null);
        parseFileForPreview(file);
      } else {
        resetState();
      }
    },
    [parseFileForPreview]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: false,
  });

  const filteredPreviewData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return allParsedData;
    return allParsedData.filter((row) =>
      String(row.student_id).toLowerCase().includes(term)
    );
  }, [allParsedData, searchTerm]);

  const handleUploadSubmit = async () => {
    if (!selectedFile || !selectedType || !selectedYear) {
      setError("กรุณาเลือกไฟล์ ประเภท และปีการศึกษาให้ครบถ้วน");
      return;
    }

    setIsLoading(true);
    setError(null);
    setUploadResponse(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", selectedType);
      formData.append("academic_year", selectedYear);

      const response = await apiClient.post("/link/upload-applied", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadResponse(response.data);
      setShowSuccessModal(true); // ✅ เปิด Modal
    } catch (err) {
      const errMsg =
        err.response?.data?.error || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์";
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center space-x-2 text-base-content">
        <Upload className="text-orange-500" size={24} />
        <span>อัปโหลดรายชื่อผู้สมัครทุนการศึกษา</span>
      </h1>

      <div className="flex gap-4 flex-wrap">
        <select
          className="select select-bordered focus:outline-none focus:ring-0 focus:border-base-300"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="">เลือกประเภท</option>
          <option value="ประเภทที่ 1">ประเภทที่ 1</option>
          <option value="ประเภทที่ 2">ประเภทที่ 2</option>
        </select>

        <select
          className="select select-bordered focus:outline-none focus:ring-0 focus:border-base-300"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="">เลือกปีการศึกษา</option>
          {academicYears.map((y) => (
            <option key={y.academic_year_id} value={y.year_name}>
              {y.year_name}
            </option>
          ))}
        </select>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-10 py-16 text-center cursor-pointer w-full max-w-lg mx-auto ${
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-base-300 hover:border-primary"
        }`}
      >
        <input {...getInputProps()} id="volunteerFileInput" />
        <div className="flex flex-col items-center space-y-2">
          <FileSpreadsheet
            size={48}
            className={isDragActive ? "text-primary" : "text-primary/40"}
          />
          {selectedFile ? (
            <div>
              <p className="font-semibold text-success">
                ไฟล์ที่เลือก: {selectedFile.name}
              </p>
              <button
                onClick={resetState}
                className="btn btn-xs btn-ghost text-error mt-1"
              >
                ล้างไฟล์
              </button>
            </div>
          ) : (
            <p className="text-base-content/80 text-lg">
              ลากและวางไฟล์ที่นี่ หรือ{" "}
              <span className="link link-primary font-semibold">เลือกไฟล์</span>
            </p>
          )}
          <p className="text-xs opacity-60 mt-1">
            รองรับไฟล์ .xlsx และ .xls เท่านั้น
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mt-4">
          <X size={18} />
          <span>{error}</span>
        </div>
      )}

      {allParsedData.length > 0 && (
        <div className="card bg-base-100 shadow-md max-w-[800px] mx-auto">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">
                ตัวอย่างรายชื่อ ({filteredPreviewData.length} รายชื่อ)
              </h2>
              <label className="input input-bordered input-sm flex items-center gap-2 w-[300px]">
                <input
                  type="text"
                  className="grow focus:outline-none bg-transparent"
                  placeholder="ค้นหารหัสนักศึกษา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={16} className="opacity-50" />
              </label>
            </div>
            <div className="overflow-x-auto max-h-96 border border-base-300 rounded-xl">
              <table className="table w-full">
                <thead className="bg-base-200 sticky top-0 z-10">
                  <tr>
                    {headers.map((header) => (
                      <th
                        key={header}
                        className="text-center whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPreviewData.map((row, index) => (
                    <tr key={index} className="hover:bg-base-100/50">
                      <td className="text-center align-middle">
                        {row.student_id}
                      </td>
                      <td className="text-center align-middle">
                        {activeStatusMap[row.student_id]
                          ? "เข้าใช้งานระบบแล้ว"
                          : "ไม่เคยเข้าใช้งานระบบ"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-actions justify-end mt-4">
              <button
                className="btn btn-primary"
                disabled={isLoading || parsedRowCount === 0}
                onClick={handleUploadSubmit}
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <CheckCircle size={16} className="mr-1" />
                )}
                ยืนยันการอัปโหลด
              </button>
            </div>
          </div>
        </div>
      )}
      {showSuccessModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">อัปโหลดสำเร็จ</h3>
            <p className="py-2">{uploadResponse?.message}</p>
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowSuccessModal(false);
                  resetState();
                }}
              >
                ตกลง
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default UploadScholarshipPage;
