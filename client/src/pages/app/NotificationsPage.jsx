import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Clock, AlertCircle, CheckCheck, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axiosConfig';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('th');
dayjs.extend(relativeTime);

const NotificationsPage = () => {
  document.title = "การแจ้งเตือน | Volunteer Student Loan e-Filling";
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/notifications?limit=50');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.notification_id === notificationId 
            ? { ...notif, read_status: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await apiClient.put('/notifications/mark-all-read');
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read_status: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'APPROVED':
        return <Check className="w-6 h-6 text-green-500" />;
      case 'REJECTED':
        return <X className="w-6 h-6 text-red-500" />;
      case 'DEADLINE_WARNING':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'HOURS_COMPLETE':
        return <AlertCircle className="w-6 h-6 text-blue-500" />;
      default:
        return <Bell className="w-6 h-6 text-gray-500" />;
    }
  };

  const getNotificationBgColor = (type, isRead) => {
    const baseClasses = "p-6 rounded-lg border transition-all duration-200 hover:shadow-md";
    
    if (isRead) {
      return `${baseClasses} bg-white border-gray-200`;
    }
    
    switch (type) {
      case 'APPROVED':
        return `${baseClasses} bg-green-50 border-green-200 border-l-4 border-l-green-400`;
      case 'REJECTED':
        return `${baseClasses} bg-red-50 border-red-200 border-l-4 border-l-red-400`;
      case 'DEADLINE_WARNING':
        return `${baseClasses} bg-yellow-50 border-yellow-200 border-l-4 border-l-yellow-400`;
      case 'HOURS_COMPLETE':
        return `${baseClasses} bg-blue-50 border-blue-200 border-l-4 border-l-blue-400`;
      default:
        return `${baseClasses} bg-gray-50 border-gray-200`;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'APPROVED':
        return { text: 'อนุมัติแล้ว', color: 'text-green-600 bg-green-100' };
      case 'REJECTED':
        return { text: 'ปฏิเสธแล้ว', color: 'text-red-600 bg-red-100' };
      case 'DEADLINE_WARNING':
        return { text: 'เตือนกำหนดส่ง', color: 'text-yellow-600 bg-yellow-100' };
      case 'HOURS_COMPLETE':
        return { text: 'ชั่วโมงครบ', color: 'text-blue-600 bg-blue-100' };
      default:
        return { text: 'แจ้งเตือน', color: 'text-gray-600 bg-gray-100' };
    }
  };

  const unreadCount = notifications.filter(n => !n.read_status).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow border border-blue-100">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <Bell className="w-6 h-6" />
                  <div>
                    <h1 className="text-xl font-bold">การแจ้งเตือน</h1>
                    <p className="text-blue-100 text-sm">
                      รายการแจ้งเตือนทั้งหมดของคุณ
                    </p>
                  </div>
                </div>
              </div>
              
              {unreadCount > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                    ยังไม่อ่าน {unreadCount} รายการ
                  </span>
                  <button
                    onClick={markAllAsRead}
                    disabled={markingAllRead}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {markingAllRead ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCheck className="w-4 h-4" />
                    )}
                    อ่านทั้งหมด
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">กำลังโหลดการแจ้งเตือน...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">ไม่มีการแจ้งเตือน</h3>
              <p className="text-gray-500">คุณไม่มีการแจ้งเตือนใดๆ ในขณะนี้</p>
            </div>
          ) : (
            <AnimatePresence>
              {notifications.map((notif, index) => {
                const typeLabel = getTypeLabel(notif.type);
                
                return (
                  <motion.div
                    key={notif.notification_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={getNotificationBgColor(notif.type, notif.read_status)}
                    onClick={() => !notif.read_status && markAsRead(notif.notification_id)}
                    role={!notif.read_status ? "button" : undefined}
                    tabIndex={!notif.read_status ? 0 : undefined}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notif.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
                            {notif.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeLabel.color}`}>
                              {typeLabel.text}
                            </span>
                            {!notif.read_status && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-3">
                          {notif.message}
                        </p>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{dayjs(notif.created_at).format('D MMMM BBBB เวลา HH:mm น.')}</span>
                          <span>{dayjs(notif.created_at).fromNow()}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-500">
              แสดงการแจ้งเตือนทั้งหมด {notifications.length} รายการ
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;