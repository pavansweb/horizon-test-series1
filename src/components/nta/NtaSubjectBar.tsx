'use client';

import React from 'react';
import { SubjectConfig } from '@/lib/types';

interface NtaSubjectBarProps {
  subjects: SubjectConfig[];
  activeSubjectId: string;
  activeFilter?: string; // 'all' or subjectId ('physics', 'chemistry', 'mathematics')
  onSelectFilter: (filter: string) => void;
}

export function NtaSubjectBar({
  subjects,
  activeFilter = 'all',
  onSelectFilter,
}: NtaSubjectBarProps) {
  const isAllActive = activeFilter === 'all';

  return (
    <div className="w-full flex items-center select-none bg-[#1e4273] dark:bg-slate-900 border-b border-[#132f54] dark:border-slate-800 min-h-[38px] transition-colors">
      <div className="flex items-stretch h-full overflow-x-auto">
        {/* 1. ALL QUESTIONS Tab Button */}
        <button
          type="button"
          onClick={() => onSelectFilter('all')}
          className={`px-4 py-2 text-xs font-bold cursor-pointer border-r border-[#2b568c] dark:border-slate-700 tracking-wider uppercase transition-colors whitespace-nowrap flex items-center ${
            isAllActive
              ? 'bg-[#15345d] dark:bg-slate-800 text-white border-b-4 border-b-blue-400'
              : 'text-blue-100 dark:text-slate-400 hover:bg-white/10 border-b-4 border-b-transparent'
          }`}
        >
          ALL QUESTIONS
        </button>

        {/* 2. Individual Subject Tabs (Physics, Chemistry, Mathematics) */}
        {subjects.map((subject) => {
          const isActive = activeFilter === subject.id;

          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelectFilter(subject.id)}
              className={`px-4 py-2 text-xs font-bold cursor-pointer border-r border-[#2b568c] dark:border-slate-700 tracking-wider uppercase transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#15345d] dark:bg-slate-800 text-white border-b-4 border-b-blue-400'
                  : 'text-blue-100 dark:text-slate-400 hover:bg-white/10 border-b-4 border-b-transparent'
              }`}
            >
              <span>{subject.name}</span>
              <span className="text-[10px] opacity-75">({subject.totalQuestions} Qs)</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
