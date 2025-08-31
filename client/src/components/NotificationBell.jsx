import React, { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('th');
dayjs.extend(relativeTime);

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch unread count on component mount
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [isOpen, notifications.length]);

  const fetchUnreadCount = async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/notifications?limit=10');
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
      
      // Decrease unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.put('/notifications/mark-all-read');
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read_status: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'APPROVED':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'REJECTED':
        return <X className="w-4 h-4 text-red-500" />;
      case 'DEADLINE_WARNING':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'HOURS_COMPLETE':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationBgColor = (type, isRead) => {
    if (isRead) return 'bg-gray-50';
    
    switch (type) {
      case 'APPROVED':
        return 'bg-green-50 border-l-4 border-green-400';
      case 'REJECTED':
        return 'bg-red-50 border-l-4 border-red-400';
      case 'DEADLINE_WARNING':
        return 'bg-yellow-50 border-l-4 border-yellow-400';
      case 'HOURS_COMPLETE':
        return 'bg-blue-50 border-l-4 border-blue-400';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">การแจ้งเตือน</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <CheckCheck className="w-4 h-4" />
                    อ่านทั้งหมด
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">
                    กำลังโหลด...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>ไม่มีการแจ้งเตือน</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notif) => (
                      <motion.div
                        key={notif.notification_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${getNotificationBgColor(notif.type, notif.read_status)}`}
                        onClick={() => !notif.read_status && markAsRead(notif.notification_id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notif.type)}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 mb-1">
                              {notif.title}
                            </p>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-400">
                              {dayjs(notif.created_at).fromNow()}
                            </p>
                          </div>

                          {/* Unread Indicator */}
                          {!notif.read_status && (
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-100 text-center">
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/app/notifications');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    ดูทั้งหมด
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;