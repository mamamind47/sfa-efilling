import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Calendar,
  Eye,
  Pin,
  FileText,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Image as ImageIcon
} from 'lucide-react';
import apiClient from '../../api/axiosConfig';
import { motion } from 'framer-motion';
import { formatThaiDate } from '../../utils/submissionUtils';

const PostsPage = () => {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [pagination, setPagination] = useState({});
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current page from URL params
  const currentPage = parseInt(searchParams.get('page')) || 1;
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';

  useEffect(() => {
    setSearchTerm(searchParam);
    setSelectedCategory(categoryParam);
    fetchPosts();
    fetchCategories();
  }, [currentPage, categoryParam, searchParam]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        sort: 'pinned'
      });

      if (categoryParam) params.append('category', categoryParam);
      if (searchParam) params.append('search', searchParam);

      const response = await apiClient.get(`/posts?${params}`);
      setPosts(response.data.posts);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/posts/categories/list');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateSearchParams({ search: searchTerm, page: 1 });
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    updateSearchParams({ category: categoryId, page: 1 });
  };

  const updateSearchParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });

    setSearchParams(newParams);
  };

  const handlePageChange = (page) => {
    updateSearchParams({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCategoryById = (categoryId) => {
    return categories.find(cat => cat.category_id === categoryId);
  };

  const stripHtmlTags = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const truncateText = (text, maxLength = 200) => {
    const stripped = stripHtmlTags(text);
    return stripped.length > maxLength 
      ? stripped.substring(0, maxLength) + '...'
      : stripped;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-2">ข่าวสารและประกาศ</h1>
          <p className="text-orange-100">ติดตามข่าวสารและกิจกรรมล่าสุด</p>
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
                placeholder="ค้นหาข่าวสาร..."
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
          <div className="lg:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="select select-bordered w-full h-12 text-base border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-all duration-200"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.name} ({category._count.posts})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(searchParam || categoryParam) && (
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm text-gray-600">กรองโดย:</span>
            {searchParam && (
              <span className="badge badge-primary gap-2">
                <Search className="w-3 h-3" />
                "{searchParam}"
                <button
                  onClick={() => updateSearchParams({ search: '', page: 1 })}
                  className="ml-1 hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            {categoryParam && (
              <span className="badge badge-secondary gap-2">
                <Filter className="w-3 h-3" />
                {getCategoryById(categoryParam)?.name}
                <button
                  onClick={() => updateSearchParams({ category: '', page: 1 })}
                  className="ml-1 hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">ไม่พบข่าวสาร</h3>
            <p className="text-gray-500">
              {searchParam || categoryParam 
                ? 'ลองปรับเปลี่ยนคำค้นหาหรือหมวดหมู่' 
                : 'ยังไม่มีข่าวสารที่เผยแพร่'}
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const category = getCategoryById(post.category_id);
            return (
              <motion.article
                key={post.post_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 ${
                  post.is_pinned ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
                }`}
              >
                <div className="p-6">
                  {/* Post Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {post.is_pinned && (
                          <Pin className="w-4 h-4 text-orange-500" />
                        )}
                        {category && (
                          <span
                            className="badge badge-sm text-white"
                            style={{ backgroundColor: category.color }}
                          >
                            {category.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatThaiDate(post.created_at)}
                        </span>
                      </div>
                      
                      <Link to={`/app/posts/${post.post_id}`}>
                        <h2 className="text-xl font-bold text-gray-800 hover:text-orange-600 transition-colors line-clamp-2">
                          {post.title}
                        </h2>
                      </Link>
                      
                      <p className="text-gray-600 mt-2 line-clamp-3">
                        {truncateText(post.content)}
                      </p>
                    </div>

                    {/* Featured Image */}
                    {post.featured_image && (
                      <div className="flex-shrink-0">
                        <img
                          src={`${import.meta.env.VITE_FILE_BASE_URL}/${post.featured_image}`}
                          alt={post.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Attachments Preview */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.attachments.slice(0, 3).map((attachment) => {
                          const isImage = attachment.file_type.startsWith('image/');
                          return isImage ? (
                            <div key={attachment.attachment_id} className="relative">
                              <img
                                src={`${import.meta.env.VITE_FILE_BASE_URL}/${attachment.file_path}`}
                                alt={attachment.file_name}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 bg-gray-200 rounded-lg items-center justify-center hidden">
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                              </div>
                            </div>
                          ) : null;
                        })}
                        {post.attachments.length > 3 && (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                            <span className="text-xs text-gray-500 font-medium">+{post.attachments.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Post Footer */}
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {post.view_count.toLocaleString()} ครั้ง
                      </span>
                      {post._count.attachments > 0 && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <Paperclip className="w-3 h-3" />
                          {post._count.attachments} ไฟล์
                        </span>
                      )}
                    </div>
                    
                    <div className="text-gray-400">
                      โดย {post.author.name}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="join">
            <button
              className={`join-item btn ${!pagination.hasPrevPage ? 'btn-disabled' : ''}`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
            >
              <ChevronLeft className="w-4 h-4" />
              ก่อนหน้า
            </button>
            
            {[...Array(pagination.totalPages)].map((_, index) => {
              const page = index + 1;
              const isCurrentPage = page === currentPage;
              
              // Show only a few pages around current page
              const shouldShow = 
                page === 1 || 
                page === pagination.totalPages ||
                (page >= currentPage - 2 && page <= currentPage + 2);
                
              if (!shouldShow) {
                if (page === currentPage - 3 || page === currentPage + 3) {
                  return (
                    <span key={page} className="join-item btn btn-disabled">
                      ...
                    </span>
                  );
                }
                return null;
              }
              
              return (
                <button
                  key={page}
                  className={`join-item btn ${isCurrentPage ? 'btn-active btn-primary' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              className={`join-item btn ${!pagination.hasNextPage ? 'btn-disabled' : ''}`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
            >
              ถัดไป
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Results info */}
      <div className="text-center text-sm text-gray-500 mt-4">
        แสดง {posts.length} จาก {pagination.totalCount?.toLocaleString() || 0} รายการ
      </div>
    </div>
  );
};

export default PostsPage;