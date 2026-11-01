'use client';

import React from 'react';
import { SubjectConfig } from '@/lib/types';

interface NtaSubjectBarProps {
  subjects: SubjectConfig[];
  activeSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
  testGroupTag?: string;
}

export function NtaSubjectBar({
  subjects,
  activeSubjectId,
  onSelectSubject,
  testGroupTag = 'JUT90 NEET',
}: NtaSubjectBarProps) {
  return (
    <div
      className="w-full flex items-center select-none"
      style={{
        background: '#1e4273',
        borderBottom: '1px solid #132f54',
        minHeight: '34px',
        padding: '0 0px',
      }}
    >
      <div className="flex items-stretch h-full overflow-x-auto">
        {/* Test Group / Exam Code Tag Badge (e.g. JUT90 NEET) */}
        <div
          style={{
            padding: '7px 14px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#ffffff',
            background: '#15345d',
            borderRight: '1px solid #2b568c',
            letterSpacing: '0.6px',
            display: 'flex',
            alignItems: 'center',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {testGroupTag}
        </div>

        {/* Subject Tabs */}
        {subjects.map((subject) => {
          const isActive = subject.id === activeSubjectId;

          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelectSubject(subject.id)}
              style={{
                padding: '7px 18px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                borderRight: '1px solid #2b568c',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                background: isActive ? '#132f54' : 'transparent',
                color: isActive ? '#ffffff' : '#dbeafe',
                outline: isActive ? '1px solid #3b71b8' : 'none',
                transition: 'background-color 0.1s',
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
