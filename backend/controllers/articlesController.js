// controllers/articlesController.js – Complete file with rich text support
import asyncHandler from 'express-async-handler';
import Article from '../models/articleModel.js';
import User from '../models/userModel.js';
import { v2 as cloudinary } from 'cloudinary';
import { notifySubscribersOfNewContent } from './subscribeController.js';
import { notifyNewContent } from './notificationController.js';
import { sanitizeArticleContent, sanitizeExcerpt } from '../utils/sanitizeContent.js';

// ==================== CREATE ARTICLE ====================
const createArticle = asyncHandler(async (req, res) => {
  const {
    title,
    excerpt,
    content,
    category,
    tags,
    isFeatured,
    isEditorsPick,
    status,
    comingSoon,
  } = req.body;

  const isComingSoon = comingSoon === 'true' || comingSoon === true;

  // Validation
  if (!title || !excerpt || !category) {
    res.status(400);
    throw new Error('Please provide title, excerpt, and category');
  }

  const isPublished = status === 'published';
  if (!isComingSoon && isPublished && (!content || content.trim().length < 20)) {
    res.status(400);
    throw new Error('Full content is required for published articles. For coming soon, set comingSoon=true.');
  }

  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('At least one image is required (cover image)');
  }

  // Upload images
  const imageUrls = [];
  for (const file of req.files) {
    try {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'Bizzed_Articles',
        transformation: [{ width: 1200, height: 800, crop: 'limit' }],
      });
      imageUrls.push(result.secure_url);
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500);
      throw new Error('Failed to upload images');
    }
  }

  const featuredImage = imageUrls[0];

  // Generate unique slug
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let slug = baseSlug;
  let counter = 1;
  while (await Article.findOne({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  // Sanitize content and excerpt using helper
  const sanitizedContent = sanitizeArticleContent(content || '<p><em>Coming soon – full article will be available shortly.</em></p>');
  const sanitizedExcerpt = sanitizeExcerpt(excerpt);

  // Create the article
  const article = await Article.create({
    title: title.trim(),
    excerpt: sanitizedExcerpt,
    content: sanitizedContent,
    category,
    tags: tags ? (Array.isArray(tags) ? tags.map(t => t.trim()) : tags.split(',').map(t => t.trim())) : [],
    images: imageUrls,
    featuredImage,
    author: req.user.name || req.user.username || 'User',
    authorId: req.user._id,
    authorType: req.user.role === 'admin' ? 'admin' : 'user',
    isFeatured: isFeatured === 'true' || isFeatured === true,
    isEditorsPick: isEditorsPick === 'true' || isEditorsPick === true,
    status: isComingSoon ? 'coming_soon' : (status || 'published'),
    slug,
    publishedAt: (status === 'published' && !isComingSoon) ? new Date() : null,
    createdBy: req.user._id,
    comingSoon: isComingSoon,
    contentFormat: 'html',
  });

  // Send notifications if published
  if (article.status === 'published' && !article.comingSoon) {
    notifySubscribersOfNewContent(article, 'article');
    const notifyResult = await notifyNewContent({ type: 'article', content: article });
    console.log('Article publish notification result:', notifyResult);
  } else if (article.status === 'coming_soon') {
    console.log(`Article "${article.title}" saved as coming soon.`);
  }

  res.status(201).json(article);
});

// ==================== GET ALL ARTICLES (public) ====================
const getArticles = asyncHandler(async (req, res) => {
  const {
    category,
    featured,
    editorsPick,
    search,
    status = 'published,coming_soon',
    page = 1,
    limit = 12,
    sort = '-createdAt',
  } = req.query;

  const statuses = status.split(',').map(s => s.trim());
  let query = { status: { $in: statuses } };

  if (category && category !== 'All') query.category = category;
  if (featured === 'true') query.isFeatured = true;
  if (editorsPick === 'true') query.isEditorsPick = true;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } },
    ];
  }

  try {
    const articles = await Article.find(query)
      .populate('authorId', 'name username profile')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const articlesWithCounts = articles.map(article => ({
      ...article,
      _id: article._id ? article._id.toString() : article._id,
      authorId: article.authorId ? {
        _id: article.authorId._id.toString(),
        name: article.authorId.name,
        username: article.authorId.username,
        profile: article.authorId.profile,
      } : null,
      createdBy: article.createdBy ? article.createdBy.toString() : null,
      authorType: article.authorType || 'user',
      author: article.author || 'Unknown',
      likes: (article.likes || []).map(id => id ? id.toString() : id),
      bookmarks: (article.bookmarks || []).map(id => id ? id.toString() : id),
      comments: (article.comments || []).map(c => ({
        ...c,
        _id: c._id ? c._id.toString() : c._id,
        user: c.user ? c.user.toString() : c.user,
        likes: (c.likes || []).map(id => id ? id.toString() : id),
        replies: (c.replies || []).map(r => ({
          ...r,
          _id: r._id ? r._id.toString() : r._id,
          user: r.user ? r.user.toString() : r.user,
          likes: (r.likes || []).map(id => id ? id.toString() : id),
        })),
      })),
      likesCount: (article.likes || []).length,
      commentsCount: (article.comments || []).length,
      bookmarksCount: (article.bookmarks || []).length,
    }));

    const count = await Article.countDocuments(query);

    res.json({
      articles: articlesWithCounts,
      page: Number(page),
      pages: Math.ceil(count / limit),
      total: count,
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500);
    throw new Error('Failed to fetch articles');
  }
});

