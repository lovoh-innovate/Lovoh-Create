// utils/sanitizeContent.js
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a single instance of DOMPurify with JSDOM window
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configuration for full article content (rich text allowed)
const articleConfig = {
  ALLOWED_TAGS: [
    // Text formatting
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'sub', 'sup', 'mark', 'del', 'ins', 'small', 'big',
    
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    
    // Lists
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption',
    
    // Text containers
    'div', 'span', 'section', 'article', 'header', 'footer', 'main', 'aside',
    'blockquote', 'pre', 'code', 'hr',
    
    // Links and media
    'a', 'img', 'figure', 'figcaption', 'picture', 'source',
    
    // Media elements
    'iframe', 'video', 'audio', 'source', 'track',
    
    // Interactive (limited)
    'button', 'input', 'label', 'select', 'option', 'textarea',
  ],
  ALLOWED_ATTR: [
    // Global attributes
    'id', 'class', 'style', 'title', 'lang', 'dir',
    
    // Links
    'href', 'target', 'rel', 'download', 'hreflang', 'type',
    
    // Images
    'src', 'alt', 'title', 'width', 'height', 'loading', 'decoding', 'srcset', 'sizes',
    
    // Media
    'controls', 'autoplay', 'loop', 'muted', 'poster', 'preload',
    'playsinline', 'webkit-playsinline',
    
    // Tables
    'colspan', 'rowspan', 'scope', 'headers',
    
    // Forms
    'name', 'value', 'checked', 'disabled', 'readonly', 'required',
    'placeholder', 'min', 'max', 'step', 'multiple', 'accept',
    
    // Iframe
    'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'sandbox',
    
    // Data attributes
    'data-*',
  ],
  ALLOW_DATA_ATTR: true,
  ADD_ATTR: ['target'],
  ADD_TAGS: ['iframe', 'video', 'audio', 'source'],
  FORBID_TAGS: ['script', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'oninput', 'onkeyup', 'onkeydown'],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  KEEP_CONTENT: true,
  USE_PROFILES: { html: true },
};

// Configuration for excerpts (more restrictive)
const excerptConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'span', 'mark', 'del', 'ins',
    'a', 'img',
  ],
  ALLOWED_ATTR: [
    'id', 'class', 'style', 'title',
    'href', 'target', 'rel',
    'src', 'alt', 'width', 'height',
  ],
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'video', 'audio', 'form', 'input', 'button', 'table'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  KEEP_CONTENT: true,
};

/**
 * Sanitize full article content for safe rendering
 * @param {string} content - Raw HTML content
 * @param {Object} options - Additional options
 * @returns {string} - Sanitized HTML content
 */
const sanitizeArticleContent = (content, options = {}) => {
  if (!content) return '';
  
  try {
    const config = { ...articleConfig, ...options };
    let sanitized = purify.sanitize(content, config);
    
    // Additional validation - ensure content isn't empty after sanitization
    if (!sanitized || sanitized.trim().length === 0) {
      return '<p><em>Content coming soon...</em></p>';
    }
    
    // Ensure paragraphs for text content
    const textOnly = sanitized.replace(/<[^>]*>/g, '').trim();
    if (textOnly && !sanitized.includes('<p>') && !sanitized.includes('<h') && !sanitized.includes('<div')) {
      sanitized = `<p>${sanitized}</p>`;
    }
    
    return sanitized;
  } catch (error) {
    console.error('Content sanitization error:', error);
    // Fallback: remove script tags and dangerous attributes
    const fallback = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/ on\w+="[^"]*"/gi, '')
      .replace(/ on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '');
    return fallback || '<p><em>Content coming soon...</em></p>';
  }
};

/**
 * Sanitize excerpt content (more restrictive)
 * @param {string} content - Raw HTML content
 * @param {Object} options - Additional options
 * @returns {string} - Sanitized HTML content
 */
const sanitizeExcerpt = (content, options = {}) => {
  if (!content) return '';
  
  try {
    const config = { ...excerptConfig, ...options };
    let sanitized = purify.sanitize(content, config);
    
    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Limit excerpt length (approx 200 characters of text)
    const textOnly = sanitized.replace(/<[^>]*>/g, '').trim();
    if (textOnly.length > 200) {
      const truncated = textOnly.substring(0, 200) + '...';
      // Try to keep formatting by wrapping in paragraphs
      return `<p>${truncated}</p>`;
    }
    
    return sanitized || '';
  } catch (error) {
    console.error('Excerpt sanitization error:', error);
    // Fallback: strip all HTML and truncate
    const fallback = content
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return fallback.length > 200 ? fallback.substring(0, 200) + '...' : fallback;
  }
};

/**
 * Get plain text from HTML content
 * @param {string} html - HTML content
 * @param {number} maxLength - Maximum length
 * @returns {string} - Plain text
 */
const getPlainText = (html, maxLength = 200) => {
  if (!html) return '';
  try {
    const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  } catch (error) {
    return '';
  }
};

/**
 * Sanitize and truncate content for SEO meta descriptions
 * @param {string} content - HTML content
 * @param {number} maxLength - Maximum length
 * @returns {string} - Plain text meta description
 */
const getMetaDescription = (content, maxLength = 160) => {
  return getPlainText(content, maxLength);
};

/**
 * Check if content has valid HTML structure
 * @param {string} content - HTML content
 * @returns {boolean} - True if valid
 */
const hasValidHtmlStructure = (content) => {
  if (!content) return false;
  
  // Check for basic HTML tags
  const hasTags = /<[a-z][\s\S]*>/i.test(content);
  
  // Check if it's just plain text without any HTML
  const textOnly = content.replace(/<[^>]*>/g, '').trim();
  if (textOnly && !hasTags) {
    return false; // Plain text without HTML tags
  }
  
  return true;
};

/**
 * Convert plain text to HTML paragraphs
 * @param {string} text - Plain text
 * @returns {string} - HTML with paragraphs
 */
const textToHtml = (text) => {
  if (!text) return '';
  
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length === 0) return `<p>${text}</p>`;
  
  return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
};

export {
  sanitizeArticleContent,
  sanitizeExcerpt,
  getPlainText,
  getMetaDescription,
  hasValidHtmlStructure,
  textToHtml,
};