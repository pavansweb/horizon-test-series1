'use client';

import React, { useState, useRef } from 'react';
import { UploadIcon } from '@/components/icons/Icons';

interface ReplacePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  testId: string;
  testTitle: string;
  onPdfReplaced: () => void;
}

export function ReplacePdfModal({
  isOpen,
  onClose,
  testId,
  testTitle,
  onPdfReplaced,
}: ReplacePdfModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are supported.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('pdf', selectedFile);

      const res = await fetch(`/api/admin/tests/${testId}/pdf`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to replace PDF file.');
        return;
      }

      onPdfReplaced();
      onClose();
    } catch (err) {
      console.error('Error uploading replacement PDF:', err);
      setError('Network error while uploading PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-300 overflow-hidden">
        <div className="bg-[#1e3a8a] text-white px-5 py-3 flex items-center justify-between">
          <h2 className="font-bold text-base">Replace Question Paper PDF</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-600">
            Select a new question paper PDF for <strong>{testTitle}</strong>. The existing PDF will be safely replaced.
          </p>

          {/* File Input Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-lg p-6 text-center cursor-pointer transition-all bg-gray-50 hover:bg-blue-50/50"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <UploadIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <span className="text-xs font-bold text-blue-700 block mb-1">
              {selectedFile ? selectedFile.name : 'Click to select new PDF'}
            </span>
            <span className="text-[11px] text-gray-500">
              {selectedFile
                ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                : 'JEE Main Question Paper PDF'}
            </span>
          </div>

          {error && <div className="text-xs text-red-600 font-medium">{error}</div>}
        </div>

        <div className="bg-gray-100 px-5 py-3 border-t border-gray-300 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
            className="px-5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 rounded transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            {isUploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <span>Upload & Replace</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
