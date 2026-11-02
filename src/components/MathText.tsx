'use client';

import React, { useMemo, useState, useEffect } from 'react';

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
 * Normalizes LaTeX math strings to prevent common escaping & KaTeX syntax issues:
 * - Un-doubles backslashes (e.g. \\frac -> \frac, \\text -> \text)
 * - Decodes basic HTML entities like &nbsp;, &lt;, &gt;
 * - Preserves chemical formulas and matrix notations
 */
function cleanLatexMath(raw: string): string {
  let cleaned = raw.trim();

  // Normalize duplicate backslashes often introduced by JSON stringification
  // e.g. "\\text" -> "\text", "\\frac" -> "\frac"
  cleaned = cleaned.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // Replace common unicode approximations with LaTeX equivalents if needed
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  return cleaned;
}

/**
 * MathText renders text containing LaTeX math formulas:
 * - Block formulas: $$...$$ or \[...\]
 * - Inline formulas: $...$ or \(...\)
 * Automatically syncs with window.katex once the CDN script loads.
 */
export function MathText({ content, className = '' }: MathTextProps) {
  const [katexLoaded, setKatexLoaded] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(window.katex);
  });

  // Watch for window.katex CDN initialization
  useEffect(() => {
    if (katexLoaded || typeof window === 'undefined') return;

    if (window.katex) {
      setKatexLoaded(true);
      return;
    }

    const interval = setInterval(() => {
      if (window.katex) {
        setKatexLoaded(true);
        clearInterval(interval);
      }
    }, 120);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [katexLoaded]);

  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Regex to detect block math: $$...$$ or \[...\]
    // and inline math: $...$ (avoiding isolated currency signs) or \(...\)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?:\\\$|[^\$\n])+?\$|\\\(.+?\\\))/g;

    const parts = content.split(regex);

    return parts
      .map((part) => {
        if (!part) return '';

        let isBlock = false;
        let isInline = false;
        let mathContent = '';

        if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
          isBlock = true;
          mathContent = part.slice(2, -2).trim();
        } else if (part.startsWith('\\[') && part.endsWith('\\]') && part.length >= 4) {
          isBlock = true;
          mathContent = part.slice(2, -2).trim();
        } else if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
          isInline = true;
          mathContent = part.slice(1, -1).trim();
        } else if (part.startsWith('\\(') && part.endsWith('\\)') && part.length >= 4) {
          isInline = true;
          mathContent = part.slice(2, -2).trim();
        }

        if (isBlock || isInline) {
          const cleanedMath = cleanLatexMath(mathContent);

          if (katexLoaded && typeof window !== 'undefined' && window.katex) {
            try {
              const html = window.katex.renderToString(cleanedMath, {
                displayMode: isBlock,
                throwOnError: false,
              });
              if (isBlock) {
                return `<div class="katex-block-wrapper my-2 overflow-x-auto text-center">${html}</div>`;
              }
              return `<span class="katex-inline-wrapper mx-0.5 inline-block align-baseline">${html}</span>`;
            } catch {
              // fallback below
            }
          }

          // Resilient styled fallback if KaTeX is not yet loaded or threw error
          const escaped = cleanedMath
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          if (isBlock) {
            return `<div class="my-2 py-1 px-2.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-center text-xs sm:text-sm overflow-x-auto text-blue-900 dark:text-blue-300 border border-slate-200 dark:border-slate-700">${escaped}</div>`;
          }
          return `<span class="inline-block px-1 py-0.5 font-mono text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-blue-900 dark:text-blue-300 rounded mx-0.5 border border-slate-200/60 dark:border-slate-700/60">${escaped}</span>`;
        }

        // Regular text: sanitize & format bold and line breaks
        const sanitized = part
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br/>');

        return sanitized;
      })
      .join('');
  }, [content, katexLoaded]);

  if (!content) return null;

  return (
    <div
      className={`math-rendered-text leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
