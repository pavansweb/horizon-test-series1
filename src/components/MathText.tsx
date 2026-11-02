'use client';

import React, { useMemo } from 'react';

declare global {
  interface Window {
    katex?: {
      renderToString: (tex: string, options?: { displayMode?: boolean; throwOnError?: boolean }) => string;
    };
  }
}

interface MathTextProps {
  content?: string;
  className?: string;
}

/**
 * MathText renders text containing LaTeX math formulas:
 * - Block formulas: $$...$$ or \[...\]
 * - Inline formulas: $...$ or \(...\)
 * Uses window.katex when available, with a resilient formatted fallback.
 */
export function MathText({ content, className = '' }: MathTextProps) {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Regex to detect block math: $$...$$ or \[...\]
    // and inline math: $...$ (avoiding isolated currency signs) or \(...\)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\(.+?\\\))/g;

    const parts = content.split(regex);

    return parts
      .map((part) => {
        if (!part) return '';

        let isBlock = false;
        let isInline = false;
        let mathContent = '';

        if (part.startsWith('$$') && part.endsWith('$$')) {
          isBlock = true;
          mathContent = part.slice(2, -2).trim();
        } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
          isBlock = true;
          mathContent = part.slice(2, -2).trim();
        } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          isInline = true;
          mathContent = part.slice(1, -1).trim();
        } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
          isInline = true;
          mathContent = part.slice(2, -2).trim();
        }

        if (isBlock || isInline) {
          if (typeof window !== 'undefined' && window.katex) {
            try {
              return window.katex.renderToString(mathContent, {
                displayMode: isBlock,
                throwOnError: false,
              });
            } catch {
              // fallback below
            }
          }
          // Styled fallback
          const escaped = mathContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          if (isBlock) {
            return `<div class="my-2 py-1 px-2.5 bg-slate-100 dark:bg-slate-800/80 rounded font-mono text-center text-sm overflow-x-auto text-blue-900 dark:text-blue-300">${escaped}</div>`;
          }
          return `<span class="inline-block px-1 py-0.2 font-mono text-sm bg-slate-100/80 dark:bg-slate-800/80 text-blue-900 dark:text-blue-300 rounded mx-0.5">${escaped}</span>`;
        }

        // Regular text: sanitize & format line breaks and bold
        const sanitized = part
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br/>');

        return sanitized;
      })
      .join('');
  }, [content]);

  if (!content) return null;

  return (
    <div
      className={`math-rendered-text leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
