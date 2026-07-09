// src/screens/BiizzedCreateArticle.jsx – With fixed preview toggle
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  FaSpinner, FaImage, FaTimes, FaPlus, FaInfoCircle, FaEye, FaSave,
  FaArrowLeft, FaBookmark, FaCheckCircle,
  FaBold, FaItalic, FaUnderline, FaStrikethrough,
  FaListUl, FaListOl, FaQuoteLeft, FaCode, FaLink,
  FaHeading, FaAlignLeft, FaAlignCenter, FaAlignRight,
  FaTrash,
} from 'react-icons/fa';
import { useCreateArticleMutation } from '../slices/articlesApiSlice';
import BiizzedArticlesNavbar from '../components/BiizzedArticlesNavbar';
import BiizzedBottomBar from '../components/BiizzedBottomBar';
import { EditorContent, useEditor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';

const CATEGORIES = [
  'Business', 'Technology', 'Lifestyle', 'Health', 'Education',
  'Entertainment', 'Sports', 'Fashion', 'Food', 'Travel',
  'Finance', 'Science', 'Politics', 'Culture', 'Design',
  'Marketing', 'Startup', 'Other',
];

const ToolbarButton = ({ onClick, isActive, icon: Icon, label, color = 'text-gray-600' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-2 rounded-lg transition-colors ${
      isActive ? 'bg-[#1B3766] text-white' : `${color} hover:bg-gray-100 hover:text-[#1B3766]`
    }`}
    title={label}
  >
    <Icon className="text-sm" />
  </button>
);

const BiizzedCreateArticle = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const [createArticle, { isLoading }] = useCreateArticleMutation();

  // ── Form State ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImages, setCoverImages] = useState([]);
  const [coverImagePreviews, setCoverImagePreviews] = useState([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isEditorsPick, setIsEditorsPick] = useState(false);
  const [status, setStatus] = useState('draft');
  const [comingSoon, setComingSoon] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const isAdmin = userInfo?.role === 'admin';

  // ── TipTap Editor ──────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Placeholder.configure({
        placeholder: 'Write your article content here...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-[#1B3766] underline underline-offset-2',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        draggable: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-xl my-4 shadow-sm cursor-grab hover:shadow-md transition-shadow',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
      }),
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
      // ── Drag & Drop ──────────────────────────────────────────────────────
      handleDrop: (view, event, slice, moved) => {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (files?.length) {
          event.preventDefault();
          const { pos } = view.posAtCoords({ left: event.clientX, top: event.clientY });
          for (const file of files) {
            if (!file.type.startsWith('image/')) {
              toast.warning(`Skipping ${file.name} – not an image`);
              continue;
            }
            if (file.size > 5 * 1024 * 1024) {
              toast.warning(`${file.name} is too large (max 5MB)`);
              continue;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target.result;
              if (pos !== undefined && pos !== null) {
                const tr = view.state.tr.insert(pos, view.state.schema.nodes.image.create({ src }));
                view.dispatch(tr);
              } else {
                editor?.chain().focus().setImage({ src }).run();
              }
            };
            reader.readAsDataURL(file);
          }
          return true;
        }
        return false;
      },
      // ── Paste Images ──────────────────────────────────────────────────────
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        let hasImage = false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target.result;
              editor?.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(file);
            hasImage = true;
          }
        }
        return hasImage;
      },
    },
  });

  // ── Insert Image ──────────────────────────────────────────────────────────
  const insertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      let inserted = 0;
      files.forEach(file => {
        if (!file.type.startsWith('image/')) {
          toast.warning(`${file.name} is not an image`);
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.warning(`${file.name} is too large (max 5MB)`);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const src = event.target.result;
          editor?.chain().focus().setImage({ src }).run();
          inserted++;
          if (inserted === files.length) {
            toast.success(`${inserted} image(s) inserted`);
          }
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  // ── Remove Selected Image ──────────────────────────────────────────────────
  const removeSelectedImage = () => {
    if (!editor) return;
    const { state } = editor;
    const { selection } = state;
    
    let node = selection.node;
    if (node && node.type.name === 'image') {
      editor.chain().focus().deleteSelection().run();
      toast.success('Image removed');
      return;
    }
    
    const { from, to } = selection;
    const selectedNode = state.doc.nodeAt(from);
    if (selectedNode && selectedNode.type.name === 'image') {
      const tr = state.tr.delete(from, to);
      editor.view.dispatch(tr);
      toast.success('Image removed');
      return;
    }
    
    toast.info('Click on an image to select it first');
  };

  // ── Cover Image Upload ─────────────────────────────────────────────────────
  const handleCoverImageUpload = (e) => {
    const files = Array.from(e.target.files).filter(
      f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024
    );
    if (!files.length) {
      toast.error('No valid images selected');
      return;
    }
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setCoverImagePreviews(prev => [...prev, ...newPreviews]);
    setCoverImages(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success(`${files.length} cover image(s) added`);
  };

  const removeCoverImage = (index) => {
    URL.revokeObjectURL(coverImagePreviews[index]);
    setCoverImagePreviews(prev => prev.filter((_, i) => i !== index));
    setCoverImages(prev => prev.filter((_, i) => i !== index));
  };

  // ── Tags ────────────────────────────────────────────────────────────────────
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      toast.warning('Tag already added');
      return;
    }
    if (tags.length >= 10) {
      toast.warning('Maximum 10 tags allowed');
      return;
    }
    setTags([...tags, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!excerpt.trim()) newErrors.excerpt = 'Excerpt is required';
    if (excerpt.trim().length > 200) newErrors.excerpt = 'Excerpt must be <200 characters';
    if (!category) newErrors.category = 'Category is required';
    if (!coverImages.length) newErrors.coverImages = 'At least one cover image is required';
    
    const isPublishing = status === 'published' && !comingSoon;
    const content = editor?.getHTML() || '';
    if (isPublishing && content.trim().length < 20) {
      newErrors.content = 'Content must be at least 20 characters for published articles';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      const firstError = Object.keys(errors)[0];
      document.getElementById(firstError)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Please fix all errors before submitting');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('excerpt', excerpt.trim());
      formData.append('content', editor?.getHTML() || '');
      formData.append('category', category);
      formData.append('tags', JSON.stringify(tags));
      formData.append('isFeatured', isFeatured);
      formData.append('isEditorsPick', isEditorsPick);
      formData.append('status', status);
      formData.append('comingSoon', comingSoon);
      
      coverImages.forEach(img => formData.append('images', img));

      const result = await createArticle(formData).unwrap();
      
      const successMsg = status === 'published' && !comingSoon
        ? 'Article published successfully! 🎉'
        : comingSoon
        ? 'Article saved as "Coming Soon" 📅'
        : 'Article saved as draft 📝';
      
      toast.success(successMsg);
      navigate(`/articles/${result.slug}`);
    } catch (error) {
      console.error('Create article error:', error);
      const message = error?.data?.message || 'Failed to create article';
      toast.error(message);
      if (error?.data?.errors) setErrors(error.data.errors);
    }
  };

  // ── Save as Draft ──────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    const originalStatus = status;
    setStatus('draft');
    const tempSubmit = async () => {
      try {
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('excerpt', excerpt.trim());
        formData.append('content', editor?.getHTML() || '');
        formData.append('category', category);
        formData.append('tags', JSON.stringify(tags));
        formData.append('isFeatured', isFeatured);
        formData.append('isEditorsPick', isEditorsPick);
        formData.append('status', 'draft');
        formData.append('comingSoon', comingSoon);
        coverImages.forEach(img => formData.append('images', img));
        await createArticle(formData).unwrap();
        toast.success('Draft saved successfully');
        navigate('/articles');
      } catch (error) {
        toast.error(error?.data?.message || 'Failed to save draft');
      }
    };
    await tempSubmit();
    setStatus(originalStatus);
  };

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      coverImagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // ── Auth Guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userInfo) {
      toast.error('Please login to create an article');
      navigate('/login');
    }
  }, [userInfo, navigate]);

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <FaSpinner className="w-8 h-8 text-[#1B3766] animate-spin" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100">
      <BiizzedArticlesNavbar />

      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/articles')}
              className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-600"
            >
              <FaArrowLeft className="text-lg" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Create Article
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Badge */}
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
              status === 'published' && !comingSoon
                ? 'bg-green-100 text-green-700'
                : comingSoon
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {status === 'published' && !comingSoon ? (
                <FaCheckCircle className="text-xs" />
              ) : comingSoon ? (
                <FaBookmark className="text-xs" />
              ) : (
                <FaSave className="text-xs" />
              )}
              {status === 'published' && !comingSoon ? 'Published' : comingSoon ? 'Coming Soon' : 'Draft'}
            </span>

            {/* Preview Toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <FaEye className="text-sm" />
              {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>
        </div>

        {/* ── Form ────────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Image */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Cover Image <span className="text-red-500">*</span>
            </label>

            {coverImagePreviews.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {coverImagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={preview}
                      alt={`Cover ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute top-2 left-2 bg-[#1B3766] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeCoverImage(index)}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-[#1B3766] transition-colors flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#1B3766]"
                >
                  <FaPlus className="text-xl" />
                  <span className="text-xs">Add more</span>
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-300 hover:border-[#1B3766] transition-colors flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <FaImage className="text-4xl text-gray-400 mb-3" />
                <p className="text-gray-500 font-medium">Click to upload cover image</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleCoverImageUpload}
              className="hidden"
            />
            {errors.coverImages && (
              <p className="text-red-500 text-sm mt-2">{errors.coverImages}</p>
            )}
          </div>

          {/* Title */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter article title..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3766] transition"
              maxLength={100}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-400">{title.length}/100</span>
              {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
            </div>
          </div>

          {/* Excerpt */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <label htmlFor="excerpt" className="block text-sm font-semibold text-gray-700 mb-2">
              Excerpt <span className="text-red-500">*</span>
            </label>
            <textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary of the article..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3766] transition resize-none"
              rows={3}
              maxLength={200}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-400">{excerpt.length}/200</span>
              {errors.excerpt && <p className="text-red-500 text-sm">{errors.excerpt}</p>}
            </div>
          </div>

          {/* Category */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3766] transition bg-white"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1B3766]/10 text-[#1B3766] rounded-full text-xs font-medium"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <FaTimes className="text-[10px]" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tags..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3766] transition"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-[#1B3766] text-white rounded-xl text-sm font-medium hover:bg-[#142952] transition-colors"
              >
                <FaPlus className="text-xs" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Press Enter to add tag (max 10)</p>
          </div>

          {/* ── Rich Text Editor with Fixed Preview ────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Content {status === 'published' && !comingSoon && <span className="text-red-500">*</span>}
                <span className="text-xs text-gray-400 ml-2 font-normal">
                  (Drag images up/down to reposition)
                </span>
              </label>

              <div className="relative">
                {/* Editor - always mounted, hidden when preview is active */}
                <div className={showPreview ? 'hidden' : 'block'}>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        isActive={editor?.isActive('bold')}
                        icon={FaBold}
                        label="Bold"
                      />
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        isActive={editor?.isActive('italic')}
                        icon={FaItalic}
                        label="Italic"
                      />
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                        isActive={editor?.isActive('underline')}
                        icon={FaUnderline}
                        label="Underline"
                      />
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleStrike().run()}
                        isActive={editor?.isActive('strike')}
                        icon={FaStrikethrough}
                        label="Strikethrough"
                      />
                      <div className="w-px h-6 bg-gray-300 mx-1" />

                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                        isActive={editor?.isActive('heading', { level: 2 })}
                        icon={FaHeading}
                        label="Heading"
                      />
                      <div className="w-px h-6 bg-gray-300 mx-1" />

                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        isActive={editor?.isActive('bulletList')}
                        icon={FaListUl}
                        label="Bullet List"
                      />
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        isActive={editor?.isActive('orderedList')}
                        icon={FaListOl}
                        label="Numbered List"
                      />
                      <div className="w-px h-6 bg-gray-300 mx-1" />

                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                        isActive={editor?.isActive('blockquote')}
                        icon={FaQuoteLeft}
                        label="Quote"
                      />
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                        isActive={editor?.isActive('codeBlock')}
                        icon={FaCode}
                        label="Code Block"
                      />
                      <div className="w-px h-6 bg-gray-300 mx-1" />

                      <ToolbarButton
                        onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                        isActive={editor?.isActive({ textAlign: 'left' })}
                        icon={FaAlignLeft}
                        label="Align Left"
                      />
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                        isActive={editor?.isActive({ textAlign: 'center' })}
                        icon={FaAlignCenter}
                        label="Align Center"
                      />
                      <ToolbarButton
                        onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                        isActive={editor?.isActive({ textAlign: 'right' })}
                        icon={FaAlignRight}
                        label="Align Right"
                      />
                      <div className="w-px h-6 bg-gray-300 mx-1" />

                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt('Enter URL:');
                          if (url) {
                            editor?.chain().focus().setLink({ href: url }).run();
                          }
                        }}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-[#1B3766] transition-colors"
                        title="Add Link"
                      >
                        <FaLink className="text-sm" />
                      </button>

                      <button
                        type="button"
                        onClick={insertImage}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-[#1B3766] transition-colors"
                        title="Insert Image"
                      >
                        <FaImage className="text-sm" />
                      </button>

                      <button
                        type="button"
                        onClick={removeSelectedImage}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove Selected Image"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </div>

                    <EditorContent editor={editor} />

                    {editor && (
                      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                        <div className="flex items-center gap-1 bg-white shadow-lg rounded-lg border border-gray-200 p-1">
                          <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            isActive={editor.isActive('bold')}
                            icon={FaBold}
                            label="Bold"
                            className="!p-1.5"
                          />
                          <ToolbarButton
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            isActive={editor.isActive('italic')}
                            icon={FaItalic}
                            label="Italic"
                            className="!p-1.5"
                          />
                          <ToolbarButton
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            isActive={editor.isActive('underline')}
                            icon={FaUnderline}
                            label="Underline"
                            className="!p-1.5"
                          />
                          <div className="w-px h-4 bg-gray-300" />
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('Enter URL:');
                              if (url) {
                                editor.chain().focus().setLink({ href: url }).run();
                              }
                            }}
                            className="p-1.5 rounded text-gray-600 hover:bg-gray-100 hover:text-[#1B3766] transition-colors"
                            title="Add Link"
                          >
                            <FaLink className="text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={insertImage}
                            className="p-1.5 rounded text-gray-600 hover:bg-gray-100 hover:text-[#1B3766] transition-colors"
                            title="Insert Image"
                          >
                            <FaImage className="text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={removeSelectedImage}
                            className="p-1.5 rounded text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Remove Image"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </BubbleMenu>
                    )}
                  </div>
                </div>

                {/* Preview - always mounted, hidden when editing */}
                <div className={showPreview ? 'block' : 'hidden'}>
                  <div className="min-h-[400px] p-6 border border-gray-200 rounded-xl bg-gray-50 prose prose-sm max-w-none">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: editor?.getHTML() || '<p class="text-gray-400 italic">No content to preview</p>',
                      }}
                    />
                  </div>
                </div>
              </div>

              {errors.content && <p className="text-red-500 text-sm mt-2">{errors.content}</p>}
            </div>
          </div>

          {/* ── Publishing Options ───────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Publishing Options</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3766] transition bg-white"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Coming Soon Mode
                </label>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={comingSoon}
                      onChange={(e) => setComingSoon(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#1B3766] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1B3766]"></div>
                    <span className="ml-3 text-sm text-gray-600">
                      {comingSoon ? 'Coming Soon' : 'Full Content'}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Enable to publish with placeholder content
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Admin Options</h4>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 text-[#1B3766] focus:ring-[#1B3766] rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Feature Article</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEditorsPick}
                      onChange={(e) => setIsEditorsPick(e.target.checked)}
                      className="w-4 h-4 text-[#1B3766] focus:ring-[#1B3766] rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Editor's Pick</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ── Form Actions ──────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3.5 bg-[#1B3766] hover:bg-[#142952] text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <>
                  {status === 'published' && !comingSoon ? (
                    <FaCheckCircle className="text-sm" />
                  ) : comingSoon ? (
                    <FaBookmark className="text-sm" />
                  ) : (
                    <FaSave className="text-sm" />
                  )}
                  {status === 'published' && !comingSoon
                    ? 'Publish Article'
                    : comingSoon
                    ? 'Save as Coming Soon'
                    : 'Save Draft'}
                </>
              )}
            </button>

            {status !== 'draft' && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isLoading}
                className="px-6 py-3.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FaSave className="text-sm" /> Save as Draft
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* ── Info Notice ───────────────────────────────────────────────────── */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <FaInfoCircle className="text-blue-500 text-lg flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700">
                <strong>Pro tip:</strong> Rich text formatting is supported including bold, italic, headings,
                lists, links, and images.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Cover image is required. You can add multiple images in the content area using the image button,
                drag & drop, or paste from clipboard. Drag images up/down to reposition them.
              </p>
            </div>
          </div>
        </form>
      </div>

      <BiizzedBottomBar />

      {/* ── Editor Styles ────────────────────────────────────────────────────── */}
      <style>{`
        .ProseMirror {
          min-height: 300px;
          padding: 1rem;
          outline: none;
        }
        .ProseMirror p {
          margin-bottom: 0.75rem;
        }
        .ProseMirror h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin: 1.5rem 0 0.75rem;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1.25rem 0 0.75rem;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #1B3766;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #4b5563;
          font-style: italic;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1rem auto;
          display: block;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
          cursor: grab;
          transition: box-shadow 0.2s;
        }
        .ProseMirror img:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .ProseMirror img:active {
          cursor: grabbing;
        }
        .ProseMirror code {
          background: #f3f4f6;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
        }
        .ProseMirror pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 0.75rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .ProseMirror pre code {
          background: transparent;
          padding: 0;
          font-size: 0.875em;
          color: inherit;
        }
        .ProseMirror .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror a {
          color: #1B3766;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .ProseMirror a:hover {
          color: #142952;
        }
      `}</style>
    </div>
  );
};

export default BiizzedCreateArticle;