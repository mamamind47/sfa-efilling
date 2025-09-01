import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, X, Save, Eye, Trash2 } from 'lucide-react';
import apiClient from '../../api/axiosConfig';
import { toast } from 'react-hot-toast';
import { renderContent } from '../../utils/contentUtils.jsx';
import RichTextEditor from '../../components/RichTextEditor.jsx';
import { motion } from 'framer-motion';

const EditPostPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [originalPost, setOriginalPost] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: '',
    is_pinned: false,
    is_published: true
  });
  const [featuredImage, setFeaturedImage] = useState(null);
  const [currentFeaturedImage, setCurrentFeaturedImage] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [currentAttachments, setCurrentAttachments] = useState([]);
  const [removedAttachments, setRemovedAttachments] = useState([]);
  const [removeFeaturedImageFlag, setRemoveFeaturedImageFlag] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchPost();
  }, [postId]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/posts/categories/list');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('ไม่สามารถโหลดหมวดหมู่ได้');
    }
  };

  const fetchPost = async () => {
    try {
      const response = await apiClient.get(`/posts/${postId}?incrementView=false`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const post = response.data;
      setOriginalPost(post);
      setFormData({
        title: post.title,
        content: post.content,
        category_id: post.category_id,
        is_pinned: post.is_pinned,
        is_published: post.is_published
      });
      
      setCurrentFeaturedImage(post.featured_image);
      setCurrentAttachments(post.attachments || []);
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('ไม่สามารถโหลดข้อมูลโพสต์ได้');
      navigate('/app/manage-posts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFeaturedImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB');
        return;
      }
      setFeaturedImage(file);
    }
  };

  const handleAttachmentsChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`ไฟล์ ${file.name} มีขนาดเกิน 10MB`);
        return false;
      }
      return true;
    });
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const removeCurrentAttachment = (attachmentId) => {
    setCurrentAttachments(prev => prev.filter(att => att.attachment_id !== attachmentId));
    setRemovedAttachments(prev => [...prev, attachmentId]);
  };

  const removeFeaturedImage = () => {
    setFeaturedImage(null);
  };

  const removeCurrentFeaturedImage = () => {
    setCurrentFeaturedImage(null);
    setRemoveFeaturedImageFlag(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('กรุณาใส่หัวข้อโพสต์');
      return;
    }
    
    if (!formData.content.trim()) {
      toast.error('กรุณาใส่เนื้อหาโพสต์');
      return;
    }
    
    if (!formData.category_id) {
      toast.error('กรุณาเลือกหมวดหมู่');
      return;
    }

    setSaving(true);
    
    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('content', formData.content);
      submitData.append('category_id', formData.category_id);
      submitData.append('is_pinned', formData.is_pinned);
      submitData.append('is_published', formData.is_published);
      
      if (featuredImage) {
        submitData.append('featured_image', featuredImage);
      }
      
      attachments.forEach(file => {
        submitData.append('attachments', file);
      });
      
      if (removedAttachments.length > 0) {
        submitData.append('removed_attachments', JSON.stringify(removedAttachments));
      }
      
      if (removeFeaturedImageFlag) {
        submitData.append('remove_featured_image', 'true');
      }

      await apiClient.put(`/posts/${postId}`, submitData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('อัปเดตโพสต์สำเร็จ');
      navigate('/app/manage-posts');
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error(error.response?.data?.error || 'เกิดข้อผิดพลาดในการอัปเดตโพสต์');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryById = (categoryId) => {
    return categories.find(cat => cat.category_id === categoryId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-orange-500"></div>
      </div>
    );
  }

  if (preview) {
    const selectedCategory = getCategoryById(formData.category_id);
    const displayFeaturedImage = featuredImage || currentFeaturedImage;
    
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Preview Header */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => setPreview(false)}
            className="btn btn-ghost gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปแก้ไข
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn btn-primary gap-2"
          >
            {saving ? (
              <div className="loading loading-spinner loading-sm"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>

        {/* Preview Content */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg border border-gray-200"
        >
          {/* Featured Image */}
          {displayFeaturedImage && (
            <div className="relative h-64 md:h-80 overflow-hidden rounded-t-lg">
              <img
                src={featuredImage ? URL.createObjectURL(featuredImage) : `${import.meta.env.VITE_FILE_BASE_URL}/${currentFeaturedImage}`}
                alt={formData.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          )}

          <div className="p-6 md:p-8">
            {/* Header */}
            <header className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                {formData.is_pinned && (
                  <span className="badge badge-warning">📌 ปักหมุด</span>
                )}
                {selectedCategory && (
                  <span
                    className="badge badge-lg text-white"
                    style={{ backgroundColor: selectedCategory.color }}
                  >
                    {selectedCategory.name}
                  </span>
                )}
                {!formData.is_published && (
                  <span className="badge badge-ghost">📝 ร่าง</span>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 leading-tight">
                {formData.title}
              </h1>
            </header>

            {/* Content */}
            {renderContent(formData.content)}

            {/* Attachments Preview */}
            {(currentAttachments.length > 0 || attachments.length > 0) && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  📎 ไฟล์แนบ ({currentAttachments.length + attachments.length} ไฟล์)
                </h3>
                
                <div className="grid gap-3">
                  {/* Current attachments */}
                  {currentAttachments.map((attachment) => (
                    <div
                      key={attachment.attachment_id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {attachment.file_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(Number(attachment.file_size))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* New attachments */}
                  {attachments.map((file, index) => (
                    <div
                      key={`new-${index}`}
                      className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-800 truncate">
                            {file.name} <span className="text-xs">(ใหม่)</span>
                          </p>
                          <p className="text-xs text-blue-600">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.article>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/app/manage-posts"
            className="btn btn-ghost gap-2 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปจัดการโพสต์
          </Link>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPreview(true)}
              className="btn btn-outline gap-2"
              disabled={!formData.title || !formData.content || !formData.category_id}
            >
              <Eye className="w-4 h-4" />
              ดูตัวอย่าง
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.title || !formData.content || !formData.category_id}
              className="btn btn-primary gap-2"
            >
              {saving ? (
                <div className="loading loading-spinner loading-sm"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800">แก้ไขโพสต์</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">ข้อมูลพื้นฐาน</h2>
          
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="label">
                <span className="label-text font-medium">หัวข้อโพสต์ *</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="ใส่หัวข้อโพสต์..."
                className="input input-bordered w-full"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="label">
                <span className="label-text font-medium">หมวดหมู่ *</span>
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className="select select-bordered w-full"
                required
              >
                <option value="">เลือกหมวดหมู่</option>
                {categories.map(category => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="label">
                <span className="label-text font-medium">เนื้อหา *</span>
              </label>
              <RichTextEditor
                value={formData.content}
                onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                placeholder="ใส่เนื้อหาโพสต์..."
              />
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">รูปภาพหลัก</h2>
          
          {/* Current Featured Image */}
          {currentFeaturedImage && !featuredImage && (
            <div className="relative mb-4">
              <img
                src={`${import.meta.env.VITE_FILE_BASE_URL}/${currentFeaturedImage}`}
                alt="Current featured"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={removeCurrentFeaturedImage}
                className="absolute top-2 right-2 btn btn-sm btn-circle btn-error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* New Featured Image */}
          {featuredImage && (
            <div className="relative mb-4">
              <img
                src={URL.createObjectURL(featuredImage)}
                alt="New featured"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={removeFeaturedImage}
                className="absolute top-2 right-2 btn btn-sm btn-circle btn-error"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute top-2 left-2 badge badge-success">ใหม่</div>
            </div>
          )}
          
          {/* Upload Input */}
          {(!currentFeaturedImage && !featuredImage) && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">อัปโหลดรูปภาพหลัก</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFeaturedImageChange}
                className="file-input file-input-bordered w-full max-w-xs"
              />
              <p className="text-xs text-gray-500 mt-2">ขนาดไฟล์ไม่เกิน 5MB</p>
            </div>
          )}
          
          {(currentFeaturedImage || featuredImage) && (
            <div className="text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFeaturedImageChange}
                className="file-input file-input-bordered w-full max-w-xs"
              />
              <p className="text-xs text-gray-500 mt-2">อัปโหลดรูปใหม่เพื่อเปลี่ยน</p>
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">ไฟล์แนบ</h2>
          
          <div className="mb-4">
            <input
              type="file"
              multiple
              onChange={handleAttachmentsChange}
              className="file-input file-input-bordered w-full"
            />
            <p className="text-xs text-gray-500 mt-2">ขนาดไฟล์แต่ละไฟล์ไม่เกิน 10MB</p>
          </div>

          {/* Current Attachments */}
          {currentAttachments.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">ไฟล์แนบปัจจุบัน</h3>
              <div className="space-y-2">
                {currentAttachments.map((attachment) => (
                  <div
                    key={attachment.attachment_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(Number(attachment.file_size))}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCurrentAttachment(attachment.attachment_id)}
                      className="btn btn-sm btn-ghost text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Attachments */}
          {attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">ไฟล์แนบใหม่</h3>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-800 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-blue-600">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="btn btn-sm btn-ghost text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">การตั้งค่า</h2>
          
          <div className="space-y-4">
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  name="is_pinned"
                  checked={formData.is_pinned}
                  onChange={handleInputChange}
                  className="checkbox checkbox-primary"
                />
                <div>
                  <span className="label-text font-medium">ปักหมุดโพสต์</span>
                  <div className="text-xs text-gray-500">โพสต์จะแสดงด้านบนสุด</div>
                </div>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleInputChange}
                  className="checkbox checkbox-primary"
                />
                <div>
                  <span className="label-text font-medium">เผยแพร่โพสต์</span>
                  <div className="text-xs text-gray-500">ยกเลิกเพื่อบันทึกเป็นร่าง</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditPostPage;