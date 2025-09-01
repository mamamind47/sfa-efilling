import React from 'react';
import DOMPurify from 'dompurify';
import MarkdownPreview from '@uiw/react-markdown-preview';

/**
 * Utility functions for content rendering
 */

/**
 * Check if content is markdown
 * @param {string} content 
 * @returns {boolean}
 */
export const isMarkdownContent = (content) => {
  // Check for common markdown patterns
  const markdownRegex = /(\*\*|__|\*|_|#{1,6}\s|```|\[.*\]\(.*\)|^\s*[\*\-\+]\s|^\s*\d+\.\s)/m;
  return markdownRegex.test(content);
};

/**
 * Check if content contains HTML tags
 * @param {string} content 
 * @returns {boolean}
 */
export const isHtmlContent = (content) => {
  // Check for common HTML tags
  const htmlRegex = /<[^>]+>/;
  return htmlRegex.test(content);
};

/**
 * Render content as HTML (all content is now HTML from TinyMCE)
 * @param {string} content 
 * @returns {JSX.Element}
 */
export const renderContent = (content) => {
  if (!content) return null;

  // Check content type and render appropriately
  if (isMarkdownContent(content)) {
    // Render markdown content
    return (
      <div className="prose prose-lg max-w-none mb-8">
        <MarkdownPreview 
          source={content}
          style={{
            backgroundColor: 'transparent',
            color: '#374151',
            fontFamily: "'Sarabun', 'Sukhumvit Set', Arial, sans-serif"
          }}
        />
      </div>
    );
  } else if (isHtmlContent(content)) {
    // Render HTML content (legacy posts)
    const sanitizedContent = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });

    return (
      <div 
        className="prose prose-lg max-w-none mb-8"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        style={{
          color: '#374151',
          lineHeight: '1.75'
        }}
      />
    );
  } else {
    // Plain text content
    return (
      <div 
        className="prose prose-lg max-w-none mb-8"
        style={{
          color: '#374151',
          lineHeight: '1.75'
        }}
      >
        {content.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-4">{paragraph || '\u00A0'}</p>
        ))}
      </div>
    );
  }
};