import React, { useState, useEffect } from "react";
import {
  Users,
  GraduationCap,
  UserX,
  UserCheck,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Filter,
  Award,
  Building,
  Hourglass,
  UserRoundMinus,
} from "lucide-react";
import apiClient from "../../api/axiosConfig";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  Legend
} from "recharts";

// Minimalist color scheme - Orange primary with grays
const COLORS = {
  primary: '#EA580C',     // Orange-600
  primaryLight: '#FB923C', // Orange-400
  blue: {
    500: '#3B82F6',       // Blue-500
    600: '#2563EB',       // Blue-600
    400: '#60A5FA',       // Blue-400
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444'
};

// Chart colors - minimal palette
const CHART_COLORS = [
  COLORS.primary,
  COLORS.blue[500],
  COLORS.gray[400],
  COLORS.gray[300],
  COLORS.gray[200],
  COLORS.success,
  COLORS.warning,
  COLORS.error
];

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('count'); // 'count' or 'hours'
  const [studentFilter, setStudentFilter] = useState('current'); // 'current' or 'all'
  const [timelineFilter, setTimelineFilter] = useState('1year'); // '7days', '1month', '3months', '1year'

  const fetchAcademicYears = async () => {
    try {
      const res = await apiClient.get('/admin/dashboard/academic-years');
      setAcademicYears(res.data);
      if (res.data.length > 0 && !selectedYear) {
        setSelectedYear(res.data[0].year_name);
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Separate params for activity stats (with academic year) and timeline (without academic year)
      const activityParams = { 
        ...(selectedYear && { academicYear: selectedYear })
      };
      const timelineParams = {
        ...(timelineFilter && { timeFilter: timelineFilter })
      };
      
      // Fetch activity and student stats with academic year filter
      const activityRes = await apiClient.get('/admin/dashboard/stats', { params: activityParams });
      
      // Fetch timeline stats without academic year filter
      const timelineRes = await apiClient.get('/admin/dashboard/stats', { params: timelineParams });
      
      // Combine the data
      setDashboardData({
        ...activityRes.data,
        timelineStats: timelineRes.data.timelineStats
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchDashboardData();
    }
  }, [selectedYear, timelineFilter]);

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-orange-500 border-t-transparent absolute top-0 left-0"></div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-base font-medium text-gray-700">กำลังโหลดข้อมูลแดชบอร์ด</p>
              <p className="text-sm text-gray-500 mt-1">กรุณารอสักครู่...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare activity chart data
  const activityChartData = Object.entries(dashboardData.activityStats.byType).map(([name, data]) => {
    const approved = viewMode === 'count' ? data.approved : data.approvedHours;
    const pending = viewMode === 'count' ? data.pending : 0;
    const rejected = viewMode === 'count' ? data.rejected : 0;
    
    return {
      fullName: name, // Use full name for Y-axis and tooltip
      shortName: name.length > 30 ? name.substring(0, 30) + '...' : name, // Shortened name for display
      อนุมัติแล้ว: approved === 0 ? null : approved, // Use null for 0 values in log scale
      รอการอนุมัติ: pending === 0 ? null : pending,
      ถูกปฏิเสธ: rejected === 0 ? null : rejected
    };
  });

  // Debug activity chart data
  console.log('Activity chart data:', activityChartData);
  console.log('View mode:', viewMode);
  console.log('Dashboard activity stats:', dashboardData.activityStats);

  // Get filtered faculty data based on current student filter
  const getFacultiesData = () => {
    return studentFilter === 'current' 
      ? dashboardData.studentStats.activeStudents.byFaculty || {}
      : dashboardData.studentStats.allStudents.byFaculty || {};
  };

  // Debug logging
  // Debug logging
  console.log('Dashboard data:', dashboardData);

  // Prepare timeline data
  const timelineData = dashboardData.timelineStats.map(item => ({
    เดือน: item.เดือน,
    คำขอทั้งหมด: item.total,
    อนุมัติแล้ว: item.approved,
    ถูกปฏิเสธ: item.rejected,
    รอการอนุมัติ: item.pending
  }));

  // Debug timeline data
  console.log('Timeline stats from backend:', dashboardData.timelineStats);
  console.log('Processed timeline data:', timelineData);

  // Get status icons
  const getStatusIcon = (status) => {
    switch (status) {
      case 'normal': return <UserCheck className="w-5 h-5" />;
      case 'on_leave': return <Clock className="w-5 h-5" />;
      case 'graduated': return <GraduationCap className="w-5 h-5" />;
      case 'withdrawn': return <UserX className="w-5 h-5" />;
      case 'dropped': return <XCircle className="w-5 h-5" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  // Get filtered student data
  const getFilteredStudentData = () => {
    if (studentFilter === 'current') {
      return {
        byScholarship: dashboardData.studentStats.activeStudents.byScholarshipType,
        total: dashboardData.studentStats.activeStudents.total
      };
    } else {
      return {
        byScholarship: dashboardData.studentStats.allStudents.byScholarshipType || {},
        total: Object.values(dashboardData.studentStats.allStudents.byStatus || {}).reduce((sum, count) => sum + count, 0)
      };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Block 1: นักศึกษาในระบบ */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              นักศึกษาในระบบ
            </h2>
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  studentFilter === 'current' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setStudentFilter('current')}
              >
                นักศึกษาปัจจุบัน
              </button>
              <button
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  studentFilter === 'all' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setStudentFilter('all')}
              >
                นักศึกษาทั้งหมด
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Status - Compact */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-700">สถานะนักศึกษา</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(dashboardData.studentStats.allStudents.byStatus || {})
                  .sort(([a], [b]) => {
                    // ปกติ จะอยู่ตำแหน่งแรกเสมอ
                    if (a === 'ปกติ') return -1;
                    if (b === 'ปกติ') return 1;
                    // ลาพัก อยู่ตำแหน่งที่สอง
                    if (a === 'ลาพัก') return -1;
                    if (b === 'ลาพัก') return 1;
                    // เรียงที่เหลือตามตัวอักษร
                    return a.localeCompare(b);
                  })
                  .map(([status, count]) => {
                    const statusKey = status === 'ปกติ' ? 'normal' : 
                                    status === 'ลาพัก' ? 'on_leave' :
                                    status === 'สำเร็จการศึกษา' ? 'graduated' :
                                    status === 'ลาออก' ? 'withdrawn' :
                                    status === 'ตกออก' ? 'dropped' : 'other';
                    const isHighlight = status === 'ปกติ';
                    
                    return (
                      <div key={status} className={`p-3 rounded border text-center ${
                        isHighlight ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className={`mx-auto w-6 h-6 rounded flex items-center justify-center mb-2 ${
                          isHighlight ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getStatusIcon(statusKey)}
                        </div>
                        <div className={`text-base font-semibold ${
                          isHighlight ? 'text-orange-600' : 'text-gray-800'
                        }`}>
                          {count.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">
                          {status}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Scholarship Type - Simple Chart */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-700">ประเภททุนการศึกษา</h3>
              <div className="space-y-4">
                {Object.entries(getFilteredStudentData().byScholarship || {})
                  .sort(([,a], [,b]) => b - a)
                  .map(([type, count], index) => {
                    const total = Object.values(getFilteredStudentData().byScholarship || {}).reduce((sum, c) => sum + c, 0);
                    const percentage = total > 0 ? (count / total * 100) : 0;
                    
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">{type}</span>
                          <span className="text-sm font-semibold text-gray-900">{count.toLocaleString()} คน</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })
                }
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">รวมทั้งหมด</span>
                    <span className="text-base font-bold text-orange-600">
                      {Object.values(getFilteredStudentData().byScholarship || {}).reduce((sum, count) => sum + count, 0).toLocaleString()} คน
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Faculty Distribution - Bar Chart */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-700">แยกตามคณะ</h3>
              {getFacultiesData() && Object.keys(getFacultiesData()).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(getFacultiesData())
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([faculty, count], index) => {
                      const total = Object.values(getFacultiesData()).reduce((sum, c) => sum + c, 0);
                      const percentage = (count / total * 100);
                      
                      return (
                        <div key={faculty} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700 truncate" title={faculty}>
                              {faculty.length > 20 ? faculty.substring(0, 20) + '...' : faculty}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">{count.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-50 rounded border">
                  <p className="text-gray-500 text-sm">ไม่มีข้อมูลคณะ</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Blocks 2 & 3 in same row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Block 2: สถิติคำขอในระบบ */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                สถิติคำขอในระบบ
              </h2>
              <select
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {academicYears.map((year) => (
                  <option key={year.academic_year_id} value={year.year_name}>
                    {year.year_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-6">
              {/* Activity Chart */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-gray-700">กิจกรรมจิตอาสาตามประเภท</h3>
                  <div className="flex bg-gray-100 rounded p-1">
                    <button
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                        viewMode === 'count' 
                          ? 'bg-orange-500 text-white' 
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                      }`}
                      onClick={() => setViewMode('count')}
                    >
                      จำนวนคำขอ
                    </button>
                    <button
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                        viewMode === 'hours' 
                          ? 'bg-orange-500 text-white' 
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                      }`}
                      onClick={() => setViewMode('hours')}
                    >
                      จำนวนชั่วโมง
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {(() => {
                    // Calculate total approved across all activities
                    const totalApproved = activityChartData.reduce((sum, item) => sum + (item['อนุมัติแล้ว'] || 0), 0);
                    
                    return activityChartData
                      .sort((a, b) => (b['อนุมัติแล้ว'] || 0) - (a['อนุมัติแล้ว'] || 0))
                      .map((item, index) => {
                        const approvedValue = item['อนุมัติแล้ว'] || 0;
                        const percentage = totalApproved > 0 ? (approvedValue / totalApproved * 100) : 0;
                      
                      return (
                        <div key={item.fullName} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700" title={item.fullName}>
                              {item.shortName}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {viewMode === 'count' 
                                ? `${approvedValue.toLocaleString()} คำขอ`
                                : `${approvedValue.toLocaleString()} ชั่วโมง`
                              }
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                              title={`อนุมัติแล้ว: ${approvedValue.toLocaleString()}`}
                            />
                          </div>
                          <div className="text-xs text-gray-500 text-right">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {/* Legend */}
                  <div className="flex justify-center gap-4 pt-4 border-t border-gray-200 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                      <span className="text-xs text-gray-600">อนุมัติแล้ว</span>
                    </div>
                  </div>
                  
                  {/* Total Summary */}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">รวมทั้งหมด (อนุมัติแล้ว)</span>
                      <span className="text-base font-bold text-blue-600">
                        {activityChartData.reduce((sum, item) => sum + (item['อนุมัติแล้ว'] || 0), 0).toLocaleString()}
                        {viewMode === 'count' ? ' คำขอ' : ' ชั่วโมง'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Summary with Donut Chart */}
              <div>
                <h3 className="text-base font-medium text-gray-700 mb-4">สถานะคำร้องทั้งหมด</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 border border-green-200 rounded">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-700">
                      {dashboardData.activityStats.overall.approved.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600">อนุมัติแล้ว</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <Hourglass className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-700">
                      {dashboardData.activityStats.overall.pending.toLocaleString()}
                    </div>
                    <div className="text-sm text-yellow-600">รอการอนุมัติ</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 border border-red-200 rounded">
                    <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-700">
                      {dashboardData.activityStats.overall.rejected.toLocaleString()}
                    </div>
                    <div className="text-sm text-red-600">ถูกปฏิเสธ</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Block 3: สถิติการส่งกิจกรรม */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                สถิติการส่งกิจกรรม
              </h2>
              <div className="flex bg-gray-100 rounded p-1">
                {[
                  { key: '7days', label: '7 วัน' },
                  { key: '1month', label: '1 เดือน' },
                  { key: '3months', label: '3 เดือน' },
                  { key: '1year', label: '1 ปี' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      timelineFilter === key 
                        ? 'bg-orange-500 text-white' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                    onClick={() => setTimelineFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="เดือน" 
                  fontSize={11} 
                  stroke="#6b7280"
                  tickFormatter={(value) => {
                    if (typeof value === 'string' && value.includes('-')) {
                      const parts = value.split('-');
                      if (parts.length === 2) {
                        return `${parts[1]}/${parts[0].slice(-2)}`;
                      } else if (parts.length === 3) {
                        return `${parts[2]}/${parts[1]}`;
                      }
                    }
                    return value;
                  }}
                />
                <YAxis fontSize={11} stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                  labelFormatter={(value) => `ช่วงเวลา: ${value}`}
                  formatter={(value, name) => [
                    value?.toLocaleString() || 0,
                    name
                  ]}
                />
                <Area 
                  type="monotone"
                  dataKey="คำขอทั้งหมด" 
                  stroke="#3b82f6"
                  fill="url(#totalGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

export default DashboardPage;