// ==================== GET USER'S OWN ARTICLES ====================
const getUserArticles = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, status } = req.query;
  
  const query = { createdBy: req.user._id };
  
  if (status) {
    const statuses = status.split(',').map(s => s.trim());
    query.status = { $in: statuses };
  }

  const articles = await Article.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const articlesWithFlags = articles.map(article => ({
    ...article,
    _id: article._id.toString(),
    status: article.status || 'unknown',
    comingSoon: article.comingSoon === true || article.status === 'coming_soon',
  }));

  const count = await Article.countDocuments(query);
  
  res.json({
    articles: articlesWithFlags,
    page: Number(page),
    pages: Math.ceil(count / limit),
    total: count,
  });
});

// ==================== GET BY SLUG (public) ====================
const getArticleBySlug = asyncHandler(async (req, res) => {
  const article = await Article.findOne({ slug: req.params.slug })
    .populate('authorId', 'name username profile')
    .populate('comments.user', 'name username profile')
    .lean();

  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }

  const articleWithCounts = {
    ...article,
    likesCount: article.likes?.length || 0,
    commentsCount: article.comments?.length || 0,
    bookmarksCount: article.bookmarks?.length || 0,
  };

  await Article.findByIdAndUpdate(article._id, { $inc: { views: 1 } });

  res.json(articleWithCounts);
});

// ==================== GET BY ID (authenticated) ====================
const getArticleById = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id)
    .populate('authorId', 'name username profile')
    .populate('comments.user', 'name username profile');

  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }

  res.json(article);
});

// ==================== UPDATE ARTICLE (owner or admin) ====================
const updateArticle = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = article.createdBy.toString() === req.user._id.toString();
  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to update this article');
  }

  const {
    title, excerpt, content, category, tags,
    isFeatured, isEditorsPick, status, keepImages, comingSoon,
  } = req.body;

  const isComingSoon = comingSoon === 'true' || comingSoon === true;
  const newStatus = status || article.status;
  const willBePublished = (newStatus === 'published') && !isComingSoon;

  // Validate content for published articles
  if (willBePublished && (!content || content.trim().length < 20)) {
    res.status(400);
    throw new Error('Cannot publish an article without full content. Add content or keep it as coming soon.');
  }

  // Handle image updates
  let updatedImages = article.images;
  let featuredImage = article.featuredImage;

  if (req.files && req.files.length > 0) {
    const newImages = [];
    for (const file of req.files) {
      try {
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'Bizzed_Articles',
          transformation: [{ width: 1200, height: 800, crop: 'limit' }],
        });
        newImages.push(result.secure_url);
      } catch (error) {
        console.error('Image upload error:', error);
      }
    }

    let imagesToKeep = [];
    if (keepImages) {
      imagesToKeep = Array.isArray(keepImages) ? keepImages : [keepImages];
    }

    // Delete removed images from Cloudinary
    for (const oldImage of article.images) {
      if (!imagesToKeep.includes(oldImage)) {
        try {
          const publicId = oldImage.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`Bizzed_Articles/${publicId}`);
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }
    }

    updatedImages = [...imagesToKeep, ...newImages];
    featuredImage = updatedImages[0];
  }

  // Update slug if title changed
  if (title && title !== article.title) {
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let newSlug = baseSlug;
    let counter = 1;
    while (await Article.findOne({ slug: newSlug, _id: { $ne: article._id } })) {
      newSlug = `${baseSlug}-${counter++}`;
    }
    article.slug = newSlug;
  }

  // Sanitize content and excerpt using helper
  if (content !== undefined) {
    article.content = sanitizeArticleContent(content);
  }
  if (excerpt) {
    article.excerpt = sanitizeExcerpt(excerpt);
  }

  // Update other fields
  if (title) article.title = title.trim();
  if (category) article.category = category;
  if (tags) article.tags = Array.isArray(tags) ? tags.map(t => t.trim()) : tags.split(',').map(t => t.trim());
  if (updatedImages) article.images = updatedImages;
  if (featuredImage) article.featuredImage = featuredImage;
  article.comingSoon = isComingSoon;

  // Admin-only fields
  if (isAdmin) {
    if (isFeatured !== undefined) article.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (isEditorsPick !== undefined) article.isEditorsPick = isEditorsPick === 'true' || isEditorsPick === true;
  }

  const oldStatus = article.status;
  article.status = newStatus;

  // Handle publication
  const isBecomingPublished = (oldStatus !== 'published' && newStatus === 'published') && !isComingSoon;
  if (isBecomingPublished) {
    article.publishedAt = new Date();
    await article.save();
    notifySubscribersOfNewContent(article, 'article');
    const notifyResult = await notifyNewContent({ type: 'article', content: article });
    console.log('Article publish on update notification result:', notifyResult);
    return res.json(article);
  }

  const updatedArticle = await article.save();
  res.json(updatedArticle);
});

