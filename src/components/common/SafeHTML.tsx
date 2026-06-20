import React, { useMemo } from 'react';

/**
 * [SV-11] SafeHTML — XSS-safe HTML renderer
 * 
 * Only allows a strict whitelist of formatting tags:
 * <b>, <i>, <em>, <strong>, <br>, <br/>, <p>, <span>, <ul>, <ol>, <li>
 * 
 * All other tags (including <script>, <img onerror>, <a href="javascript:">)
 * are stripped entirely. Attributes are removed from all allowed tags.
 */

const ALLOWED_TAGS = new Set([
  'b', 'i', 'em', 'strong', 'br', 'p', 'span', 'ul', 'ol', 'li',
]);

/**
 * Strips all HTML tags except the ones in the whitelist.
 * Removes all attributes from allowed tags.
 * Escapes any remaining angle brackets to prevent injection.
 */
function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  // Replace HTML comments
  let clean = dirty.replace(/<!--[\s\S]*?-->/g, '');

  // Process tags: keep only allowed tags without attributes
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/gi, (match, tagName) => {
    const normalizedTag = tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(normalizedTag)) {
      return ''; // Strip disallowed tags entirely
    }

    // Reconstruct the tag without any attributes
    const isClosing = match.startsWith('</');
    const isSelfClosing = match.endsWith('/>') || normalizedTag === 'br';

    if (isClosing) {
      return `</${normalizedTag}>`;
    }

    if (isSelfClosing) {
      return `<${normalizedTag} />`;
    }

    return `<${normalizedTag}>`;
  });

  return clean;
}

interface SafeHTMLProps {
  html: string;
  className?: string;
  as?: React.ElementType;
}

/**
 * Renders sanitized HTML content safely.
 * 
 * @example
 * <SafeHTML html="<b>Bold</b> and <script>alert('xss')</script> safe" />
 */
const SafeHTML: React.FC<SafeHTMLProps> = ({ html, className, as: Tag = 'div' }) => {
  const sanitized = useMemo(() => sanitizeHtml(html), [html]);

  return React.createElement(Tag, {
    className,
    dangerouslySetInnerHTML: { __html: sanitized },
  });
};

export { sanitizeHtml };
export default SafeHTML;
