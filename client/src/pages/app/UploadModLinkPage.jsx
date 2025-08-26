// src/pages/app/UploadModLinkPage.jsx
import React, { useState, useCallback, useMemo } from "react";
import apiClient from "../../api/axiosConfig";
import { Upload, CheckCircle, Search, FileSpreadsheet, X, AlertCircle, Check } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";

function UploadModLinkPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [allParsedData, setAllParsedData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [parsedRowCount, setParsedRowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadResponse, setUploadResponse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showResultModal, setShowResultModal] = useState(false);

  const expectedHeaders = [
    "รหัสนักศึกษา",
    "ปีการศึกษา",
    "ชื่อโครงการ",
    "จำนวนชั่วโมงที่ทำกิจกรรม",
    "ประเภทกิจกรรมจิตอาสา",
  ];
  const [studentIdHeader, yearHeader, projectNameHeader, hoursHeader, activityTypeHeader] = expectedHeaders;

  const resetState = () => {
    setSelectedFile(null);
    setAllParsedData([]);
    setHeaders([]);
    setParsedRowCount(0);
    setError(null);
    setUploadResponse(null);
    setSearchTerm("");
    setShowResultModal(false);
  };

  const parseFileForPreview = useCallback((file) => {
    setIsLoading(true);
    const reader = new FileReader();
    const fileExtension = file.name.split(".").pop().toLowerCase();
    const isExcel = ["xlsx", "xls"].includes(fileExtension);

    reader.onload = (e) => {
      try {
        let parsedHeaders = [];
        let dataRows = [];

        if (isExcel) {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range: 1,
            blankrows: false,
          });
          if (rawData.length < 1)
            throw new Error("ไม่พบ Header ในไฟล์ Excel (แถวที่ 2)");
          parsedHeaders = rawData[0].map((h) => String(h || "").trim());
          dataRows = rawData.slice(1);
        } else {
          const result = Papa.parse(e.target.result, { skipEmptyLines: true });
          if (result.errors.length > 0)
            throw new Error("รูปแบบ CSV ไม่ถูกต้อง");
          if (result.data.length < 3)
            throw new Error("CSV ต้องมีอย่างน้อย 3 แถว");
          parsedHeaders = result.data[1].map((h) => String(h || "").trim());
          dataRows = result.data.slice(2);
        }

        const requiredHeadersPresent = expectedHeaders.every((h) =>
          parsedHeaders.includes(h)
        );
        if (!requiredHeadersPresent) {
          const missing = expectedHeaders.filter(
            (h) => !parsedHeaders.includes(h)
          );
          throw new Error(
            `Header ในไฟล์ไม่ถูกต้อง ขาด Header: ${missing.join(", ")}`
          );
        }

        const headerIndices = {
          studentId: parsedHeaders.indexOf(studentIdHeader),
          year: parsedHeaders.indexOf(yearHeader),
          projectName: parsedHeaders.indexOf(projectNameHeader),
          hours: parsedHeaders.indexOf(hoursHeader),
          activityType: parsedHeaders.indexOf(activityTypeHeader),
        };

        const mappedData = dataRows
          .map((rowArray, rowIndex) => {
            const studentId = String(
              rowArray[headerIndices.studentId] || ""
            ).trim();
            const academicYear = String(
              rowArray[headerIndices.year] || ""
            ).trim();
            const projectName = String(
              rowArray[headerIndices.projectName] || ""
            ).trim();
            const totalHoursString = String(
              rowArray[headerIndices.hours] || ""
            ).trim();
            const hoursNum = parseInt(totalHoursString, 10);
            const activityType = String(
              rowArray[headerIndices.activityType] || ""
            ).trim();

            if (
              !studentId ||
              !academicYear ||
              !projectName ||
              isNaN(hoursNum) ||
              hoursNum <= 0 ||
              !activityType
            ) {
              console.warn(`Skipping row ${rowIndex + 3} due to invalid data`);
              return null;
            }

            return {
              [studentIdHeader]: studentId,
              [yearHeader]: academicYear,
              [projectNameHeader]: projectName,
              [hoursHeader]: hoursNum,
              [activityTypeHeader]: activityType,
            };
          })
          .filter((row) => row !== null);

        setHeaders(expectedHeaders);
        setParsedRowCount(mappedData.length);
        setAllParsedData(mappedData);
      } catch (parseError) {
        console.error("Error parsing file:", parseError);
        setError(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${parseError.message}`);
        setSelectedFile(null);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      console.error("FileReader error");
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
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: false,
  });

  const handleUploadConfirm = async () => {
    if (!selectedFile) {
      alert("ไม่พบไฟล์ที่เลือก กรุณาเลือกไฟล์ใหม่อีกครั้ง");
      return;
    }

    setIsLoading(true);
    setError(null);
    setUploadResponse(null);

    const formData = new FormData();
    formData.append("volunteerFile", selectedFile);

    try {
      const response = await apiClient.post("/link/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Upload Response:", response.data);
      setUploadResponse(response.data);
      setShowResultModal(true);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error("❌ Error uploading file:", err);
        const errMsg =
          err.response?.data?.error ||
          err.message ||
          "เกิดข้อผิดพลาดในการอัปโหลดไฟล์";
        setError(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPreviewData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return allParsedData;
    return allParsedData.filter(
      (row) =>
        String(row[studentIdHeader]).toLowerCase().includes(term) ||
        String(row[yearHeader]).toLowerCase().includes(term) ||
        String(row[projectNameHeader]).toLowerCase().includes(term) ||
        String(row[hoursHeader]).toLowerCase().includes(term) ||
        String(row[activityTypeHeader]).toLowerCase().includes(term)
    );
  }, [allParsedData, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full mb-4 shadow-lg">
            <Upload className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            อัปโหลดชั่วโมงจิตอาสา (MOD LINK)
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            อัปโหลดไฟล์ Excel หรือ CSV ที่มีข้อมูลชั่วโมงจิตอาสาของนักศึกษา ระบบจะตรวจสอบและบันทึกข้อมูลโดยอัตโนมัติ
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FileSpreadsheet className="mr-3" size={24} />
              เลือกไฟล์ Excel (.xlsx) หรือ CSV (.csv)
            </h2>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-700 mb-3">คอลัมน์ที่ต้องการ:</h3>
              <div className="text-sm text-gray-600 space-y-1">
                {expectedHeaders.map((header, index) => (
                  <div key={index} className="flex items-center">
                    <span className="text-orange-500 font-medium mr-2">{index + 1}.</span>
                    <span>{header}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 py-16 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? "border-orange-400 bg-orange-50 scale-105 shadow-lg"
                  : "border-orange-300 hover:border-orange-400 hover:bg-orange-50 hover:shadow-md"
              }`}
            >
              <input {...getInputProps()} id="volunteerFileInput" />
              <div className="flex flex-col items-center space-y-2">
                <div className={`transition-all duration-300 ${
                  isDragActive ? "scale-110" : ""
                }`}>
                  <FileSpreadsheet
                    size={64}
                    className={isDragActive ? "text-orange-500" : "text-orange-400"}
                  />
                </div>
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
              ) : isDragActive ? (
                <p className="font-semibold text-primary text-lg">
                  วางไฟล์ที่นี่...
                </p>
              ) : (
                <p className="text-base-content/80 text-lg">
                  ลากและวางไฟล์ที่นี่ หรือ{" "}
                  <span className="link link-primary font-semibold">
                    เลือกไฟล์
                  </span>
                </p>
              )}
              <p className="text-xs opacity-60 mt-1">
                รองรับไฟล์นามสกุล .xlsx และ .csv เท่านั้น
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading && !uploadResponse && (
        <div className="text-center p-5">
          <span className="loading loading-lg loading-spinner text-primary"></span>
          <p>กำลังประมวลผล...</p>
        </div>
      )}

      {error && !uploadResponse && (
        <div role="alert" className="alert alert-error">
          <X size={18} />
          <span>{error}</span>
        </div>
      )}

      {allParsedData.length > 0 && !isLoading && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
              <h2 className="card-title">
                ตัวอย่างข้อมูล ({filteredPreviewData.length} / {parsedRowCount}{" "}
                แถวที่ถูกต้อง)
              </h2>
              <label className="input input-bordered input-sm flex items-center gap-2 w-full md:max-w-xs">
                <input
                  type="text"
                  className="grow focus:outline-none bg-transparent"
                  placeholder="ค้นหาในข้อมูลตัวอย่าง..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={16} className="opacity-50" />
              </label>
            </div>

            <p className="text-sm opacity-70">
              กรุณาตรวจสอบความถูกต้องของข้อมูลและคอลัมน์ก่อนกดยืนยัน
            </p>
            <div className="overflow-x-auto mt-2 max-h-96 rounded-xl border border-base-300 shadow-sm mx-auto w-full max-w-[1000px]">
              <table className="table w-full text-sm">
                <thead className="sticky top-0 bg-base-200 text-base-content font-semibold z-10">
                  <tr>
                    {headers.map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-center whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPreviewData.length > 0 ? (
                    filteredPreviewData.map((row, index) => (
                      <tr
                        key={index}
                        className="hover:bg-base-100/50 transition-colors"
                      >
                        <td className="px-4 py-2 text-center align-middle">
                          {row[studentIdHeader]}
                        </td>
                        <td className="px-4 py-2 text-center align-middle">
                          {row[yearHeader]}
                        </td>
                        <td className="px-4 py-2 text-center align-middle">
                          {row[projectNameHeader]}
                        </td>
                        <td className="px-4 py-2 text-center align-middle">
                          {row[hoursHeader]}
                        </td>
                        <td className="px-4 py-2 text-center align-middle">
                          {row[activityTypeHeader]}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={headers.length}
                        className="text-center px-4 py-6 text-base-content/60"
                      >
                        ไม่พบข้อมูลที่ตรงกับการค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card-actions justify-end mt-4">
              <button
                className="btn bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-none px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleUploadConfirm}
                disabled={isLoading || parsedRowCount === 0}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    กำลังอัปโหลด...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} className="mr-2" />
                    ยืนยันการอัปโหลด ({parsedRowCount} รายการ)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Result Modal */}
      {showResultModal && uploadResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="text-center">
              <div className="mb-4">
                <Check className="mx-auto text-green-500 w-16 h-16" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ผลการอัปโหลดไฟล์
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700">สร้างข้อมูลใหม่:</span>
                    <span className="font-semibold text-green-800">
                      {uploadResponse.successCount || 0} รายการ
                    </span>
                  </div>
                </div>
                
                {uploadResponse.duplicateCount > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-700">ข้อมูลซ้ำ (ข้าม):</span>
                      <span className="font-semibold text-yellow-800">
                        {uploadResponse.duplicateCount} รายการ
                      </span>
                    </div>
                  </div>
                )}
                
                {uploadResponse.skippedCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-red-700">ข้อมูลไม่ถูกต้อง:</span>
                      <span className="font-semibold text-red-800">
                        {uploadResponse.skippedCount} รายการ
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-gray-600 text-sm mb-4">
                  ประมวลผลจากไฟล์ทั้งหมด {uploadResponse.totalRowsInFile || 0} แถว
                </p>
                
                <button
                  onClick={() => {
                    setShowResultModal(false);
                    resetState();
                  }}
                  className="btn bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-none w-full"
                >
                  ตกลง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default UploadModLinkPage;