// ==================== DELETE ARTICLE (owner or admin) ====================
const deleteArticle = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = article.createdBy.toString() === req.user._id.toString();
  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to delete this article');
  }

  for (const image of article.images) {
    try {
      const publicId = image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`Bizzed_Articles/${publicId}`);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

  await User.updateMany(
    { bookmarkedArticles: article._id },
    { $pull: { bookmarkedArticles: article._id } },
  );

  await Article.deleteOne({ _id: req.params.id });
  res.json({ message: 'Article removed' });
});

// ==================== REQUEST FEATURED (user) ====================
const requestFeatured = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }

  const isOwner = article.createdBy.toString() === req.user._id.toString();
  if (!isOwner) {
    res.status(403);
    throw new Error('Only the creator can request featured status');
  }

  if (article.isFeatured) {
    res.status(400);
    throw new Error('Article is already featured');
  }

  article.featuredRequest = true;
  article.featuredRequestAt = new Date();
  await article.save();

  res.json({ message: 'Featured request submitted. Admin will review it.', article });
});

// ==================== APPROVE FEATURED (admin only) ====================
const approveFeatured = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }

  if (!article.featuredRequest) {
    res.status(400);
    throw new Error('No pending featured request for this article');
  }

  article.isFeatured = true;
  article.featuredRequest = false;
  article.featuredRequestAt = undefined;
  await article.save();

  res.json({ message: 'Article is now featured', article });
});

// ==================== TOGGLE FEATURED (admin only - direct) ====================
const toggleFeatured = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only admins can feature articles');
  }
  const article = await Article.findById(req.params.id);
  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }
  article.isFeatured = !article.isFeatured;
  if (article.isFeatured && article.featuredRequest) article.featuredRequest = false;
  await article.save();
  res.json({ message: `Article ${article.isFeatured ? 'featured' : 'unfeatured'}`, article });
});

// ==================== TOGGLE EDITOR'S PICK (admin only) ====================
const toggleEditorsPick = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only admins can set editor\'s pick');
  }
  const article = await Article.findById(req.params.id);
  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }
  article.isEditorsPick = !article.isEditorsPick;
  await article.save();
  res.json({ message: `Article ${article.isEditorsPick ? 'is editor\'s pick' : 'removed from editor\'s pick'}`, article });
});

// ==================== SOCIAL FEATURES ====================
const likeArticle = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }

  const userId = req.user._id;
  const isLiked = article.likes.includes(userId);

  if (isLiked) {
    article.likes.pull(userId);
    await User.findByIdAndUpdate(userId, { $pull: { likedArticles: article._id } });
  } else {
    article.likes.push(userId);
    await User.findByIdAndUpdate(userId, { $addToSet: { likedArticles: article._id } });
  }

  await article.save();

  res.json({
    liked: !isLiked,
    likesCount: article.likes.length,
  });
});

