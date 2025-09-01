import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Calendar,
  FileText,
  MoreHorizontal
} from 'lucide-react';
import apiClient from '../../api/axiosConfig';
import { formatThaiDate } from '../../utils/submissionUtils';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const ManagePostsPage = () => {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('all');
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, [currentPage, selectedCategory, publishedFilter]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        sort: 'pinned',
        published: publishedFilter
      });

      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);

      const response = await apiClient.get(`/posts?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setPosts(response.data.posts);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/posts/categories/list?includeInactive=true');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPosts();
  };

  const togglePin = async (postId, currentPinStatus) => {
    try {
      await apiClient.patch(
        `/posts/${postId}/pin`,
        { is_pinned: !currentPinStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      toast.success(currentPinStatus ? 'ยกเลิกการปักหมุดแล้ว' : 'ปักหมุดโพสต์แล้ว');
      fetchPosts();
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('เกิดข้อผิดพลาดในการปักหมุด');
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบโพสต์นี้?')) {
      return;
    }

    try {
      await apiClient.delete(`/posts/${postId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      toast.success('ลบโพสต์สำเร็จ');
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('เกิดข้อผิดพลาดในการลบโพสต์');
    }
  };

  const getCategoryById = (categoryId) => {
    return categories.find(cat => cat.category_id === categoryId);
  };

  const stripHtmlTags = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const truncateText = (text, maxLength = 100) => {
    const stripped = stripHtmlTags(text);
    return stripped.length > maxLength 
      ? stripped.substring(0, maxLength) + '...'
      : stripped;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">จัดการข่าวสารและประกาศ</h1>
              <p className="text-orange-100">สร้าง แก้ไข และจัดการโพสต์ทั้งหมด</p>
            </div>
            <Link
              to="/app/posts/create"
              className="btn btn-white bg-white text-orange-500 hover:bg-orange-50 gap-2"
            >
              <Plus className="w-4 h-4" />
              สร้างโพสต์ใหม่
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
              <input
                type="text"
                placeholder="ค้นหาโพสต์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input input-bordered w-full pl-12 pr-20 h-12 text-base placeholder-gray-500 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-all duration-200"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 btn btn-sm btn-primary bg-orange-500 hover:bg-orange-600 border-orange-500 rounded-lg px-4 text-white font-medium transition-colors duration-200"
              >
                ค้นหา
              </button>
            </div>
          </form>

          {/* Category Filter */}
          <div className="lg:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="select select-bordered w-full h-12 text-base border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-all duration-200"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Published Filter */}
          <div className="lg:w-48">
            <select
              value={publishedFilter}
              onChange={(e) => {
                setPublishedFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="select select-bordered w-full h-12 text-base border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-all duration-200"
            >
              <option value="all">ทั้งหมด</option>
              <option value="true">เผยแพร่แล้ว</option>
              <option value="false">ยังไม่เผยแพร่</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="loading loading-spinner loading-md text-orange-500"></div>
            <p className="mt-2 text-gray-500">กำลังโหลด...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">ไม่พบโพสต์</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedCategory || publishedFilter !== 'all'
                ? 'ลองปรับเปลี่ยนเงื่อนไขการค้นหา'
                : 'ยังไม่มีโพสต์ในระบบ'}
            </p>
            <Link to="/app/posts/create" className="btn btn-primary gap-2">
              <Plus className="w-4 h-4" />
              สร้างโพสต์แรก
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>ชื่อเรื่อง</th>
                    <th>หมวดหมู่</th>
                    <th>สถานะ</th>
                    <th>ยอดดู</th>
                    <th>วันที่สร้าง</th>
                    <th className="w-24">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => {
                    const category = getCategoryById(post.category_id);
                    return (
                      <motion.tr
                        key={post.post_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={post.is_pinned ? 'bg-orange-50' : ''}
                      >
                        <td>
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col gap-1">
                              {post.is_pinned && (
                                <Pin className="w-4 h-4 text-orange-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 line-clamp-2">
                                {post.title}
                              </div>
                              <div className="text-sm text-gray-500 line-clamp-2 mt-1">
                                {truncateText(post.content)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {category && (
                            <span
                              className="badge badge-sm text-white"
                              style={{ backgroundColor: category.color }}
                            >
                              {category.name}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            {post.is_published ? (
                              <>
                                <Eye className="w-4 h-4 text-green-500" />
                                <span className="text-green-600 font-medium">เผยแพร่</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">ร่าง</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="flex items-center gap-1 text-sm">
                            <Eye className="w-3 h-3" />
                            {post.view_count.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm text-gray-600">
                            {formatThaiDate(post.created_at)}
                          </span>
                        </td>
                        <td>
                          <div className="dropdown dropdown-end">
                            <label tabIndex={0} className="btn btn-ghost btn-sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </label>
                            <ul
                              tabIndex={0}
                              className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                            >
                              <li>
                                <Link to={`/app/posts/${post.post_id}`}>
                                  <Eye className="w-4 h-4" />
                                  ดูโพสต์
                                </Link>
                              </li>
                              <li>
                                <Link to={`/app/posts/edit/${post.post_id}`}>
                                  <Edit className="w-4 h-4" />
                                  แก้ไข
                                </Link>
                              </li>
                              <li>
                                <button
                                  onClick={() => togglePin(post.post_id, post.is_pinned)}
                                >
                                  {post.is_pinned ? (
                                    <>
                                      <PinOff className="w-4 h-4" />
                                      ยกเลิกปักหมุด
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="w-4 h-4" />
                                      ปักหมุด
                                    </>
                                  )}
                                </button>
                              </li>
                              <li>
                                <button
                                  onClick={() => deletePost(post.post_id)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  ลบ
                                </button>
                              </li>
                            </ul>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    แสดง {posts.length} จาก {pagination.totalCount.toLocaleString()} รายการ
                  </div>
                  <div className="join">
                    <button
                      className={`join-item btn btn-sm ${!pagination.hasPrevPage ? 'btn-disabled' : ''}`}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                    >
                      ก่อนหน้า
                    </button>
                    
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                      const page = index + 1;
                      const isCurrentPage = page === currentPage;
                      
                      return (
                        <button
                          key={page}
                          className={`join-item btn btn-sm ${isCurrentPage ? 'btn-active' : ''}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      className={`join-item btn btn-sm ${!pagination.hasNextPage ? 'btn-disabled' : ''}`}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ManagePostsPage;