import React, { useState, useEffect } from 'react';

/**
 * AnimatedPriorityScore
 * 
 * Polished, animated circular priority gauge for emergency command center triage.
 * - Numerical score as the visual focal point
 * - Compact animated circular progress gauge (600-900ms ease-out)
 * - Severity-aware color scheme consistent with RESQNET design tokens
 * - Subtle glow for critical incidents without distracting effects
 * - Accessible with role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax
 * - Honors prefers-reduced-motion
 * - Avoids re-animating on arbitrary renders (animates on mount or score change)
 */
export default function AnimatedPriorityScore({
  score = 0,
  severity = 'moderate',
  size = 'md', // 'sm' | 'md' | 'lg'
  showDenominator = true,
  showLabel = true,
  label = 'Priority',
  className = ''
}) {
  const numericScore = typeof score === 'number' ? score : parseFloat(score) || 0;
  const clampedScore = Math.min(100, Math.max(0, Math.round(numericScore)));

  // Severity-aware color mapping matching RESQNET design system
  const getColor = (val, sev) => {
    const s = (sev || '').toLowerCase();
    if (s === 'critical' || val >= 85) {
      return {
        stroke: '#FF4566',
        text: 'text-[#FF4566]',
        glow: 'filter drop-shadow-[0_0_5px_rgba(255,69,102,0.45)]',
        track: '#2A1520',
        badgeBg: 'bg-rose-950/40 border-rose-500/30 text-rose-300'
      };
    }
    if (s === 'high' || val >= 70) {
      return {
        stroke: '#FFB547',
        text: 'text-[#FFB547]',
        glow: 'filter drop-shadow-[0_0_4px_rgba(255,181,71,0.35)]',
        track: '#2A2012',
        badgeBg: 'bg-amber-950/40 border-amber-500/30 text-amber-300'
      };
    }
    if (s === 'moderate' || s === 'medium' || val >= 50) {
      return {
        stroke: '#21D4FD',
        text: 'text-[#21D4FD]',
        glow: 'filter drop-shadow-[0_0_3px_rgba(33,212,253,0.3)]',
        track: '#0D2238',
        badgeBg: 'bg-sky-950/40 border-sky-500/30 text-sky-300'
      };
    }
    return {
      stroke: '#25D6A2',
      text: 'text-[#25D6A2]',
      glow: '',
      track: '#0C261E',
      badgeBg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
    };
  };

  const color = getColor(clampedScore, severity);

  // Check prefers-reduced-motion safely
  const isReducedMotion = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  };

  const [progress, setProgress] = useState(() => (isReducedMotion() ? clampedScore : 0));

  useEffect(() => {
    if (isReducedMotion()) {
      setProgress(clampedScore);
      return;
    }

    // Smooth entry transition from 0 to target clampedScore
    const frame = requestAnimationFrame(() => {
      setProgress(clampedScore);
    });

    return () => cancelAnimationFrame(frame);
  }, [clampedScore]);

  // Dimension presets
  const dimensions = {
    sm: { size: 40, radius: 15, strokeWidth: 3, textSize: 'text-xs', denomSize: 'text-[7px]' },
    md: { size: 48, radius: 19, strokeWidth: 3.5, textSize: 'text-sm sm:text-base', denomSize: 'text-[8px] sm:text-[9px]' },
    lg: { size: 82, radius: 50, strokeWidth: 5, textSize: 'text-base sm:text-lg', denomSize: 'text-[9px]' }
  };

  const config = dimensions[size] || dimensions.md;
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {showLabel && (
        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold mb-1 select-none">
          {label}
        </span>
      )}

      <div
        role="progressbar"
        aria-valuenow={clampedScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Priority score: ${clampedScore} out of 100`}
        className={`relative flex items-center justify-center ${color.glow}`}
        style={{ width: config.size, height: config.size }}
      >
        <svg
          width={config.size}
          height={config.size}
          viewBox={`0 0 ${config.size} ${config.size}`}
          className="transform -rotate-90"
        >
          {/* Background track circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={config.radius}
            fill="transparent"
            stroke={color.track}
            strokeWidth={config.strokeWidth}
          />
          {/* Animated progress circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={config.radius}
            fill="transparent"
            stroke={color.stroke}
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: isReducedMotion() ? 'none' : 'stroke-dashoffset 750ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        </svg>

        {/* Centered numeric score and denominator */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none leading-none">
          <span className={`font-black font-mono tracking-tight leading-none ${config.textSize} ${color.text}`}>
            {clampedScore}
          </span>
          {showDenominator && (
            <span className={`font-mono text-slate-400 leading-none mt-0.5 ${config.denomSize}`}>
              /100
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