// ==================== BOOKMARK ARTICLE ====================
const bookmarkArticle = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }

  const userId = req.user._id;
  const isBookmarked = article.bookmarks.includes(userId);

  if (isBookmarked) {
    article.bookmarks.pull(userId);
    await User.findByIdAndUpdate(userId, { $pull: { bookmarkedArticles: article._id } });
  } else {
    article.bookmarks.push(userId);
    await User.findByIdAndUpdate(userId, { $addToSet: { bookmarkedArticles: article._id } });
  }

  await article.save();

  res.json({
    bookmarked: !isBookmarked,
    bookmarksCount: article.bookmarks.length,
  });
});

// ==================== ADD COMMENT ====================
const addArticleComment = asyncHandler(async (req, res) => {
  const { text, parentCommentId } = req.body;

  if (!text || !text.trim()) {
    res.status(400);
    throw new Error('Comment text is required');
  }

  const article = await Article.findById(req.params.id);
  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }

  const comment = {
    user: req.user._id,
    text: text.trim(),
    userName: req.user.name || req.user.username,
    userProfile: req.user.profile || '',
  };

  if (parentCommentId) {
    const parentComment = article.comments.id(parentCommentId);
    if (!parentComment) {
      res.status(404);
      throw new Error('Parent comment not found');
    }
    parentComment.replies.push(comment);
  } else {
    article.comments.push(comment);
  }

  await article.save();

  const populatedArticle = await Article.findById(article._id)
    .populate('comments.user', 'name username profile')
    .populate('comments.replies.user', 'name username profile');

  const allComments = populatedArticle.comments;
  let newComment;

  if (parentCommentId) {
    const parent = allComments.id(parentCommentId);
    newComment = parent?.replies[parent.replies.length - 1];
  } else {
    newComment = allComments[allComments.length - 1];
  }

  res.status(201).json(newComment);
});

// ==================== LIKE COMMENT ====================
const likeArticleComment = asyncHandler(async (req, res) => {
  const { id, commentId } = req.params;
  const { replyId } = req.body;

  const article = await Article.findById(id);
  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }

  let comment;
  if (replyId) {
    const parentComment = article.comments.id(commentId);
    if (!parentComment) {
      res.status(404);
      throw new Error('Parent comment not found');
    }
    comment = parentComment.replies.id(replyId);
  } else {
    comment = article.comments.id(commentId);
  }

  if (!comment) {
    res.status(404);
    throw new Error('Comment not found');
  }

  const userId = req.user._id;
  const isLiked = comment.likes?.includes(userId);

  if (isLiked) {
    comment.likes.pull(userId);
  } else {
    if (!comment.likes) comment.likes = [];
    comment.likes.push(userId);
  }

  await article.save();

  res.json({
    liked: !isLiked,
    likesCount: comment.likes?.length || 0,
  });
});

// ==================== DELETE COMMENT ====================
const deleteArticleComment = asyncHandler(async (req, res) => {
  const { id, commentId } = req.params;
  const { replyId } = req.body;

  const article = await Article.findById(id);
  if (!article) {
    res.status(404);
    throw new Error('Article not found');
  }

  if (replyId) {
    const parentComment = article.comments.id(commentId);
    if (!parentComment) {
      res.status(404);
      throw new Error('Parent comment not found');
    }
    const reply = parentComment.replies.id(replyId);
    if (!reply) {
      res.status(404);
      throw new Error('Reply not found');
    }
    if (reply.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized');
    }
    parentComment.replies.pull(replyId);
  } else {
    const comment = article.comments.id(commentId);
    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized');
    }
    article.comments.pull(commentId);
  }

  await article.save();
  res.json({ message: 'Comment removed' });
});

// ==================== GET BOOKMARKED ARTICLES ====================
const getBookmarkedArticles = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('bookmarkedArticles');
  res.json(user.bookmarkedArticles || []);
});

// ==================== GET ARTICLE CATEGORIES ====================
const getArticleCategories = asyncHandler(async (req, res) => {
  const categories = await Article.distinct('category');
  res.json(categories);
});

// ==================== EXPORTS ====================
export {
  createArticle,
  getArticles,
  getUserArticles,
  getArticleBySlug,
  getArticleById,
  updateArticle,
  deleteArticle,
  requestFeatured,
  approveFeatured,
  toggleFeatured,
  toggleEditorsPick,
  getArticleCategories,
  likeArticle,
  bookmarkArticle,
  addArticleComment,
  likeArticleComment,
  deleteArticleComment,
  getBookmarkedArticles,
};