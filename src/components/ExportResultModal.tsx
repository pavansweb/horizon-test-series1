'use client';

import React, { useState, useEffect } from 'react';
import { TestResult } from '@/lib/types';
import {
  generateAiMarkdownPrompt,
  generateRawJsonExport,
  triggerFileDownload,
  copyTextToClipboard,
} from '@/lib/exportResult';
import { StructuredScorecard } from '@/components/StructuredScorecard';

interface ExportResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TestResult;
  initialTab?: 'ai' | 'json' | 'report';
}

export function ExportResultModal({ isOpen, onClose, result, initialTab = 'ai' }: ExportResultModalProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'json' | 'report'>(initialTab);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const safeTitle = (result.testTitle || 'jee_mock_test').replace(/[^a-zA-Z0-9_-]/g, '_');

  const handleCopyAiPrompt = async () => {
    const md = generateAiMarkdownPrompt(result);
    const ok = await copyTextToClipboard(md);
    if (ok) {
      setCopiedType('ai');
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleDownloadAiMarkdown = () => {
    const md = generateAiMarkdownPrompt(result);
    triggerFileDownload(`${safeTitle}_ai_analysis.md`, md, 'text/markdown');
  };

  const handleCopyJson = async () => {
    const json = generateRawJsonExport(result);
    const ok = await copyTextToClipboard(json);
    if (ok) {
      setCopiedType('json');
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleDownloadJson = () => {
    const json = generateRawJsonExport(result);
    triggerFileDownload(`${safeTitle}_raw_data.json`, json, 'application/json');
  };

  const aiMarkdownPreview = generateAiMarkdownPrompt(result);
  const jsonPreview = generateRawJsonExport(result);

  const wrongCount = result.totalIncorrect;
  const correctCount = result.totalCorrect;
  const unattemptedCount = result.totalUnattempted;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl shadow-xs">
              📤
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Export Examination Results</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Export result for AI chat analysis, raw data backup, or structured scorecard.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`pb-3 px-3 border-b-2 cursor-pointer flex items-center gap-1.5 transition-all ${
              activeTab === 'ai'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>🤖 AI Analysis Prompt</span>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded-full">
              Recommended
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`pb-3 px-3 border-b-2 cursor-pointer flex items-center gap-1.5 transition-all ${
              activeTab === 'json'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>📦 Raw Data (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`pb-3 px-3 border-b-2 cursor-pointer flex items-center gap-1.5 transition-all ${
              activeTab === 'report'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>📊 Structured Scorecard</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: AI Prompt */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-blue-950 dark:text-blue-200">
                    Ready-to-Chat AI Performance Prompt
                  </h3>
                  <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                    Specially structured to paste into <strong>ChatGPT, Claude, Gemini, or Antigravity</strong>. 
                    Includes exact wrong questions, student choices, answer keys, solutions, and diagnostic prompt instructions.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyAiPrompt}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    {copiedType === 'ai' ? (
                      <>
                        <span className="text-sm">✓</span>
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        <span>Copy for AI Chat</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadAiMarkdown}
                    className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all"
                    title="Download as markdown file"
                  >
                    <span>⬇️</span>
                    <span>Download .md</span>
                  </button>
                </div>
              </div>

              {/* Quick Snapshot Badges */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 block">Wrong Questions</span>
                  <span className="text-lg font-black text-red-700 dark:text-red-300">{wrongCount}</span>
                  <span className="text-[10px] text-red-500 block">Included with solutions</span>
                </div>
                <div className="p-2.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-green-600 dark:text-green-400 block">Correct Questions</span>
                  <span className="text-lg font-black text-green-700 dark:text-green-300">{correctCount}</span>
                  <span className="text-[10px] text-green-500 block">Highlighted as strengths</span>
                </div>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Left / Unattempted</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-200">{unattemptedCount}</span>
                  <span className="text-[10px] text-slate-500 block">Flagged for time analysis</span>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  Export Preview (Markdown format):
                </span>
                <div className="bg-slate-900 text-slate-100 font-mono text-[11px] p-4 rounded-xl border border-slate-800 max-h-80 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
                  {aiMarkdownPreview}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Raw JSON */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Raw JSON Examination Dataset
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Full JSON document containing student responses, answer keys, time statistics, subject results, and all question reviews. Ideal for attaching as a file to an AI.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <span>⬇️</span>
                    <span>Download JSON File</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    {copiedType === 'json' ? (
                      <>
                        <span className="text-sm">✓</span>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* JSON Code Preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  Raw JSON Payload Preview:
                </span>
                <div className="bg-slate-900 text-emerald-400 font-mono text-[11px] p-4 rounded-xl border border-slate-800 max-h-80 overflow-y-auto whitespace-pre select-text leading-relaxed">
                  {jsonPreview}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Structured Scorecard Report (High-Res Image / Print / PDF) */}
          {activeTab === 'report' && (
            <StructuredScorecard result={result} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {activeTab === 'ai'
              ? 'Paste the copied prompt into ChatGPT, Claude, Gemini, or Antigravity for instant AI coaching.'
              : activeTab === 'json'
              ? 'Raw data can be processed by python scripts or attached to AI chats.'
              : 'Print or save as PDF for permanent offline records.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
