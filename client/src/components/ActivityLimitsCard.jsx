import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
import apiClient from '../api/axiosConfig';

const ActivityLimitsCard = ({ academicYearId }) => {
  const [limitsStatus, setLimitsStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Activity type labels (based on ACTIVITY_TYPE_MAPPING from submissionService.js)
  const activityLabels = {
    Certificate: 'e-Learning',
    BloodDonate: 'บริจาคโลหิต',
    NSF: 'ออมเงิน กอช.',
    AOM_YOUNG: 'โครงการ AOM YOUNG',
    religious: 'กิจกรรมทำนุบำรุงศาสนสถาน',
    social_development: 'กิจกรรมพัฒนาโรงเรียน ชุมชนและสังคม',
    tree_planting: 'ต้นไม้ล้านต้น ล้านความดี'
  };

  useEffect(() => {
    if (academicYearId) {
      fetchLimitsStatus();
    }
  }, [academicYearId]);

  const fetchLimitsStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/activity-limits/user-status/${academicYearId}`);
      setLimitsStatus(response.data);
    } catch (err) {
      console.error('Error fetching limits status:', err);
      if (err.response?.status === 401) {
        setError('กรุณาเข้าสู่ระบบใหม่');
      } else {
        setError('ไม่สามารถโหลดข้อมูลลิมิตได้');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="loading loading-spinner loading-md text-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-red-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (limitsStatus.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-6 h-6 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-800">ลิมิตชั่วโมงกิจกรรม</h3>
        </div>
        <div className="text-center text-gray-500 py-4">
          <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>ไม่มีการกำหนดลิมิตสำหรับปีการศึกษานี้</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-800">ลิมิตชั่วโมงกิจกรรม</h3>
      </div>

      <div className="space-y-4">
        {limitsStatus.map((status) => {
          const label = activityLabels[status.activity_type] || status.activity_type;
          const isNearLimit = status.percentage >= 80;
          const isExceeded = status.is_exceeded;
          
          return (
            <div key={status.activity_type} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">{label}</span>
                <div className="flex items-center gap-2">
                  {isExceeded ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : status.current_hours === status.max_hours ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : isNearLimit ? (
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-blue-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    isExceeded ? 'text-red-600' : 
                    isNearLimit ? 'text-amber-600' : 'text-gray-600'
                  }`}>
                    {status.current_hours}/{status.max_hours} ชม.
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isExceeded ? 'bg-red-500' :
                    isNearLimit ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, status.percentage)}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className={`${
                  isExceeded ? 'text-red-600' : 
                  isNearLimit ? 'text-amber-600' : 'text-gray-600'
                }`}>
                  {status.percentage}% ใช้ไปแล้ว
                </span>
                <span className="text-gray-500">
                  {isExceeded ? 
                    `เกิน ${status.current_hours - status.max_hours} ชม.` :
                    `เหลือ ${status.remaining_hours} ชม.`
                  }
                </span>
              </div>

              {/* Warning message */}
              {isExceeded && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  ⚠️ ชั่วโมงเกินลิมิตที่กำหนด
                </div>
              )}
              {isNearLimit && !isExceeded && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                  💡 ใกล้ถึงลิมิตแล้ว
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
        <p className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          ลิมิตชั่วโมงใช้สำหรับควบคุมการส่งเอกสารแต่ละประเภท
        </p>
      </div>
    </div>
  );
};

export default ActivityLimitsCard;