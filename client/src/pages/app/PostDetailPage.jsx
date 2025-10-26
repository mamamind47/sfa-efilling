import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar,
  Eye,
  Pin,
  User,
  Download,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Paperclip
} from 'lucide-react';
import apiClient from '../../api/axiosConfig';
import { motion } from 'framer-motion';
import { formatThaiDate } from '../../utils/submissionUtils';
import { renderContent } from '../../utils/contentUtils.jsx';

const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const viewCountedRef = useRef(false);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First load without incrementing view count
      const response = await apiClient.get(`/posts/${postId}?incrementView=false`);
      setPost(response.data);
      
      // Increment view count only once after successful load
      if (!viewCountedRef.current) {
        viewCountedRef.current = true;
        // Use setTimeout to increment view count after component has mounted
        setTimeout(() => {
          apiClient.get(`/posts/${postId}?incrementView=true`).catch(console.error);
        }, 1000);
      }
    } catch (err) {
      console.error('Error fetching post:', err);
      if (err.response?.status === 404) {
        setError('ไม่พบข่าวสารที่ต้องการ');
      } else {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (attachment) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_FILE_BASE_URL}/${attachment.file_path}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const isImageFile = (fileType) => {
    return fileType.startsWith('image/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">{error}</h2>
          <button
            onClick={() => navigate('/app/posts')}
            className="btn btn-primary"
          >
            กลับไปหน้าข่าวสาร
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-6 max-w-7xl">
      {/* Back Button */}
      <div className="mb-4 md:mb-6">
        <Link
          to="/app/posts"
          className="btn btn-sm md:btn-md btn-ghost gap-2 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">กลับไปหน้าข่าวสาร</span>
          <span className="sm:hidden">กลับ</span>
        </Link>
      </div>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {/* Featured Image */}
        {post.featured_image && (
          <div className="relative h-48 md:h-64 lg:h-80 overflow-hidden rounded-t-lg">
            <img
              src={`${import.meta.env.VITE_FILE_BASE_URL}/${post.featured_image}`}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}

        <div className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <header className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              {post.is_pinned && (
                <Pin className="w-4 md:w-5 h-4 md:h-5 text-orange-500" />
              )}
              {post.category && (
                <span
                  className="badge badge-md md:badge-lg text-white text-xs md:text-sm"
                  style={{ backgroundColor: post.category.color }}
                >
                  {post.category.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-3 md:mb-4 leading-tight">
              {post.title}
            </h1>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600 pb-3 md:pb-4 border-b border-gray-200">
              <div className="flex items-center gap-1">
                <User className="w-3 md:w-4 h-3 md:h-4" />
                <span className="truncate max-w-[120px] md:max-w-none">โดย {post.author.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 md:w-4 h-3 md:h-4" />
                <span>{formatThaiDate(post.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 md:w-4 h-3 md:h-4" />
                <span>{post.view_count.toLocaleString()} ครั้ง</span>
              </div>
            </div>
          </header>

          {/* Content */}
          {renderContent(post.content)}

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="border-t border-gray-200 pt-4 md:pt-6 mt-4 md:mt-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4 flex items-center gap-2">
                <Paperclip className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                ไฟล์แนบ ({post.attachments.length} ไฟล์)
              </h3>

              <div className="grid gap-3 md:gap-4">
                {post.attachments.map((attachment) => {
                  const isImage = isImageFile(attachment.file_type);
                  
                  return (
                    <div key={attachment.attachment_id}>
                      {isImage ? (
                        // Image attachment with preview
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                          <div className="aspect-video bg-gray-100 relative">
                            <img
                              src={`${import.meta.env.VITE_FILE_BASE_URL}/${attachment.file_path}`}
                              alt={attachment.file_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="absolute inset-0 bg-gray-200 items-center justify-center hidden">
                              <ImageIcon className="w-8 md:w-12 h-8 md:h-12 text-gray-400" />
                            </div>
                          </div>
                          <div className="p-3 md:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                <ImageIcon className="w-4 md:w-5 h-4 md:h-5 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs md:text-sm font-medium text-gray-800 truncate">
                                    {attachment.file_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(Number(attachment.file_size))}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => window.open(`${import.meta.env.VITE_FILE_BASE_URL}/${attachment.file_path}`, '_blank')}
                                  className="btn btn-xs md:btn-sm btn-outline gap-1 flex-1 sm:flex-none"
                                  title="ดูรูปภาพขนาดเต็ม"
                                >
                                  <ExternalLink className="w-3 md:w-4 h-3 md:h-4" />
                                  <span className="hidden sm:inline">ดูเต็มหน้าจอ</span>
                                  <span className="sm:hidden">ดู</span>
                                </button>
                                <button
                                  onClick={() => handleDownloadFile(attachment)}
                                  className="btn btn-xs md:btn-sm btn-primary gap-1 flex-1 sm:flex-none"
                                  title="ดาวน์โหลดรูปภาพ"
                                >
                                  <Download className="w-3 md:w-4 h-3 md:h-4" />
                                  ดาวน์โหลด
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Regular file attachment
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                            {getFileIcon(attachment.file_type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs md:text-sm font-medium text-gray-800 truncate">
                                {attachment.file_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(Number(attachment.file_size))}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownloadFile(attachment)}
                              className="btn btn-xs md:btn-sm btn-primary gap-1 w-full sm:w-auto"
                              title="ดาวน์โหลดไฟล์"
                            >
                              <Download className="w-3 md:w-4 h-3 md:h-4" />
                              ดาวน์โหลด
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.article>
    </div>
  );
};

export default PostDetailPage;