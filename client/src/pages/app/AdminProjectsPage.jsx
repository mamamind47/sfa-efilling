import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, CheckCircle, XCircle, Loader2, Users, Calendar, MapPin } from "lucide-react";
import apiClient from "../../api/axiosConfig";
import { toast } from "react-hot-toast";
import {
  PROJECT_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PARTICIPANT_STATUS_LABELS
} from "../../constants/projectConstants";

const AdminProjectsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: "submitted", // Default to pending projects
    project_type: "",
    academic_year_id: ""
  });
  const [academicYears, setAcademicYears] = useState([]);
  const [reviewingProject, setReviewingProject] = useState(null);
  const [reviewMode, setReviewMode] = useState("approve"); // "approve" or "reject"
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchProjects();
  }, [filter]);

  useEffect(() => {
    fetchProjects();
  }, [pagination.page]);

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
        page: pagination.page,
        limit: pagination.limit
      };
      if (filter.status) params.status = filter.status;
      if (filter.project_type) params.project_type = filter.project_type;
      if (filter.academic_year_id) params.academic_year_id = filter.academic_year_id;

      const response = await apiClient.get("/projects", { params });
      setProjects(response.data.projects);
      setPagination(prev => ({
        ...prev,
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 0
      }));
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("ไม่สามารถโหลดข้อมูลโครงการได้");
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (project, mode = "approve") => {
    setReviewingProject(project);
    setReviewMode(mode);
    if (mode === "approve") {
      // Pre-select all participants for approve mode
      setSelectedParticipants(project.participants?.map(p => p.user_id) || []);
    } else {
      // Clear for reject mode
      setSelectedParticipants([]);
    }
    setRejectionReason("");
  };

  const closeReviewModal = () => {
    setReviewingProject(null);
    setReviewMode("approve");
    setSelectedParticipants([]);
    setRejectionReason("");
  };

  const toggleParticipant = (userId) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleApprove = async () => {
    if (selectedParticipants.length === 0) {
      toast.error("กรุณาเลือกผู้เข้าร่วมที่ต้องการอนุมัติอย่างน้อย 1 คน");
      return;
    }

    if (!confirm(`คุณต้องการอนุมัติโครงการนี้พร้อมผู้เข้าร่วม ${selectedParticipants.length} คนใช่หรือไม่?`)) {
      return;
    }

    try {
      await apiClient.post(`/projects/${reviewingProject.project_id}/review`, {
        status: "approved",
        approved_participant_ids: selectedParticipants
      });

      toast.success("อนุมัติโครงการสำเร็จ");
      closeReviewModal();
      fetchProjects();
    } catch (error) {
      console.error("Error approving project:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการอนุมัติโครงการ");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
      return;
    }

    if (!confirm("คุณต้องการไม่อนุมัติโครงการนี้ใช่หรือไม่?")) {
      return;
    }

    try {
      await apiClient.post(`/projects/${reviewingProject.project_id}/review`, {
        status: "rejected",
        rejection_reason: rejectionReason,
        approved_participant_ids: []
      });

      toast.success("ไม่อนุมัติโครงการสำเร็จ");
      closeReviewModal();
      fetchProjects();
    } catch (error) {
      console.error("Error rejecting project:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการไม่อนุมัติโครงการ");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Filters */}
        <div className="bg-white rounded-lg shadow border border-orange-100 mb-5">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 rounded-t-lg">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-bold">จัดการโครงการ</h1>
                <p className="text-orange-100 mt-1 text-sm">อนุมัติ/ปฏิเสธโครงการจากนักศึกษา</p>
              </div>
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
                  onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                  className="select select-bordered w-full"
                >
                  <option value="">ทั้งหมด</option>
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
                  onChange={(e) => setFilter(prev => ({ ...prev, project_type: e.target.value }))}
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
                  onChange={(e) => setFilter(prev => ({ ...prev, academic_year_id: e.target.value }))}
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
                <p className="text-gray-500">ไม่พบโครงการ</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="bg-white border-b-2 border-gray-200">
                      <tr>
                        <th className="text-gray-500">รายละเอียด</th>
                        <th className="text-gray-500">ประเภท</th>
                        <th className="text-gray-500">สถานะ</th>
                        <th className="text-gray-500 text-center">ผู้เข้าร่วม</th>
                        <th className="text-gray-500 text-center">ชั่วโมง</th>
                        <th className="text-gray-500 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map(project => (
                        <tr key={project.project_id} className="hover border-b border-gray-100">
                          {/* รายละเอียด */}
                          <td className="py-4">
                            <div className="space-y-1">
                              <div className="text-sm text-gray-900">{project.project_name}</div>
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
                              <div className="text-xs text-gray-400">
                                ผู้สร้าง: {project.creator.name}
                              </div>
                              {project.status === "rejected" && project.rejection_reason && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                  <span className="text-red-800">เหตุผล: </span>
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
                            <button
                              onClick={() => navigate(`/app/projects/${project.project_id}`, { state: { from: 'manage-projects' } })}
                              className="btn btn-ghost btn-sm border border-gray-300 hover:bg-gray-100"
                              title="ดูรายละเอียด"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 py-4 border-t border-gray-100">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="btn btn-sm btn-ghost"
                    >
                      ก่อนหน้า
                    </button>

                    <div className="flex gap-1">
                      {[...Array(pagination.totalPages)].map((_, index) => {
                        const pageNum = index + 1;
                        // Show first page, last page, current page, and pages around current
                        if (
                          pageNum === 1 ||
                          pageNum === pagination.totalPages ||
                          (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                              className={`btn btn-sm ${
                                pagination.page === pageNum
                                  ? 'btn-primary'
                                  : 'btn-ghost'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (
                          pageNum === pagination.page - 2 ||
                          pageNum === pagination.page + 2
                        ) {
                          return <span key={pageNum} className="px-2">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="btn btn-sm btn-ghost"
                    >
                      ถัดไป
                    </button>

                    <span className="text-sm text-gray-500 ml-4">
                      หน้า {pagination.page} / {pagination.totalPages} (ทั้งหมด {pagination.total} โครงการ)
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Review Modal */}
        {reviewingProject && (
          <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <h3 className="font-bold text-sm mb-3">
                {reviewMode === "approve" ? "อนุมัติโครงการ" : "ไม่อนุมัติโครงการ"}
              </h3>

              <div className="mb-3">
                <p className="font-semibold text-xs text-gray-700">{reviewingProject.project_name}</p>
                <p className="text-xs text-gray-600">{PROJECT_TYPE_LABELS[reviewingProject.project_type]}</p>
              </div>

              {reviewMode === "approve" ? (
                <>
                  {/* Participant Selection */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold mb-1.5">
                      <Users className="inline h-3 w-3 mr-1" />
                      เลือกผู้เข้าร่วมที่ต้องการอนุมัติ
                    </label>
                    <p className="text-[10px] text-gray-500 mb-2">
                      ผู้ที่ไม่ถูกเลือกจะถูกปฏิเสธโดยอัตโนมัติ
                    </p>

                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {reviewingProject.participants?.map(participant => (
                        <div
                          key={participant.user_id}
                          className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                            selectedParticipants.includes(participant.user_id)
                              ? "bg-green-50 border-green-300"
                              : "bg-gray-50 border-gray-300"
                          }`}
                          onClick={() => toggleParticipant(participant.user_id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{participant.user?.name}</p>
                              <p className="text-[10px] text-gray-600 truncate">
                                {participant.user?.username} • {participant.user?.email}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">
                                {participant.user?.faculty} - {participant.user?.major}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedParticipants.includes(participant.user_id)}
                              onChange={() => toggleParticipant(participant.user_id)}
                              className="checkbox checkbox-success checkbox-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="modal-action">
                    <button onClick={closeReviewModal} className="btn btn-ghost btn-sm">
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => {
                        setReviewMode("reject");
                        setSelectedParticipants([]);
                      }}
                      className="btn btn-error btn-sm"
                    >
                      ไม่อนุมัติแทน
                    </button>
                    <button onClick={handleApprove} className="btn btn-success btn-sm">
                      อนุมัติ ({selectedParticipants.length} คน)
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Rejection Reason */}
                  <div className="form-control mb-3">
                    <label className="block text-xs font-semibold mb-1.5">
                      เหตุผลที่ไม่อนุมัติ
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="textarea textarea-bordered textarea-sm h-20 text-xs"
                      placeholder="ระบุเหตุผล..."
                    />
                  </div>

                  <div className="modal-action">
                    <button onClick={closeReviewModal} className="btn btn-ghost btn-sm">
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => {
                        setReviewMode("approve");
                        setSelectedParticipants(reviewingProject.participants?.map(p => p.user_id) || []);
                      }}
                      className="btn btn-success btn-sm"
                    >
                      อนุมัติแทน
                    </button>
                    <button onClick={handleReject} className="btn btn-error btn-sm">
                      ยืนยันไม่อนุมัติ
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProjectsPage;
