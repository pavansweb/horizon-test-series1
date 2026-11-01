'use client';

import React, { useState } from 'react';
import {
  ZoomInIcon,
  ZoomOutIcon,
  RotateCcwIcon,
  ExternalLinkIcon,
  MaximizeIcon,
} from '@/components/icons/Icons';

interface NtaPdfViewerProps {
  pdfUrl: string;
  currentQuestionNumber: number;
  subjectName: string;
  markingScheme: { correct: number; incorrect: number };
}

export function NtaPdfViewer({
  pdfUrl,
  currentQuestionNumber,
  subjectName,
  markingScheme,
}: NtaPdfViewerProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 70));
  const handleResetZoom = () => setZoomLevel(100);

  // Parameterized PDF URL with toolbar enabled
  const viewerUrl = `${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`;

  return (
    <div
      className={`flex flex-col bg-white border border-gray-300 rounded shadow-xs overflow-hidden transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 p-2 bg-gray-900/90 backdrop-blur-sm'
          : 'h-[58vh] sm:h-[62vh] min-h-[380px]'
      }`}
    >
      {/* Top Bar for Question Details and PDF Controls */}
      <div className="bg-[#e9ecef] border-b border-gray-300 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 select-none">
        {/* Question Header */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 text-sm sm:text-base">
            Question No. {currentQuestionNumber}
          </span>
          <span className="text-xs bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-medium border border-blue-200">
            {subjectName}
          </span>
          <span className="text-xs text-gray-600 hidden sm:inline">
            (Marking: <span className="text-green-700 font-bold">+{markingScheme.correct}</span>,{' '}
            <span className="text-red-700 font-bold">{markingScheme.incorrect}</span>)
          </span>
        </div>

        {/* PDF Viewer Tools */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200"
            title="Zoom Out"
          >
            <ZoomOutIcon className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-gray-700 w-10 text-center">
            {zoomLevel}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200"
            title="Zoom In"
          >
            <ZoomInIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 ml-0.5"
            title="Reset Zoom"
          >
            <RotateCcwIcon className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-gray-300 mx-1" />

          {/* Popout Link */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded text-gray-600 hover:text-blue-700 hover:bg-gray-200 inline-flex items-center gap-1 text-xs"
            title="Open PDF in new tab"
          >
            <ExternalLinkIcon className="w-4 h-4" />
          </a>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen PDF'}
          >
            <MaximizeIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Scrollable View Area */}
      <div className="flex-1 w-full bg-[#525659] overflow-auto relative">
        <div
          className="w-full h-full transition-transform origin-top flex items-center justify-center"
          style={{ transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none' }}
        >
          <iframe
            src={viewerUrl}
            className="w-full h-full border-none"
            title={`Question Paper PDF - Question ${currentQuestionNumber}`}
          />
        </div>
      </div>
    </div>
  );
}
