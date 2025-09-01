const postsService = require('../services/postsService');

// Helper function to convert absolute paths to relative paths
const convertToRelativePath = (absolutePath) => {
  if (!absolutePath) return absolutePath;
  const backendPath = path.join(__dirname, '../');
  return absolutePath.replace(backendPath, '');
};
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/posts/');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Fix Thai filename encoding
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    // Allow images and common document types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ================================
// CATEGORY CONTROLLERS
// ================================

const createCategory = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await postsService.createCategory({
      name,
      description,
      color
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCategories = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const categories = await postsService.getCategories(includeInactive === 'true');
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { categoryId } = req.params;
    const { name, description, color, is_active } = req.body;

    const category = await postsService.updateCategory(categoryId, {
      name,
      description,
      color,
      is_active
    });

    res.status(200).json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { categoryId } = req.params;
    await postsService.deleteCategory(categoryId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error.message === 'Cannot delete category that contains posts') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ================================
// POST CONTROLLERS
// ================================

const createPost = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { title, content, category_id, is_pinned, is_published } = req.body;

    if (!title || !content || !category_id) {
      return res.status(400).json({ error: 'Title, content, and category are required' });
    }

    const postData = {
      title,
      content,
      category_id,
      author_id: requester.user_id,
      is_pinned: is_pinned === 'true',
      is_published: is_published !== 'false' // Default to true
    };

    // Handle featured image
    if (req.files && req.files.featured_image) {
      // Convert absolute path to relative path
      const relativePath = req.files.featured_image[0].path.replace(path.join(__dirname, '../'), '');
      postData.featured_image = relativePath;
    }

    // Handle attachments
    const attachmentFiles = req.files && req.files.attachments ? req.files.attachments : [];

    const post = await postsService.createPost(postData, attachmentFiles);
    
    // Convert BigInt to Number and paths to relative for JSON serialization
    const sanitizedPost = JSON.parse(JSON.stringify(post, (key, value) => {
      if (typeof value === 'bigint') return Number(value);
      if ((key === 'featured_image' || key === 'file_path') && typeof value === 'string') {
        return convertToRelativePath(value);
      }
      return value;
    }));
    
    res.status(201).json(sanitizedPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      author,
      published,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      categoryId: category,
      search,
      authorId: author,
      isPublished: published !== 'false', // Default to true for public access
      sortBy: sort,
      sortOrder: order
    };

    // Admin can see unpublished posts
    if (req.user && req.user.role === 'admin') {
      if (published === 'false') {
        options.isPublished = false;
      } else if (published === 'all') {
        delete options.isPublished;
      }
    }

    const result = await postsService.getPosts(options);
    
    // Convert BigInt to Number and paths to relative for JSON serialization
    const sanitizedResult = JSON.parse(JSON.stringify(result, (key, value) => {
      if (typeof value === 'bigint') return Number(value);
      if ((key === 'featured_image' || key === 'file_path') && typeof value === 'string') {
        return convertToRelativePath(value);
      }
      return value;
    }));
    
    res.status(200).json(sanitizedResult);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const { incrementView = 'false' } = req.query;

    const post = await postsService.getPostById(postId, incrementView === 'true');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user can see unpublished posts
    if (!post.is_published && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Convert BigInt to Number and paths to relative for JSON serialization
    const sanitizedPost = JSON.parse(JSON.stringify(post, (key, value) => {
      if (typeof value === 'bigint') return Number(value);
      if ((key === 'featured_image' || key === 'file_path') && typeof value === 'string') {
        return convertToRelativePath(value);
      }
      return value;
    }));

    res.status(200).json(sanitizedPost);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updatePost = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { postId } = req.params;
    const { title, content, category_id, is_pinned, is_published, removed_attachments, remove_featured_image } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (category_id) updateData.category_id = category_id;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned === 'true';
    if (is_published !== undefined) updateData.is_published = is_published !== 'false';

    // Handle featured image
    if (req.files && req.files.featured_image) {
      // Convert absolute path to relative path
      const relativePath = req.files.featured_image[0].path.replace(path.join(__dirname, '../'), '');
      updateData.featured_image = relativePath;
    } else if (remove_featured_image === 'true') {
      updateData.featured_image = null;
    }

    // Handle attachments
    const newAttachmentFiles = req.files && req.files.attachments ? req.files.attachments : [];
    const removedFiles = removed_attachments ? JSON.parse(removed_attachments) : [];

    const post = await postsService.updatePost(postId, updateData, newAttachmentFiles, removedFiles);
    
    // Convert BigInt to Number and paths to relative for JSON serialization
    const sanitizedPost = JSON.parse(JSON.stringify(post, (key, value) => {
      if (typeof value === 'bigint') return Number(value);
      if ((key === 'featured_image' || key === 'file_path') && typeof value === 'string') {
        return convertToRelativePath(value);
      }
      return value;
    }));
    
    res.status(200).json(sanitizedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deletePost = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { postId } = req.params;
    await postsService.deletePost(postId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
    if (error.message === 'Post not found') {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

const togglePinPost = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { postId } = req.params;
    const { is_pinned } = req.body;

    const post = await postsService.togglePinPost(postId, is_pinned);
    
    // Convert BigInt to Number and paths to relative for JSON serialization
    const sanitizedPost = JSON.parse(JSON.stringify(post, (key, value) => {
      if (typeof value === 'bigint') return Number(value);
      if ((key === 'featured_image' || key === 'file_path') && typeof value === 'string') {
        return convertToRelativePath(value);
      }
      return value;
    }));
    
    res.status(200).json(sanitizedPost);
  } catch (error) {
    console.error('Error toggling pin status:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPostStats = async (req, res) => {
  try {
    const requester = req.user;
    if (requester.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const stats = await postsService.getPostStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching post stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  upload,
  
  // Categories
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  
  // Posts
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  togglePinPost,
  getPostStats
};