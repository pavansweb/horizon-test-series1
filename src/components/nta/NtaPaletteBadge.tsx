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
      bgColor = '#e5e7eb';
      textColor = '#374151';
      borderColor = '#9ca3af';
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
      bgColor = '#388e3c';
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
      title={`Question ${number}`}
    >
      <span>{number}</span>

      {/* Green corner square for answered_and_marked */}
      {showGreenDot && (
        <span
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: '8px',
            height: '8px',
            background: '#388e3c',
            border: '1px solid white',
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
}: {
  status: QuestionStatus;
  label: string;
}) {
  let bgColor = '#e5e7eb';
  let clipPath = 'none';
  let borderRadius = '2px';
  let border = '1px solid #9ca3af';
  let showGreenDot = false;

  switch (status) {
    case 'not_visited':
      bgColor = '#e5e7eb';
      border = '1px solid #9ca3af';
      break;

    case 'not_answered':
      bgColor = '#d32f2f';
      clipPath = 'polygon(15% 0%, 85% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)';
      border = 'none';
      break;

    case 'answered':
      bgColor = '#388e3c';
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

  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          position: 'relative',
          width: '20px',
          height: '20px',
          background: bgColor,
          clipPath: clipPath !== 'none' ? clipPath : undefined,
          borderRadius: borderRadius,
          border: border,
          flexShrink: 0,
        }}
      >
        {showGreenDot && (
          <span
            style={{
              position: 'absolute',
              bottom: '-1px',
              right: '-1px',
              width: '7px',
              height: '7px',
              background: '#388e3c',
              border: '1px solid white',
              borderRadius: '1px',
            }}
          />
        )}
      </div>
      <span
        style={{
          fontSize: '11px',
          color: '#4b5563',
          lineHeight: '1.2',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        }}
      >
        {label}
      </span>
    </div>
  );
}
