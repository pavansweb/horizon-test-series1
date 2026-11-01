import React from 'react';
import { QuestionStatus } from '@/lib/types';

interface NtaPaletteBadgeProps {
  number: number;
  status: QuestionStatus;
  isActive?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function NtaPaletteBadge({
  number,
  status,
  isActive = false,
  onClick,
  size = 'md',
}: NtaPaletteBadgeProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-xs sm:text-sm font-semibold',
    lg: 'w-11 h-11 text-base font-bold',
  }[size];

  // Base button styling
  let bgStyle = '';
  let shapeClass = '';

  switch (status) {
    case 'answered':
      // Green polygon / rounded hex
      bgStyle = 'bg-[#2ea44f] text-white hover:bg-[#2c974b] shadow-sm';
      shapeClass = 'rounded-md clip-hex';
      break;

    case 'not_answered':
      // Red-orange trapezoid / shield
      bgStyle = 'bg-[#d73a49] text-white hover:bg-[#cb2431] shadow-sm';
      shapeClass = 'rounded-t-lg rounded-b-sm';
      break;

    case 'marked_for_review':
      // Purple circle
      bgStyle = 'bg-[#6f42c1] text-white hover:bg-[#5a32a3] shadow-sm';
      shapeClass = 'rounded-full';
      break;

    case 'answered_and_marked':
      // Purple circle with green corner indicator
      bgStyle = 'bg-[#6f42c1] text-white hover:bg-[#5a32a3] shadow-sm relative';
      shapeClass = 'rounded-full';
      break;

    case 'not_visited':
    default:
      // Gray/silver box
      bgStyle = 'bg-[#f6f8fa] text-gray-800 border border-gray-300 hover:bg-gray-200';
      shapeClass = 'rounded-sm';
      break;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center justify-center transition-all duration-150 select-none ${sizeClasses} ${shapeClass} ${bgStyle} ${
        isActive ? 'ring-2 ring-offset-2 ring-blue-600 scale-105 z-10' : ''
      }`}
      title={`Question ${number}: ${status.replace(/_/g, ' ')}`}
    >
      <span>{number}</span>

      {/* Small green badge at bottom right for 'answered_and_marked' */}
      {status === 'answered_and_marked' && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#2ea44f] border border-white rounded-sm flex items-center justify-center"
          title="Evaluated"
        >
          <svg className="w-2 h-2 text-white" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}

/**
 * Visual miniature icon for legends
 */
export function NtaLegendBadge({
  status,
  count,
  label,
}: {
  status: QuestionStatus;
  count: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs py-1">
      <div className="flex-shrink-0">
        <NtaPaletteBadge number={count} status={status} size="sm" />
      </div>
      <span className="text-gray-700 font-medium leading-tight">{label}</span>
    </div>
  );
}
