'use client';

import React from 'react';
import { QuestionStatus } from '@/lib/types';

interface NtaPaletteBadgeProps {
  number: number;
  status: QuestionStatus;
  isActive?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function NtaPaletteBadge({
  number,
  status,
  isActive = false,
  onClick,
  size = 'md',
}: NtaPaletteBadgeProps) {
  const width = size === 'sm' ? '26px' : '34px';
  const height = size === 'sm' ? '26px' : '34px';
  const fontSize = size === 'sm' ? '11px' : '12.5px';

  let bgColor = '#e5e7eb';
  let textColor = '#1f2937';
  let borderColor = '#9ca3af';
  let clipPath = 'none';
  let borderRadius = '2px';
  let showGreenDot = false;

  switch (status) {
    case 'not_visited':
      bgColor = '#e2e8f0';
      textColor = '#334155';
      borderColor = '#94a3b8';
      clipPath = 'none';
      borderRadius = '2px';
      break;

    case 'not_answered':
      bgColor = '#d32f2f';
      textColor = '#ffffff';
      borderColor = 'transparent';
      clipPath = 'polygon(15% 0%, 85% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)';
      borderRadius = '0';
      break;

    case 'answered':
      bgColor = '#2e7d32';
      textColor = '#ffffff';
      borderColor = 'transparent';
      clipPath = 'polygon(50% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)';
      borderRadius = '0';
      break;

    case 'marked_for_review':
      bgColor = '#512da8';
      textColor = '#ffffff';
      borderColor = 'transparent';
      clipPath = 'none';
      borderRadius = '50%';
      break;

    case 'answered_and_marked':
      bgColor = '#512da8';
      textColor = '#ffffff';
      borderColor = 'transparent';
      clipPath = 'none';
      borderRadius = '50%';
      showGreenDot = true;
      break;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: width,
        height: height,
        fontSize: fontSize,
        fontWeight: 700,
        background: bgColor,
        color: textColor,
        border: clipPath !== 'none' ? 'none' : `1px solid ${borderColor}`,
        borderRadius: borderRadius,
        clipPath: clipPath !== 'none' ? clipPath : undefined,
        cursor: onClick ? 'pointer' : 'default',
        outline: isActive ? '2px solid #2563eb' : 'none',
        outlineOffset: '1px',
        flexShrink: 0,
        padding: 0,
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      }}
      title={`Question ${number} (${status.replace(/_/g, ' ')})`}
    >
      <span>{number}</span>

      {/* Green corner square indicator for answered_and_marked */}
      {showGreenDot && (
        <span
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: '8px',
            height: '8px',
            background: '#2e7d32',
            border: '1.5px solid white',
            borderRadius: '1px',
          }}
        />
      )}
    </button>
  );
}

export function NtaLegendBadge({
  status,
  label,
  count,
  isSelected = false,
  onClick,
}: {
  status: QuestionStatus;
  label: string;
  count?: number;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  let bgColor = '#e2e8f0';
  let clipPath = 'none';
  let borderRadius = '2px';
  let border = '1px solid #94a3b8';
  let showGreenDot = false;

  switch (status) {
    case 'not_visited':
      bgColor = '#e2e8f0';
      border = '1px solid #94a3b8';
      break;

    case 'not_answered':
      bgColor = '#d32f2f';
      clipPath = 'polygon(15% 0%, 85% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)';
      border = 'none';
      break;

    case 'answered':
      bgColor = '#2e7d32';
      clipPath = 'polygon(50% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)';
      border = 'none';
      break;

    case 'marked_for_review':
      bgColor = '#512da8';
      borderRadius = '50%';
      border = 'none';
      break;

    case 'answered_and_marked':
      bgColor = '#512da8';
      borderRadius = '50%';
      border = 'none';
      showGreenDot = true;
      break;
  }

  const content = (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-1.5 py-1 rounded transition-colors ${
        onClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60' : ''
      } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/70 dark:bg-blue-950/40 font-bold' : ''}`}
      title={onClick ? `Filter questions by ${label}` : undefined}
    >
      <div
        style={{
          position: 'relative',
          width: '24px',
          height: '24px',
          background: bgColor,
          clipPath: clipPath !== 'none' ? clipPath : undefined,
          borderRadius: borderRadius,
          border: border,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: status === 'not_visited' ? '#334155' : '#ffffff',
          fontWeight: 700,
          fontSize: '11px',
        }}
      >
        {count !== undefined && <span>{count}</span>}
        {showGreenDot && (
          <span
            style={{
              position: 'absolute',
              bottom: '-1px',
              right: '-1px',
              width: '7px',
              height: '7px',
              background: '#2e7d32',
              border: '1px solid white',
              borderRadius: '1px',
            }}
          />
        )}
      </div>
      <span className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight font-sans">
        {label}
      </span>
    </div>
  );

  return content;
}
