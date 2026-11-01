'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface NtaPdfViewerProps {
  pdfUrl: string;
  currentQuestionNumber: number;
  startPage?: number;
  endPage?: number;
}

interface PdfJsViewport {
  width: number;
  height: number;
}

interface PdfJsRenderTask {
  promise: Promise<void>;
  cancel: () => void;
}

interface PdfJsPage {
  getViewport: (params: { scale: number }) => PdfJsViewport;
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfJsViewport;
  }) => PdfJsRenderTask;
}

interface PdfJsDoc {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
}

interface PdfJsLib {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (params: {
    url: string;
    cMapUrl?: string;
    cMapPacked?: boolean;
  }) => {
    promise: Promise<PdfJsDoc>;
  };
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

export function NtaPdfViewer({
  pdfUrl,
  currentQuestionNumber,
  startPage,
  endPage,
}: NtaPdfViewerProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(90);
  const [loading, setLoading] = useState<boolean>(true);
  const [useFallback, setUseFallback] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PdfJsDoc | null>(null);
  const renderTasksRef = useRef<PdfJsRenderTask[]>([]);

  // Smooth scroll up/down using the circular blue buttons
  const handleScrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: 140, behavior: 'smooth' });
    }
  };

  const handleScrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: -140, behavior: 'smooth' });
    }
  };

  // Load PDF.js library dynamically from CDN
  const loadPdfJs = useCallback((): Promise<PdfJsLib> => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;

      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          reject(new Error('PDF.js failed to initialize'));
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load PDF.js from CDN'));
      };

      document.head.appendChild(script);
    });
  }, []);

  // Render all pages continuously on canvases
  const renderAllPages = useCallback(
    async (pdf: PdfJsDoc, scaleMultiplier: number) => {
      if (!pagesContainerRef.current) return;
      const container = pagesContainerRef.current;

      // Cancel any ongoing render tasks
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel();
        } catch {
          // Ignore
        }
      });
      renderTasksRef.current = [];
      container.innerHTML = '';

      const pixelRatio = window.devicePixelRatio || 1;
      const baseScale = (scaleMultiplier / 100) * 0.85;

      const firstPage = Math.max(1, startPage || 1);
      const lastPage = Math.min(pdf.numPages, endPage || pdf.numPages);

      for (let pageNum = firstPage; pageNum <= lastPage; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: baseScale });

          const isDark =
            typeof document !== 'undefined' &&
            (document.documentElement.classList.contains('dark') ||
              document.documentElement.getAttribute('data-theme') === 'dark');

          const pageWrapper = document.createElement('div');
          pageWrapper.style.margin = '0 auto 10px auto';
          pageWrapper.style.boxShadow = isDark
            ? '0 4px 18px rgba(0,0,0,0.6)'
            : '0 1px 4px rgba(0,0,0,0.18)';
          pageWrapper.style.border = isDark ? '1px solid #334155' : '1px solid #cbd5e1';
          pageWrapper.style.borderRadius = '3px';
          pageWrapper.style.backgroundColor = '#ffffff';
          pageWrapper.style.width = `${viewport.width}px`;
          pageWrapper.style.maxWidth = '860px';
          pageWrapper.style.position = 'relative';

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width * pixelRatio;
          canvas.height = viewport.height * pixelRatio;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.maxWidth = '100%';
          canvas.style.display = 'block';

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(pixelRatio, pixelRatio);
            pageWrapper.appendChild(canvas);
            container.appendChild(pageWrapper);

            const renderTask = page.render({
              canvasContext: ctx,
              viewport: viewport,
            });
            renderTasksRef.current.push(renderTask);
            await renderTask.promise;
          }
        } catch (err: unknown) {
          const errorObj = err as { name?: string };
          if (errorObj?.name !== 'RenderingCancelledException') {
            console.warn(`Error rendering page ${pageNum}:`, err);
          }
        }
      }
    },
    [startPage, endPage]
  );

  useEffect(() => {
    let isCancelled = false;

    async function initPdf() {
      try {
        setLoading(true);
        const pdfjs = await loadPdfJs();
        if (isCancelled) return;

        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = pdf;
        setLoading(false);
        await renderAllPages(pdf, zoomLevel);
      } catch (err) {
        console.warn('PDF.js failed, switching to native embed fallback:', err);
        if (!isCancelled) {
          setUseFallback(true);
          setLoading(false);
        }
      }
    }

    initPdf();

    return () => {
      isCancelled = true;
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel();
        } catch {
          // Ignore
        }
      });
    };
  }, [pdfUrl, loadPdfJs, renderAllPages, zoomLevel]);

  // Re-render when zoom level changes
  useEffect(() => {
    if (pdfDocRef.current && !useFallback) {
      renderAllPages(pdfDocRef.current, zoomLevel);
    }
  }, [zoomLevel, renderAllPages, useFallback]);

  const firstPage = Math.max(1, startPage || 1);
  const fallbackUrl = `${pdfUrl}#page=${firstPage}&toolbar=0&navpanes=0&scrollbar=1&view=FitH`;

  return (
    <div className="nta-pdf-root w-full flex flex-col bg-white dark:bg-slate-900 border-b border-gray-300 dark:border-slate-800">
      {/* Top Question Info & Circular Blue Scroll Arrows Bar */}
      <div className="pdf-header-bar flex items-center justify-between px-3 py-1.5 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
        {/* Left: Question No : 1 */}
        <div className="question-num-text text-[15.5px] font-bold text-[#7f1d1d] dark:text-red-400 font-sans">
          Question No : {currentQuestionNumber}
        </div>

        {/* Right: Circular Blue Action Buttons (Down / Up Scroll) */}
        <div className="flex items-center gap-1.5">
          {/* Blue Circle with Down Arrow */}
          <button
            type="button"
            onClick={handleScrollDown}
            title="Scroll Question Down"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </button>

          {/* Blue Circle with Up Arrow */}
          <button
            type="button"
            onClick={handleScrollUp}
            title="Scroll Question Up"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>

          {/* Subtle Zoom Controls */}
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
              title="Zoom out"
              className="btn-zoom text-xs px-2 py-0.5 border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded cursor-pointer"
            >
              -
            </button>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 min-w-[32px] text-center font-mono font-semibold">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              title="Zoom in"
              className="btn-zoom text-xs px-2 py-0.5 border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* The Scrollable Embedded PDF Box */}
      <div
        ref={scrollContainerRef}
        className="pdf-scroll-box w-full overflow-y-auto overflow-x-auto relative bg-[#eef2f6] dark:bg-[#0b1120] border-t border-gray-200 dark:border-slate-800 p-2"
        style={{
          height: '380px',
          minHeight: '280px',
          maxHeight: '440px',
        }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-6">
            <div
              style={{
                width: '24px',
                height: '24px',
                border: '2.5px solid #1e4273',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '6px',
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Loading Question Paper...</span>
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {useFallback ? (
          <iframe
            src={fallbackUrl}
            className="w-full h-full border-none"
            title={`Question Paper - Question ${currentQuestionNumber}`}
            style={{ minHeight: '220px', width: '100%', maxWidth: '860px', margin: '0 auto', display: 'block', background: 'white' }}
          />
        ) : (
          <div
            ref={pagesContainerRef}
            className="w-full flex flex-col items-center"
            style={{ minHeight: '100%', maxWidth: '860px', margin: '0 auto' }}
          />
        )}
      </div>
    </div>
  );
}
