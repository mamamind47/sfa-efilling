import React, { useState, useEffect, useMemo } from 'react';
import { Search, Users, Send, X, ChevronDown, ChevronUp, Mail, Filter, AlertCircle, Eye } from 'lucide-react';
import apiClient from '../../api/axiosConfig';
import { toast } from 'react-hot-toast';

const SendEmailPage = () => {
  const [emailType, setEmailType] = useState('individual'); 
  const [sendMethod, setSendMethod] = useState('individual'); 
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupFilters, setGroupFilters] = useState({
    status: 'current', 
    faculty: 'all' 
  });
  const [faculties, setFaculties] = useState([]);
  const [emailData, setEmailData] = useState({
    template: 'personal-notification',
    subject: '',
    headerTitle: 'แจ้งเตือนจากระบบ',
    message: '',
    buttonText: '',
    buttonUrl: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showGroupOptions, setShowGroupOptions] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetchFaculties();
  }, []);

  // Auto-switch template when BCC is selected and personal-notification is active
  useEffect(() => {
    if (sendMethod === 'bcc' && emailData.template === 'personal-notification') {
      setEmailData(prev => ({
        ...prev,
        template: 'general-announcement'
      }));
    }
  }, [sendMethod, emailData.template]);

  // Fetch real email preview from API
  const fetchEmailPreview = async () => {
    if (!emailData.template || !emailData.message) {
      setPreviewHTML('<div style="padding: 20px; text-align: center; color: #666;">กรุณากรอกข้อความเพื่อดูตัวอย่าง</div>');
      return;
    }

    try {
      const response = await apiClient.post('/admin/email/preview', {
        template: emailData.template,
        headerTitle: emailData.headerTitle,
        message: emailData.message,
        buttonText: emailData.buttonText,
        buttonUrl: emailData.buttonUrl
      });

      if (response.data.success) {
        setPreviewHTML(response.data.html);
      } else {
        setPreviewHTML('<div style="padding: 20px; text-align: center; color: #ef4444;">ไม่สามารถโหลดตัวอย่างได้</div>');
      }
    } catch (error) {
      console.error('Failed to fetch email preview:', error);
      setPreviewHTML('<div style="padding: 20px; text-align: center; color: #ef4444;">ไม่สามารถโหลดตัวอย่างได้</div>');
    }
  };

  // Update preview when email data changes
  useEffect(() => {
    if (showPreview) {
      fetchEmailPreview();
    }
  }, [emailData, showPreview]);

  const fetchFaculties = async () => {
    try {
      const response = await apiClient.get('/admin/faculties');
      setFaculties(response.data || []);
    } catch (error) {
      console.error('Failed to fetch faculties:', error);
      toast.error('ไม่สามารถโหลดข้อมูลคณะได้');
    }
  };

  const searchUsers = async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiClient.get(`/admin/email/search-users?q=${encodeURIComponent(term)}`);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      if (error.response?.status === 401) {
        toast.error('กรุณาเข้าสู่ระบบใหม่');
      } else {
        toast.error('การค้นหาล้มเหลว');
      }
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchUsers(searchTerm.trim());
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const addUser = (user) => {
    if (!selectedUsers.find(u => u.user_id === user.user_id)) {
      setSelectedUsers([...selectedUsers, user]);
      setSearchTerm('');
      setSearchResults([]);
      toast.success(`เพิ่ม ${user.name || user.username} แล้ว`);
    } else {
      toast.error('ผู้ใช้นี้ถูกเลือกแล้ว');
    }
  };

  const removeUser = (userId) => {
    const removedUser = selectedUsers.find(u => u.user_id === userId);
    setSelectedUsers(selectedUsers.filter(u => u.user_id !== userId));
    if (removedUser) {
      toast.success(`ลบ ${removedUser.name || removedUser.username} แล้ว`);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!emailData.subject?.trim()) {
      newErrors.subject = 'กรุณากรอกหัวเรื่อง';
    }
    
    if (!emailData.message?.trim()) {
      newErrors.message = 'กรุณากรอกข้อความ';
    }
    
    if (emailType === 'individual' && selectedUsers.length === 0) {
      newErrors.recipients = 'กรุณาเลือกผู้รับอีเมล';
    }

    if (emailData.buttonText?.trim() && !emailData.buttonUrl?.trim()) {
      newErrors.buttonUrl = 'กรุณากรอก URL สำหรับปุ่ม';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [recipientCount, setRecipientCount] = useState(0);

  const handleSendEmail = async () => {
    if (!validateForm()) {
      toast.error('กรุณาตรวจสอบข้อมูลให้ครบถ้วน');
      return;
    }

    // Get recipient count before showing modal
    const count = await getRecipientCount();
    setRecipientCount(count);
    setShowConfirmModal(true);
  };

  const confirmSendEmail = async () => {
    setShowConfirmModal(false);
    setIsLoading(true);
    try {
      const payload = {
        ...emailData,
        sendMethod,
        ...(emailType === 'individual' 
          ? { recipients: selectedUsers.map(u => u.user_id) }
          : { groupFilters }
        )
      };

      const endpoint = emailType === 'individual' 
        ? '/admin/email/send-to-users'
        : '/admin/email/send-to-group';

      const response = await apiClient.post(endpoint, payload);
      
      toast.success(`ส่งอีเมลสำเร็จแล้ว (${response.data.recipientCount} คน)`);
      
      // Reset form
      setSelectedUsers([]);
      setEmailData({
        template: 'personal-notification',
        subject: '',
        headerTitle: 'แจ้งเตือนจากระบบ',
        message: '',
        buttonText: '',
        buttonUrl: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Send email failed:', error);
      const errorMessage = error.response?.data?.error || 'เกิดข้อผิดพลาดในการส่งอีเมล';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecipientCount = async () => {
    if (emailType === 'individual') {
      return selectedUsers.length;
    } else {
      // For group emails, get exact count from backend
      try {
        const endpoint = '/admin/email/send-to-group';
        const payload = {
          ...emailData,
          sendMethod,
          groupFilters,
          dryRun: true // Add dry run flag to get count without sending
        };
        
        const response = await apiClient.post(endpoint, payload);
        return response.data.recipientCount || 0;
      } catch (error) {
        console.error('Failed to get recipient count:', error);
        // Fallback to estimates
        if (groupFilters.status === 'current_not_graduating') {
          return 'ประมาณ 500-1000';
        } else {
          return 'ประมาณ 1000-2000';
        }
      }
    }
  };

  const getRecipientDescription = () => {
    if (emailType === 'individual') {
      return `${selectedUsers.length} คนที่เลือก`;
    } else {
      let desc = '';
      if (groupFilters.status === 'current_not_graduating') {
        desc = 'นักศึกษาปัจจุบันที่ไม่ใช่ใกล้จบการศึกษา';
      } else {
        desc = 'นักศึกษาปัจจุบันทั้งหมด';
      }
      if (groupFilters.faculty !== 'all') {
        desc += ` คณะ${groupFilters.faculty}`;
      }
      return desc;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className={`mx-auto space-y-6 ${showPreview ? 'max-w-7xl' : 'max-w-5xl'}`}>
        <div className={`${showPreview ? 'lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0' : ''} space-y-6`}>
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-orange-100">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Mail className="w-8 h-8" />
                  ส่งอีเมล
                </h1>
                <p className="text-orange-100 mt-2">จัดการการส่งอีเมลให้กับนักศึกษาและผู้ใช้ในระบบ</p>
              </div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200"
              >
                <Eye className="w-5 h-5" />
                {showPreview ? 'ซ่อนตัวอย่าง' : 'แสดงตัวอย่าง'}
              </button>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Email Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                  <Users className="w-5 h-5" />
                  ประเภทการส่ง
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-orange-50 transition-all duration-200 border-gray-200 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                    <input
                      type="radio"
                      name="emailType"
                      value="individual"
                      checked={emailType === 'individual'}
                      onChange={(e) => setEmailType(e.target.value)}
                      className="w-5 h-5 text-orange-500"
                    />
                    <div>
                      <div className="font-medium">ระบุผู้รับเอง</div>
                      <div className="text-sm text-gray-500">เลือกคนที่ต้องการส่ง</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-orange-50 transition-all duration-200 border-gray-200 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                    <input
                      type="radio"
                      name="emailType"
                      value="group"
                      checked={emailType === 'group'}
                      onChange={(e) => setEmailType(e.target.value)}
                      className="w-5 h-5 text-orange-500"
                    />
                    <div>
                      <div className="font-medium">ส่งแบบกลุ่ม</div>
                      <div className="text-sm text-gray-500">เลือกตามเงื่อนไข</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                  <Send className="w-5 h-5" />
                  วิธีการส่ง
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-orange-50 transition-all duration-200 border-gray-200 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                    <input
                      type="radio"
                      name="sendMethod"
                      value="individual"
                      checked={sendMethod === 'individual'}
                      onChange={(e) => setSendMethod(e.target.value)}
                      className="w-5 h-5 text-orange-500"
                    />
                    <div>
                      <div className="font-medium">ส่งทีละคน</div>
                      <div className="text-sm text-gray-500">แต่ละคนแยกกัน</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-orange-50 transition-all duration-200 border-gray-200 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                    <input
                      type="radio"
                      name="sendMethod"
                      value="bcc"
                      checked={sendMethod === 'bcc'}
                      onChange={(e) => setSendMethod(e.target.value)}
                      className="w-5 h-5 text-orange-500"
                    />
                    <div>
                      <div className="font-medium">ส่งแบบ BCC</div>
                      <div className="text-sm text-gray-500">ซ่อนรายชื่อผู้รับ</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Individual User Selection */}
            {emailType === 'individual' && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  เลือกผู้รับ
                </h3>
                
                {/* Search Bar */}
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ รหัสผู้ใช้ หรืออีเมล (อย่างน้อย 2 ตัวอักษร)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                  />
                  {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg mb-4 max-h-64 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.user_id}
                        onClick={() => addUser(user)}
                        className="w-full px-6 py-4 text-left hover:bg-orange-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                      >
                        <div className="font-semibold text-gray-900">{user.name || user.username}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-4 mt-1">
                          <span>{user.email}</span>
                          {user.faculty && <span>• {user.faculty}</span>}
                          {user.role && <span className="px-2 py-1 bg-gray-100 rounded text-xs">{user.role}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-600" />
                      <label className="text-lg font-semibold text-gray-700">
                        ผู้รับที่เลือก ({selectedUsers.length} คน)
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((user) => (
                        <span
                          key={user.user_id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                        >
                          {user.name || user.username}
                          <button
                            onClick={() => removeUser(user.user_id)}
                            className="text-green-600 hover:text-green-800 ml-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {errors.recipients && (
                  <div className="mt-3 flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{errors.recipients}</span>
                  </div>
                )}
              </div>
            )}

            {/* Group Selection */}
            {emailType === 'group' && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    ตัวเลือกกลุ่มผู้รับ
                  </h3>
                  <button
                    onClick={() => setShowGroupOptions(!showGroupOptions)}
                    className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors duration-150"
                  >
                    {showGroupOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showGroupOptions ? 'ซ่อน' : 'แสดง'}ตัวเลือก
                  </button>
                </div>

                {showGroupOptions && (
                  <div className="bg-white rounded-lg p-6 border border-purple-200 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <label className="text-lg font-semibold text-gray-700">สถานะนักศึกษา</label>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-purple-50 transition-colors duration-150">
                            <input
                              type="radio"
                              name="studentStatus"
                              value="current_not_graduating"
                              checked={groupFilters.status === 'current_not_graduating'}
                              onChange={(e) => setGroupFilters({...groupFilters, status: e.target.value})}
                              className="w-4 h-4 text-purple-500"
                            />
                            <span>นักศึกษาปัจจุบันที่ไม่ใช่ใกล้จบการศึกษา</span>
                          </label>
                          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-purple-50 transition-colors duration-150">
                            <input
                              type="radio"
                              name="studentStatus"
                              value="current"
                              checked={groupFilters.status === 'current'}
                              onChange={(e) => setGroupFilters({...groupFilters, status: e.target.value})}
                              className="w-4 h-4 text-purple-500"
                            />
                            <span>นักศึกษาปัจจุบันทั้งหมด</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-lg font-semibold text-gray-700">คณะ</label>
                        <select
                          value={groupFilters.faculty}
                          onChange={(e) => setGroupFilters({...groupFilters, faculty: e.target.value})}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="all">ทุกคณะ</option>
                          {faculties.map((faculty) => (
                            <option key={faculty} value={faculty}>{faculty}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Email Content */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                เนื้อหาอีเมล
              </h3>

              <div className="space-y-6">
                {/* Template Selection */}
                <div className="space-y-3">
                  <label className="text-lg font-semibold text-gray-700">เทมเพลตอีเมล</label>
                  <select
                    value={emailData.template}
                    onChange={(e) => setEmailData({...emailData, template: e.target.value})}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option 
                      value="personal-notification" 
                      disabled={sendMethod === 'bcc'}
                      className={sendMethod === 'bcc' ? 'text-gray-400' : ''}
                    >
                      แจ้งเตือนส่วนบุคคล {sendMethod === 'bcc' ? '(ไม่สามารถใช้กับ BCC ได้)' : ''}
                    </option>
                    <option value="general-announcement">ประกาศทั่วไป</option>
                  </select>
                  {sendMethod === 'bcc' && emailData.template === 'personal-notification' && (
                    <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">เทมเพลตแจ้งเตือนส่วนบุคคลไม่เหมาะสำหรับการส่งแบบ BCC กรุณาเลือกเทมเพลตประกาศทั่วไป</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-lg font-semibold text-gray-700">หัวเรื่อง *</label>
                    <input
                      type="text"
                      value={emailData.subject}
                      onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                      className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 ${errors.subject ? 'border-red-500' : 'border-gray-300 focus:border-green-500'}`}
                      placeholder="หัวเรื่องอีเมล"
                    />
                    {errors.subject && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{errors.subject}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-lg font-semibold text-gray-700">หัวข้อในอีเมล</label>
                    <input
                      type="text"
                      value={emailData.headerTitle}
                      onChange={(e) => setEmailData({...emailData, headerTitle: e.target.value})}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="หัวข้อที่แสดงในอีเมล"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-lg font-semibold text-gray-700">ข้อความ *</label>
                  <textarea
                    rows={6}
                    value={emailData.message}
                    onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                    className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 resize-none ${errors.message ? 'border-red-500' : 'border-gray-300 focus:border-green-500'}`}
                    placeholder="เนื้อหาอีเมลที่ต้องการส่ง..."
                  />
                  {errors.message && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.message}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-lg font-semibold text-gray-700">ข้อความปุ่ม (ไม่บังคับ)</label>
                    <input
                      type="text"
                      value={emailData.buttonText}
                      onChange={(e) => setEmailData({...emailData, buttonText: e.target.value})}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="เช่น เข้าสู่ระบบ"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-lg font-semibold text-gray-700">ลิงก์ปุ่ม (ไม่บังคับ)</label>
                    <input
                      type="url"
                      value={emailData.buttonUrl}
                      onChange={(e) => setEmailData({...emailData, buttonUrl: e.target.value})}
                      className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 ${errors.buttonUrl ? 'border-red-500' : 'border-gray-300 focus:border-green-500'}`}
                      placeholder="https://example.com"
                    />
                    {errors.buttonUrl && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">{errors.buttonUrl}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Send Button */}
            <div className="flex justify-center pt-6">
              <button
                onClick={handleSendEmail}
                disabled={isLoading}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-lg font-semibold rounded-xl shadow-lg hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                    กำลังส่ง...
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    ส่งอีเมล
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Email Preview Panel - Only visible on desktop */}
        {showPreview && (
          <div className="hidden lg:block bg-white rounded-xl shadow-lg border border-orange-100">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Eye className="w-6 h-6" />
                ตัวอย่างอีเมล
              </h2>
              <p className="text-blue-100 mt-2">ดูตัวอย่างอีเมลก่อนส่งจริง</p>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-100 p-4 rounded-lg overflow-hidden">
                <div 
                  className="bg-white"
                  dangerouslySetInnerHTML={{ __html: previewHTML }}
                />
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-t-xl">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <AlertCircle className="w-6 h-6" />
                  ยืนยันการส่งอีเมล
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <div className="text-orange-800">
                    <p className="font-semibold mb-2">คุณกำลังจะส่งอีเมลไปยัง:</p>
                    <div className="text-sm space-y-1">
                      <p><strong>ผู้รับ:</strong> {getRecipientDescription()}</p>
                      <p><strong>จำนวน:</strong> {recipientCount} คน</p>
                      <p><strong>หัวเรื่อง:</strong> {emailData.subject}</p>
                      <p><strong>เทมเพลต:</strong> {emailData.template === 'personal-notification' ? 'แจ้งเตือนส่วนบุคคล' : 'ประกาศทั่วไป'}</p>
                      <p><strong>วิธีส่ง:</strong> {sendMethod === 'individual' ? 'ส่งทีละคน' : 'ส่งแบบ BCC'}</p>
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 text-sm">
                  เมื่อกดยืนยันแล้ว อีเมลจะถูกส่งทันที และไม่สามารถยกเลิกได้
                </p>
              </div>

              <div className="px-6 pb-6 flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmSendEmail}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-200 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  ยืนยันส่ง
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendEmailPage;