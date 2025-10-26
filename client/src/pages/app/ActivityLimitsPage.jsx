import React, { useState, useEffect } from 'react';
import { 
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';
import apiClient from '../../api/axiosConfig';
import { toast } from 'react-hot-toast';

const ActivityLimitsPage = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [activityTypes, setActivityTypes] = useState([]);
  const [limits, setLimits] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Activity type labels and descriptions (based on ACTIVITY_TYPE_MAPPING from submissionService.js)
  const activityLabels = {
    Certificate: {
      label: 'e-Learning',
      description: 'ชั่วโมงจากการเรียนหลักสูตรออนไลน์และได้รับใบประกาศนียบัตร'
    },
    BloodDonate: {
      label: 'บริจาคโลหิต',
      description: 'ชั่วโมงจากการบริจาคโลหิตที่หน่วยงานที่ได้รับการรับรอง'
    },
    NSF: {
      label: 'ออมเงิน กอช.',
      description: 'ชั่วโมงจากการออมเงินผ่านกองทุนออมแห่งชาติ'
    },
    AOM_YOUNG: {
      label: 'โครงการ AOM YOUNG',
      description: 'ชั่วโมงจากการเข้าร่วมโครงการ AOM YOUNG'
    },
    religious: {
      label: 'กิจกรรมทำนุบำรุงศาสนสถาน',
      description: 'ชั่วโมงจากกิจกรรมทำความสะอาดและบำรุงรักษาศาสนสถาน'
    },
    social_development: {
      label: 'กิจกรรมพัฒนาโรงเรียน ชุมชนและสังคม',
      description: 'ชั่วโมงจากกิจกรรมพัฒนาโรงเรียน ชุมชน และสังคม'
    },
    tree_planting: {
      label: 'ต้นไม้ล้านต้น ล้านความดี',
      description: 'ชั่วโมงจากกิจกรรมปลูกต้นไม้และดูแลรักษาสิ่งแวดล้อม'
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (selectedYearId) {
      fetchActivityTypes();
    }
  }, [selectedYearId]);

  const fetchAcademicYears = async () => {
    try {
      const response = await apiClient.get('/academic');
      const sortedYears = response.data.sort((a, b) => 
        new Date(b.start_date) - new Date(a.start_date)
      );
      setAcademicYears(sortedYears);
      if (sortedYears.length > 0) {
        setSelectedYearId(sortedYears[0].academic_year_id);
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
      toast.error('ไม่สามารถโหลดข้อมูลปีการศึกษาได้');
    }
  };

  const fetchActivityTypes = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/activity-limits/activity-types/${selectedYearId}`);
      setActivityTypes(response.data);
      
      // Create limits object from response
      const limitsObj = {};
      response.data.forEach(item => {
        limitsObj[item.activity_type] = item.limit ? item.limit.max_hours : '';
      });
      setLimits(limitsObj);
    } catch (error) {
      console.error('Error fetching activity types:', error);
      toast.error('ไม่สามารถโหลดข้อมูลประเภทกิจกรรมได้');
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (activityType, value) => {
    setLimits(prev => ({
      ...prev,
      [activityType]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare data for batch upsert
      const limitsArray = Object.entries(limits).map(([activityType, maxHours]) => ({
        activity_type: activityType,
        max_hours: maxHours === '' ? null : parseInt(maxHours)
      }));

      await apiClient.post('/activity-limits/batch-upsert', {
        limits: limitsArray,
        academic_year_id: selectedYearId
      });

      toast.success('บันทึกการตั้งค่าลิมิตสำเร็จ');
      fetchActivityTypes(); // Refresh data
    } catch (error) {
      console.error('Error saving limits:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const selectedYear = academicYears.find(year => year.academic_year_id === selectedYearId);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8" />
            <h1 className="text-3xl font-bold">ตั้งค่าลิมิตชั่วโมงกิจกรรม</h1>
          </div>
          <p className="text-orange-100">กำหนดจำนวนชั่วโมงสูงสุดที่นักศึกษาสามารถส่งได้ในแต่ละประเภทกิจกรรม</p>
        </div>
      </div>

      {/* Academic Year Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <label className="text-lg font-medium text-gray-700">เลือกปีการศึกษา:</label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="select select-bordered select-primary max-w-xs"
          >
            <option value="">-- เลือกปีการศึกษา --</option>
            {academicYears.map((year) => (
              <option key={year.academic_year_id} value={year.academic_year_id}>
                {year.year_name}
              </option>
            ))}
          </select>
          {selectedYear && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                {new Date(selectedYear.start_date).toLocaleDateString('th-TH')} - 
                {new Date(selectedYear.end_date).toLocaleDateString('th-TH')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Activity Limits Settings */}
      {selectedYearId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-semibold text-gray-800">ตั้งค่าลิมิตแต่ละประเภทกิจกรรม</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchActivityTypes}
                disabled={loading}
                className="btn btn-ghost gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="btn btn-primary gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading loading-spinner loading-lg text-orange-500"></div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-blue-800 mb-2">หมายเหตุการใช้งาน</div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                        <span className="text-sm text-blue-700">ใส่ <strong>0</strong> หรือ<strong>เว้นว่าง</strong>หากต้องการไม่จำกัดชั่วโมงสำหรับกิจกรรมนั้น</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                        <span className="text-sm text-blue-700">การตั้งค่าจะมีผลกับการส่งเอกสารในปีการศึกษาที่เลือกเท่านั้น</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activityTypes.map((item) => {
                  const activityInfo = activityLabels[item.activity_type] || {
                    label: item.activity_type,
                    description: ''
                  };

                  const hasLimit = item.limit && item.limit.max_hours > 0;
                  const currentLimit = limits[item.activity_type];
                  const isModified = currentLimit !== (item.limit?.max_hours || '').toString();

                  return (
                    <div 
                      key={item.activity_type} 
                      className={`relative bg-white border rounded-lg p-4 transition-all duration-200 hover:shadow-sm ${
                        isModified ? 'border-orange-300 ring-1 ring-orange-100' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Activity Icon */}
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center">
                          <Activity className="w-5 h-5 text-orange-500" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 text-base">
                              {activityInfo.label}
                            </h3>
                            {isModified && (
                              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse flex-shrink-0"></div>
                            )}
                          </div>
                          
                          {/* Description */}
                          {activityInfo.description && (
                            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                              {activityInfo.description}
                            </p>
                          )}
                          
                          {/* Current Status */}
                          <div className="flex items-center gap-2 mb-3">
                            {hasLimit ? (
                              <>
                                <div className="w-3 h-3 bg-green-100 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-2 h-2 text-green-500" />
                                </div>
                                <span className="text-sm text-green-700 font-medium">
                                  ลิมิตปัจจุบัน: {item.limit.max_hours} ชั่วโมง
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                                <span className="text-sm text-gray-500">ยังไม่มีการจำกัด</span>
                              </>
                            )}
                          </div>

                          {/* Input Section */}
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">ลิมิตใหม่:</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="∞"
                                min="0"
                                max="999"
                                value={currentLimit || ''}
                                onChange={(e) => handleLimitChange(item.activity_type, e.target.value)}
                                className={`w-16 px-2 py-1 text-center text-sm border rounded focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors ${
                                  isModified 
                                    ? 'border-orange-300 bg-orange-50' 
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              />
                              <span className="text-sm text-gray-500">ชม</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-green-900 mb-3 text-lg">คำแนะนำการใช้งาน</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></div>
                        <span className="text-sm text-green-800">ลิมิตจะป้องกันนักศึกษาส่งเอกสารเกินจำนวนที่กำหนด</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></div>
                        <span className="text-sm text-green-800">นักศึกษาจะเห็นลิมิตและจำนวนที่ใช้ไปแล้วในหน้าส่งเอกสาร</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></div>
                        <span className="text-sm text-green-800">การเปลี่ยนแปลงจะมีผลทันทีหลังกดบันทึก</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></div>
                        <span className="text-sm text-green-800">สามารถตั้งค่าต่างกันในแต่ละปีการศึกษา</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityLimitsPage;