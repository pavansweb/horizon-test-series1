'use client';

import React, { useRef, useState } from 'react';
import { TestResult } from '@/lib/types';
import { toPng, toBlob } from 'html-to-image';

interface StructuredScorecardProps {
  result: TestResult;
  onClose?: () => void;
}

function formatDuration(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours > 0) {
    return `${hours}h ${remMins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

export function StructuredScorecard({ result }: StructuredScorecardProps) {
  const scorecardRef = useRef<HTMLDivElement>(null);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
  const [copyImageSuccess, setCopyImageSuccess] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const safeTitle = (result.testTitle || 'jee_mock_test').replace(/[^a-zA-Z0-9_-]/g, '_');
  const scorePercent = ((result.totalScore / result.maxScore) * 100).toFixed(1);
  const submittedDate = result.submittedAt ? new Date(result.submittedAt).toLocaleDateString() : 'N/A';
  const submittedTime = result.submittedAt ? new Date(result.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const wrongQuestions = result.questionReviews.filter((q) => q.status === 'incorrect');

  // Download high-resolution PNG image
  const handleDownloadImage = async () => {
    if (!scorecardRef.current) return;
    try {
      setIsExportingImage(true);
      const dataUrl = await toPng(scorecardRef.current, {
        quality: 0.98,
        pixelRatio: 2, // 2x high resolution for retina screens
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `${safeTitle}_scorecard.png`;
      link.href = dataUrl;
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export scorecard image:', err);
      alert('Failed to generate image. Please use Print / Save as PDF as an alternative.');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Copy high-resolution image to clipboard
  const handleCopyImage = async () => {
    if (!scorecardRef.current) return;
    try {
      setIsExportingImage(true);
      const blob = await toBlob(scorecardRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopyImageSuccess(true);
        setTimeout(() => setCopyImageSuccess(false), 2500);
      } else {
        alert('Direct image copy to clipboard is not supported in this browser. Please use Download PNG.');
      }
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
      alert('Could not copy image to clipboard. Please download the PNG image instead.');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Divide question reviews by subject
  const physicsReviews = result.questionReviews.filter((q) => q.subjectId.toLowerCase() === 'physics');
  const chemReviews = result.questionReviews.filter((q) => q.subjectId.toLowerCase() === 'chemistry');
  const mathReviews = result.questionReviews.filter((q) => q.subjectId.toLowerCase() === 'mathematics');

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Export Scorecard Options:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Image Button */}
          <button
            type="button"
            disabled={isExportingImage}
            onClick={handleDownloadImage}
            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-lg shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            title="Download high resolution PNG image of this scorecard"
          >
            {isExportingImage ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Image...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <span>✓</span>
                <span>Saved Image!</span>
              </>
            ) : (
              <>
                <span>📸</span>
                <span>Download PNG Image</span>
              </>
            )}
          </button>

          {/* Copy Image Button */}
          <button
            type="button"
            disabled={isExportingImage}
            onClick={handleCopyImage}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs rounded-lg shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all"
            title="Copy image directly to clipboard to paste into WhatsApp, Telegram, or chat"
          >
            {copyImageSuccess ? (
              <>
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="text-emerald-700 dark:text-emerald-400">Copied Image!</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Copy Image</span>
              </>
            )}
          </button>

          {/* Print / Save PDF Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <span>🖨️</span>
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Structured Scorecard Canvas (Captured by html-to-image) */}
      <div
        ref={scorecardRef}
        className="bg-white text-slate-900 border-2 border-slate-300 rounded-2xl p-6 sm:p-8 space-y-6 shadow-md max-w-4xl mx-auto font-sans"
        style={{ minWidth: '320px', backgroundColor: '#ffffff', color: '#0f172a' }}
      >
        {/* 1. Header with NTA-style official branding */}
        <div className="border-b-2 border-blue-900 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-800 to-indigo-900 text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                  NATIONAL TESTING AGENCY (NTA) PATTERN
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  CBT EXAMINATION
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-blue-950 mt-0.5 tracking-tight">
                Joint Entrance Examination (Main) • Scorecard
              </h1>
              <p className="text-xs text-slate-600 font-semibold">
                Horizon-Test-series Official Candidate Evaluation &amp; Performance Report
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right shrink-0 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
              STATUS: EVALUATED
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 block">
              ID: #{result.submissionId.slice(0, 10).toUpperCase()}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {submittedDate} • {submittedTime}
            </span>
          </div>
        </div>

        {/* 2. Candidate & Examination Details Table */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Candidate Name</span>
            <span className="font-black text-sm text-slate-900 truncate block">
              {result.candidateName || 'JEE Aspirant'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Test Paper</span>
            <span className="font-bold text-xs text-blue-900 truncate block" title={result.testTitle}>
              {result.testTitle}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Time Utilized</span>
            <span className="font-bold text-xs text-slate-900 font-mono block">
              {formatDuration(result.timeTakenSeconds)} / {result.durationMinutes}m
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Marking Scheme</span>
            <span className="font-bold text-xs text-slate-700 block">
              +4 (Correct) • -1 (Wrong)
            </span>
          </div>
        </div>

        {/* 3. Hero Performance Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Total Marks */}
          <div className="p-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/40 text-center flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">
              Aggregate Score
            </span>
            <div className="my-1.5">
              <span className="text-3xl sm:text-4xl font-black text-blue-950 font-sans">
                {result.totalScore}
              </span>
              <span className="text-sm font-bold text-slate-500"> / {result.maxScore}</span>
            </div>
            <span className="text-[11px] font-extrabold text-blue-700 bg-blue-100/80 py-0.5 px-2 rounded-full mx-auto">
              Percentage: {scorePercent}%
            </span>
          </div>

          {/* Card 2: Overall Accuracy */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/40 text-center flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
              Accuracy Rate
            </span>
            <div className="my-1.5">
              <span
                className={`text-3xl sm:text-4xl font-black ${
                  result.overallAccuracy >= 75
                    ? 'text-emerald-700'
                    : result.overallAccuracy >= 50
                    ? 'text-amber-700'
                    : 'text-red-700'
                }`}
              >
                {result.overallAccuracy}%
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800">
              {result.totalCorrect} of {result.totalAttempted} right
            </span>
          </div>

          {/* Card 3: Attempt Breakdown */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Questions Attempted
            </span>
            <div className="my-1.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900">
                {result.totalAttempted}
              </span>
              <span className="text-sm font-bold text-slate-500"> / {result.totalQuestions}</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-600">
              Coverage: {Math.round((result.totalAttempted / result.totalQuestions) * 100)}%
            </span>
          </div>

          {/* Card 4: Negative Marking Loss */}
          <div className="p-4 rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50/40 text-center flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 block">
              Negative Penalty
            </span>
            <div className="my-1.5">
              <span className="text-3xl sm:text-4xl font-black text-red-600 font-sans">
                -{result.totalIncorrect}
              </span>
              <span className="text-xs font-bold text-red-500 block">Marks Lost</span>
            </div>
            <span className="text-[10px] font-bold text-red-700 bg-red-100 py-0.5 px-2 rounded-full mx-auto">
              {result.totalIncorrect} Wrong Responses
            </span>
          </div>
        </div>

        {/* 4. Subject-Wise Performance Table & Progress Bars */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-800">
              Subject-Wise Performance &amp; Accuracy Breakdown
            </h3>
            <span className="text-[10px] font-semibold text-slate-500">
              Standard: 100 Marks per Subject
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5">Subject</th>
                  <th className="p-2.5 text-center">Score</th>
                  <th className="p-2.5 text-center">Attempted</th>
                  <th className="p-2.5 text-center text-emerald-700">Correct (+4)</th>
                  <th className="p-2.5 text-center text-red-600">Incorrect (-1)</th>
                  <th className="p-2.5 text-center text-slate-500">Left (0)</th>
                  <th className="p-2.5 text-center">Accuracy</th>
                  <th className="p-2.5 w-32">Performance Meter</th>
                </tr>
              </thead>
              <tbody>
                {result.subjectResults.map((sub) => {
                  const subScorePercent = Math.max(0, Math.min(100, (sub.score / sub.maxScore) * 100));
                  return (
                    <tr key={sub.subjectId} className="border-b border-slate-100 font-medium">
                      <td className="p-2.5 font-bold text-slate-900">{sub.subjectName}</td>
                      <td className="p-2.5 text-center font-black text-blue-900 text-sm">
                        {sub.score} <span className="text-[10px] text-slate-500 font-normal">/ {sub.maxScore}</span>
                      </td>
                      <td className="p-2.5 text-center text-slate-700">
                        {sub.attempted} / {sub.totalQuestions}
                      </td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">{sub.correct}</td>
                      <td className="p-2.5 text-center font-bold text-red-600">{sub.incorrect}</td>
                      <td className="p-2.5 text-center text-slate-500">{sub.unattempted}</td>
                      <td className="p-2.5 text-center font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            sub.accuracy >= 75
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.accuracy >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sub.accuracy}%
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sub.accuracy >= 75
                                ? 'bg-emerald-500'
                                : sub.accuracy >= 50
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${subScorePercent}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Total Row */}
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <td className="p-2.5 font-black text-slate-900">Total Aggregate</td>
                  <td className="p-2.5 text-center font-black text-blue-950 text-base">
                    {result.totalScore} <span className="text-xs text-slate-500">/ {result.maxScore}</span>
                  </td>
                  <td className="p-2.5 text-center text-slate-800 font-black">
                    {result.totalAttempted} / {result.totalQuestions}
                  </td>
                  <td className="p-2.5 text-center font-black text-emerald-700">{result.totalCorrect}</td>
                  <td className="p-2.5 text-center font-black text-red-600">{result.totalIncorrect}</td>
                  <td className="p-2.5 text-center font-black text-slate-600">{result.totalUnattempted}</td>
                  <td className="p-2.5 text-center font-black text-slate-900 text-sm">
                    {result.overallAccuracy}%
                  </td>
                  <td className="p-2.5 font-semibold text-[10px] text-slate-500">
                    Grand Total
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Complete 75-Question Performance Matrix (Divided by Subject) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-800">
              Complete Question Performance Grid ({result.totalQuestions} Questions)
            </h3>
            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-3 h-3 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[8px]">✓</span>
                <span>Correct (+4)</span>
              </span>
              <span className="flex items-center gap-1.5 text-red-700">
                <span className="w-3 h-3 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px]">✗</span>
                <span>Wrong (-1)</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-3 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[8px]">○</span>
                <span>Left (0)</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Physics Block */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <span className="font-extrabold text-[11px] text-blue-900 uppercase block mb-2">
                Physics (Q1–Q25)
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {physicsReviews.map((q) => {
                  let badge = 'bg-slate-200 text-slate-700 border-slate-300';
                  let symbol = '○';
                  if (q.status === 'correct') {
                    badge = 'bg-emerald-600 text-white border-emerald-700';
                    symbol = '✓';
                  } else if (q.status === 'incorrect') {
                    badge = 'bg-red-600 text-white border-red-700';
                    symbol = '✗';
                  }
                  return (
                    <div
                      key={q.questionNumber}
                      className={`h-7 rounded-md border text-[11px] font-black flex items-center justify-center gap-0.5 ${badge}`}
                      title={`Q${q.questionNumber}: ${q.status.toUpperCase()}`}
                    >
                      <span>{q.questionNumber}</span>
                      <span className="text-[8px] opacity-80">{symbol}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chemistry Block */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <span className="font-extrabold text-[11px] text-blue-900 uppercase block mb-2">
                Chemistry (Q26–Q50)
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {chemReviews.map((q) => {
                  let badge = 'bg-slate-200 text-slate-700 border-slate-300';
                  let symbol = '○';
                  if (q.status === 'correct') {
                    badge = 'bg-emerald-600 text-white border-emerald-700';
                    symbol = '✓';
                  } else if (q.status === 'incorrect') {
                    badge = 'bg-red-600 text-white border-red-700';
                    symbol = '✗';
                  }
                  return (
                    <div
                      key={q.questionNumber}
                      className={`h-7 rounded-md border text-[11px] font-black flex items-center justify-center gap-0.5 ${badge}`}
                      title={`Q${q.questionNumber}: ${q.status.toUpperCase()}`}
                    >
                      <span>{q.questionNumber}</span>
                      <span className="text-[8px] opacity-80">{symbol}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mathematics Block */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <span className="font-extrabold text-[11px] text-blue-900 uppercase block mb-2">
                Mathematics (Q51–Q75)
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {mathReviews.map((q) => {
                  let badge = 'bg-slate-200 text-slate-700 border-slate-300';
                  let symbol = '○';
                  if (q.status === 'correct') {
                    badge = 'bg-emerald-600 text-white border-emerald-700';
                    symbol = '✓';
                  } else if (q.status === 'incorrect') {
                    badge = 'bg-red-600 text-white border-red-700';
                    symbol = '✗';
                  }
                  return (
                    <div
                      key={q.questionNumber}
                      className={`h-7 rounded-md border text-[11px] font-black flex items-center justify-center gap-0.5 ${badge}`}
                      title={`Q${q.questionNumber}: ${q.status.toUpperCase()}`}
                    >
                      <span>{q.questionNumber}</span>
                      <span className="text-[8px] opacity-80">{symbol}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 6. Diagnostic Highlights & Actionable Advice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          {/* Wrong Questions Target List */}
          <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl">
            <span className="font-black text-red-900 uppercase text-[10px] block mb-1">
              ⚠️ Immediate Revision Required ({wrongQuestions.length} Questions)
            </span>
            {wrongQuestions.length > 0 ? (
              <p className="text-red-800 leading-relaxed text-[11px]">
                Questions answered incorrectly resulting in -1 penalty:{' '}
                <span className="font-mono font-bold">
                  {wrongQuestions.map((q) => `Q${q.questionNumber}`).join(', ')}
                </span>
                . Analyze the root cause before attempting the next paper.
              </p>
            ) : (
              <p className="text-emerald-800 text-[11px] font-bold">
                ✓ 0 wrong answers! Zero negative marking penalty incurred.
              </p>
            )}
          </div>

          {/* Test Strategy Advice */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
            <span className="font-black text-blue-900 uppercase text-[10px] block mb-1">
              💡 Test Taking Strategy Insight
            </span>
            <p className="text-blue-900 leading-relaxed text-[11px]">
              Accuracy is <span className="font-bold">{result.overallAccuracy}%</span> across{' '}
              <span className="font-bold">{result.totalAttempted}</span> attempts. Eliminating the{' '}
              <span className="font-bold text-red-600">{result.totalIncorrect} negative marking traps</span>{' '}
              would immediately boost your score from <span className="font-bold text-blue-800">{result.totalScore}</span> to{' '}
              <span className="font-bold text-emerald-700">
                {result.totalScore + result.totalIncorrect * 5} marks
              </span>.
            </p>
          </div>
        </div>

        {/* 7. Footer Seal & Verification */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-medium">
          <span>
            Joint Entrance Examination (Main) Simulator • Horizon-Test-series
          </span>
          <span className="font-mono">
            Verification Hash: {result.submissionId}
          </span>
        </div>
      </div>
    </div>
  );
}
