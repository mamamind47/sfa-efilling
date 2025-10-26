import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Clock, Users, FileText, Image, Loader2, CheckCircle, XCircle, AlertCircle, Edit, Trash2, Upload, Send } from "lucide-react";
import apiClient from "../../api/axiosConfig";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import DocumentUploadForm from "../../components/DocumentUploadForm";
import AddParticipantForm from "../../components/AddParticipantForm";
import {
  PROJECT_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PARTICIPANT_STATUS_LABELS,
  PARTICIPANT_STATUS_COLORS
} from "../../constants/projectConstants";

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { role, user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPendingParticipants, setSelectedPendingParticipants] = useState([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [participantRejectionReason, setParticipantRejectionReason] = useState("");
  const [showProjectRejectModal, setShowProjectRejectModal] = useState(false);
  const [showProjectApproveModal, setShowProjectApproveModal] = useState(false);
  const [showApproveParticipantsModal, setShowApproveParticipantsModal] = useState(false);
  const [showRejectParticipantModal, setShowRejectParticipantModal] = useState(false);
  const [showRevertParticipantModal, setShowRevertParticipantModal] = useState(false);
  const [showReApproveParticipantModal, setShowReApproveParticipantModal] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showAddParticipantForm, setShowAddParticipantForm] = useState(false);
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [showSubmitProjectModal, setShowSubmitProjectModal] = useState(false);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [showOpenProjectModal, setShowOpenProjectModal] = useState(false);
  const [openingProject, setOpeningProject] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'documents', 'pending', 'approved', 'rejected'
  const [participantMenuOpen, setParticipantMenuOpen] = useState(true);
  const [detailsSubTab, setDetailsSubTab] = useState('general'); // 'general', 'description'
  const [selectedParticipantToRevert, setSelectedParticipantToRevert] = useState(null);
  const [selectedParticipantToReApprove, setSelectedParticipantToReApprove] = useState(null);

  useEffect(() => {
    fetchProjectDetail();
  }, [projectId]);

  useEffect(() => {
    // Show modal only when coming from project creation (justSubmitted state)
    if (location.state?.justSubmitted && project && project.status === 'submitted' && String(project.created_by) === String(user?.id) && role !== 'admin') {
      setShowSubmittedModal(true);
      // Clear the state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [project, user, role, location.state]);

  const fetchProjectDetail = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/projects/${projectId}`);
      const projectData = response.data;

      // Convert file_path to full URL
      if (projectData.files && projectData.files.length > 0) {
        const fileBaseUrl = import.meta.env.VITE_FILE_BASE_URL || 'http://localhost:3000';
        projectData.files = projectData.files.map(file => ({
          ...file,
          file_url: `${fileBaseUrl}${file.file_path}`,
          file_name: file.file_path.split('/').pop()
        }));
      }

      setProject(projectData);
    } catch (error) {
      console.error("Error fetching project detail:", error);
      toast.error("ไม่สามารถโหลดข้อมูลโครงการได้");
    } finally {
      setLoading(false);
    }
  };

  // ===== NEW: Project Approval Handlers (Step 1) =====
  const handleApproveProject = async () => {
    try {
      await apiClient.post(`/projects/${projectId}/approve`);
      toast.success("อนุมัติโครงการสำเร็จ");
      setShowProjectApproveModal(false);
      fetchProjectDetail();
    } catch (error) {
      console.error("Error approving project:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการอนุมัติโครงการ");
    }
  };

  const handleRejectProject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
      return;
    }

    try {
      await apiClient.post(`/projects/${projectId}/reject`, {
        rejection_reason: rejectionReason
      });
      toast.success("ไม่อนุมัติโครงการสำเร็จ");
      setShowProjectRejectModal(false);
      setRejectionReason("");
      fetchProjectDetail();
    } catch (error) {
      console.error("Error rejecting project:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการไม่อนุมัติโครงการ");
    }
  };

  // ===== Student Submit Project Handler =====
  const handleSubmitProject = async () => {
    setSubmittingProject(true);
    try {
      await apiClient.post(`/projects/${projectId}/submit`);
      toast.success("ส่งโครงการสำเร็จ");
      setShowSubmitProjectModal(false);
      fetchProjectDetail();
    } catch (error) {
      console.error("Error submitting project:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการส่งโครงการ");
    } finally {
      setSubmittingProject(false);
    }
  };

  // ===== Admin Open Project Handler =====
  const handleOpenProject = async () => {
    setOpeningProject(true);
    try {
      await apiClient.post(`/projects/${projectId}/approve`);
      toast.success("เปิดโครงการสำเร็จ");
      setShowOpenProjectModal(false);
      fetchProjectDetail();
    } catch (error) {
      console.error("Error opening project:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการเปิดโครงการ");
    } finally {
      setOpeningProject(false);
    }
  };

  // ===== NEW: Participant Approval Handlers (Step 2) =====
  const handleApprovePendingParticipants = () => {
    if (selectedPendingParticipants.length === 0) {
      toast.error("กรุณาเลือกผู้เข้าร่วมอย่างน้อย 1 คน");
      return;
    }
    setShowApproveParticipantsModal(true);
  };

  const confirmApproveParticipants = async () => {
    try {
      await apiClient.post(`/projects/${projectId}/participants/approve`, {
        user_ids: selectedPendingParticipants
      });
      toast.success(`อนุมัติผู้เข้าร่วม ${selectedPendingParticipants.length} คนสำเร็จ`);
      setShowApproveParticipantsModal(false);
      setSelectedPendingParticipants([]);
      fetchProjectDetail();
    } catch (error) {
      console.error("Error approving participants:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  };

  const handleRejectPendingParticipants = () => {
    if (selectedPendingParticipants.length === 0) {
      toast.error("กรุณาเลือกผู้เข้าร่วมอย่างน้อย 1 คน");
      return;
    }
    setParticipantRejectionReason("");
    setShowRejectParticipantModal(true);
  };

  const confirmRejectParticipants = async () => {
    if (!participantRejectionReason.trim()) {
      toast.error("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
      return;
    }

    try {
      await apiClient.post(`/projects/${projectId}/participants/reject`, {
        user_ids: selectedPendingParticipants,
        rejection_reason: participantRejectionReason
      });
      toast.success(`ปฏิเสธผู้เข้าร่วม ${selectedPendingParticipants.length} คนสำเร็จ`);
      setSelectedPendingParticipants([]);
      setShowRejectParticipantModal(false);
      setParticipantRejectionReason("");
      fetchProjectDetail();
    } catch (error) {
      console.error("Error rejecting participants:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  };

  const handleRevertSingleParticipant = (userId, userName) => {
    setSelectedParticipantToRevert({ userId, userName });
    setShowRevertParticipantModal(true);
  };

  const confirmRevertParticipant = async () => {
    if (!selectedParticipantToRevert) return;

    try {
      await apiClient.post(`/projects/${projectId}/participants/revert`, {
        user_ids: [selectedParticipantToRevert.userId]
      });
      toast.success(`ยกเลิกการอนุมัติสำเร็จ`);
      setShowRevertParticipantModal(false);
      setSelectedParticipantToRevert(null);
      fetchProjectDetail();
    } catch (error) {
      console.error("Error reverting participant:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  };

  const handleReApproveSingleParticipant = (userId, userName) => {
    setSelectedParticipantToReApprove({ userId, userName });
    setShowReApproveParticipantModal(true);
  };

  const confirmReApproveParticipant = async () => {
    if (!selectedParticipantToReApprove) return;

    try {
      await apiClient.post(`/projects/${projectId}/participants/approve`, {
        user_ids: [selectedParticipantToReApprove.userId]
      });
      toast.success(`อนุมัติสำเร็จ`);
      setShowReApproveParticipantModal(false);
      setSelectedParticipantToReApprove(null);
      fetchProjectDetail();
    } catch (error) {
      console.error("Error re-approving participant:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  };

  const togglePendingParticipant = (userId) => {
    setSelectedPendingParticipants(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    fetchProjectDetail();
  };

  const handleAddParticipantSuccess = () => {
    setShowAddParticipantModal(false);
    fetchProjectDetail();
  };

  // Check if user can upload documents
  const canUploadDocuments = () => {
    if (!project) return false;
    // Creator or admin can upload
    if (project.created_by !== user?.id && role !== 'admin') return false;
    // Can upload if draft, submitted, rejected, or if there are no files yet
    return (project.status === 'draft' || project.status === 'submitted' || project.status === 'rejected' || !project.files || project.files.length === 0);
  };

  // Check if user can add participants
  const canAddParticipants = () => {
    if (!project) return false;
    // Creator or admin can add
    if (project.created_by !== user?.id && role !== 'admin') return false;
    // Can add participants if draft, submitted, rejected, or approved
    return (project.status === 'draft' || project.status === 'submitted' || project.status === 'rejected' || project.status === 'approved');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="card bg-white shadow-md">
            <div className="card-body text-center py-12">
              <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
              <h2 className="text-base font-bold mb-3">ไม่พบโครงการ</h2>
              <button onClick={() => navigate(-1)} className="btn btn-primary btn-sm mt-3">
                <ArrowLeft className="h-4 w-4 mr-1" />
                กลับ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white shadow-lg flex-shrink-0">
        <div className="sticky top-0">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-1"></div>
          <div className="p-3">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide px-3 py-2">การจัดการ</h3>
                <ul className="menu menu-compact p-0">
                  <li>
                    <a
                      className={`text-sm rounded-lg ${activeTab === 'details' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700'}`}
                      onClick={() => setActiveTab('details')}
                    >
                      <FileText className="h-4 w-4" />
                      ข้อมูลโครงการ
                    </a>
                  </li>
                  <li>
                    <a
                      className={`text-sm rounded-lg ${activeTab === 'documents' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700'}`}
                      onClick={() => setActiveTab('documents')}
                    >
                      <Upload className="h-4 w-4" />
                      เอกสารสิ้นสุดโครงการ
                    </a>
                  </li>

                  {/* Collapsible Participants Menu */}
                  <li>
                    <a
                      className="text-sm rounded-lg text-gray-700 justify-between"
                      onClick={() => setParticipantMenuOpen(!participantMenuOpen)}
                    >
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        ผู้เข้าร่วมโครงการ
                      </span>
                      <svg
                        className={`h-4 w-4 transition-transform ${participantMenuOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </a>

                    {participantMenuOpen && (
                      <ul className="ml-6 mt-1 space-y-1">
                        <li>
                          <a
                            className={`text-sm rounded-lg ${activeTab === 'pending' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-600'}`}
                            onClick={() => setActiveTab('pending')}
                          >
                            รายชื่อที่รอดำเนินการ
                            {project.participants?.filter(p => p.status === 'pending').length > 0 && (
                              <span className={`badge badge-xs ml-auto ${PARTICIPANT_STATUS_COLORS.pending}`}>
                                {project.participants.filter(p => p.status === 'pending').length}
                              </span>
                            )}
                          </a>
                        </li>
                        <li>
                          <a
                            className={`text-sm rounded-lg ${activeTab === 'approved' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-600'}`}
                            onClick={() => setActiveTab('approved')}
                          >
                            รายชื่อที่อนุมัติแล้ว
                            {project.participants?.filter(p => p.status === 'approved').length > 0 && (
                              <span className={`badge badge-xs ml-auto ${PARTICIPANT_STATUS_COLORS.approved}`}>
                                {project.participants.filter(p => p.status === 'approved').length}
                              </span>
                            )}
                          </a>
                        </li>
                        <li>
                          <a
                            className={`text-sm rounded-lg ${activeTab === 'rejected' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-600'}`}
                            onClick={() => setActiveTab('rejected')}
                          >
                            รายชื่อที่ไม่อนุมัติ
                            {project.participants?.filter(p => p.status === 'rejected').length > 0 && (
                              <span className={`badge badge-xs ml-auto ${PARTICIPANT_STATUS_COLORS.rejected}`}>
                                {project.participants.filter(p => p.status === 'rejected').length}
                              </span>
                            )}
                          </a>
                        </li>
                      </ul>
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="text-sm breadcrumbs mb-4">
            <ul>
              <li>
                <a
                  onClick={() => {
                    // Check if came from manage-projects or my-projects
                    const from = location.state?.from || (document.referrer.includes('manage-projects') ? 'manage-projects' : 'my-projects');
                    if (from === 'manage-projects') {
                      navigate('/app/manage-projects');
                    } else {
                      navigate('/app/my-projects');
                    }
                  }}
                  className="text-gray-600 hover:text-orange-600 cursor-pointer"
                >
                  {(() => {
                    const from = location.state?.from || (document.referrer.includes('manage-projects') ? 'manage-projects' : 'my-projects');
                    return from === 'manage-projects' ? 'จัดการโครงการ' : 'โครงการของฉัน';
                  })()}
                </a>
              </li>
              <li className="text-orange-600 font-medium">
                {project.project_name}
              </li>
            </ul>
          </div>

          <div>
            {/* Tab: ข้อมูลโครงการ */}
            {activeTab === 'details' && (
              <div className="card bg-white shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-1"></div>
                <div className="card-body p-6">
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-xl font-bold">ข้อมูลโครงการ</h2>

                    {/* Admin Action Buttons */}
                    {role === "admin" && (
                      <div className="flex flex-row gap-2">
                        {/* Open draft project */}
                        {project.status === "draft" && (
                          <button
                            onClick={() => setShowOpenProjectModal(true)}
                            className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-0 gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            เปิดโครงการ
                          </button>
                        )}

                        {/* Step 1: Approve/Reject Project (for submitted projects) */}
                        {project.status === "submitted" && (
                          <>
                            <button
                              onClick={() => setShowProjectApproveModal(true)}
                              className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-0 gap-1"
                            >
                              <CheckCircle className="h-4 w-4" />
                              อนุมัติโครงการ
                            </button>
                            <button
                              onClick={() => setShowProjectRejectModal(true)}
                              className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-0 gap-1"
                            >
                              <XCircle className="h-4 w-4" />
                              ไม่อนุมัติโครงการ
                            </button>
                          </>
                        )}

                      </div>
                    )}

                    {/* Student Action Button (Submit for draft projects) */}
                    {role === "student" && project.status === "draft" && String(project.created_by) === String(user?.id) && (
                      <button
                        onClick={() => setShowSubmitProjectModal(true)}
                        className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-0 gap-1"
                      >
                        <Send className="h-4 w-4" />
                        ส่งขออนุมัติโครงการ
                      </button>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-6 py-4 border-b border-gray-100">
                      <div className="text-sm text-gray-600">ชื่อโครงการ</div>
                      <div className="col-span-2 text-sm font-medium text-gray-900">{project.project_name}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 py-4 border-b border-gray-100">
                      <div className="text-sm text-gray-600">ประเภท</div>
                      <div className="col-span-2 text-sm font-medium text-gray-900">{PROJECT_TYPE_LABELS[project.project_type]}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 py-4 border-b border-gray-100">
                      <div className="text-sm text-gray-600">สถานะโครงการ</div>
                      <div className="col-span-2">
                        <span className={`badge ${PROJECT_STATUS_COLORS[project.status]}`}>
                          {PROJECT_STATUS_LABELS[project.status]}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">วันและเวลาดำเนินกิจกรรม</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">วันเริ่มต้นการจัดกิจกรรม</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(project.start_date).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">เวลาเริ่มต้นการจัดกิจกรรม</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(project.start_date).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 mt-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">วันสิ้นสุดการจัดกิจกรรม</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(project.end_date).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">เวลาสิ้นสุดการจัดกิจกรรม</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(project.end_date).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 py-4 border-b border-gray-100">
                      <div className="text-sm text-gray-600">สถานที่</div>
                      <div className="col-span-2 text-sm font-medium text-gray-900">
                        {project.location}
                        {project.campus && <span className="text-gray-600"> ({project.campus})</span>}
                      </div>
                    </div>

                    {project.province && (
                      <div className="grid grid-cols-3 gap-6 py-4 border-b border-gray-100">
                        <div className="text-sm text-gray-600">จังหวัด</div>
                        <div className="col-span-2 text-sm font-medium text-gray-900">{project.province}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-6 py-4 border-b border-gray-100">
                      <div className="text-sm text-gray-600">จำนวนชั่วโมง</div>
                      <div className="col-span-2 text-sm font-medium text-gray-900">{project.hours_per_person} ชม./คน</div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 py-4 border-b border-gray-100">
                      <div className="text-sm text-gray-600">ปีการศึกษา</div>
                      <div className="col-span-2 text-sm font-medium text-gray-900">{project.academic_year?.year_name || "N/A"}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 py-4 border-b border-gray-100">
                      <div className="text-sm text-gray-600">ผู้สร้างโครงการ</div>
                      <div className="col-span-2 text-sm font-medium text-gray-900">{project.creator?.name || "N/A"}</div>
                    </div>

                    {/* รายละเอียดโครงการ */}
                    {project.description && (
                      <div className="grid grid-cols-3 gap-6 py-4 border-b border-gray-100">
                        <div className="text-sm text-gray-600">รายละเอียดโครงการ</div>
                        <div className="col-span-2 text-sm text-gray-700 whitespace-pre-wrap">
                          {project.description}
                        </div>
                      </div>
                    )}

                    {project.status === "rejected" && project.rejection_reason && (
                      <div className="mt-6 p-4 bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg">
                        <p className="text-sm font-bold text-red-900 mb-2">เหตุผลที่ไม่อนุมัติ</p>
                        <p className="text-sm text-red-800">{project.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: เอกสารสิ้นสุดโครงการ */}
            {activeTab === 'documents' && (
              <div className="card bg-white shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-1.5"></div>
                <div className="card-body p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800">เอกสารสิ้นสุดโครงการ</h2>
                    {canUploadDocuments() && !showUploadForm && (
                      <button
                        onClick={() => setShowUploadForm(true)}
                        className="btn btn-sm bg-orange-500 hover:bg-orange-600 text-white border-0"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {project.files && project.files.length > 0 ? 'อัปโหลดเอกสารเพิ่มเติม' : 'อัปโหลดเอกสาร'}
                      </button>
                    )}
                  </div>

                  {/* Upload Form */}
                  {showUploadForm && canUploadDocuments() && (
                    <div className="mb-6 p-4 border-2 border-orange-200 rounded-lg">
                      <h3 className="text-sm font-bold text-gray-800 mb-4">
                        {project.files && project.files.length > 0 ? 'อัปโหลดเอกสารเพิ่มเติม' : 'อัปโหลดเอกสารสิ้นสุดโครงการ'}
                      </h3>
                      <DocumentUploadForm
                        projectId={projectId}
                        role={role}
                        hasExistingFiles={project.files && project.files.length > 0}
                        onSuccess={() => {
                          setShowUploadForm(false);
                          fetchProjectDetail();
                        }}
                        onCancel={() => setShowUploadForm(false)}
                      />
                    </div>
                  )}

                  {!project.files || project.files.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Upload className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">ยังไม่มีเอกสาร</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Photos */}
                      {project.files.filter(f => {
                        if (f.document_type === 'photo') return true;
                        if (f.document_type === 'files') {
                          const ext = f.file_path.split('.').pop().toLowerCase();
                          return ['jpg', 'jpeg', 'png', 'gif'].includes(ext);
                        }
                        return false;
                      }).length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold mb-3 text-gray-700 flex items-center gap-2">
                            <Image className="h-4 w-4 text-orange-600" />
                            รูปภาพกิจกรรม ({project.files.filter(f => f.document_type === 'photo' || (f.document_type === 'files' && ['jpg', 'jpeg', 'png', 'gif'].includes(f.file_path.split('.').pop().toLowerCase()))).length})
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {project.files
                              .filter(f => {
                                if (f.document_type === 'photo') return true;
                                if (f.document_type === 'files') {
                                  const ext = f.file_path.split('.').pop().toLowerCase();
                                  return ['jpg', 'jpeg', 'png', 'gif'].includes(ext);
                                }
                                return false;
                              })
                              .map((file, index) => (
                                <a
                                  key={file.file_id}
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group relative block overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                                >
                                  <img
                                    src={file.file_url}
                                    alt={`รูปที่ ${index + 1}`}
                                    className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                                    <div className="text-white text-xs font-semibold flex items-center gap-1 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                      <Image className="h-4 w-4" />
                                      คลิกเพื่อดู
                                    </div>
                                  </div>
                                </a>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Certificate */}
                      {project.files.filter(f => f.document_type === 'certificate').length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold mb-2 text-gray-700">เอกสารรับรอง</h3>
                          <div className="space-y-2">
                            {project.files
                              .filter(f => f.document_type === 'certificate')
                              .map((file) => (
                                <a
                                  key={file.file_id}
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-2 p-3 bg-base-200 hover:bg-base-300 rounded-lg transition-colors"
                                >
                                  <FileText className="h-5 w-5 text-primary" />
                                  <span className="flex-1 text-sm truncate">{file.file_name}</span>
                                  <span className="text-xs text-gray-500">ดูเอกสาร →</span>
                                </a>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Other Documents */}
                      {project.files.filter(f => {
                        if (f.document_type === 'other') return true;
                        if (f.document_type === 'files') {
                          const ext = f.file_path.split('.').pop().toLowerCase();
                          return !['jpg', 'jpeg', 'png', 'gif'].includes(ext);
                        }
                        return false;
                      }).length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold mb-2 text-gray-700">เอกสารอื่นๆ</h3>
                          <div className="space-y-2">
                            {project.files
                              .filter(f => {
                                if (f.document_type === 'other') return true;
                                if (f.document_type === 'files') {
                                  const ext = f.file_path.split('.').pop().toLowerCase();
                                  return !['jpg', 'jpeg', 'png', 'gif'].includes(ext);
                                }
                                return false;
                              })
                              .map((file) => (
                                <a
                                  key={file.file_id}
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-2 p-3 bg-base-200 hover:bg-base-300 rounded-lg transition-colors"
                                >
                                  <FileText className="h-5 w-5 text-primary" />
                                  <span className="flex-1 text-sm truncate">{file.file_name}</span>
                                  <span className="text-xs text-gray-500">ดูเอกสาร →</span>
                                </a>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: รายชื่อที่รอดำเนินการ */}
            {activeTab === 'pending' && (
              <div className="card bg-white shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-1.5"></div>
                <div className="card-body p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800">รายชื่อที่รอดำเนินการ</h2>
                    {canAddParticipants() && !showAddParticipantForm && (
                      <button
                        onClick={() => setShowAddParticipantForm(true)}
                        className="btn btn-sm bg-orange-500 hover:bg-orange-600 text-white border-0"
                      >
                        <Users className="h-4 w-4 mr-1" />
                        เพิ่มผู้เข้าร่วม
                      </button>
                    )}
                  </div>

                  {/* Add Participant Form */}
                  {showAddParticipantForm && canAddParticipants() && (
                    <div className="mb-6 p-4 border-2 border-orange-200 rounded-lg">
                      <h3 className="text-sm font-bold text-gray-800 mb-4">เพิ่มผู้เข้าร่วมโครงการ</h3>
                      <AddParticipantForm
                        projectId={projectId}
                        onSuccess={() => {
                          setShowAddParticipantForm(false);
                          fetchProjectDetail();
                        }}
                        onCancel={() => setShowAddParticipantForm(false)}
                      />
                    </div>
                  )}

                  {!project.participants || project.participants.filter(p => p.status === 'pending').length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">ไม่มีรายชื่อที่รอดำเนินการ</p>
                    </div>
                  ) : (
                    <>
                      {/* Admin Action Buttons */}
                      {role === "admin" && (
                        <div className="flex gap-2 mb-4">
                          <button
                            onClick={handleApprovePendingParticipants}
                            disabled={selectedPendingParticipants.length === 0}
                            className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-0 disabled:bg-gray-300"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            อนุมัติ ({selectedPendingParticipants.length})
                          </button>
                          <button
                            onClick={handleRejectPendingParticipants}
                            disabled={selectedPendingParticipants.length === 0}
                            className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-0 disabled:bg-gray-300"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            ปฏิเสธ ({selectedPendingParticipants.length})
                          </button>
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="table table-zebra">
                          <thead>
                            <tr className="text-xs">
                              {role === "admin" && <th className="w-12"></th>}
                              <th>#</th>
                              <th>ชื่อ-นามสกุล</th>
                              <th>รหัสนักศึกษา</th>
                              <th>คณะ / สาขา</th>
                              <th>สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {project.participants
                              .filter(p => p.status === 'pending')
                              .map((participant, index) => (
                                <tr key={participant.user_id} className="text-sm">
                                  {role === "admin" && (
                                    <td>
                                      <input
                                        type="checkbox"
                                        className="checkbox checkbox-sm"
                                        checked={selectedPendingParticipants.includes(participant.user_id)}
                                        onChange={() => togglePendingParticipant(participant.user_id)}
                                      />
                                    </td>
                                  )}
                                  <td>{index + 1}</td>
                                  <td>{participant.user?.name || "N/A"}</td>
                                  <td>{participant.user?.username || "N/A"}</td>
                                  <td>
                                    <div className="text-sm">
                                      <div>{participant.user?.faculty}</div>
                                      <div className="text-gray-500 text-xs">{participant.user?.major}</div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`badge badge-sm ${PARTICIPANT_STATUS_COLORS[participant.status]}`}>
                                      {PARTICIPANT_STATUS_LABELS[participant.status]}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tab: รายชื่อที่อนุมัติผลตอบแทนแล้ว */}
            {activeTab === 'approved' && (
              <div className="card bg-white shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5"></div>
                <div className="card-body p-5">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">รายชื่อที่อนุมัติผลตอบแทนแล้ว</h2>

                  {!project.participants || project.participants.filter(p => p.status === 'approved').length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">ยังไม่มีรายชื่อที่อนุมัติแล้ว</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table table-zebra">
                        <thead>
                          <tr className="text-xs">
                            <th>#</th>
                            <th>ชื่อ-นามสกุล</th>
                            <th>รหัสนักศึกษา</th>
                            <th>คณะ / สาขา</th>
                            <th>สถานะ</th>
                            <th>ชั่วโมงที่ได้รับ</th>
                            {role === "admin" && <th className="text-center">จัดการ</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {project.participants
                            .filter(p => p.status === 'approved')
                            .map((participant, index) => (
                              <tr key={participant.user_id} className="text-sm">
                                <td>{index + 1}</td>
                                <td>{participant.user?.name || "N/A"}</td>
                                <td>{participant.user?.username || "N/A"}</td>
                                <td>
                                  <div className="text-sm">
                                    <div>{participant.user?.faculty}</div>
                                    <div className="text-gray-500 text-xs">{participant.user?.major}</div>
                                  </div>
                                </td>
                                <td>
                                  <span className={`badge badge-sm ${PARTICIPANT_STATUS_COLORS[participant.status]}`}>
                                    {PARTICIPANT_STATUS_LABELS[participant.status]}
                                  </span>
                                </td>
                                <td>
                                  {participant.hours_received ? `${participant.hours_received} ชม.` : "-"}
                                </td>
                                {role === "admin" && (
                                  <td className="text-center">
                                    <button
                                      onClick={() => handleRevertSingleParticipant(participant.user_id, participant.user?.name)}
                                      className="btn btn-xs bg-amber-600 hover:bg-amber-700 text-white border-0"
                                    >
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      ยกเลิก
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: รายชื่อที่ไม่อนุมัติ */}
            {activeTab === 'rejected' && (
              <div className="card bg-white shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-rose-500 h-1.5"></div>
                <div className="card-body p-5">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">รายชื่อที่ไม่อนุมัติ</h2>

                  {!project.participants || project.participants.filter(p => p.status === 'rejected').length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <XCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">ไม่มีรายชื่อที่ไม่อนุมัติ</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table table-zebra">
                        <thead>
                          <tr className="text-xs">
                            <th>#</th>
                            <th>ชื่อ-นามสกุล</th>
                            <th>รหัสนักศึกษา</th>
                            <th>คณะ / สาขา</th>
                            <th>สถานะ</th>
                            <th>เหตุผล</th>
                            {role === "admin" && <th className="text-center">จัดการ</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {project.participants
                            .filter(p => p.status === 'rejected')
                            .map((participant, index) => (
                              <tr key={participant.user_id} className="text-sm">
                                <td>{index + 1}</td>
                                <td>{participant.user?.name || "N/A"}</td>
                                <td>{participant.user?.username || "N/A"}</td>
                                <td>
                                  <div className="text-sm">
                                    <div>{participant.user?.faculty}</div>
                                    <div className="text-gray-500 text-xs">{participant.user?.major}</div>
                                  </div>
                                </td>
                                <td>
                                  <span className={`badge badge-sm ${PARTICIPANT_STATUS_COLORS[participant.status]}`}>
                                    {PARTICIPANT_STATUS_LABELS[participant.status]}
                                  </span>
                                </td>
                                <td>
                                  {participant.rejection_reason ? (
                                    <div className="text-xs text-gray-700 max-w-xs">
                                      {participant.rejection_reason}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </td>
                                {role === "admin" && (
                                  <td className="text-center">
                                    <button
                                      onClick={() => handleReApproveSingleParticipant(participant.user_id, participant.user?.name)}
                                      className="btn btn-xs bg-green-600 hover:bg-green-700 text-white border-0"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      อนุมัติ
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submitted Project Info Modal */}
        {/* Submit Project Confirmation Modal (Student) */}
        {showSubmitProjectModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg text-green-600">ยืนยันการส่งโครงการ</h3>
              <p className="py-4">
                คุณต้องการส่งโครงการ <span className="font-semibold">"{project.project_name}"</span> เพื่อรอการอนุมัติใช่หรือไม่?
              </p>
              <p className="text-sm text-gray-500">
                โครงการจะถูกส่งไปยังผู้ดูแลระบบเพื่อพิจารณาอนุมัติ
              </p>
              <div className="modal-action">
                <button
                  onClick={() => setShowSubmitProjectModal(false)}
                  className="btn btn-ghost"
                  disabled={submittingProject}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmitProject}
                  className="btn bg-green-600 hover:bg-green-700 text-white border-0"
                  disabled={submittingProject}
                >
                  {submittingProject ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      ส่งโครงการ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Open Project Confirmation Modal (Admin) */}
        {showOpenProjectModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg text-blue-600">ยืนยันการเปิดโครงการ</h3>
              <p className="py-4">
                คุณต้องการเปิดโครงการ <span className="font-semibold">"{project.project_name}"</span> ใช่หรือไม่?
              </p>
              <p className="text-sm text-gray-500">
                โครงการจะอยู่ในสถานะอนุมัติทันที
              </p>
              <div className="modal-action">
                <button
                  onClick={() => setShowOpenProjectModal(false)}
                  className="btn btn-ghost"
                  disabled={openingProject}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleOpenProject}
                  className="btn bg-blue-600 hover:bg-blue-700 text-white border-0"
                  disabled={openingProject}
                >
                  {openingProject ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      กำลังเปิด...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      เปิดโครงการ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSubmittedModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-lg shadow-2xl overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 -m-6 mb-6 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                    <Clock className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-white">
                      ส่งโครงการสำเร็จ
                    </h3>
                    <p className="text-sm text-white/90 mt-1">
                      โครงการของท่านอยู่ระหว่างดำเนินการพิจารณา
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold text-gray-800 mb-1">หมายเหตุ:</p>
                      <p>ท่านสามารถดำเนินการอัปโหลดเอกสารและเพิ่มรายชื่อผู้เข้าร่วมโครงการได้ในระหว่างรอการพิจารณาอนุมัติ</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      setShowSubmittedModal(false);
                      setActiveTab('documents');
                    }}
                    className="btn btn-md w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 hover:from-orange-600 hover:to-amber-600 shadow-md"
                  >
                    จัดการเอกสารและผู้เข้าร่วม
                  </button>

                  <button
                    onClick={() => {
                      setShowSubmittedModal(false);
                      navigate('/app/my-projects');
                    }}
                    className="btn btn-md w-full btn-outline border-gray-300 hover:border-orange-500 hover:bg-orange-50"
                  >
                    กลับไปหน้ารายการโครงการ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Approve Modal */}
        {showProjectApproveModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-md">
              <h3 className="font-bold text-base mb-4 text-green-700 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                ยืนยันการอนุมัติโครงการ
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                คุณต้องการอนุมัติโครงการนี้ใช่หรือไม่?
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                {project?.project_name}
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-green-800">
                  เมื่ออนุมัติโครงการแล้ว ผู้เข้าร่วมทั้งหมดจะอยู่ในสถานะ "รอการอนุมัติ" คุณสามารถอนุมัติ/ปฏิเสธผู้เข้าร่วมแต่ละคนได้ภายหลัง
                </p>
              </div>
              <div className="modal-action">
                <button
                  onClick={() => setShowProjectApproveModal(false)}
                  className="btn btn-ghost btn-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleApproveProject}
                  className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  ยืนยันอนุมัติโครงการ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project Reject Modal */}
        {showProjectRejectModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-md">
              <h3 className="font-bold text-base mb-4 text-red-700 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                ไม่อนุมัติโครงการ
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                {project?.project_name}
              </p>
              <div className="form-control mb-4">
                <label className="block text-xs font-semibold mb-1.5">
                  เหตุผลที่ไม่อนุมัติ <span className="text-error">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="textarea textarea-bordered text-xs w-full h-32"
                  placeholder="ระบุเหตุผล..."
                />
              </div>
              <div className="modal-action">
                <button
                  onClick={() => {
                    setShowProjectRejectModal(false);
                    setRejectionReason("");
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleRejectProject}
                  className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-0"
                  disabled={!rejectionReason.trim()}
                >
                  ยืนยันไม่อนุมัติ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approve Participants Confirmation Modal */}
        {showApproveParticipantsModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-md">
              <h3 className="font-bold text-base mb-4 text-green-700 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                ยืนยันการอนุมัติผู้เข้าร่วม
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                คุณต้องการอนุมัติผู้เข้าร่วมใช่หรือไม่?
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-4">
                จำนวน {selectedPendingParticipants.length} คน
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-green-800">
                  ผู้เข้าร่วมทั้งหมดจะได้รับชั่วโมงตามที่โครงการกำหนด
                </p>
              </div>
              <div className="modal-action">
                <button
                  onClick={() => setShowApproveParticipantsModal(false)}
                  className="btn btn-ghost btn-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmApproveParticipants}
                  className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  ยืนยันอนุมัติ ({selectedPendingParticipants.length} คน)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Participant Rejection Reason Modal */}
        {showRejectParticipantModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-md">
              <h3 className="font-bold text-base mb-4 text-red-700 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                ปฏิเสธผู้เข้าร่วม
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                คุณกำลังจะปฏิเสธผู้เข้าร่วม {selectedPendingParticipants.length} คน
              </p>
              <div className="form-control mb-4">
                <label className="block text-xs font-semibold mb-1.5">
                  เหตุผลที่ไม่อนุมัติ <span className="text-error">*</span>
                </label>
                <textarea
                  value={participantRejectionReason}
                  onChange={(e) => setParticipantRejectionReason(e.target.value)}
                  className="textarea textarea-bordered text-xs w-full h-32"
                  placeholder="ระบุเหตุผล..."
                />
              </div>
              <div className="modal-action">
                <button
                  onClick={() => {
                    setShowRejectParticipantModal(false);
                    setParticipantRejectionReason("");
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmRejectParticipants}
                  className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-0"
                  disabled={!participantRejectionReason.trim()}
                >
                  ยืนยันปฏิเสธ ({selectedPendingParticipants.length} คน)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Revert Participant Confirmation Modal */}
        {showRevertParticipantModal && selectedParticipantToRevert && (
          <div className="modal modal-open">
            <div className="modal-box max-w-md">
              <h3 className="font-bold text-base mb-4 text-amber-700 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                ยืนยันยกเลิกการอนุมัติ
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                คุณต้องการยกเลิกการอนุมัติผู้เข้าร่วมคนนี้ใช่หรือไม่?
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-4">
                {selectedParticipantToRevert.userName}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-800">
                  เมื่อยกเลิกแล้ว ผู้เข้าร่วมจะกลับไปอยู่ในสถานะ "รอการอนุมัติ" และชั่วโมงที่ได้รับจะถูกล้างออก
                </p>
              </div>
              <div className="modal-action">
                <button
                  onClick={() => {
                    setShowRevertParticipantModal(false);
                    setSelectedParticipantToRevert(null);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmRevertParticipant}
                  className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white border-0"
                >
                  ยืนยันยกเลิกการอนุมัติ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Re-approve Participant Confirmation Modal */}
        {showReApproveParticipantModal && selectedParticipantToReApprove && (
          <div className="modal modal-open">
            <div className="modal-box max-w-md">
              <h3 className="font-bold text-base mb-4 text-green-700 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                ยืนยันการอนุมัติ
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                คุณต้องการอนุมัติผู้เข้าร่วมคนนี้ใช่หรือไม่?
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-4">
                {selectedParticipantToReApprove.userName}
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-green-800">
                  ผู้เข้าร่วมจะได้รับชั่วโมงตามที่โครงการกำหนด
                </p>
              </div>
              <div className="modal-action">
                <button
                  onClick={() => {
                    setShowReApproveParticipantModal(false);
                    setSelectedParticipantToReApprove(null);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmReApproveParticipant}
                  className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  ยืนยันอนุมัติ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage;
