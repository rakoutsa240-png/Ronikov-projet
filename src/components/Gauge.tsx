import React from 'react';

interface GaugeProps {
  value: number; // 0 to 100
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  sublabel?: string;
  showPercent?: boolean;
  type?: 'circular' | 'bar';
  className?: string;
  darkMode?: boolean;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  size = 'md',
  label,
  sublabel,
  showPercent = true,
  type = 'circular',
  className = '',
  darkMode = true,
}) => {
  const percentage = Math.min(100, Math.max(0, value));

  if (type === 'bar') {
    return (
      <div className={`w-full ${className}`}>
        {(label || showPercent) && (
          <div className="flex justify-between items-center mb-1.5 text-xs font-mono-code tracking-tight">
            {label && <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{label}</span>}
            {showPercent && <span className={`font-bold ${darkMode ? 'text-amber-400' : 'text-slate-600'}`}>{Math.round(percentage)}%</span>}
          </div>
        )}
        <div className={`w-full border h-3 overflow-hidden p-0.5 relative rounded-full ${darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-slate-100 border-slate-300'}`}>
          <div
            className={`h-full transition-all duration-500 ease-out rounded-full ${darkMode ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-black'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {sublabel && (
          <div className={`text-xs mt-1 font-mono-code ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`}>{sublabel}</div>
        )}
      </div>
    );
  }

  // Circular gauge size parameters
  const dimensions = {
    sm: { cx: 28, cy: 28, r: 20, stroke: 4, width: 56, text: 'text-xs' },
    md: { cx: 40, cy: 40, r: 30, stroke: 6, width: 80, text: 'text-sm' },
    lg: { cx: 56, cy: 56, r: 44, stroke: 8, width: 112, text: 'text-lg' },
  }[size];

  const circumference = 2 * Math.PI * dimensions.r;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={dimensions.width}
          height={dimensions.width}
          className="transform -rotate-90"
        >
          {/* Outer track */}
          <circle
            cx={dimensions.cx}
            cy={dimensions.cy}
            r={dimensions.r}
            style={{ stroke: darkMode ? 'var(--color-neutral-800)' : 'var(--color-neutral-200)' }}
            strokeWidth={dimensions.stroke}
            fill="transparent"
          />
          {/* Inner percentage fill */}
          <circle
            cx={dimensions.cx}
            cy={dimensions.cy}
            r={dimensions.r}
            style={{ stroke: darkMode ? 'var(--color-amber-500)' : 'var(--color-neutral-950)' }}
            strokeWidth={dimensions.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {showPercent && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center font-mono-code font-black ${dimensions.text} ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
      </div>

      {label && (
        <div className="mt-2 text-center">
          <div className={`text-xs font-bold tracking-tight font-mono-code ${darkMode ? 'text-amber-300' : 'text-slate-900'}`}>{label}</div>
          {sublabel && <div className={`text-xs font-mono-code mt-0.5 ${darkMode ? 'text-neutral-400' : 'text-slate-500'}`}>{sublabel}</div>}
        </div>
      )}
    </div>
  );
};
