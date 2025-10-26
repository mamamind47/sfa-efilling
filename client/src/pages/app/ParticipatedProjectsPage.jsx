import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import apiClient from "../../api/axiosConfig";
import { toast } from "react-hot-toast";
import {
  PROJECT_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PARTICIPANT_STATUS_LABELS,
  PARTICIPANT_STATUS_COLORS
} from "../../constants/projectConstants";

const ParticipatedProjectsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: "",
    academic_year_id: ""
  });
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [filter]);

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
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.academic_year_id) params.academic_year_id = filter.academic_year_id;

      const response = await apiClient.get("/projects/participated", { params });
      setProjects(response.data.projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("ไม่สามารถโหลดข้อมูลโครงการได้");
    } finally {
      setLoading(false);
    }
  };

  const getParticipantStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-error" />;
      case "pending":
      default:
        return <Clock className="h-5 w-5 text-warning" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="card bg-white shadow-md mb-5">
          <div className="card-body p-5">
            <h1 className="text-xl font-bold text-gray-800">โครงการที่เข้าร่วม</h1>
            <p className="text-sm text-gray-600 mt-1">โครงการที่คุณเป็นผู้เข้าร่วม</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card bg-white shadow-md mb-5">
          <div className="card-body p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="block text-sm font-semibold mb-2">
                  สถานะโครงการ
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

        {/* Projects List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="card bg-white shadow-md">
            <div className="card-body text-center py-12">
              <p className="text-gray-500">ไม่พบโครงการที่คุณเข้าร่วม</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map(project => {
              // Get participant status for current user
              const myParticipation = project.participants[0]; // API returns only current user's participation

              return (
                <div key={project.project_id} className="card bg-white shadow-md hover:shadow-lg transition-shadow">
                  <div className="card-body p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-3">
                          <h2 className="text-base font-bold">{project.project_name}</h2>
                          <span className={`badge ${PROJECT_STATUS_COLORS[project.status]}`}>
                            {PROJECT_STATUS_LABELS[project.status]}
                          </span>
                          <span className="badge badge-ghost">
                            {PROJECT_TYPE_LABELS[project.project_type]}
                          </span>
                        </div>

                        {project.description && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">{project.description}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-semibold">วันที่:</span>{" "}
                            {new Date(project.start_date).toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: '2-digit' })} -{" "}
                            {new Date(project.end_date).toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </div>
                          <div>
                            <span className="font-semibold">ผู้สร้าง:</span> {project.creator.name}
                          </div>
                          <div>
                            <span className="font-semibold">ผู้เข้าร่วม:</span> {project._count.participants} คน
                          </div>
                          <div>
                            <span className="font-semibold">ปีการศึกษา:</span> {project.academic_year.year_name}
                          </div>
                        </div>

                        {/* My Participation Status */}
                        <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                          {getParticipantStatusIcon(myParticipation.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">
                              สถานะการเข้าร่วมของคุณ:{" "}
                              <span className={`badge badge-sm ${PARTICIPANT_STATUS_COLORS[myParticipation.status]}`}>
                                {PARTICIPANT_STATUS_LABELS[myParticipation.status]}
                              </span>
                            </p>
                            {myParticipation.status === "approved" && myParticipation.hours_received && (
                              <p className="text-xs text-gray-600 mt-1">
                                ชั่วโมงที่ได้รับ: {myParticipation.hours_received} ชม.
                                {myParticipation.approved_at && (
                                  <> • อนุมัติเมื่อ {new Date(myParticipation.approved_at).toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: '2-digit' })}</>
                                )}
                              </p>
                            )}
                            {myParticipation.status === "pending" && (
                              <p className="text-xs text-gray-600 mt-1">
                                รอการอนุมัติจากแอดมิน
                              </p>
                            )}
                            {myParticipation.status === "rejected" && (
                              <p className="text-xs text-error mt-1">
                                การเข้าร่วมของคุณไม่ได้รับการอนุมัติ
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        <button
                          onClick={() => navigate(`/app/projects/${project.project_id}`)}
                          className="btn btn-sm btn-ghost"
                        >
                          <Eye className="h-4 w-4" />
                          ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipatedProjectsPage;
