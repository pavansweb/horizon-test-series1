'use client';

import React, { useState } from 'react';
import { SubjectConfig } from '@/lib/types';
import { RotateCcwIcon } from '@/components/icons/Icons';

interface AnswerKeyEditorProps {
  subjects: SubjectConfig[];
  answerKey: Record<number, string>;
  onChangeAnswerKey: (updatedKey: Record<number, string>) => void;
}

export function AnswerKeyEditor({
  subjects,
  answerKey,
  onChangeAnswerKey,
}: AnswerKeyEditorProps) {
  const [bulkText, setBulkText] = useState<string>('');
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>(
    subjects[0]?.id || 'physics'
  );
  const [bulkMsg, setBulkMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const totalQuestions = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);

  // Parse bulk pasted text
  const handleBulkParse = () => {
    if (!bulkText.trim()) {
      setBulkMsg({ text: 'Please enter or paste answer text first.', type: 'error' });
      return;
    }

    const newKey = { ...answerKey };
    let filledCount = 0;

    // Pattern 1: Check for "1: A, 2: B" or "1. A, 2. B" or "1-A"
    const regexPattern = /(\d+)\s*[:.\-)]\s*([A-D])/gi;
    let match;
    let foundExplicit = false;

    while ((match = regexPattern.exec(bulkText)) !== null) {
      foundExplicit = true;
      const qNum = parseInt(match[1], 10);
      const opt = match[2].toUpperCase();
      if (qNum >= 1 && qNum <= totalQuestions) {
        newKey[qNum] = opt;
        filledCount++;
      }
    }

    // Pattern 2: If no numbered pattern, split by whitespace, comma, or newline
    if (!foundExplicit) {
      const tokens = bulkText
        .trim()
        .toUpperCase()
        .replace(/[,;]/g, ' ')
        .split(/\s+/)
        .filter((t) => /^[A-D]$/.test(t));

      if (tokens.length > 0) {
        tokens.forEach((opt, idx) => {
          const qNum = idx + 1;
          if (qNum <= totalQuestions) {
            newKey[qNum] = opt;
            filledCount++;
          }
        });
      }
    }

    if (filledCount > 0) {
      onChangeAnswerKey(newKey);
      setBulkMsg({
        text: `Successfully populated ${filledCount} answers into the answer key!`,
        type: 'success',
      });
      setBulkText('');
    } else {
      setBulkMsg({
        text: 'Could not recognize answer options. Please use format like "A B C D..." or "1: A, 2: B, 3: C..."',
        type: 'error',
      });
    }
  };

  const handleSetOption = (qNum: number, opt: string) => {
    const current = answerKey[qNum];
    const newKey = { ...answerKey };
    if (current === opt) {
      delete newKey[qNum]; // toggle off
    } else {
      newKey[qNum] = opt;
    }
    onChangeAnswerKey(newKey);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all configured answers?')) {
      onChangeAnswerKey({});
      setBulkMsg(null);
    }
  };

  const currentSubject = subjects.find((s) => s.id === activeSubjectTab) || subjects[0];
  const subjectQuestions: number[] = [];
  if (currentSubject) {
    for (let q = currentSubject.startQuestion; q <= currentSubject.endQuestion; q++) {
      subjectQuestions.push(q);
    }
  }

  // Count filled answers
  const filledAnswersCount = Object.keys(answerKey).filter(
    (k) => parseInt(k, 10) <= totalQuestions && !!answerKey[parseInt(k, 10)]
  ).length;

  return (
    <div className="space-y-4">
      {/* Quick Bulk Paste Section */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-blue-900 uppercase tracking-wide">
            Fast Bulk Answer Key Paste
          </label>
          <span className="text-[11px] text-blue-700">
            Supports &ldquo;A B C D...&rdquo; or &ldquo;1: A, 2: B...&rdquo;
          </span>
        </div>
        <textarea
          rows={2}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder="Paste answer key here, e.g.: A B C D A B C D ... or 1: A, 2: B, 3: C, 4: D ..."
          className="w-full text-xs font-mono p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBulkParse}
            className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs"
          >
            Parse & Apply to Answer Key
          </button>
          {bulkMsg && (
            <span
              className={`text-xs font-medium ${
                bulkMsg.type === 'success' ? 'text-green-700 font-bold' : 'text-red-600'
              }`}
            >
              {bulkMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Answer Key Grid / Matrix Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700">Answer Key Completion:</span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              filledAnswersCount === totalQuestions
                ? 'bg-green-100 text-green-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {filledAnswersCount} / {totalQuestions} questions keyed
          </span>
        </div>

        <button
          type="button"
          onClick={handleClearAll}
          className="text-xs text-red-600 hover:text-red-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
        >
          <RotateCcwIcon className="w-3 h-3" />
          Clear All Answers
        </button>
      </div>

      {/* Subject Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {subjects.map((s) => {
          const isActive = s.id === activeSubjectTab;
          let subFilled = 0;
          for (let q = s.startQuestion; q <= s.endQuestion; q++) {
            if (answerKey[q]) subFilled++;
          }

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSubjectTab(s.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-t transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{s.name}</span>
              <span className="text-[10px] opacity-80">
                ({subFilled}/{s.totalQuestions})
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive Answer Matrix Grid */}
      <div className="max-h-[300px] overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {subjectQuestions.map((qNum) => {
            const currentOpt = answerKey[qNum];

            return (
              <div
                key={qNum}
                className={`p-2 rounded border flex items-center justify-between text-xs transition-all ${
                  currentOpt ? 'bg-white border-blue-300 shadow-2xs' : 'bg-gray-100/70 border-gray-200'
                }`}
              >
                <span className="font-bold text-gray-800 w-10">Q.{qNum}</span>
                <div className="flex items-center gap-1">
                  {['A', 'B', 'C', 'D'].map((opt) => {
                    const isSelected = currentOpt === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSetOption(qNum, opt)}
                        className={`w-6 h-6 rounded font-bold text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-700 text-white shadow-xs scale-105'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
