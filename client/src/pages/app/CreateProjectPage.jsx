import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Church, School, Building2, X } from "lucide-react";
import apiClient from "../../api/axiosConfig";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { THAILAND_PROVINCES } from "../../constants/provinces";
import { UNIVERSITY_CAMPUSES, getCampusList, getLocationsForCampus } from "../../constants/campusLocations";

const PROJECT_TYPE_LABELS = {
  religious: 'ทำนุบำรุงศาสนสถาน',
  social_development: 'พัฒนาโรงเรียน/ชุมชน',
  university_activity: 'กิจกรรมภายในมหาวิทยาลัย'
};

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [activityLimits, setActivityLimits] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    project_name: "",
    project_type: "religious",
    description: "",
    start_date: "",
    end_date: "",
    location: "",
    campus: "",
    province: "",
    hours_per_person: "",
    academic_year_id: ""
  });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (formData.academic_year_id) {
      fetchActivityLimits();
    }
  }, [formData.academic_year_id]);

  const fetchAcademicYears = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/academic");
      const openYears = response.data.filter(year => year.status === "OPEN");

      if (openYears.length === 0) {
        toast.error("ไม่มีปีการศึกษาที่เปิดรับอยู่");
        setAcademicYears([]);
        return;
      }

      setAcademicYears(openYears);

      // Set default academic year
      const current = openYears.find(year => year.is_current);
      if (current) {
        setFormData(prev => ({ ...prev, academic_year_id: current.academic_year_id }));
      } else if (openYears.length > 0) {
        setFormData(prev => ({ ...prev, academic_year_id: openYears[0].academic_year_id }));
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
      toast.error("ไม่สามารถโหลดข้อมูลปีการศึกษาได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLimits = async () => {
    try {
      const response = await apiClient.get(`/activity-limits/academic-year/${formData.academic_year_id}`);
      setActivityLimits(response.data || {});
    } catch (error) {
      console.error("Error fetching activity limits:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Validate hours against limit
    if (name === 'hours_per_person') {
      const maxHours = activityLimits[formData.project_type];
      if (maxHours && value && parseInt(value) > maxHours) {
        toast.error(`จำนวนชั่วโมงต้องไม่เกิน ${maxHours} ชั่วโมง`);
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.project_name.trim()) {
      toast.error("กรุณาระบุชื่อโครงการ");
      return false;
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error("กรุณาระบุวันที่เริ่มต้นและสิ้นสุด");
      return false;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast.error("วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด");
      return false;
    }

    // Validate location based on project type
    if (formData.project_type === "university_activity") {
      if (!formData.campus) {
        toast.error("กรุณาเลือกพื้นที่การศึกษา");
        return false;
      }
      if (!formData.location) {
        toast.error("กรุณาเลือกสถานที่");
        return false;
      }
    } else {
      if (!formData.location.trim()) {
        toast.error("กรุณาระบุสถานที่");
        return false;
      }
    }

    if (!formData.hours_per_person || formData.hours_per_person <= 0) {
      toast.error("กรุณาระบุจำนวนชั่วโมง");
      return false;
    }

    // Check hours limit
    const maxHours = activityLimits[formData.project_type];
    if (maxHours && formData.hours_per_person > maxHours) {
      toast.error(`จำนวนชั่วโมงต้องไม่เกิน ${maxHours} ชั่วโมง`);
      return false;
    }

    if ((formData.project_type === "religious" || formData.project_type === "social_development") && !formData.province) {
      toast.error("กรุณาเลือกจังหวัด");
      return false;
    }

    return true;
  };

  const handleSubmit = async (submitImmediately) => {
    if (!validateForm()) {
      return;
    }

    if (!formData.academic_year_id) {
      toast.error("ไม่มีปีการศึกษาที่เปิดรับอยู่");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        project_name: formData.project_name,
        project_type: formData.project_type,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        location: formData.location,
        hours_per_person: parseInt(formData.hours_per_person),
        academic_year_id: formData.academic_year_id,
        submit_immediately: submitImmediately
      };

      // Add campus for university_activity
      if (formData.project_type === 'university_activity') {
        payload.campus = formData.campus;
      }

      // Add province for religious/social_development
      if (formData.project_type === 'religious' || formData.project_type === 'social_development') {
        payload.province = formData.province;
      }

      const response = await apiClient.post("/projects", payload);

      toast.success(submitImmediately ? "ส่งโครงการสำเร็จ" : "บันทึกฉบับร่างสำเร็จ");

      // Navigate to project detail page with state to show submitted modal
      navigate(`/app/projects/${response.data.project.project_id}`, {
        state: { justSubmitted: submitImmediately }
      });
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(error.response?.data?.error || "เกิดข้อผิดพลาดในการสร้างโครงการ");
    } finally {
      setSubmitting(false);
    }
  };

  const requiresProvince = formData.project_type === "religious" || formData.project_type === "social_development";

  // Get selected academic year for date validation
  const selectedAcademicYear = academicYears.find(year => year.academic_year_id === formData.academic_year_id);
  const academicYearStartDate = selectedAcademicYear ? new Date(selectedAcademicYear.start_date).toISOString().slice(0, 16) : '';
  const academicYearEndDate = selectedAcademicYear ? new Date(selectedAcademicYear.end_date).toISOString().slice(0, 16) : '';

  // Get max hours for current project type
  const maxHoursForType = activityLimits[formData.project_type] || null;

  // Check if no academic year is available
  if (academicYears.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 flex items-center justify-center">
        <div className="card bg-white shadow-xl max-w-md">
          <div className="card-body text-center">
            <div className="mx-auto w-16 h-16 bg-error bg-opacity-10 rounded-full flex items-center justify-center mb-4">
              <X className="h-8 w-8 text-error" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              ไม่สามารถสร้างโครงการได้
            </h2>
            <p className="text-gray-600 mb-6">
              ขณะนี้อยู่นอกเวลายื่นเอกสาร<br />
              กรุณาติดต่อเจ้าหน้าที่หรือรอช่วงเวลาที่เปิดรับ
            </p>
            <button
              onClick={() => navigate("/app/dashboard")}
              className="btn btn-primary"
            >
              กลับหน้าแรก
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="card bg-white shadow-md mb-4">
          <div className="card-body p-4">
            <h1 className="text-lg font-bold text-gray-800">สร้างกิจกรรม</h1>
            <p className="text-xs text-gray-600 mt-1">โปรดระบุข้อมูลกิจกรรมที่จะสร้าง และกรอกข้อมูลให้สมบูรณ์</p>
          </div>
        </div>

        {/* Form */}
        <div className="card bg-white shadow-xl">
          <div className="card-body p-5">
            <div className="space-y-4">
              {/* Project Type */}
              <div>
                <label className="block text-xs font-semibold mb-2">
                  ประเภทกิจกรรม <span className="text-error">*</span>
                </label>
                <div className={`grid gap-2 max-w-3xl ${role === 'admin' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {/* Religious */}
                  <div
                    onClick={() => !loading && setFormData(prev => ({ ...prev, project_type: 'religious' }))}
                    className={`card cursor-pointer transition-all ${
                      formData.project_type === 'religious'
                        ? 'bg-orange-500 border-2 border-orange-600 shadow-lg'
                        : 'bg-base-100 border-2 border-gray-200 hover:border-orange-300 hover:shadow-md'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="card-body items-center text-center p-3">
                      <Church className={`h-6 w-6 mb-1 ${
                        formData.project_type === 'religious' ? 'text-white' : 'text-gray-400'
                      }`} />
                      <h3 className={`text-xs font-semibold ${
                        formData.project_type === 'religious' ? 'text-white' : 'text-gray-700'
                      }`}>
                        {PROJECT_TYPE_LABELS.religious}
                      </h3>
                      <p className={`text-[10px] mt-0.5 ${
                        formData.project_type === 'religious' ? 'text-white text-opacity-90' : 'text-gray-500'
                      }`}>วัด โบสถ์ มัสยิด</p>
                    </div>
                  </div>

                  {/* Social Development */}
                  <div
                    onClick={() => !loading && setFormData(prev => ({ ...prev, project_type: 'social_development' }))}
                    className={`card cursor-pointer transition-all ${
                      formData.project_type === 'social_development'
                        ? 'bg-orange-500 border-2 border-orange-600 shadow-lg'
                        : 'bg-base-100 border-2 border-gray-200 hover:border-orange-300 hover:shadow-md'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="card-body items-center text-center p-3">
                      <School className={`h-6 w-6 mb-1 ${
                        formData.project_type === 'social_development' ? 'text-white' : 'text-gray-400'
                      }`} />
                      <h3 className={`text-xs font-semibold ${
                        formData.project_type === 'social_development' ? 'text-white' : 'text-gray-700'
                      }`}>
                        {PROJECT_TYPE_LABELS.social_development}
                      </h3>
                      <p className={`text-[10px] mt-0.5 ${
                        formData.project_type === 'social_development' ? 'text-white text-opacity-90' : 'text-gray-500'
                      }`}>โรงเรียน ชุมชน สังคม</p>
                    </div>
                  </div>

                  {/* University Activity (Admin only) */}
                  {role === 'admin' && (
                    <div
                      onClick={() => !loading && setFormData(prev => ({ ...prev, project_type: 'university_activity' }))}
                      className={`card cursor-pointer transition-all ${
                        formData.project_type === 'university_activity'
                          ? 'bg-orange-500 border-2 border-orange-600 shadow-lg'
                          : 'bg-base-100 border-2 border-gray-200 hover:border-orange-300 hover:shadow-md'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="card-body items-center text-center p-3">
                        <Building2 className={`h-6 w-6 mb-1 ${
                          formData.project_type === 'university_activity' ? 'text-white' : 'text-gray-400'
                        }`} />
                        <h3 className={`text-xs font-semibold ${
                          formData.project_type === 'university_activity' ? 'text-white' : 'text-gray-700'
                        }`}>
                          {PROJECT_TYPE_LABELS.university_activity}
                        </h3>
                        <p className={`text-[10px] mt-0.5 ${
                          formData.project_type === 'university_activity' ? 'text-white text-opacity-90' : 'text-gray-500'
                        }`}>กิจกรรมภายในมหาวิทยาลัย</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Name */}
              <div className="form-control">
                <label className="block text-xs font-semibold mb-1.5">
                  ชื่อกิจกรรม <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleInputChange}
                  className="input input-bordered input-sm w-full"
                  disabled={loading}
                />
              </div>

              {/* Description */}
              <div className="form-control">
                <label className="block text-xs font-semibold mb-1.5">
                  รายละเอียด
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="textarea textarea-bordered textarea-sm h-20 w-full focus:outline-none text-sm"
                  disabled={loading}
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="block text-xs font-semibold mb-1.5">
                    วันที่และเวลาเริ่มต้น <span className="text-error">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    min={academicYearStartDate}
                    max={formData.end_date || academicYearEndDate}
                    className="input input-bordered input-sm w-full"
                    disabled={loading}
                  />
                </div>

                <div className="form-control">
                  <label className="block text-xs font-semibold mb-1.5">
                    วันที่และเวลาสิ้นสุด <span className="text-error">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    min={formData.start_date || academicYearStartDate}
                    max={academicYearEndDate}
                    className="input input-bordered input-sm w-full"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Location - Different for university_activity */}
              {formData.project_type === 'university_activity' ? (
                <>
                  {/* Campus Selection */}
                  <div className="form-control">
                    <label className="block text-xs font-semibold mb-1.5">
                      พื้นที่การศึกษา <span className="text-error">*</span>
                    </label>
                    <select
                      name="campus"
                      value={formData.campus}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          campus: e.target.value,
                          location: ""
                        }));
                      }}
                      className="select select-bordered select-sm w-full"
                      disabled={loading}
                    >
                      <option value="">เลือกพื้นที่การศึกษา</option>
                      {getCampusList().map(campus => (
                        <option key={campus.id} value={campus.name}>
                          {campus.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location Selection */}
                  {formData.campus && (
                    <div className="form-control">
                      <label className="block text-xs font-semibold mb-1.5">
                        สถานที่ <span className="text-error">*</span>
                      </label>
                      <select
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="select select-bordered select-sm w-full"
                        disabled={loading}
                      >
                        <option value="">เลือกสถานที่</option>
                        {getLocationsForCampus(
                          Object.keys(UNIVERSITY_CAMPUSES).find(
                            key => UNIVERSITY_CAMPUSES[key].name === formData.campus
                          )
                        ).map((loc, index) => (
                          <option key={index} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <div className="form-control">
                  <label className="block text-xs font-semibold mb-1.5">
                    สถานที่ <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="input input-bordered input-sm w-full"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Province (conditional) */}
              {requiresProvince && (
                <div className="form-control">
                  <label className="block text-xs font-semibold mb-1.5">
                    จังหวัด <span className="text-error">*</span>
                  </label>
                  <select
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    className="select select-bordered select-sm w-full"
                    disabled={loading}
                  >
                    <option value="">เลือกจังหวัด</option>
                    {THAILAND_PROVINCES.map(province => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Hours */}
              <div className="form-control">
                <label className="block text-xs font-semibold mb-1.5">
                  จำนวนชั่วโมง <span className="text-error">*</span>
                  {maxHoursForType && (
                    <span className="text-[10px] font-normal text-orange-600 ml-2">
                      (สูงสุด {maxHoursForType} ชม.)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  name="hours_per_person"
                  value={formData.hours_per_person}
                  onChange={handleInputChange}
                  className="input input-bordered input-sm w-full"
                  min="1"
                  max={maxHoursForType || undefined}
                  disabled={loading}
                />
                {maxHoursForType && formData.hours_per_person > maxHoursForType && (
                  <p className="text-[10px] text-error mt-1">
                    จำนวนชั่วโมงเกินลิมิตที่กำหนด ({maxHoursForType} ชม.)
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t mt-4">
                {/* Left: Cancel button */}
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn btn-ghost btn-sm"
                  disabled={submitting}
                >
                  ยกเลิก
                </button>

                {/* Right: Draft and Submit buttons */}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    className="btn btn-sm bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 hover:border-orange-400"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      "บันทึกฉบับร่าง"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    className="btn btn-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 hover:from-orange-600 hover:to-amber-600"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      "บันทึกโครงการ"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectPage;
