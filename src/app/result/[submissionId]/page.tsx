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

export default function ResultPage({
  params,
}: {
  params: { submissionId: string };
}) {
  const submissionId = params.submissionId;
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for question review
  const [statusFilter, setStatusFilter] = useState<'all' | 'correct' | 'incorrect' | 'unattempted'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [showPdfSide, setShowPdfSide] = useState<boolean>(false);

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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-gray-800">Calculating Examination Results...</h2>
        <p className="text-sm text-gray-500">Grading answers against the official answer key</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center border border-gray-200">
          <AlertCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Result Unavailable</h2>
          <p className="text-sm text-gray-600 mb-4">{error || 'Could not find this submission'}</p>
          <Link
            href="/"
            className="inline-block w-full py-2 bg-blue-700 text-white rounded font-bold hover:bg-blue-800 text-center"
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

  // Filter question reviews
  const filteredReviews = result.questionReviews.filter((item: QuestionReviewItem) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (subjectFilter !== 'all' && item.subjectId !== subjectFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans pb-12">
      {/* Top Header */}
      <header className="bg-[#1e3a8a] text-white border-b border-blue-900 shadow-sm py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold tracking-widest text-blue-200 uppercase">
              JEE (Main) Mock Test Result Card
            </span>
            <h1 className="text-xl sm:text-2xl font-black">{result.testTitle}</h1>
            <p className="text-xs text-blue-200">
              Candidate: {result.candidateName} • Submitted on{' '}
              {new Date(result.submittedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPdfSide(!showPdfSide)}
              className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded border border-white/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              <ExternalLinkIcon className="w-3.5 h-3.5" />
              <span>{showPdfSide ? 'Hide Question Paper' : 'View Question Paper'}</span>
            </button>
            <Link
              href="/"
              className="px-4 py-1.5 text-xs font-bold bg-white text-[#1e3a8a] hover:bg-blue-50 rounded shadow-xs transition-all"
            >
              All Tests
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 space-y-6">
        {/* PDF Popout / Collapsible Split View */}
        {showPdfSide && (
          <div className="bg-white border border-gray-300 rounded-lg shadow-md p-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-2">
              <span className="font-bold text-sm text-gray-800">
                Question Paper Reference: {result.testTitle}
              </span>
              <a
                href={result.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
              >
                Open in new tab <ExternalLinkIcon className="w-3 h-3" />
              </a>
            </div>
            <iframe
              src={`${result.pdfUrl}#toolbar=1&navpanes=0`}
              className="w-full h-[500px] border rounded"
              title="Question Paper PDF"
            />
          </div>
        )}

        {/* Overview Score Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Marks */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">Total Marks</span>
            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#1e3a8a]">
                {result.totalScore}
              </span>
              <span className="text-gray-400 font-bold text-lg"> / {result.maxScore}</span>
            </div>
            <div className="text-xs font-medium text-gray-600">
              Percentage: {Math.round((result.totalScore / result.maxScore) * 100)}%
            </div>
          </div>

          {/* Card 2: Overall Accuracy */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">Overall Accuracy</span>
            <div className="my-2">
              <span
                className={`text-3xl sm:text-4xl font-extrabold ${
                  result.overallAccuracy >= 75
                    ? 'text-green-600'
                    : result.overallAccuracy >= 50
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {result.overallAccuracy}%
              </span>
            </div>
            <div className="text-xs font-medium text-gray-600">
              {result.totalCorrect} of {result.totalAttempted} attempted correct
            </div>
          </div>

          {/* Card 3: Attempt Breakdown */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">Attempt Summary</span>
            <div className="my-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-800">
                {result.totalAttempted}
              </span>
              <span className="text-xs text-gray-500">/ {result.totalQuestions} questions</span>
            </div>
            <div className="flex items-center gap-3 text-xs pt-1 border-t border-gray-100">
              <span className="text-green-600 font-bold">✓ {result.totalCorrect}</span>
              <span className="text-red-600 font-bold">✗ {result.totalIncorrect}</span>
              <span className="text-gray-500 font-bold">○ {result.totalUnattempted}</span>
            </div>
          </div>

          {/* Card 4: Time Spent */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold uppercase text-gray-500">Time Taken</span>
            <div className="my-2 flex items-center gap-2">
              <ClockIcon className="w-6 h-6 text-blue-600 shrink-0" />
              <span className="text-xl sm:text-2xl font-bold font-mono text-gray-800">
                {formatDuration(result.timeTakenSeconds)}
              </span>
            </div>
            <div className="text-xs font-medium text-gray-600">
              Allotted: {result.durationMinutes} minutes
            </div>
          </div>
        </div>

        {/* Subject-Wise Performance Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-xs p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChartIcon className="w-5 h-5 text-blue-700" />
            <h2 className="font-bold text-base sm:text-lg text-gray-900">
              Subject-wise Performance Breakdown
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                  <th className="p-3">Subject</th>
                  <th className="p-3 text-center">Score</th>
                  <th className="p-3 text-center">Max Marks</th>
                  <th className="p-3 text-center">Attempted</th>
                  <th className="p-3 text-center text-green-700">Correct</th>
                  <th className="p-3 text-center text-red-600">Incorrect</th>
                  <th className="p-3 text-center text-gray-500">Unattempted</th>
                  <th className="p-3 text-center">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {result.subjectResults.map((sub) => (
                  <tr key={sub.subjectId} className="border-b border-gray-100 hover:bg-gray-50 font-medium">
                    <td className="p-3 font-bold text-gray-900">{sub.subjectName}</td>
                    <td className="p-3 text-center font-extrabold text-blue-900 text-base">{sub.score}</td>
                    <td className="p-3 text-center text-gray-600">{sub.maxScore}</td>
                    <td className="p-3 text-center">{sub.attempted} / {sub.totalQuestions}</td>
                    <td className="p-3 text-center font-bold text-green-700">{sub.correct}</td>
                    <td className="p-3 text-center font-bold text-red-600">{sub.incorrect}</td>
                    <td className="p-3 text-center text-gray-500">{sub.unattempted}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                          sub.accuracy >= 75
                            ? 'bg-green-100 text-green-800'
                            : sub.accuracy >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
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

        {/* Detailed Question Review Table & Filtering */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-xs p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-base sm:text-lg text-gray-900">
              Question-wise Detailed Review ({filteredReviews.length} of {result.totalQuestions})
            </h2>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-gray-500 mr-1">Filter:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({result.totalQuestions})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('correct')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                  statusFilter === 'correct'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-green-700 hover:bg-green-50'
                }`}
              >
                Correct ({result.totalCorrect})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('incorrect')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                  statusFilter === 'incorrect'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-red-600 hover:bg-red-50'
                }`}
              >
                Incorrect ({result.totalIncorrect})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unattempted')}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                  statusFilter === 'unattempted'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Left ({result.totalUnattempted})
              </button>
            </div>
          </div>

          {/* Subject Filter Tabs */}
          <div className="flex items-center gap-1 mb-4 border-b border-gray-200 pb-2">
            <button
              onClick={() => setSubjectFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded cursor-pointer ${
                subjectFilter === 'all'
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Subjects
            </button>
            {result.subjectResults.map((sub) => (
              <button
                key={sub.subjectId}
                onClick={() => setSubjectFilter(sub.subjectId)}
                className={`px-3 py-1 text-xs font-bold rounded cursor-pointer ${
                  subjectFilter === sub.subjectId
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {sub.subjectName}
              </button>
            ))}
          </div>

          {/* Question Grid / Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredReviews.map((item) => (
              <div
                key={item.questionNumber}
                className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                  item.status === 'correct'
                    ? 'border-green-200 bg-green-50/40'
                    : item.status === 'incorrect'
                    ? 'border-red-200 bg-red-50/40'
                    : 'border-gray-200 bg-gray-50/40'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-gray-900">
                      Q.{item.questionNumber}
                    </span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600 font-medium">
                      {item.subjectName}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {item.status === 'correct' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                        <CheckCircleIcon className="w-3.5 h-3.5" /> +{item.marksAwarded}
                      </span>
                    ) : item.status === 'incorrect' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        <XCircleIcon className="w-3.5 h-3.5" /> {item.marksAwarded}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        0 (Left)
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded border border-gray-100">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">
                      Your Answer
                    </span>
                    <span
                      className={`font-bold text-sm ${
                        item.selectedOption
                          ? item.isCorrect
                            ? 'text-green-700'
                            : 'text-red-600'
                          : 'text-gray-400 italic'
                      }`}
                    >
                      {item.selectedOption ? `Option (${item.selectedOption})` : 'Not Attempted'}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-100">
                    <span className="text-gray-400 block text-[10px] font-semibold uppercase">
                      Correct Key
                    </span>
                    <span className="font-bold text-sm text-green-800">
                      Option ({item.correctOption || 'N/A'})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredReviews.length === 0 && (
            <div className="py-12 text-center text-gray-500 text-sm">
              No questions match the selected filter.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
