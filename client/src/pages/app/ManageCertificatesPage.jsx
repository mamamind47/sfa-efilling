// src/pages/app/ManageCertificatesPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "../../api/axiosConfig";
import {
  ClipboardEdit,
  PlusCircle,
  Pencil,
  Trash,
  X,
  Search,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast"; 

function ManageCertificatesPage() {
  // --- State Variables ---
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState(null); // <-- 2. ไม่ต้องใช้ state error แล้ว (ใช้ toast แทน)

  // --- State สำหรับ Search ---
  const [searchTerm, setSearchTerm] = useState("");

  // State ฟอร์มสร้าง
  const [certificateCode, setCertificateCode] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [hours, setHours] = useState("");
  const [category, setCategory] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // State Modal แก้ไข
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // ยังคงใช้เพื่อ disable ปุ่มขณะลบ

  // --- API Functions ---
  const fetchCertificates = useCallback(async () => {
    setIsLoading(true);
    // setError(null); // ไม่ต้อง set error แล้ว

    try {
      const response = await apiClient.get("/certificate");
      const sortedCerts = response.data.sort((a, b) =>
        a.certificate_code.localeCompare(b.certificate_code)
      );
      setCertificates(sortedCerts);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error(" Error fetching certificates:", err);
        const errMsg =
          err.response?.data?.error ||
          err.message ||
          "ไม่สามารถโหลดข้อมูลหัวข้อใบรับรองได้";
        // setError(errMsg); // <-- เปลี่ยนเป็น toast.error
        toast.error(`${errMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCertificate = async (event) => {
    event.preventDefault();
    if (!certificateCode || !certificateName || !hours || !category) {
      // return alert("กรุณากรอกข้อมูลให้ครบถ้วน (รหัส, ชื่อ, ชั่วโมง, ประเภท)");
      return toast.error(
        "กรุณากรอกข้อมูลให้ครบถ้วน (รหัส, ชื่อ, ชั่วโมง, ประเภท)"
      ); // <-- 3. เปลี่ยน alert เป็น toast.error
    }
    const hoursNum = parseInt(hours, 10);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      return toast.error("กรุณากรอกชั่วโมงเป็นตัวเลขที่มากกว่า 0"); // <-- 3. เปลี่ยน alert เป็น toast.error (ถ้ามี)
    }

    setIsCreating(true);
    // setError(null); // ไม่ต้อง set error
    try {
      const response = await apiClient.post("/certificate", {
        certificate_code: certificateCode,
        certificate_name: certificateName,
        hours: hoursNum,
        category: category,
        is_active: 1,
      });
      if (response.status === 200 || response.status === 201) {
        toast.success("เพิ่มหัวข้อใบรับรองสำเร็จ");
        await fetchCertificates();
        setCertificateCode("");
        setCertificateName("");
        setHours("");
        setCategory("");
      } else {
        throw new Error(response.data?.error || "สร้างหัวข้อใบรับรองไม่สำเร็จ");
      }
    } catch (err) {
      console.error("Error creating certificate:", err);
      const errMsg =
        err.response?.data?.error ||
        err.message ||
        "เกิดข้อผิดพลาดในการเพิ่มหัวข้อ";
      toast.error(`${errMsg}`);
    } finally {
      setIsCreating(false);
    }
  };

  const updateCertificate = async (event) => {
    event.preventDefault();
    if (!editingCert || !editCode || !editName || !editHours || !editCategory) {
      // return alert("ข้อมูลในฟอร์มแก้ไขไม่ครบถ้วน");
      return toast.error("ข้อมูลในฟอร์มแก้ไขไม่ครบถ้วน"); // <-- 3. เปลี่ยน alert เป็น toast.error
    }
    const hoursNum = parseInt(editHours, 10);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      return toast.error("กรุณากรอกชั่วโมงเป็นตัวเลขที่มากกว่า 0"); 
    }

    setIsUpdating(true);
    // setError(null); // ไม่ต้อง set error
    try {
      const response = await apiClient.put(
        `/certificate/${editingCert.certificate_type_id}`,
        {
          certificate_code: editCode,
          certificate_name: editName,
          hours: hoursNum,
          category: editCategory,
          is_active: editIsActive ? 1 : 0,
        }
      );
      if (response.status === 200) {
        // alert("อัปเดตหัวข้อใบรับรองสำเร็จ");
        toast.success("อัปเดตหัวข้อใบรับรองสำเร็จ"); 
        await fetchCertificates();
        closeModal();
      } else {
        throw new Error(
          response.data?.error || "อัปเดตหัวข้อใบรับรองไม่สำเร็จ"
        );
      }
    } catch (err) {
      console.error("Error updating certificate:", err);
      const errMsg =
        err.response?.data?.error ||
        err.message ||
        "เกิดข้อผิดพลาดในการอัปเดตหัวข้อ";
      toast.error(`${errMsg}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- ฟังก์ชันสำหรับดำเนินการลบจริง ---
  const performDelete = async (id, name) => {
    // setError(null); // ไม่ต้อง set error
    setIsDeleting(true); // Optional: set deleting state

    try {
      const response = await apiClient.delete(`/certificate/${id}`);
      if (response.status === 200 || response.status === 204) {
        toast.success(`ลบหัวข้อ "${name}" สำเร็จ`);
        await fetchCertificates();
      } else {
        throw new Error(response.data?.error || "ไม่สามารถลบหัวข้อใบรับรองได้");
      }
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error("Error deleting certificate:", err);
        const errMsg =
          err.response?.data?.error || err.message || "เกิดข้อผิดพลาดในการลบฯ";
        // setError(errMsg); // <-- เปลี่ยนเป็น toast.error
        // alert(`${errMsg}`); // <-- ลบ alert เดิม
        toast.error(`${errMsg}`); // <-- 3. เปลี่ยน alert เป็น toast.error
      }
    } finally {
      setIsDeleting(false); // Optional: clear deleting state
    }
  };

  // --- ฟังก์ชันที่แสดง Toast ยืนยันการลบ ---
  const deleteCertificate = (id, name) => {
    // ป้องกันการคลิกซ้ำขณะกำลังลบ หรือมี toast ยืนยันแสดงอยู่
    if (isDeleting) return;

    // <-- 5. เปลี่ยน window.confirm เป็น toast แบบกำหนดเอง
    toast(
      (t) => (
        <div className="flex flex-col items-center space-y-2">
          <span>
            คุณแน่ใจหรือไม่ว่าต้องการลบหัวข้อ{" "}
            <b className="font-semibold">"{name}"</b>?
          </span>
          <div className="flex space-x-2">
            {/* ใช้ class ของ DaisyUI หรือ Tailwind เพื่อความสวยงาม */}
            <button
              className="btn btn-sm btn-error text-white" // ปุ่มยืนยัน
              onClick={() => {
                toast.dismiss(t.id); // ปิด toast ยืนยัน
                performDelete(id, name); // เรียกฟังก์ชันลบจริง
              }}
            >
              ยืนยันลบ
            </button>
            <button
              className="btn btn-sm btn-ghost" // ปุ่มยกเลิก
              onClick={() => toast.dismiss(t.id)}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity, // ทำให้ toast ไม่หายไปเอง ต้องกดปุ่ม
        position: "top-center", // แสดง toast ด้านบนกลางจอ
      }
    );
  };

  // --- Modal Functions (เหมือนเดิม) ---
  const openModal = (cert) => {
    setEditingCert({ ...cert });
    setEditCode(cert.certificate_code);
    setEditName(cert.certificate_name);
    setEditHours(cert.hours.toString());
    setEditCategory(cert.category || "");
    setEditIsActive(cert.is_active === 1 || cert.is_active === true);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCert(null);
    setEditCode("");
    setEditName("");
    setEditHours("");
    setEditCategory("");
    setEditIsActive(true);
  };

  // --- Load initial data (เหมือนเดิม) ---
  useEffect(() => {
    document.title = "จัดการหัวข้อ e-Learning | Volunteer Student Loan e-Filling";
    fetchCertificates();
  }, [fetchCertificates]);

  // --- Filtering Logic (เหมือนเดิม) ---
  const filteredCertificates = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    if (!lowerCaseSearchTerm) {
      return certificates;
    }
    return certificates.filter(
      (cert) =>
        cert.certificate_code.toLowerCase().includes(lowerCaseSearchTerm) ||
        cert.certificate_name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (cert.category &&
          cert.category.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [certificates, searchTerm]);

  // --- Render JSX ---
  return (
    <div className="p-4 md:p-6">
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={
          {

          }
        }
      />

      <h1 className="text-2xl font-bold mb-4 flex items-center space-x-2 text-base-content">
        <ClipboardEdit className="text-orange-500" size="24" />
        <span>จัดการหัวข้อใบรับรอง</span>
      </h1>

      {/* ----- ฟอร์มเพิ่มหัวข้อ ----- */}
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body p-4 md:p-6">
          <h2 className="card-title text-lg mb-2">เพิ่มหัวข้อใหม่</h2>
          <form
            onSubmit={createCertificate}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
          >
            {/* Input Fields */}
            <div className="form-control w-full">
              <label className="label" htmlFor="cert_code">
                {" "}
                <span className="label-text">รหัส</span>{" "}
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
            <div className="form-control w-full">
              <label className="label" htmlFor="cert_name">
                {" "}
                <span className="label-text">ชื่อใบรับรอง</span>{" "}
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
            <div className="form-control w-full">
              <label className="label" htmlFor="cert_hours">
                {" "}
                <span className="label-text">ชั่วโมง</span>{" "}
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
            <div className="form-control w-full">
              <label className="label" htmlFor="cert_category">
                {" "}
                <span className="label-text">ประเภท</span>{" "}
              </label>
              <select
                id="cert_category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select select-bordered select-sm w-full focus:outline-none focus:ring-0 focus:ring-offset-0"
                required
              >
                <option value="" disabled>
                  {" "}
                  -- เลือกประเภท --{" "}
                </option>
                <option value="SET-eLearning">SET-eLearning</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
            <button
              type="submit"
              className="btn btn-sm w-full sm:w-auto justify-self-start sm:justify-self-end bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-white"
              disabled={isCreating}
            >
              {isCreating ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  {" "}
                  <PlusCircle size={16} className="mr-1" /> เพิ่ม{" "}
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ----- ช่องค้นหา ----- */}
      <div className="mb-4">
        <div className="form-control relative max-w-xs">
          <label htmlFor="searchInput" className="sr-only">
            {" "}
            ค้นหา{" "}
          </label>
          <input
            type="text"
            id="searchInput"
            className="input input-bordered input-sm md:input-md w-full pr-10 focus:outline-none focus:ring-0 focus:ring-offset-0"
            placeholder="ค้นหาด้วยรหัส, ชื่อ, หรือประเภท..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute inset-y-0 right-0 flex items-center pr-3">
            <Search size={16} className="opacity-50" />
          </span>
        </div>
      </div>

      {/* ----- ตารางแสดงรายการ ----- */}
      {isLoading ? (
        <div className="text-center p-10">
          <span className="loading loading-lg loading-spinner text-primary"></span>
        </div>
      ) : (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead className="bg-base-200">
                  <tr>
                    <th className="p-3">รหัส</th>
                    <th className="p-3">ชื่อใบรับรอง</th>
                    <th className="p-3">ประเภท</th>
                    <th className="p-3">ชั่วโมง</th>
                    <th className="p-3 text-center">สถานะ</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCertificates.length > 0 ? (
                    filteredCertificates.map((cert) => (
                      <tr key={cert.certificate_type_id} className="hover">
                        <td className="p-3 font-mono">
                          {" "}
                          {cert.certificate_code}{" "}
                        </td>
                        <td className="p-3">{cert.certificate_name}</td>
                        <td className="p-3">{cert.category || "-"}</td>
                        <td className="p-3">{cert.hours}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`badge text-white ${
                              cert.is_active ? "badge-success" : "badge-warning"
                            }`}
                          >
                            {cert.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                          </span>
                        </td>
                        <td className="p-3 text-center space-x-1">
                          <button
                            onClick={() => openModal(cert)}
                            className="btn btn-ghost btn-xs text-orange-600 hover:bg-orange-100 px-2"
                          >
                            <Pencil size="14" />
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
                            <Trash size="14" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center p-10 text-base-content/60"
                      >
                        ไม่พบข้อมูลที่ตรงกับการค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----- Modal แก้ไข  ----- */}
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
              {" "}
              <X size={18} />{" "}
            </button>
            <h3 className="font-bold text-lg mb-4">
              {" "}
              แก้ไขหัวข้อ: {editingCert.certificate_name}{" "}
            </h3>
            <form onSubmit={updateCertificate} className="space-y-4">
              {/* Input fields */}
              <div className="form-control">
                <label className="label" htmlFor="editCodeModal">
                  {" "}
                  <span className="label-text">รหัส</span>{" "}
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
              <div className="form-control">
                <label className="label" htmlFor="editNameModal">
                  {" "}
                  <span className="label-text">ชื่อใบรับรอง</span>{" "}
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
              <div className="form-control">
                <label className="label" htmlFor="editHoursModal">
                  {" "}
                  <span className="label-text">ชั่วโมง</span>{" "}
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
              <div className="form-control w-full">
                <label className="label" htmlFor="editCategoryModal">
                  {" "}
                  <span className="label-text">ประเภท</span>{" "}
                </label>
                <select
                  id="editCategoryModal"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="select select-bordered w-full focus:outline-none focus:ring-0 focus:ring-offset-0"
                  required
                >
                  <option value="" disabled>
                    {" "}
                    -- เลือกประเภท --{" "}
                  </option>
                  <option value="SET-eLearning">SET-eLearning</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
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
              <div className="modal-action mt-6">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeModal}
                >
                  {" "}
                  ยกเลิก{" "}
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
              {" "}
              close{" "}
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}

export default ManageCertificatesPage;