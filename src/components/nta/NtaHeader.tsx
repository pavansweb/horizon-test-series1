import React from 'react';
import { ClockIcon, UserIcon } from '@/components/icons/Icons';

interface NtaHeaderProps {
  testTitle: string;
  candidateName?: string;
  timeRemainingSeconds: number;
}

export function NtaHeader({
  testTitle,
  candidateName = 'JEE Aspirant',
  timeRemainingSeconds,
}: NtaHeaderProps) {
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemainingSeconds < 900; // < 15 minutes
  const isUrgentTime = timeRemainingSeconds < 300; // < 5 minutes

  return (
    <header className="bg-[#1e3a8a] text-white border-b-2 border-[#172554] shadow-sm select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-col md:flex-row items-center justify-between gap-2">
        {/* Exam Title & Branding */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-white text-[#1e3a8a] font-extrabold flex items-center justify-center text-sm shadow">
              NTA
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-tight">
                JEE (Main) Computer Based Test
              </h1>
              <p className="text-xs text-blue-200 truncate max-w-xs sm:max-w-md">
                {testTitle}
              </p>
            </div>
          </div>

          {/* Mobile timer if on small screens */}
          <div className="md:hidden flex items-center gap-1 bg-white/10 px-2 py-1 rounded text-xs font-mono">
            <ClockIcon className="w-3.5 h-3.5 text-yellow-300" />
            <span className={isUrgentTime ? 'text-red-400 animate-pulse font-bold' : ''}>
              {formatTime(timeRemainingSeconds)}
            </span>
          </div>
        </div>

        {/* Center / Right: Candidate & Timer */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          {/* Candidate Profile Box */}
          <div className="hidden sm:flex items-center gap-2 bg-[#172554] px-3 py-1.5 rounded border border-blue-800">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-blue-100">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                {candidateName}
              </div>
              <div className="text-[10px] text-blue-300">Subject: Paper 1 (B.E./B.Tech)</div>
            </div>
          </div>

          {/* Prominent Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              isUrgentTime
                ? 'bg-red-600/90 text-white border-red-400 animate-pulse'
                : isLowTime
                ? 'bg-amber-500/90 text-white border-amber-300'
                : 'bg-white text-gray-900 border-gray-200'
            }`}
          >
            <ClockIcon
              className={`w-5 h-5 ${
                isUrgentTime || isLowTime ? 'text-white' : 'text-blue-700'
              }`}
            />
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 leading-none">
                Time Left
              </span>
              <span className="text-base sm:text-lg font-mono font-bold leading-tight">
                {formatTime(timeRemainingSeconds)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
