const prisma = require('../config/database');
const fs = require('fs');
const path = require('path');

// ================================
// POST CATEGORIES SERVICES
// ================================

const createCategory = async (categoryData) => {
  try {
    const category = await prisma.post_categories.create({
      data: categoryData
    });
    return category;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

const getCategories = async (includeInactive = false) => {
  try {
    const where = includeInactive ? {} : { is_active: true };
    const categories = await prisma.post_categories.findMany({
      where,
      include: {
        _count: {
          select: {
            posts: {
              where: { is_published: true }
            }
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

const updateCategory = async (categoryId, updateData) => {
  try {
    const category = await prisma.post_categories.update({
      where: { category_id: categoryId },
      data: updateData
    });
    return category;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

const deleteCategory = async (categoryId) => {
  try {
    // Check if category has posts
    const postsCount = await prisma.posts.count({
      where: { category_id: categoryId }
    });

    if (postsCount > 0) {
      throw new Error('Cannot delete category that contains posts');
    }

    await prisma.post_categories.delete({
      where: { category_id: categoryId }
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// ================================
// POSTS SERVICES
// ================================

const createPost = async (postData, files = []) => {
  try {
    const path = require('path');
    const post = await prisma.posts.create({
      data: {
        ...postData,
        attachments: {
          create: files.map(file => ({
            file_name: file.originalname,
            file_path: file.path.replace(path.join(__dirname, '../'), ''),
            file_size: Number(file.size),
            file_type: file.mimetype
          }))
        }
      },
      include: {
        author: {
          select: { name: true, username: true }
        },
        category: {
          select: { name: true, color: true }
        },
        attachments: true
      }
    });
    return post;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

const getPosts = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      categoryId,
      search,
      authorId,
      isPublished = true,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;

    // Build where condition
    const where = {
      is_published: isPublished
    };

    if (categoryId) {
      where.category_id = categoryId;
    }

    if (authorId) {
      where.author_id = authorId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } }
      ];
    }

    // Build order by
    const orderBy = {};
    if (sortBy === 'pinned') {
      orderBy.is_pinned = 'desc';
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [posts, totalCount] = await Promise.all([
      prisma.posts.findMany({
        where,
        include: {
          author: {
            select: { name: true, username: true }
          },
          category: {
            select: { name: true, color: true }
          },
          _count: {
            select: { attachments: true }
          },
          attachments: {
            take: 5,
            select: {
              attachment_id: true,
              file_name: true,
              file_path: true,
              file_type: true,
              file_size: true
            }
          }
        },
        orderBy,
        skip,
        take: parseInt(limit)
      }),
      prisma.posts.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};

const getPostById = async (postId, incrementView = false) => {
  try {
    // Increment view count if requested
    if (incrementView) {
      await prisma.posts.update({
        where: { post_id: postId },
        data: { view_count: { increment: 1 } }
      });
    }

    const post = await prisma.posts.findUnique({
      where: { post_id: postId },
      include: {
        author: {
          select: { name: true, username: true }
        },
        category: {
          select: { name: true, color: true }
        },
        attachments: true
      }
    });

    return post;
  } catch (error) {
    console.error('Error fetching post:', error);
    throw error;
  }
};

const updatePost = async (postId, updateData, newFiles = [], removedFiles = []) => {
  try {
    // Get current post to check for featured image deletion
    const currentPost = await prisma.posts.findUnique({
      where: { post_id: postId }
    });

    // Remove old featured image if being replaced or deleted
    if (updateData.featured_image !== undefined && currentPost.featured_image) {
      try {
        fs.unlinkSync(currentPost.featured_image);
      } catch (err) {
        console.warn('Could not delete featured image:', currentPost.featured_image);
      }
    }

    // Remove old files if specified
    if (removedFiles.length > 0) {
      const attachmentsToRemove = await prisma.post_attachments.findMany({
        where: {
          post_id: postId,
          attachment_id: { in: removedFiles }
        }
      });

      // Delete physical files
      for (const attachment of attachmentsToRemove) {
        try {
          fs.unlinkSync(attachment.file_path);
        } catch (err) {
          console.warn('Could not delete file:', attachment.file_path);
        }
      }

      // Delete from database
      await prisma.post_attachments.deleteMany({
        where: {
          post_id: postId,
          attachment_id: { in: removedFiles }
        }
      });
    }

    const post = await prisma.posts.update({
      where: { post_id: postId },
      data: {
        ...updateData,
        attachments: {
          create: newFiles.map(file => ({
            file_name: file.originalname,
            file_path: file.path.replace(path.join(__dirname, '../'), ''),
            file_size: Number(file.size),
            file_type: file.mimetype
          }))
        }
      },
      include: {
        author: {
          select: { name: true, username: true }
        },
        category: {
          select: { name: true, color: true }
        },
        attachments: true
      }
    });

    return post;
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

const deletePost = async (postId) => {
  try {
    // Get post with attachments
    const post = await prisma.posts.findUnique({
      where: { post_id: postId },
      include: { attachments: true }
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Delete physical files
    for (const attachment of post.attachments) {
      try {
        fs.unlinkSync(attachment.file_path);
      } catch (err) {
        console.warn('Could not delete file:', attachment.file_path);
      }
    }

    // Delete featured image if exists
    if (post.featured_image) {
      try {
        fs.unlinkSync(post.featured_image);
      } catch (err) {
        console.warn('Could not delete featured image:', post.featured_image);
      }
    }

    // Delete from database (attachments will be deleted by cascade)
    await prisma.posts.delete({
      where: { post_id: postId }
    });

  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};

const togglePinPost = async (postId, isPinned) => {
  try {
    const post = await prisma.posts.update({
      where: { post_id: postId },
      data: { is_pinned: isPinned }
    });
    return post;
  } catch (error) {
    console.error('Error toggling pin status:', error);
    throw error;
  }
};

const getPostStats = async () => {
  try {
    const stats = await prisma.posts.aggregate({
      _count: {
        post_id: true
      },
      _sum: {
        view_count: true
      }
    });

    const categoryStats = await prisma.post_categories.findMany({
      include: {
        _count: {
          select: {
            posts: {
              where: { is_published: true }
            }
          }
        }
      }
    });

    return {
      totalPosts: stats._count.post_id,
      totalViews: stats._sum.view_count || 0,
      categories: categoryStats.map(cat => ({
        name: cat.name,
        count: cat._count.posts
      }))
    };
  } catch (error) {
    console.error('Error fetching post stats:', error);
    throw error;
  }
};

module.exports = {
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