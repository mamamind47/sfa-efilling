import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Edit, Trash2, Send, Loader2, FolderKanban, Calendar, MapPin, CheckCircle } from "lucide-react";
import apiClient from "../../api/axiosConfig";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
  PROJECT_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS
} from "../../constants/projectConstants";

const MyProjectsPage = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: "",
    project_type: "",
    academic_year_id: ""
  });
  const [academicYears, setAcademicYears] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [projectToSubmit, setProjectToSubmit] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [filter, currentPage]);

  const fetchAcademicYears = async () => {
    try {
      const response = await apiClient.get("/academic");
      setAcademicYears(response.data);
    } catch (error) {
      console.error("Error fetching academic years:", error);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 20
      };
      if (filter.status) params.status = filter.status;
      if (filter.project_type) params.project_type = filter.project_type;
      if (filter.academic_year_id) params.academic_year_id = filter.academic_year_id;

      const response = await apiClient.get("/projects/my-projects", { params });
      setProjects(response.data.projects);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("ไม่สามารถโหลดข้อมูลโครงการได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProject = (projectId, projectName) => {
    setProjectToSubmit({ projectId, projectName });
    setShowSubmitModal(true);
  };

  const confirmSubmitProject = async () => {
    if (!projectToSubmit) return;

    setSubmittingId(projectToSubmit.projectId);
    try {
      if (role === 'admin') {
        await apiClient.post(`/projects/${projectToSubmit.projectId}/approve`);
        toast.success("เปิดโครงการสำเร็จ");
      } else {
        await apiClient.post(`/projects/${projectToSubmit.projectId}/submit`);
        toast.success("ส่งโครงการสำเร็จ");
      }
      setShowSubmitModal(false);
      setProjectToSubmit(null);
      fetchProjects();
    } catch (error) {
      console.error("Error submitting project:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการส่งโครงการ");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDeleteProject = (projectId, projectName) => {
    setProjectToDelete({ projectId, projectName });
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeletingId(projectToDelete.projectId);
    try {
      await apiClient.delete(`/projects/${projectToDelete.projectId}`);
      toast.success("ลบโครงการสำเร็จ");
      setShowDeleteModal(false);
      setProjectToDelete(null);
      fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการลบโครงการ");
    } finally {
      setDeletingId(null);
    }
  };

  const canEdit = (status) => ["draft", "rejected"].includes(status);
  const canDelete = (status) => status !== "approved";

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Filters */}
        <div className="bg-white rounded-lg shadow border border-orange-100 mb-5">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderKanban className="w-6 h-6" />
                <div>
                  <h1 className="text-xl font-bold">โครงการของฉัน</h1>
                  <p className="text-orange-100 mt-1 text-sm">จัดการโครงการที่คุณสร้าง</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/app/create-project")}
                className="btn btn-sm bg-white text-orange-600 hover:bg-orange-50 border-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                สร้างโครงการใหม่
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="block text-sm font-semibold mb-2">
                  สถานะ
                </label>
                <select
                  value={filter.status}
                  onChange={(e) => handleFilterChange({ ...filter, status: e.target.value })}
                  className="select select-bordered w-full"
                >
                  <option value="">ทั้งหมด</option>
                  <option value="draft">ฉบับร่าง</option>
                  <option value="submitted">รอการอนุมัติ</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="rejected">ไม่อนุมัติ</option>
                </select>
              </div>

              <div className="form-control">
                <label className="block text-sm font-semibold mb-2">
                  ประเภทโครงการ
                </label>
                <select
                  value={filter.project_type}
                  onChange={(e) => handleFilterChange({ ...filter, project_type: e.target.value })}
                  className="select select-bordered w-full"
                >
                  <option value="">ทั้งหมด</option>
                  <option value="religious">{PROJECT_TYPE_LABELS.religious}</option>
                  <option value="social_development">{PROJECT_TYPE_LABELS.social_development}</option>
                  <option value="university_activity">{PROJECT_TYPE_LABELS.university_activity}</option>
                </select>
              </div>

              <div className="form-control">
                <label className="block text-sm font-semibold mb-2">
                  ปีการศึกษา
                </label>
                <select
                  value={filter.academic_year_id}
                  onChange={(e) => handleFilterChange({ ...filter, academic_year_id: e.target.value })}
                  className="select select-bordered w-full"
                >
                  <option value="">ทั้งหมด</option>
                  {academicYears.map(year => (
                    <option key={year.academic_year_id} value={year.academic_year_id}>
                      {year.year_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <div className="card bg-white shadow-md overflow-hidden">
          <div className="card-body p-0">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin h-10 w-10 text-primary" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">ไม่พบโครงการ</p>
                <button
                  onClick={() => navigate("/app/create-project")}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  สร้างโครงการแรก
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="bg-white border-b-2 border-gray-200">
                    <tr>
                      <th className="text-gray-500">รายละเอียด</th>
                      <th className="text-gray-500">ประเภท</th>
                      <th className="text-gray-500">สถานะ</th>
                      <th className="text-gray-500 text-center">ผู้เข้าร่วม</th>
                      <th className="text-gray-500 text-center">ชั่วโมง</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(project => (
                      <tr key={project.project_id} className="hover border-b border-gray-100">
                        {/* รายละเอียด */}
                        <td className="py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-gray-900">{project.project_name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(project.start_date).toLocaleDateString("th-TH", {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })} - {new Date(project.end_date).toLocaleDateString("th-TH", {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="h-3 w-3" />
                              <span>{project.location || project.province || project.campus || '-'}</span>
                            </div>
                            {project.status === "rejected" && project.rejection_reason && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                <span className="text-red-800 font-semibold">เหตุผล: </span>
                                <span className="text-red-700">{project.rejection_reason}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* ประเภท */}
                        <td>
                          <span className="badge badge-sm badge-ghost whitespace-nowrap">
                            {PROJECT_TYPE_LABELS[project.project_type]}
                          </span>
                        </td>

                        {/* สถานะ */}
                        <td>
                          <span className={`badge badge-sm ${PROJECT_STATUS_COLORS[project.status]} whitespace-nowrap`}>
                            {PROJECT_STATUS_LABELS[project.status]}
                          </span>
                        </td>

                        {/* ผู้เข้าร่วม */}
                        <td className="text-center">
                          <div className="text-sm">{project._count.participants}</div>
                          <div className="text-xs text-gray-400">คน</div>
                        </td>

                        {/* ชั่วโมง */}
                        <td className="text-center">
                          <div className="text-sm">{project.hours_per_person}</div>
                          <div className="text-xs text-gray-400">ชม.</div>
                        </td>

                        {/* จัดการ */}
                        <td className="text-center">
                          <div className="flex flex-col gap-1 items-center">
                            {/* ส่งโครงการ (draft only) */}
                            {project.status === "draft" && (
                              <button
                                onClick={() => handleSubmitProject(project.project_id, project.project_name)}
                                className="btn btn-xs btn-square bg-green-600 hover:bg-green-700 text-white border-0"
                                disabled={submittingId === project.project_id}
                                title="ส่งโครงการ"
                              >
                                {submittingId === project.project_id ? (
                                  <Loader2 className="animate-spin h-3 w-3" />
                                ) : (
                                  <Send className="h-3 w-3" />
                                )}
                              </button>
                            )}

                            {/* ดูรายละเอียด */}
                            <button
                              onClick={() => navigate(`/app/projects/${project.project_id}`, { state: { from: 'my-projects' } })}
                              className="btn btn-xs btn-square btn-ghost border border-gray-300 hover:bg-gray-100"
                              title="ดูรายละเอียด"
                            >
                              <Eye className="h-3 w-3" />
                            </button>

                            {/* แก้ไข */}
                            {canEdit(project.status) && (
                              <button
                                onClick={() => navigate(`/app/projects/${project.project_id}/edit`)}
                                className="btn btn-xs btn-square btn-ghost border border-gray-300 hover:bg-gray-100"
                                title="แก้ไข"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                            )}

                            {/* ลบ */}
                            {canDelete(project.status) && (
                              <button
                                onClick={() => handleDeleteProject(project.project_id, project.project_name)}
                                className="btn btn-xs btn-square btn-ghost text-error border border-gray-300 hover:bg-red-50"
                                disabled={deletingId === project.project_id}
                                title="ลบ"
                              >
                                {deletingId === project.project_id ? (
                                  <Loader2 className="animate-spin h-3 w-3" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && projects.length > 0 && totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-200">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn btn-sm btn-ghost"
                >
                  ก่อนหน้า
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, current page, and pages around current
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    const showEllipsis =
                      (page === currentPage - 2 && currentPage > 3) ||
                      (page === currentPage + 2 && currentPage < totalPages - 2);

                    if (showEllipsis) {
                      return <span key={page} className="px-2">...</span>;
                    }

                    if (!showPage) return null;

                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`btn btn-sm ${
                          currentPage === page
                            ? 'btn-active bg-orange-500 text-white'
                            : 'btn-ghost'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn btn-sm btn-ghost"
                >
                  ถัดไป
                </button>

                <span className="text-sm text-gray-500 ml-4">
                  หน้า {currentPage} จาก {totalPages} ({total} รายการ)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-green-600">
              {role === 'admin' ? 'ยืนยันการเปิดโครงการ' : 'ยืนยันการส่งโครงการ'}
            </h3>
            <p className="py-4">
              {role === 'admin' ? (
                <>
                  คุณต้องการเปิดโครงการ <span className="font-semibold">"{projectToSubmit?.projectName}"</span> ใช่หรือไม่?
                </>
              ) : (
                <>
                  คุณต้องการส่งโครงการ <span className="font-semibold">"{projectToSubmit?.projectName}"</span> เพื่อรอการอนุมัติใช่หรือไม่?
                </>
              )}
            </p>
            <p className="text-sm text-gray-500">
              {role === 'admin'
                ? 'โครงการจะอยู่ในสถานะอนุมัติทันที'
                : 'โครงการจะถูกส่งไปยังผู้ดูแลระบบเพื่อพิจารณาอนุมัติ'}
            </p>
            <div className="modal-action">
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setProjectToSubmit(null);
                }}
                className="btn btn-ghost"
                disabled={submittingId !== null}
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmSubmitProject}
                className="btn bg-green-600 hover:bg-green-700 text-white border-0"
                disabled={submittingId !== null}
              >
                {submittingId !== null ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    {role === 'admin' ? 'กำลังเปิด...' : 'กำลังส่ง...'}
                  </>
                ) : (
                  <>
                    {role === 'admin' ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        เปิดโครงการ
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        ส่งโครงการ
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-red-600">ยืนยันการลบโครงการ</h3>
            <p className="py-4">
              คุณต้องการลบโครงการ <span className="font-semibold">"{projectToDelete?.projectName}"</span> ใช่หรือไม่?
            </p>
            <p className="text-sm text-gray-500">
              การลบโครงการจะไม่สามารถกู้คืนได้
            </p>
            <div className="modal-action">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setProjectToDelete(null);
                }}
                className="btn btn-ghost"
                disabled={deletingId !== null}
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteProject}
                className="btn bg-red-600 hover:bg-red-700 text-white border-0"
                disabled={deletingId !== null}
              >
                {deletingId !== null ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    กำลังลบ...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    ลบโครงการ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProjectsPage;
