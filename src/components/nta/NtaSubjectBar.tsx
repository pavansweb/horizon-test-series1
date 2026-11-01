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
    <div
      className="w-full flex items-center select-none"
      style={{
        background: '#1e4273',
        borderBottom: '1px solid #132f54',
        minHeight: '38px',
        padding: '0 0px',
      }}
    >
      <div className="flex items-stretch h-full overflow-x-auto">
        {/* 1. ALL QUESTIONS Tab Button (replaces JUT90 NEET) */}
        <button
          type="button"
          onClick={() => onSelectFilter('all')}
          style={{
            padding: '8px 18px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            borderRight: '1px solid #2b568c',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            background: isAllActive ? '#15345d' : 'transparent',
            color: isAllActive ? '#ffffff' : '#bfdbfe',
            borderBottom: isAllActive ? '3px solid #60a5fa' : '3px solid transparent',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isAllActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
          }}
          onMouseLeave={(e) => {
            if (!isAllActive) e.currentTarget.style.backgroundColor = 'transparent';
          }}
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
              style={{
                padding: '8px 18px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                borderRight: '1px solid #2b568c',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                background: isActive ? '#15345d' : 'transparent',
                color: isActive ? '#ffffff' : '#bfdbfe',
                borderBottom: isActive ? '3px solid #60a5fa' : '3px solid transparent',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {subject.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
