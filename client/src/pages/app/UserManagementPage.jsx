import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { UserPlus, UploadCloud, ShieldCheck, Users, Search, Filter, X, RefreshCw } from "lucide-react";
import AddUserModal from "../../components/AddUserModal";
import ImportUserExcelModal from "../../components/ImportUserExcelModal";
import apiClient from "../../api/axiosConfig";

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("");
  const [isSeniorFilter, setIsSeniorFilter] = useState("");
  const [scholarshipTypeFilter, setScholarshipTypeFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateLoading, setBulkUpdateLoading] = useState(false);
  const [bulkUpdateProgress, setBulkUpdateProgress] = useState(null);
  const [eventSource, setEventSource] = useState(null);

  const limit = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/admin/users", {
        params: {
          page,
          limit,
          search,
          role: roleFilter,
          studentStatus: studentStatusFilter || undefined,
          isSenior: isSeniorFilter || undefined,
          scholarship_type: scholarshipTypeFilter || undefined,
        },
      });
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, [page, search, roleFilter, studentStatusFilter, isSeniorFilter, scholarshipTypeFilter]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, studentStatusFilter, isSeniorFilter, scholarshipTypeFilter]);

  const handleRoleChange = async (username, newRole) => {
    try {
      await apiClient.put(`/admin/users/${username}/role`, { role: newRole });
      fetchUsers();
      setEditingUserId(null);
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  const handleBulkUpdate = () => {
    setShowBulkUpdateModal(true);
  };

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        // Close bulk update modal only if not loading
        if (showBulkUpdateModal && !bulkUpdateLoading) {
          cancelBulkUpdate();
        }
        // Close other modals
        if (showAddModal) {
          setShowAddModal(false);
        }
        if (showImportModal) {
          setShowImportModal(false);
        }
        // Close role edit modal
        if (selectedUser) {
          setSelectedUser(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showBulkUpdateModal, bulkUpdateLoading, showAddModal, showImportModal, selectedUser]);

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const confirmBulkUpdate = async () => {
    setBulkUpdateLoading(true);
    setBulkUpdateProgress(null);
    
    try {
      // Start bulk update and get session ID
      const response = await apiClient.post('/admin/users/bulk-update-status');
      const { sessionId } = response.data;
      
      // Connect to SSE stream  
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
      const token = localStorage.getItem('authToken');
      const es = new EventSource(`${baseURL}/admin/users/bulk-update-progress/${sessionId}?token=${token}`);
      setEventSource(es);

      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('SSE Connected:', data.sessionId);
        } else if (data.type === 'progress') {
          setBulkUpdateProgress(data);
          
          // If completed
          if (data.status === 'completed') {
            toast.success(
              `อัปเดทเสร็จสิ้น! สำเร็จ ${data.updated} รายการ จากทั้งหมด ${data.total} รายการ`
            );
            setBulkUpdateLoading(false);
            fetchUsers(); // Refresh users list
            
            // Close after 2 seconds
            setTimeout(() => {
              setShowBulkUpdateModal(false);
              setBulkUpdateProgress(null);
            }, 2000);
          } else if (data.status === 'error') {
            toast.error(`เกิดข้อผิดพลาด: ${data.error}`);
            setBulkUpdateLoading(false);
          }
        }
      };

      es.onerror = (error) => {
        console.error('SSE Error:', error);
        toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        setBulkUpdateLoading(false);
        es.close();
      };
      
    } catch (err) {
      const message = err.response?.data?.error || 'เกิดข้อผิดพลาดในการอัปเดทข้อมูล';
      toast.error(message);
      setBulkUpdateLoading(false);
      console.error('Error bulk updating:', err);
    }
  };

  // Cleanup function
  const cancelBulkUpdate = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setBulkUpdateLoading(false);
    setBulkUpdateProgress(null);
    setShowBulkUpdateModal(false);
    toast.info('ยกเลิกการอัปเดทแล้ว');
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full mb-3 shadow-lg">
            <Users className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            จัดการผู้ใช้งานระบบ
          </h1>
          <p className="text-gray-600 text-sm max-w-xl mx-auto">
            เพิ่ม แก้ไข และจัดการข้อมูลผู้ใช้งานในระบบ รวมถึงการควบคุมสิทธิ์การเข้าใช้งาน
          </p>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-md border border-orange-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Users className="text-orange-500" size={20} />
              <h2 className="text-base font-medium text-gray-800">รายการผู้ใช้งาน</h2>
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                {total.toLocaleString()} คน
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowAddModal(true)} 
                className="btn btn-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-none shadow-md hover:shadow-lg transition-all duration-300"
              >
                <UserPlus size={16} />
                เพิ่มผู้ใช้
              </button>
              <button 
                onClick={() => setShowImportModal(true)} 
                className="btn btn-sm bg-white text-orange-600 border border-orange-300 hover:bg-orange-50 hover:border-orange-400 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <UploadCloud size={16} />
                นำเข้า Excel
              </button>
              <button 
                onClick={handleBulkUpdate} 
                className="btn btn-sm bg-white text-blue-600 border border-blue-300 hover:bg-blue-50 hover:border-blue-400 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <RefreshCw size={16} />
                อัปเดทข้อมูล
              </button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 text-sm"
                  placeholder="ค้นหาชื่อ, รหัสนักศึกษา, ชื่อผู้ใช้ หรือ อีเมล"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400" />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              <div className="relative">
                <select
                  className="w-full pl-10 pr-4 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white transition-all duration-300 text-sm"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    // Clear student-specific filters when role changes
                    if (e.target.value !== 'student') {
                      setStudentStatusFilter('');
                      setIsSeniorFilter('');
                      setScholarshipTypeFilter('');
                    }
                  }}
                >
                  <option value="">แสดงทุกสิทธิ์</option>
                  <option value="student">เฉพาะนักศึกษา</option>
                  <option value="admin">เฉพาะผู้ดูแลระบบ</option>
                </select>
                <Filter size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400" />
              </div>

              {/* Student Status Filter - only show when role is student */}
              <div className="relative">
                <select
                  className={`w-full pl-10 pr-4 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white transition-all duration-300 text-sm ${
                    roleFilter !== 'student' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value)}
                  disabled={roleFilter !== 'student'}
                >
                  <option value="">สถานภาพทั้งหมด</option>
                  <option value="normal">ปกติ</option>
                  <option value="withdrawn">ลาออก</option>
                  <option value="dropped">ตกออก</option>
                  <option value="graduated">สำเร็จการศึกษา</option>
                </select>
                <Filter size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400" />
              </div>

              {/* Senior Status Filter - only show when role is student */}
              <div className="relative">
                <select
                  className={`w-full pl-10 pr-4 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white transition-all duration-300 text-sm ${
                    roleFilter !== 'student' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  value={isSeniorFilter}
                  onChange={(e) => setIsSeniorFilter(e.target.value)}
                  disabled={roleFilter !== 'student'}
                >
                  <option value="">ทั้งหมด</option>
                  <option value="true">ใกล้สำเร็จการศึกษา</option>
                  <option value="false">ไม่ใกล้สำเร็จการศึกษา</option>
                </select>
                <Filter size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400" />
              </div>

              {/* Scholarship Type Filter */}
              <div className="relative">
                <select
                  className="w-full pl-10 pr-4 py-2.5 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white transition-all duration-300 text-sm"
                  value={scholarshipTypeFilter}
                  onChange={(e) => setScholarshipTypeFilter(e.target.value)}
                >
                  <option value="">ประเภททุนทั้งหมด</option>
                  <option value="TYPE1">ลักษณะที่ 1</option>
                  <option value="TYPE2">ลักษณะที่ 2</option>
                  <option value="TYPE3">ลักษณะที่ 3</option>
                </select>
                <Filter size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-md border border-orange-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                  <th className="px-4 py-3 text-left font-medium text-sm">ชื่อผู้ใช้</th>
                  <th className="px-4 py-3 text-left font-medium text-sm">รหัส/ชื่อผู้ใช้</th>
                  <th className="px-4 py-3 text-left font-medium text-sm">ติดต่อ</th>
                  <th className="px-4 py-3 text-center font-medium text-sm">สถานะ</th>
                  <th className="px-4 py-3 text-center font-medium text-sm">ประเภททุน</th>
                  <th className="px-4 py-3 text-center font-medium text-sm">ปีที่จบ</th>
                  <th className="px-4 py-3 text-center font-medium text-sm">สิทธิ์</th>
                  <th className="px-4 py-3 text-center font-medium text-sm">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                        <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <Users size={48} className="text-gray-300" />
                        <div>
                          <p className="text-gray-500 font-medium">ไม่พบข้อมูลผู้ใช้</p>
                          <p className="text-gray-400 text-sm">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.user_id} className={`hover:bg-orange-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.faculty || 'ไม่ระบุคณะ'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{user.username}</p>
                          <p className="text-xs text-gray-500">{user.major || 'ไม่ระบุสาขา'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-gray-900">{user.email}</p>
                          {user.phone && (
                            <p className="text-xs text-gray-500">{user.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {user.studentStatusName && (
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              user.studentStatusName === 'graduated' ? 'bg-green-100 text-green-800' :
                              user.studentStatusName === 'normal' ? 'bg-blue-100 text-blue-800' :
                              user.studentStatusName === 'withdrawn' ? 'bg-yellow-100 text-yellow-800' :
                              user.studentStatusName === 'dropped' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.studentStatusName === 'normal' ? 'ปกติ' :
                               user.studentStatusName === 'withdrawn' ? 'ลาออก' :
                               user.studentStatusName === 'dropped' ? 'ตกออก' :
                               user.studentStatusName === 'graduated' ? 'สำเร็จการศึกษา' : 
                               user.studentStatusName}
                            </span>
                          )}
                          {user.isSenior === true && (
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 whitespace-nowrap">
                              ใกล้สำเร็จการศึกษา
                            </span>
                          )}
                          {!user.studentStatusName && user.isSenior !== true && (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {user.scholarship_type === 'TYPE1' ? 'ลักษณะที่ 1' :
                           user.scholarship_type === 'TYPE2' ? 'ลักษณะที่ 2' :
                           user.scholarship_type === 'TYPE3' ? 'ลักษณะที่ 3' :
                           user.scholarship_type || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900">
                        {user.finishedAcadYear || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === "student" ? "นักศึกษา" : "ผู้ดูแลระบบ"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          className="btn btn-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-none shadow-sm hover:shadow-md transition-all duration-300 whitespace-nowrap"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role);
                          }}
                        >
                          <ShieldCheck size={12} className="mr-1" />
                          แก้ไข
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Enhanced Pagination */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
              <div className="text-sm text-gray-600">
                แสดง <span className="font-medium text-gray-900">{((page - 1) * limit) + 1}</span> ถึง <span className="font-medium text-gray-900">{Math.min(page * limit, total)}</span> จาก <span className="font-medium text-gray-900">{total.toLocaleString()}</span> รายการ
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    page === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 shadow-sm'
                  }`}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ก่อนหน้า
                </button>
                <span className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg">
                  หน้า {page} / {Math.ceil(total / limit)}
                </span>
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    page === Math.ceil(total / limit) 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 shadow-sm'
                  }`}
                  onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
                  disabled={page === Math.ceil(total / limit)}
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* 🧩 Modals */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchUsers}
      />
      <ImportUserExcelModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchUsers}
      />

        {/* Enhanced Role Edit Modal */}
        {selectedUser && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedUser(null);
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <ShieldCheck className="mr-2" size={20} />
                    แก้ไขสิทธิ์ผู้ใช้
                  </h2>
                  <button 
                    onClick={() => setSelectedUser(null)} 
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                    <p className="text-gray-500 text-sm">{selectedUser.username}</p>
                    <p className="text-gray-500 text-sm">{selectedUser.email}</p>
                  </div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-orange-800 mb-3">เลือกสิทธิ์การใช้งานใหม่</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="student"
                        checked={newRole === 'student'}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">นักศึกษา</p>
                        <p className="text-sm text-gray-500">สามารถส่งใบรับรองและดูสถานะการอนุมัติ</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={newRole === 'admin'}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">ผู้ดูแลระบบ</p>
                        <p className="text-sm text-gray-500">สามารถจัดการผู้ใช้และอนุมัติใบรับรอง</p>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    onClick={() => setSelectedUser(null)} 
                    className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await apiClient.post("/admin/users/update-role", {
                          username: selectedUser.username,
                          role: newRole,
                        });
                        toast.success("อัปเดตสิทธิ์ผู้ใช้เรียบร้อยแล้ว");
                        setSelectedUser(null);
                        fetchUsers();
                      } catch (err) {
                        console.error("Error updating role:", err);
                        toast.error("เกิดข้อผิดพลาดในการอัปเดตสิทธิ์");
                      }
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                    disabled={newRole === selectedUser.role}
                  >
                    ยืนยันการเปลี่ยนแปลง
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Update Confirmation Modal */}
        {showBulkUpdateModal && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !bulkUpdateLoading) {
                setShowBulkUpdateModal(false);
              } else if (e.target === e.currentTarget && bulkUpdateLoading) {
                cancelBulkUpdate();
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <RefreshCw className="mr-2" size={20} />
                    อัปเดทข้อมูลนักศึกษา
                  </h2>
                  <button 
                    onClick={bulkUpdateLoading ? cancelBulkUpdate : () => setShowBulkUpdateModal(false)} 
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {!bulkUpdateLoading ? (
                  <>
                    {/* Initial Confirmation View */}
                    <div className="mb-6">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4 mx-auto">
                        <RefreshCw className="text-blue-600" size={24} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                        ยืนยันการอัปเดทข้อมูล
                      </h3>
                      <p className="text-sm text-gray-600 text-center leading-relaxed">
                        ระบบจะดึงข้อมูลล่าสุดจาก Student API สำหรับผู้ใช้ที่มีสถานภาพ 
                        <span className="font-medium text-blue-600"> "ปกติ" </span>
                        หรือยังไม่ได้อัปเดท
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h4 className="font-medium text-blue-800 mb-2">ข้อมูลที่จะอัปเดท:</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• สถานภาพนักศึกษาปัจจุบัน</li>
                        <li>• สถานะใกล้สำเร็จการศึกษา</li>
                        <li>• ปีที่สำเร็จการศึกษา</li>
                        <li>• เบอร์โทรศัพท์ (หากมี)</li>
                      </ul>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowBulkUpdateModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={confirmBulkUpdate}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm font-medium whitespace-nowrap flex items-center justify-center"
                      >
                        <RefreshCw size={14} className="mr-1" />
                        เริ่มอัปเดท
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Progress View */}
                    <div className="mb-6">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4 mx-auto">
                        <RefreshCw className="text-blue-600 animate-spin" size={24} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                        กำลังอัปเดทข้อมูล...
                      </h3>

                      {bulkUpdateProgress && (
                        <div className="space-y-4">
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${(bulkUpdateProgress.completed / bulkUpdateProgress.total * 100).toFixed(1)}%` }}
                            ></div>
                          </div>

                          {/* Progress Stats */}
                          <div className="text-center space-y-2">
                            <p className="text-sm font-medium text-gray-700">
                              {bulkUpdateProgress.completed} / {bulkUpdateProgress.total} ({((bulkUpdateProgress.completed / bulkUpdateProgress.total) * 100).toFixed(1)}%)
                            </p>
                            
                            {bulkUpdateProgress.currentStudent && (
                              <p className="text-xs text-gray-500">
                                กำลังประมวลผล: {bulkUpdateProgress.currentStudent}
                              </p>
                            )}

                            <div className="flex justify-center space-x-4 text-xs">
                              <span className="text-green-600">✓ อัปเดท: {bulkUpdateProgress.updated}</span>
                              <span className="text-yellow-600">⚠ ข้าม: {bulkUpdateProgress.skipped}</span>
                              <span className="text-red-600">✗ ผิดพลาด: {bulkUpdateProgress.errors}</span>
                            </div>

                            {bulkUpdateProgress.status === 'completed' && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                                <p className="text-green-800 text-sm font-medium">
                                  🎉 อัปเดทเสร็จสิ้น!
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={cancelBulkUpdate}
                        className="px-4 py-2 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors text-sm"
                        disabled={bulkUpdateProgress?.status === 'completed'}
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagementPage;
