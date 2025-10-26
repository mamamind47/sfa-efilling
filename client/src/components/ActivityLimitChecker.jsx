import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react';
import apiClient from '../api/axiosConfig';

const ActivityLimitChecker = ({ academicYearId, activityType, requestedHours = 0 }) => {
  const [limitStatus, setLimitStatus] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Activity type display names
  const activityLabels = {
    Certificate: 'e-Learning',
    BloodDonate: 'บริจาคโลหิต',
    NSF: 'ออมเงิน กอช.',
    'AOM YOUNG': 'โครงการ AOM YOUNG',
    religious: 'กิจกรรมทำนุบำรุงศาสนสถาน',
    'social-development': 'กิจกรรมพัฒนาโรงเรียน ชุมชนและสังคม',
    'ต้นไม้ล้านต้น ล้านความดี': 'ต้นไม้ล้านต้น ล้านความดี'
  };

  useEffect(() => {
    if (academicYearId) {
      fetchLimitStatus();
    }
  }, [academicYearId, activityType]);

  useEffect(() => {
    if (requestedHours > 0 && limitStatus) {
      validateSubmission();
    }
  }, [requestedHours, limitStatus]);

  const fetchLimitStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/activity-limits/user-status/${academicYearId}`);
      const status = response.data.find(item => item.activity_type === activityType);
      setLimitStatus(status || null);
    } catch (error) {
      console.error('Error fetching limit status:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateSubmission = async () => {
    if (!requestedHours) return;
    
    try {
      const response = await apiClient.post('/activity-limits/validate-submission', {
        academicYearId,
        submissionType: activityType,
        requestedHours: parseInt(requestedHours)
      });
      setValidation(response.data);
    } catch (error) {
      console.error('Error validating submission:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="loading loading-spinner loading-sm text-blue-500"></div>
          <span className="text-sm text-blue-700">กำลังตรวจสอบลิมิต...</span>
        </div>
      </div>
    );
  }

  if (!limitStatus) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <div className="text-sm font-medium text-gray-800">
              ไม่มีการจำกัดชั่วโมง
            </div>
            <div className="text-xs text-gray-600">
              สำหรับ {activityLabels[activityType] || activityType}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const percentage = Math.min(100, Math.round((limitStatus.current_hours / limitStatus.max_hours) * 100));
  const isNearLimit = percentage >= 80;
  const isExceeded = limitStatus.is_exceeded;
  
  // Validation status for requested hours
  const wouldExceed = validation && !validation.isValid;

  return (
    <div className={`border rounded-lg p-4 ${
      wouldExceed ? 'bg-red-50 border-red-200' :
      isExceeded ? 'bg-red-50 border-red-200' : 
      isNearLimit ? 'bg-amber-50 border-amber-200' : 
      'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Activity className={`w-5 h-5 ${
            wouldExceed ? 'text-red-500' :
            isExceeded ? 'text-red-500' : 
            isNearLimit ? 'text-amber-500' : 
            'text-blue-500'
          }`} />
          <div>
            <div className="font-medium text-gray-800">
              ลิมิตชั่วโมง {activityLabels[activityType] || activityType}
            </div>
            <div className="text-sm text-gray-600">
              ใช้ไป {limitStatus.current_hours}/{limitStatus.max_hours} ชั่วโมง ({percentage}%)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {wouldExceed ? (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          ) : isExceeded ? (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          ) : limitStatus.current_hours === limitStatus.max_hours ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : isNearLimit ? (
            <TrendingUp className="w-4 h-4 text-amber-500" />
          ) : (
            <Clock className="w-4 h-4 text-blue-500" />
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            wouldExceed ? 'bg-red-500' :
            isExceeded ? 'bg-red-500' :
            isNearLimit ? 'bg-amber-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        ></div>
      </div>

      {/* Status Messages */}
      <div className="space-y-2">
        {wouldExceed && validation && (
          <div className="p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
            <div className="font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              ไม่สามารถส่งได้
            </div>
            <div className="mt-1">
              หากส่ง {requestedHours} ชั่วโมง จะมีชั่วโมงรวม {validation.totalAfter} ชั่วโมง 
              เกินลิมิต {validation.limit} ชั่วโมง
            </div>
          </div>
        )}
        
        {!wouldExceed && requestedHours > 0 && validation && validation.isValid && (
          <div className="p-2 bg-green-100 border border-green-300 rounded text-sm text-green-700">
            <div className="font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              สามารถส่งได้
            </div>
            <div className="mt-1">
              หลังส่ง {requestedHours} ชั่วโมง จะมีชั่วโมงรวม {validation.totalAfter}/{validation.limit} ชั่วโมง
            </div>
          </div>
        )}
        
        {isExceeded && !wouldExceed && (
          <div className="p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            ชั่วโมงปัจจุบันเกินลิมิตที่กำหนดแล้ว
          </div>
        )}
        
        {isNearLimit && !isExceeded && !wouldExceed && (
          <div className="p-2 bg-amber-100 border border-amber-300 rounded text-sm text-amber-700">
            <TrendingUp className="w-4 h-4 inline mr-2" />
            ใกล้ถึงลิมิตแล้ว เหลือ {limitStatus.remaining_hours} ชั่วโมง
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLimitChecker;