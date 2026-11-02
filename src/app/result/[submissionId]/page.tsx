'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TestResult, QuestionReviewItem } from '@/lib/types';
import {
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  BarChartIcon,
  ExternalLinkIcon,
} from '@/components/icons/Icons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MathText } from '@/components/MathText';

export default function ResultPage({
  params,
}: {
  params: { submissionId: string };
}) {
  const submissionId = params.submissionId;
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected question in palette review
  const [selectedQNumber, setSelectedQNumber] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'correct' | 'incorrect' | 'unattempted'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  useEffect(() => {
    async function loadResult() {
      try {
        setLoading(true);
        const res = await fetch(`/api/results/${submissionId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Submission result not found');
          return;
        }

        setResult(data.result);
        if (data.result?.questionReviews?.length > 0) {
          setSelectedQNumber(data.result.questionReviews[0].questionNumber);
        }
      } catch (err) {
        console.error('Error fetching result:', err);
        setError('Failed to fetch test results');
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [submissionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">Calculating Examination Results...</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">Grading answers against the official answer key</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-md max-w-md w-full text-center border border-gray-200 dark:border-slate-800">
          <AlertCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Result Unavailable</h2>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">{error || 'Could not find this submission'}</p>
          <Link
            href="/"
            className="inline-block w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold text-center transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) {
      return `${hours}h ${remMins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  // Find currently selected question review
  const selectedQuestion =
    result.questionReviews.find((q) => q.questionNumber === selectedQNumber) ||
    result.questionReviews[0];

  const handlePrevQuestion = () => {
    const idx = result.questionReviews.findIndex((q) => q.questionNumber === selectedQNumber);
    if (idx > 0) {
      setSelectedQNumber(result.questionReviews[idx - 1].questionNumber);
    }
  };

  const handleNextQuestion = () => {
    const idx = result.questionReviews.findIndex((q) => q.questionNumber === selectedQNumber);
    if (idx >= 0 && idx < result.questionReviews.length - 1) {
      setSelectedQNumber(result.questionReviews[idx + 1].questionNumber);
    }
  };

  // Filtered reviews for palette
  const filteredReviews = result.questionReviews.filter((item: QuestionReviewItem) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (subjectFilter !== 'all' && item.subjectId !== subjectFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans pb-16 overflow-y-auto">
      {/* 1. Top Header */}
      <header className="bg-[#1e3a8a] dark:bg-slate-900 text-white border-b border-blue-900 dark:border-slate-800 shadow-sm py-4 px-4 sm:px-6 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold tracking-widest text-blue-200 dark:text-blue-300 uppercase">
              Horizon-Test-series • Result Card
            </span>
            <h1 className="text-xl sm:text-2xl font-black">{result.testTitle}</h1>
            <p className="text-xs text-blue-200 dark:text-slate-400">
              Candidate: <span className="font-bold text-white">{result.candidateName}</span> • Submitted on{' '}
              {new Date(result.submittedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#paper-review-section"
              className="px-3.5 py-1.5 text-xs font-bold bg-blue-500 hover:bg-blue-400 text-white rounded shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>Verify Answers with PDF ↓</span>
            </a>
            <Link
              href="/"
              className="px-4 py-1.5 text-xs font-bold bg-white text-[#1e3a8a] hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:border dark:border-slate-700 rounded shadow-xs transition-all"
            >
              All Tests
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 space-y-6">
        {/* ========================================================================= */}
        {/* SECTION 1: RESULT AND PERFORMANCE ANALYSIS                                */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          {/* Overview Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Marks */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Total Marks</span>
              <div className="my-2">
                <span className="text-3xl sm:text-4xl font-black text-[#1e3a8a] dark:text-blue-400">
                  {result.totalScore}
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-bold text-lg"> / {result.maxScore}</span>
              </div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Score: {Math.round((result.totalScore / result.maxScore) * 100)}%
              </div>
            </div>

            {/* Card 2: Overall Accuracy */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Overall Accuracy</span>
              <div className="my-2">
                <span
                  className={`text-3xl sm:text-4xl font-black ${
                    result.overallAccuracy >= 75
                      ? 'text-green-600 dark:text-green-400'
                      : result.overallAccuracy >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {result.overallAccuracy}%
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {result.totalCorrect} of {result.totalAttempted} attempted correct
              </div>
            </div>

            {/* Card 3: Attempt Breakdown */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Attempt Summary</span>
              <div className="my-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                  {result.totalAttempted}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">/ {result.totalQuestions} questions</span>
              </div>
              <div className="flex items-center gap-3 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-green-600 dark:text-green-400 font-bold">✓ {result.totalCorrect} Correct</span>
                <span className="text-red-600 dark:text-red-400 font-bold">✗ {result.totalIncorrect} Wrong</span>
                <span className="text-slate-500 dark:text-slate-400 font-bold">○ {result.totalUnattempted} Left</span>
              </div>
            </div>

            {/* Card 4: Time Spent */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Time Taken</span>
              <div className="my-2 flex items-center gap-2">
                <ClockIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">
                  {formatDuration(result.timeTakenSeconds)}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Duration: {result.durationMinutes} minutes
              </div>
            </div>
          </div>

          {/* Subject-Wise Performance Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChartIcon className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                Subject-wise Performance Breakdown
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Subject</th>
                    <th className="p-3 text-center">Score</th>
                    <th className="p-3 text-center">Max Marks</th>
                    <th className="p-3 text-center">Attempted</th>
                    <th className="p-3 text-center text-green-700 dark:text-green-400">Correct</th>
                    <th className="p-3 text-center text-red-600 dark:text-red-400">Wrong</th>
                    <th className="p-3 text-center text-slate-500 dark:text-slate-400">Left</th>
                    <th className="p-3 text-center">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {result.subjectResults.map((sub) => (
                    <tr
                      key={sub.subjectId}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 font-medium transition-colors"
                    >
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{sub.subjectName}</td>
                      <td className="p-3 text-center font-black text-blue-900 dark:text-blue-400 text-base">{sub.score}</td>
                      <td className="p-3 text-center text-slate-600 dark:text-slate-400">{sub.maxScore}</td>
                      <td className="p-3 text-center text-slate-700 dark:text-slate-300">{sub.attempted} / {sub.totalQuestions}</td>
                      <td className="p-3 text-center font-bold text-green-700 dark:text-green-400">{sub.correct}</td>
                      <td className="p-3 text-center font-bold text-red-600 dark:text-red-400">{sub.incorrect}</td>
                      <td className="p-3 text-center text-slate-500 dark:text-slate-400">{sub.unattempted}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded font-bold text-xs ${
                            sub.accuracy >= 75
                              ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 dark:border dark:border-green-800'
                              : sub.accuracy >= 50
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border dark:border-amber-800'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 dark:border dark:border-red-800'
                          }`}
                        >
                          {sub.accuracy}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: SPLIT SCREEN (LEFT: WHOLE PDF FILE, RIGHT: QUESTION PALETTE)   */}
        {/* ========================================================================= */}
        <section id="paper-review-section" className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-1 border-b border-slate-300 dark:border-slate-800">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>📄 Full Question Paper &amp; Solutions Verification</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Left half displays the complete original PDF (with questions &amp; solutions); right half shows your response palette.
              </p>
            </div>
            {result.pdfUrl && (
              <a
                href={result.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors"
              >
                <span>Open Full PDF in New Tab</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Split Container: Left PDF (55%) + Right Question Palette (45%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* LEFT HALF: THE WHOLE PDF FILE */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-slate-100 dark:bg-slate-800/90 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span>📄</span>
                  <span>Complete Question Paper &amp; Detailed Solutions PDF</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Scroll freely to check questions &amp; solutions
                </span>
              </div>

              {result.pdfUrl ? (
                <div className="w-full bg-slate-900" style={{ height: '760px' }}>
                  <iframe
                    src={`${result.pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                    className="w-full h-full border-none"
                    title={`Complete Question Paper - ${result.testTitle}`}
                  />
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                  No PDF file available for this examination.
                </div>
              )}
            </div>

            {/* RIGHT HALF: QUESTION NUMBERS, STATUS & PALETTE */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              
              {/* Palette Card */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                {/* Palette Filters & Legend */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Question Palette ({filteredReviews.length})
                  </span>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`text-[11px] px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                        statusFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      All ({result.totalQuestions})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('correct')}
                      className={`text-[11px] px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                        statusFilter === 'correct'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50'
                      }`}
                    >
                      ✓ {result.totalCorrect}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('incorrect')}
                      className={`text-[11px] px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                        statusFilter === 'incorrect'
                          ? 'bg-red-600 text-white'
                          : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50'
                      }`}
                    >
                      ✗ {result.totalIncorrect}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('unattempted')}
                      className={`text-[11px] px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                        statusFilter === 'unattempted'
                          ? 'bg-slate-700 dark:bg-slate-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      ○ {result.totalUnattempted}
                    </button>
                  </div>
                </div>

                {/* Subject Filter Pills */}
                <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto text-xs border-b border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSubjectFilter('all')}
                    className={`px-2.5 py-0.5 rounded font-bold text-xs cursor-pointer whitespace-nowrap transition-colors ${
                      subjectFilter === 'all'
                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    All Subjects
                  </button>
                  {result.subjectResults.map((sub) => (
                    <button
                      key={sub.subjectId}
                      type="button"
                      onClick={() => setSubjectFilter(sub.subjectId)}
                      className={`px-2.5 py-0.5 rounded font-bold text-xs cursor-pointer whitespace-nowrap transition-colors ${
                        subjectFilter === sub.subjectId
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sub.subjectName}
                    </button>
                  ))}
                </div>

                {/* Palette Grid (Buttons 1..N) */}
                <div className="pt-3 max-h-[220px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5">
                    {filteredReviews.map((item) => {
                      const isSelected = item.questionNumber === selectedQNumber;
                      let bgClass = 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700';
                      if (item.status === 'correct') {
                        bgClass = 'bg-green-600 text-white border-green-700 hover:bg-green-700';
                      } else if (item.status === 'incorrect') {
                        bgClass = 'bg-red-600 text-white border-red-700 hover:bg-red-700';
                      }

                      return (
                        <button
                          key={item.questionNumber}
                          type="button"
                          onClick={() => setSelectedQNumber(item.questionNumber)}
                          className={`h-8 rounded font-bold text-xs border flex items-center justify-center cursor-pointer transition-all ${bgClass} ${
                            isSelected
                              ? 'ring-3 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900 scale-105 shadow-md z-10'
                              : 'shadow-2xs'
                          }`}
                          title={`Q.${item.questionNumber} - ${item.status.toUpperCase()}`}
                        >
                          {item.questionNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legend indicator */}
                <div className="flex items-center justify-center gap-4 text-[11px] pt-3 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 mt-3">
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Correct (+4)
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Wrong (-1)
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" /> Left (0)
                  </span>
                </div>
              </div>

              {/* Selected Question Detailed Inspection Card */}
              {selectedQuestion && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col gap-3">
                  {/* Card Header: Q Number, Subject & Status Pill */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-slate-900 dark:text-slate-100">
                        Q.{selectedQuestion.questionNumber}
                      </span>
                      <span className="text-xs uppercase font-extrabold bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        {selectedQuestion.subjectName}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {selectedQuestion.status === 'correct' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/60 px-2.5 py-0.5 rounded-full border border-green-300 dark:border-green-800">
                          <CheckCircleIcon className="w-3.5 h-3.5" /> Correct (+{selectedQuestion.marksAwarded} Marks)
                        </span>
                      ) : selectedQuestion.status === 'incorrect' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-300 dark:border-red-800">
                          <XCircleIcon className="w-3.5 h-3.5" /> Wrong ({selectedQuestion.marksAwarded} Marks)
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700">
                          Left / Unattempted (0 Marks)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Answers Comparison Box */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Candidate's answer */}
                    <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                        Your Marked Response
                      </span>
                      <span
                        className={`font-black text-base ${
                          selectedQuestion.selectedOption
                            ? selectedQuestion.isCorrect
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                            : 'text-slate-400 dark:text-slate-500 italic'
                        }`}
                      >
                        {selectedQuestion.selectedOption
                          ? /^[A-D]$/i.test(selectedQuestion.selectedOption)
                            ? `Option (${selectedQuestion.selectedOption.toUpperCase()})`
                            : `Value: ${selectedQuestion.selectedOption}`
                          : 'Not Attempted'}
                      </span>
                    </div>

                    {/* Official Key */}
                    <div className="p-3 rounded-lg border bg-green-50/60 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                      <span className="text-[10px] font-bold uppercase text-green-800 dark:text-green-300 block mb-1">
                        Official Correct Key
                      </span>
                      <span className="font-black text-base text-green-800 dark:text-green-400">
                        {selectedQuestion.correctOption
                          ? /^[A-D]$/i.test(selectedQuestion.correctOption)
                            ? `Option (${selectedQuestion.correctOption.toUpperCase()})`
                            : `Value: ${selectedQuestion.correctOption}`
                          : 'Pending Key'}
                      </span>
                    </div>
                  </div>

                  {/* Render Question Text if parsed */}
                  {selectedQuestion.questionText && (
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed max-h-56 overflow-y-auto">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1 text-xs uppercase tracking-wide">
                        Question Statement:
                      </span>
                      <MathText content={selectedQuestion.questionText} />
                    </div>
                  )}

                  {/* Diagram / Image if attached */}
                  {selectedQuestion.imageUrl && (
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-center">
                      <img
                        src={selectedQuestion.imageUrl}
                        alt={`Question ${selectedQuestion.questionNumber} diagram`}
                        className="max-h-56 max-w-full object-contain rounded"
                      />
                    </div>
                  )}

                  {/* Render Options if available */}
                  {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                        Options:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {selectedQuestion.options.map((opt) => {
                          const isCand = selectedQuestion.selectedOption?.toUpperCase() === opt.id.toUpperCase();
                          const isCorr = selectedQuestion.correctOption?.toUpperCase() === opt.id.toUpperCase();
                          let borderClass = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70';
                          if (isCorr) {
                            borderClass = 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                          } else if (isCand && !isCorr) {
                            borderClass = 'border-red-400 bg-red-50/70 dark:bg-red-950/40 text-red-900 dark:text-red-200';
                          }

                          return (
                            <div key={opt.id} className={`p-2.5 rounded-lg border flex items-start gap-2 ${borderClass}`}>
                              <span className="font-bold uppercase shrink-0">({opt.id})</span>
                              <div className="flex-1">
                                <MathText content={opt.text} />
                              </div>
                              {isCorr && <span className="text-emerald-600 font-bold text-xs shrink-0">✓ Key</span>}
                              {isCand && !isCorr && <span className="text-red-600 font-bold text-xs shrink-0">✗ Your Choice</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Render Solution / Explanation if available */}
                  {selectedQuestion.solution && (
                    <div className="p-3.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 leading-relaxed max-h-56 overflow-y-auto">
                      <span className="font-bold text-blue-950 dark:text-blue-200 block mb-1 flex items-center gap-1.5">
                        <span>💡</span>
                        <span>Step-by-Step Solution / Explanation:</span>
                      </span>
                      <MathText content={selectedQuestion.solution} />
                    </div>
                  )}

                  {/* Prev / Next Navigation in Palette */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={handlePrevQuestion}
                      className="px-3 py-1.5 rounded font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
                    >
                      ← Previous Question
                    </button>
                    <span className="text-slate-400 dark:text-slate-500 font-semibold">
                      Q.{selectedQuestion.questionNumber} of {result.totalQuestions}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="px-3 py-1.5 rounded font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
                    >
                      Next Question →
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
