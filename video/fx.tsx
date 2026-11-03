import React from 'react';
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { C, IMPACTS, MINOR_HITS } from './theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/* ------------------------------------------------------------------ footage */

const GRADES = {
  cine: 'contrast(1.2) saturate(0.72) brightness(0.9)',
  mono: 'grayscale(1) contrast(1.55) brightness(0.88)',
  dark: 'grayscale(0.6) contrast(1.2) brightness(0.32) blur(14px)',
  whip: 'contrast(1.25) saturate(0.6) brightness(0.95) blur(3px)',
};

export const Footage: React.FC<{
  trimBefore: number;
  rate?: number;
  grade?: keyof typeof GRADES;
  position?: string;
  tint?: number; // 0..1 strength of the red grade
}> = ({ trimBefore, rate = 1, grade = 'cine', position = '50% 40%', tint = 0.55 }) => (
  <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
    <OffthreadVideo
      src={staticFile('footage.mp4')}
      trimBefore={trimBefore}
      playbackRate={rate}
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: position,
        filter: GRADES[grade],
      }}
    />
    {/* red/teal split grade: red pushes into the shadows, highlights stay clean */}
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, rgba(20,40,60,0.35) 0%, rgba(227,18,27,${0.5 * tint}) 100%)`,
        mixBlendMode: 'multiply',
      }}
    />
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, rgba(255,120,90,${0.18 * tint}) 0%, transparent 60%)`,
        mixBlendMode: 'screen',
      }}
    />
  </AbsoluteFill>
);

/* --------------------------------------------------------------- overlays */

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: 'overlay', opacity: 0.32, pointerEvents: 'none' }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed={frame % 24}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.7 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 75% 60% at 50% 45%, transparent 45%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

export const BottomShade: React.FC<{ from?: number }> = ({ from = 45 }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, transparent ${from}%, rgba(0,0,0,0.55) ${from + 15}%, rgba(0,0,0,0.92) 100%)`,
    }}
  />
);

/** 0..1 amount for the latest hit near `frame`. */
export const hitAmount = (frame: number, hits: number[], len: number) => {
  let amt = 0;
  for (const h of hits) {
    const d = frame - h;
    if (d >= 0 && d < len) amt = Math.max(amt, (1 - d / len) ** 2);
  }
  return amt;
};

/** Camera shake + zoom punch on every hit. Wrap the whole picture in this. */
export const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const big = hitAmount(frame, IMPACTS, 12);
  const small = hitAmount(frame, MINOR_HITS, 7) * 0.45;
  const amt = Math.max(big, small);
  const x = (random(`x${frame}`) - 0.5) * 2 * 30 * amt;
  const y = (random(`y${frame}`) - 0.5) * 2 * 30 * amt;
  const r = (random(`r${frame}`) - 0.5) * 2 * 0.8 * amt;
  return (
    <AbsoluteFill
      style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${1 + 0.05 * amt})` }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** White flash at each of the given frames. */
export const Flash: React.FC<{ at: number[]; peak?: number; len?: number; color?: string }> = ({
  at,
  peak = 0.9,
  len = 7,
  color = '#fff',
}) => {
  const frame = useCurrentFrame();
  const o = hitAmount(frame, at, len) * peak;
  if (o <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: color, opacity: o, pointerEvents: 'none' }} />;
};

/* ------------------------------------------------------------------- type */

/** Slides content up out of a mask. */
export const Reveal: React.FC<{
  delay: number;
  dur?: number;
  from?: 'up' | 'down' | 'left';
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay, dur = 14, from = 'up', children, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, dur], [0, 1], { ...clamp, easing: easeOut });
  const off = (1 - p) * 115;
  const transform =
    from === 'up' ? `translateY(${off}%)` : from === 'down' ? `translateY(${-off}%)` : `translateX(${-off}%)`;
  return (
    <div style={{ overflow: 'hidden', padding: '0.06em 0', ...style }}>
      <div style={{ transform }}>{children}</div>
    </div>
  );
};

/** Big scale-down "slam" with motion blur. */
export const Slam: React.FC<{
  delay: number;
  from?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay, from = 2.4, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 210, mass: 0.8 } });
  const scale = interpolate(s, [0, 1], [from, 1]);
  const opacity = interpolate(frame - delay, [0, 3], [0, 1], clamp);
  const blur = Math.max(0, (1 - s) * 18);
  return (
    <div style={{ transform: `scale(${scale})`, opacity, filter: `blur(${blur}px)`, ...style }}>
      {children}
    </div>
  );
};

/** Fades/stretches letters apart while they appear. */
export const Track: React.FC<{
  delay: number;
  text: string;
  style?: React.CSSProperties;
  spacing?: number;
}> = ({ delay, text, style, spacing = 0.32 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, 18], [0, 1], { ...clamp, easing: easeOut });
  return (
    <div style={{ letterSpacing: `${spacing + (1 - p) * 0.5}em`, opacity: p, whiteSpace: 'nowrap', ...style }}>
      {text}
    </div>
  );
};

/** Outline word with a red fill wiping up through it. */
export const FillWord: React.FC<{
  text: string;
  size: number;
  delay: number;
  dur?: number;
  fill?: string;
}> = ({ text, size, delay, dur = 18, fill = C.red }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, dur], [0, 1], { ...clamp, easing: easeOut });
  const base: React.CSSProperties = {
    fontFamily: "'Unbounded', sans-serif",
    fontWeight: 900,
    fontSize: size,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
  };
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ ...base, color: 'transparent', WebkitTextStroke: `3px ${C.white}` }}>{text}</div>
      <div
        style={{
          ...base,
          position: 'absolute',
          inset: 0,
          color: fill,
          clipPath: `inset(${(1 - p) * 100}% 0 0 0)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const clampOpts = clamp;
