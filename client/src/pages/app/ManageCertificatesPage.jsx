// src/pages/app/ManageCertificatesPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react"; // <-- เพิ่ม useMemo
import apiClient from "../../api/axiosConfig";
import {
  ClipboardEdit,
  PlusCircle,
  Pencil,
  Trash,
  X,
  Search,
} from "lucide-react"; // <-- เพิ่ม Search Icon

function ManageCertificatesPage() {
  // --- State Variables ---
  const [certificates, setCertificates] = useState([]); // ข้อมูลต้นฉบับทั้งหมด
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- State สำหรับ Search ---
  const [searchTerm, setSearchTerm] = useState(""); // <-- เพิ่ม State ค้นหา

  // State ฟอร์มสร้าง
  const [certificateCode, setCertificateCode] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [hours, setHours] = useState("");
  const [category, setCategory] = useState(""); // <-- เพิ่ม State ประเภท
  const [isCreating, setIsCreating] = useState(false);

  // State Modal แก้ไข
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editCategory, setEditCategory] = useState(""); // <-- เพิ่ม State ประเภท (แก้ไข)
  const [editIsActive, setEditIsActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- API Functions ---
  const fetchCertificates = useCallback(async () => {
    setIsLoading(true);

    setError(null);

    try {
      const response = await apiClient.get("/certificate");

      const sortedCerts = response.data.sort((a, b) =>
        a.certificate_code.localeCompare(b.certificate_code)
      );

      setCertificates(sortedCerts);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error("❌ Error fetching certificates:", err);

        setError(
          err.response?.data?.error ||
            err.message ||
            "ไม่สามารถโหลดข้อมูลหัวข้อใบรับรองได้"
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCertificate = async (event) => {
    event.preventDefault();
    // เพิ่ม category ในการเช็ค validation
    if (!certificateCode || !certificateName || !hours || !category) {
      return alert("กรุณากรอกข้อมูลให้ครบถ้วน (รหัส, ชื่อ, ชั่วโมง, ประเภท)");
    }
    // ... (Validation ชั่วโมง เหมือนเดิม) ...
    const hoursNum = parseInt(hours, 10);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      /* ... */
    }

    setIsCreating(true);
    setError(null);
    try {
      const response = await apiClient.post("/certificate", {
        certificate_code: certificateCode,
        certificate_name: certificateName,
        hours: hoursNum,
        category: category, // <-- ส่ง category ไปด้วย
        is_active: 1,
      });
      if (response.status === 200 || response.status === 201) {
        alert("✅ เพิ่มหัวข้อใบรับรองสำเร็จ");
        await fetchCertificates();
        // เคลียร์ฟอร์ม (เพิ่ม category)
        setCertificateCode("");
        setCertificateName("");
        setHours("");
        setCategory(""); // <-- เคลียร์ category
      } else {
        throw new Error(response.data?.error || "สร้างหัวข้อใบรับรองไม่สำเร็จ");
      }
    } catch (err) {
      /* ... Error handling ... */
    } finally {
      setIsCreating(false);
    }
  };

  const updateCertificate = async (event) => {
    event.preventDefault();
    // เพิ่ม editCategory ในการเช็ค validation
    if (!editingCert || !editCode || !editName || !editHours || !editCategory)
      return alert("ข้อมูลในฟอร์มแก้ไขไม่ครบถ้วน");
    // ... (Validation ชั่วโมง เหมือนเดิม) ...
    const hoursNum = parseInt(editHours, 10);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      /* ... */
    }

    setIsUpdating(true);
    setError(null);
    try {
      const response = await apiClient.put(
        `/certificate/${editingCert.certificate_type_id}`,
        {
          certificate_code: editCode,
          certificate_name: editName,
          hours: hoursNum,
          category: editCategory, // <-- ส่ง category ไปด้วย
          is_active: editIsActive ? 1 : 0,
        }
      );
      if (response.status === 200) {
        alert("✅ อัปเดตหัวข้อใบรับรองสำเร็จ");
        await fetchCertificates();
        closeModal();
      } else {
        throw new Error(
          response.data?.error || "อัปเดตหัวข้อใบรับรองไม่สำเร็จ"
        );
      }
    } catch (err) {
      /* ... Error handling ... */
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCertificate = async (id, name) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหัวข้อ "${name}"?`)) return;

    setError(null);

    setIsDeleting(true); // Optional: set deleting state

    try {
      const response = await apiClient.delete(`/certificate/${id}`);

      if (response.status === 200 || response.status === 204) {
        alert(`✅ ลบหัวข้อ "${name}" สำเร็จ`);

        await fetchCertificates();
      } else {
        throw new Error(response.data?.error || "ไม่สามารถลบหัวข้อใบรับรองได้");
      }
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error("❌ Error deleting certificate:", err);

        const errMsg =
          err.response?.data?.error || err.message || "เกิดข้อผิดพลาดในการลบฯ";

        setError(errMsg);

        alert(`❌ ${errMsg}`);
      }
    } finally {
      setIsDeleting(false);
    } // Optional: clear deleting state
  };

  // --- Modal Functions ---
  const openModal = (cert) => {
    setEditingCert({ ...cert });
    setEditCode(cert.certificate_code);
    setEditName(cert.certificate_name);
    setEditHours(cert.hours.toString());
    setEditCategory(cert.category || ""); // <-- ตั้งค่า editCategory (ใช้ '' ถ้าเป็น null)
    setEditIsActive(cert.is_active === 1 || cert.is_active === true);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCert(null);
    setEditCode("");
    setEditName("");
    setEditHours("");
    setEditCategory(""); // <-- เคลียร์ editCategory
    setEditIsActive(true);
  };

  // --- Load initial data ---
  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  // --- Filtering Logic ---
  const filteredCertificates = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    if (!lowerCaseSearchTerm) {
      return certificates; // ถ้าไม่มี search term ให้แสดงทั้งหมด
    }
    return certificates.filter(
      (cert) =>
        cert.certificate_code.toLowerCase().includes(lowerCaseSearchTerm) ||
        cert.certificate_name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (cert.category &&
          cert.category.toLowerCase().includes(lowerCaseSearchTerm)) // ค้นหาใน category ด้วย (ถ้ามี)
    );
  }, [certificates, searchTerm]); // คำนวณใหม่เมื่อ certificates หรือ searchTerm เปลี่ยน
  // --- ----------------- ---

  // --- Render JSX ---
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center space-x-2 text-base-content">
        <ClipboardEdit className="text-orange-500" size="24" />
        <span>จัดการหัวข้อใบรับรอง</span>
      </h1>

      {/* ----- ฟอร์มเพิ่มหัวข้อ ----- */}
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body p-4 md:p-6">
          <h2 className="card-title text-lg mb-2">เพิ่มหัวข้อใหม่</h2>
          {/* ปรับ Grid เป็น 5 ช่อง หรือตามต้องการ */}
          <form
            onSubmit={createCertificate}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
          >
            {/* รหัส */}
            <div className="form-control w-full">
              <label className="label" htmlFor="cert_code">
                <span className="label-text">รหัส</span>
              </label>
              <input
                id="cert_code"
                type="text"
                placeholder="รหัส"
                value={certificateCode}
                onChange={(e) => setCertificateCode(e.target.value)}
                className="input input-bordered input-sm w-full focus:outline-none focus:ring-0 focus:ring-offset-0"
                required
              />
            </div>
            {/* ชื่อ */}
            <div className="form-control w-full">
              <label className="label" htmlFor="cert_name">
                <span className="label-text">ชื่อใบรับรอง</span>
              </label>
              <input
                id="cert_name"
                type="text"
                placeholder="ชื่อใบรับรอง"
                value={certificateName}
                onChange={(e) => setCertificateName(e.target.value)}
                className="input input-bordered input-sm w-full focus:outline-none focus:ring-0 focus:ring-offset-0"
                required
              />
            </div>
            {/* ชั่วโมง */}
            <div className="form-control w-full">
              <label className="label" htmlFor="cert_hours">
                <span className="label-text">ชั่วโมง</span>
              </label>
              <input
                id="cert_hours"
                type="number"
                placeholder="ชั่วโมง"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="input input-bordered input-sm w-full focus:outline-none focus:ring-0 focus:ring-offset-0"
                required
                min="1"
              />
            </div>
            {/* ประเภท */}
            <div className="form-control w-full">
              <label className="label" htmlFor="cert_category">
                <span className="label-text">ประเภท</span>
              </label>
              {/* ใช้ DaisyUI Select */}
              <select
                id="cert_category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select select-bordered select-sm w-full focus:outline-none focus:ring-0 focus:ring-offset-0"
                required
              >
                <option value="" disabled>
                  -- เลือกประเภท --
                </option>
                <option value="SET-eLearning">SET-eLearning</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
            {/* ปุ่ม Add */}
            <button
              type="submit"
              className="btn btn-sm w-full sm:w-auto justify-self-start sm:justify-self-end bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-white"
              disabled={isCreating}
            >
              {isCreating ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <PlusCircle size={16} className="mr-1" /> เพิ่ม
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ----- แสดงข้อผิดพลาด ----- */}
      {error && (
        <div role="alert" className="alert alert-error mb-4">
          <X size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ----- ช่องค้นหา ----- */}
      <div className="mb-4">
        {/* ใช้โครงสร้าง form-control เหมือน input อื่นๆ */}
        <div className="form-control relative max-w-xs">
          {" "}
          {/* เพิ่ม relative สำหรับ icon */}
          <label htmlFor="searchInput" className="sr-only">
            ค้นหา
          </label>{" "}
          {/* Label ซ่อนไว้ */}
          <input
            type="text"
            id="searchInput" // ใส่ id เชื่อมกับ label
            // --- ใส่ class input และ focus removal ที่นี่ ---
            className="input input-bordered input-sm md:input-md w-full pr-10 focus:outline-none focus:ring-0 focus:ring-offset-0" // เพิ่ม pr-10 เผื่อที่ให้ไอคอน
            // --- ------------------------------------------- ---
            placeholder="ค้นหาด้วยรหัส, ชื่อ, หรือประเภท..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* จัดวางไอคอนด้วย Absolute */}
          <span className="absolute inset-y-0 right-0 flex items-center pr-3">
            <Search size={16} className="opacity-50" />
          </span>
        </div>
      </div>
      {/* ----- -------------- ----- */}

      {/* ----- ตารางแสดงรายการ ----- */}
      {isLoading ? (
        <div className="text-center p-10">
          <span className="loading loading-lg loading-spinner text-primary"></span>
        </div>
      ) : (
        // ถ้าไม่ Loading ให้แสดงตาราง (แม้ข้อมูลจะว่างเปล่าหลัง Filter)
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead className="bg-base-200">
                  <tr>
                    <th className="p-3">รหัส</th>
                    <th className="p-3">ชื่อใบรับรอง</th>
                    <th className="p-3">ประเภท</th>{" "}
                    {/* <-- เพิ่ม Header ประเภท */}
                    <th className="p-3">ชั่วโมง</th>
                    <th className="p-3 text-center">สถานะ</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ตรวจสอบ filteredCertificates ก่อน Map */}
                  {filteredCertificates.length > 0 ? (
                    filteredCertificates.map(
                      (
                        cert // <-- ใช้ filteredCertificates
                      ) => (
                        <tr key={cert.certificate_type_id} className="hover">
                          <td className="p-3 font-mono">
                            {cert.certificate_code}
                          </td>
                          <td className="p-3">{cert.certificate_name}</td>
                          <td className="p-3">{cert.category || "-"}</td>{" "}
                          {/* <-- แสดง ประเภท (ถ้าไม่มีให้แสดง -) */}
                          <td className="p-3">{cert.hours}</td>
                          <td className="p-3 text-center">
                            {" "}
                            <span
                              className={`badge text-white ${
                                cert.is_active
                                  ? "badge-success"
                                  : "badge-warning"
                              }`}
                            >
                              {cert.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                            </span>{" "}
                          </td>
                          <td className="p-3 text-center space-x-1">
                            <button
                              onClick={() => openModal(cert)}
                              className="btn btn-ghost btn-xs text-orange-600 hover:bg-orange-100 px-2"
                            >
                              {" "}
                              <Pencil size="14" />{" "}
                            </button>
                            <button
                              onClick={() =>
                                deleteCertificate(
                                  cert.certificate_type_id,
                                  cert.certificate_name
                                )
                              }
                              className="btn btn-ghost btn-xs text-red-600 hover:bg-red-100 px-2"
                              disabled={isDeleting}
                            >
                              {" "}
                              <Trash size="14" />{" "}
                            </button>
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center p-10 text-base-content/60"
                      >
                        ไม่พบข้อมูลที่ตรงกับการค้นหา
                      </td>
                    </tr> // <-- แสดงเมื่อ Filter แล้วไม่เจอ
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----- Modal แก้ไข ----- */}
      {isModalOpen && editingCert && (
        <dialog
          id="edit_cert_modal"
          className={`modal ${isModalOpen ? "modal-open" : ""}`}
        >
          <div className="modal-box">
            <button
              onClick={closeModal}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              <X size={18} />
            </button>
            <h3 className="font-bold text-lg mb-4">
              แก้ไขหัวข้อ: {editingCert.certificate_name}
            </h3>
            <form onSubmit={updateCertificate} className="space-y-4">
              {/* รหัส */}
              <div className="form-control">
                <label className="label" htmlFor="editCodeModal">
                  <span className="label-text">รหัส</span>
                </label>
                <input
                  id="editCodeModal"
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="input input-bordered focus:outline-none focus:ring-0 focus:ring-offset-0"
                  required
                />
              </div>
              {/* ชื่อ */}
              <div className="form-control">
                <label className="label" htmlFor="editNameModal">
                  <span className="label-text">ชื่อใบรับรอง</span>
                </label>
                <input
                  id="editNameModal"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input input-bordered focus:outline-none focus:ring-0 focus:ring-offset-0"
                  required
                />
              </div>
              {/* ชั่วโมง */}
              <div className="form-control">
                <label className="label" htmlFor="editHoursModal">
                  <span className="label-text">ชั่วโมง</span>
                </label>
                <input
                  id="editHoursModal"
                  type="number"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  className="input input-bordered focus:outline-none focus:ring-0 focus:ring-offset-0"
                  required
                  min="1"
                />
              </div>
              {/* ประเภท */}
              <div className="form-control w-full">
                <label className="label" htmlFor="editCategoryModal">
                  <span className="label-text">ประเภท</span>
                </label>
                <select
                  id="editCategoryModal"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="select select-bordered w-full focus:outline-none focus:ring-0 focus:ring-offset-0"
                  required
                >
                  <option value="" disabled>
                    -- เลือกประเภท --
                  </option>
                  <option value="SET-eLearning">SET-eLearning</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
              {/* สถานะ */}
              <div className="form-control">
                <label className="label cursor-pointer justify-start space-x-2">
                  <span className="label-text">สถานะเปิดใช้งาน:</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-success"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                  />
                </label>
              </div>
              {/* Buttons */}
              <div className="modal-action mt-6">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeModal}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-white"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    "บันทึกการแก้ไข"
                  )}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={closeModal}>
              close
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}

export default ManageCertificatesPage;
