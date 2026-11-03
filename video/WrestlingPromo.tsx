import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  BottomShade,
  Camera,
  FillWord,
  Flash,
  Footage,
  Grain,
  Reveal,
  Slam,
  Track,
  Vignette,
  clampOpts,
  easeOut,
} from './fx';
import { C, COND, DURATION, HEAD, SRC, fit } from './theme';

export type WrestlingPromoProps = {
  /** Big headline in the intro. */
  headline: string;
  /** Small line above the headline. */
  kicker: string;
  /** Club or gym name for the end card. Leave empty to hide it. */
  club: string;
  /** Call to action on the end card. */
  cta: string;
};

export const defaultPromoProps: WrestlingPromoProps = {
  headline: 'БОРЬБОЙ',
  kicker: 'МЫ ЗАНИМАЕМСЯ',
  club: '',
  cta: 'ЗАПИСЬ ОТКРЫТА',
};

const label: React.CSSProperties = {
  fontFamily: COND,
  fontWeight: 500,
  fontSize: 34,
  color: C.white,
  textTransform: 'uppercase',
};

const head = (size: number, color: string = C.white): React.CSSProperties => ({
  fontFamily: HEAD,
  fontWeight: 900,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: '-0.02em',
  color,
  whiteSpace: 'nowrap',
});

/* ===================================================================== */
/* 0 - 45  Intro: "МЫ ЗАНИМАЕМСЯ БОРЬБОЙ"                                 */
/* ===================================================================== */

const Intro: React.FC<WrestlingPromoProps> = ({ headline, kicker }) => {
  const frame = useCurrentFrame();
  const band = interpolate(frame, [3, 14], [0, 1], { ...clampOpts, easing: easeOut });
  const exit = interpolate(frame, [34, 45], [0, 1], { ...clampOpts, easing: easeOut });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* footage strip behind the title */}
      <AbsoluteFill
        style={{
          top: 960 - 330,
          height: 660,
          clipPath: `inset(${(1 - band) * 50}% 0 ${(1 - band) * 50}% 0)`,
          opacity: 0.55,
        }}
      >
        <Footage trimBefore={SRC.guy1 + 20} rate={0.5} grade="mono" tint={0.9} />
      </AbsoluteFill>

      {/* red slashes */}
      {[0, 1, 2].map((i) => {
        const x = interpolate(frame, [i * 2, 12 + i * 2], [-140, 140], { ...clampOpts, easing: easeOut });
        const hgt = [150, 46, 14][i];
        const top = [520, 1290, 1350][i];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '-20%',
              width: '140%',
              top,
              height: hgt,
              backgroundColor: i === 1 ? C.white : C.red,
              transform: `translateX(${x}%) rotate(-14deg)`,
              opacity: i === 0 ? 0.9 : 1,
            }}
          />
        );
      })}

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${1 + exit * 0.6})`,
          opacity: 1 - exit,
          filter: `blur(${exit * 10}px)`,
        }}
      >
        <Track delay={6} text={kicker} style={{ ...label, fontSize: 46, fontWeight: 700, marginBottom: 26 }} />
        <Slam delay={10}>
          <div style={{ ...head(fit(headline, 190)), textShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>{headline}</div>
        </Slam>
        <Track
          delay={18}
          text="СИЛА · ТЕХНИКА · ХАРАКТЕР"
          style={{ ...label, fontWeight: 700, marginTop: 34, textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ===================================================================== */
/* Shared: chapter number + big word block                                */
/* ===================================================================== */

const Chapter: React.FC<{ n: number; delay: number }> = ({ n, delay }) => (
  <Reveal delay={delay} dur={12}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
      <span style={{ ...label, fontSize: 64, fontWeight: 700, color: C.red }}>{String(n).padStart(2, '0')}</span>
      <span style={{ ...label, fontSize: 30, color: C.mute }}>/ 03</span>
    </div>
  </Reveal>
);

/* ===================================================================== */
/* 45 - 135  СИЛА (speaker 1, slow motion)                                */
/* ===================================================================== */

const Strength: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 90], [1.06, 1.2]);
  const bar = interpolate(frame, [4, 22], [0, 1], { ...clampOpts, easing: easeOut });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Footage trimBefore={SRC.guy1} rate={0.7} position="50% 30%" />
      </AbsoluteFill>
      <BottomShade from={42} />
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 1260,
          width: 10,
          height: 420 * bar,
          backgroundColor: C.red,
        }}
      />
      <div style={{ position: 'absolute', left: 120, top: 1250 }}>
        <Chapter n={1} delay={4} />
        <div style={{ marginTop: 6 }}>
          <FillWord text="СИЛА" size={fit('СИЛА', 230, 860)} delay={8} />
        </div>
        <Reveal delay={20} style={{ marginTop: 26 }}>
          <div style={{ ...label, fontSize: 40, letterSpacing: '0.12em' }}>КАЖДАЯ ТРЕНИРОВКА</div>
        </Reveal>
        <Reveal delay={25}>
          <div style={{ ...label, fontSize: 40, letterSpacing: '0.12em', color: C.mute }}>ДЕЛАЕТ ТЕБЯ СИЛЬНЕЕ</div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

/* ===================================================================== */
/* 135 - 150 / 330 - 345  whip-pans from the original clip                */
/* ===================================================================== */

const Whip: React.FC<{ trimBefore: number }> = ({ trimBefore }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ transform: `scale(${1.15 + frame * 0.01}) skewX(${-4 + frame * 0.4}deg)` }}>
      <Footage trimBefore={trimBefore} grade="whip" tint={0.8} />
    </AbsoluteFill>
  );
};

/* ===================================================================== */
/* 150 - 255  ТЕХНИКА (speaker 2, shrinks into a card over a marquee)     */
/* ===================================================================== */

const Marquee: React.FC<{ word: string }> = ({ word }) => {
  const frame = useCurrentFrame();
  const rows = 9;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, i) => {
        const dir = i % 2 === 0 ? -1 : 1;
        const x = -600 + dir * frame * 7 + (i % 3) * 140;
        const red = i === 4;
        return (
          <div
            key={i}
            style={{
              ...head(170),
              position: 'absolute',
              top: i * 220 - 40,
              left: x,
              color: red ? C.red : 'transparent',
              WebkitTextStroke: red ? undefined : '2px rgba(244,241,236,0.16)',
              opacity: red ? 0.85 : 1,
            }}
          >
            {`${word} • `.repeat(6)}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Technique: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 120 } });
  const w = interpolate(p, [0, 1], [1080, 840]);
  const h = interpolate(p, [0, 1], [1920, 1120]);
  const top = interpolate(p, [0, 1], [0, 230]);
  const rot = interpolate(p, [0, 1], [0, -3]);
  // Push in on the speaker so the wall posters stay out of frame.
  const zoom = interpolate(frame, [0, 105], [1.45, 1.55]);

  return (
    <AbsoluteFill>
      <Marquee word="ТЕХНИКА" />
      {/* red offset block */}
      <div
        style={{
          position: 'absolute',
          left: (1080 - w) / 2 + 26 * p,
          top: top + 26 * p,
          width: w,
          height: h,
          backgroundColor: C.red,
          transform: `rotate(${rot}deg)`,
          opacity: p,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: (1080 - w) / 2,
          top,
          width: w,
          height: h,
          overflow: 'hidden',
          transform: `rotate(${rot}deg)`,
          boxShadow: `0 0 0 ${4 * p}px ${C.white}, 0 40px 120px rgba(0,0,0,0.6)`,
        }}
      >
        <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: '50% 100%' }}>
          <Footage trimBefore={SRC.guy2} rate={0.86} position="50% 45%" />
        </AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 26,
            ...label,
            fontSize: 26,
            letterSpacing: '0.3em',
            opacity: p,
          }}
        >
          ● ТРЕНИРОВКА
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 1420, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Chapter n={2} delay={22} />
        </div>
        <Slam delay={26} from={1.8}>
          <div style={{ ...head(fit('ТЕХНИКА', 150)), textShadow: '0 12px 40px rgba(0,0,0,0.8)' }}>ТЕХНИКА</div>
        </Slam>
        <Track
          delay={36}
          text="ЗАХВАТЫ · БРОСКИ · УДЕРЖАНИЯ"
          spacing={0.2}
          style={{ ...label, fontSize: 36, color: C.red, fontWeight: 700, marginTop: 24 }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ===================================================================== */
/* 255 - 330  ХАРАКТЕР: split panels, then a word stutter                  */
/* ===================================================================== */

const Panel: React.FC<{ i: number; delay: number; trim: number; pos: string; mono?: boolean }> = ({
  i,
  delay,
  trim,
  pos,
  mono,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, 10], [0, 1], { ...clampOpts, easing: easeOut });
  const dir = i % 2 === 0 ? -1 : 1;
  return (
    <div
      style={{
        position: 'absolute',
        top: i * 640,
        left: 0,
        width: 1080,
        height: 640,
        overflow: 'hidden',
        transform: `translateX(${dir * (1 - p) * 100}%)`,
        borderBottom: i < 2 ? `8px solid ${C.red}` : undefined,
      }}
    >
      <AbsoluteFill style={{ transform: `scale(${1.1 + frame * 0.002})` }}>
        <Footage trimBefore={trim} rate={0.6} position={pos} grade={mono ? 'mono' : 'cine'} tint={0.8} />
      </AbsoluteFill>
    </div>
  );
};

const STUTTER = [
  { at: 45, word: 'ВОЛЯ', trim: SRC.guy2 + 40, mono: false },
  { at: 52, word: 'ДИСЦИПЛИНА', trim: SRC.guy1 + 40, mono: true },
  { at: 60, word: 'КОМАНДА', trim: SRC.guy2 + 70, mono: false },
  { at: 67, word: 'ПОБЕДА', trim: SRC.guy1 + 10, mono: true },
];

const Character: React.FC = () => {
  const frame = useCurrentFrame();
  const band = interpolate(frame, [28, 36], [0, 1], { ...clampOpts, easing: easeOut });
  const cut = [...STUTTER].reverse().find((s) => frame >= s.at);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {!cut && (
        <>
          <Panel i={0} delay={0} trim={SRC.guy1 + 25} pos="50% 32%" />
          <Panel i={1} delay={7} trim={SRC.guy2 + 20} pos="50% 42%" mono />
          <Panel i={2} delay={15} trim={SRC.guy2 + 60} pos="50% 40%" />
          <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${0.35 * band})` }} />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 960 - 150,
              height: 300,
              backgroundColor: C.bg,
              clipPath: `inset(0 ${(1 - band) * 100}% 0 0)`,
            }}
          />
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ marginBottom: 14 }}>
              <Chapter n={3} delay={30} />
            </div>
            <Slam delay={30} from={2}>
              <div style={head(fit('ХАРАКТЕР', 140), C.red)}>ХАРАКТЕР</div>
            </Slam>
          </AbsoluteFill>
        </>
      )}

      {cut && (
        <Sequence from={cut.at} key={cut.at} layout="none">
          <StutterCut word={cut.word} trim={cut.trim} mono={cut.mono} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

const StutterCut: React.FC<{ word: string; trim: number; mono: boolean }> = ({ word, trim, mono }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, 5], [1.35, 1], { ...clampOpts, easing: easeOut });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${1.25 - frame * 0.01})` }}>
        <Footage trimBefore={trim} grade={mono ? 'mono' : 'cine'} tint={1} position="50% 40%" />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: mono ? 'rgba(0,0,0,0.25)' : 'rgba(110,2,7,0.35)' }} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            ...head(fit(word, 170), mono ? C.red : C.white),
            transform: `scale(${s})`,
            textShadow: '0 10px 50px rgba(0,0,0,0.7)',
          }}
        >
          {word}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ===================================================================== */
/* 345 - 450  End card                                                    */
/* ===================================================================== */

const Emblem: React.FC = () => {
  const frame = useCurrentFrame();
  const r = 330;
  const circ = 2 * Math.PI * r;
  const draw = interpolate(frame, [0, 26], [0, 1], { ...clampOpts, easing: easeOut });
  const textIn = interpolate(frame, [8, 24], [0, 1], clampOpts);
  return (
    <svg width={900} height={900} viewBox="-450 -450 900 900" style={{ overflow: 'visible' }}>
      <defs>
        <path id="ring" d={`M 0 ${-r + 60} a ${r - 60} ${r - 60} 0 1 1 0 ${2 * (r - 60)} a ${r - 60} ${r - 60} 0 1 1 0 ${-2 * (r - 60)}`} />
      </defs>
      <circle
        r={r}
        fill="none"
        stroke={C.red}
        strokeWidth={10}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - draw)}
        transform="rotate(-90)"
      />
      <circle
        r={r + 26}
        fill="none"
        stroke={C.white}
        strokeOpacity={0.35}
        strokeWidth={2}
        strokeDasharray={`${circ * 0.02} ${circ * 0.012}`}
        transform={`rotate(${frame * 0.6})`}
        opacity={draw}
      />
      <g transform={`rotate(${-frame * 0.5})`} opacity={textIn}>
        <text
          style={{ fontFamily: COND, fontWeight: 700, fontSize: 36 }}
          fill={C.white}
          fillOpacity={0.8}
          textLength={2 * Math.PI * (r - 60) - 30}
          lengthAdjust="spacing"
        >
          <textPath href="#ring">СИЛА • ТЕХНИКА • ХАРАКТЕР • ВОЛЯ • ПОБЕДА • БОРЬБА •</textPath>
        </text>
      </g>
    </svg>
  );
};

const Outro: React.FC<WrestlingPromoProps> = ({ club, cta, headline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stamp = spring({ frame: frame - 63, fps, config: { damping: 11, stiffness: 200 } });
  const glow = 0.6 + 0.4 * Math.sin(frame / 6);
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill style={{ transform: 'scale(1.25)', opacity: 0.9 }}>
        <Footage trimBefore={SRC.guy1} rate={0.4} grade="dark" tint={1} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 38%, rgba(227,18,27,${0.42 * glow}) 0%, transparent 55%)`,
        }}
      />

      <AbsoluteFill style={{ alignItems: 'center', top: 330, height: 900 }}>
        <Emblem />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: 'center', top: 690 }}>
        {club ? (
          <Track delay={10} text={club} style={{ ...label, fontSize: 40, fontWeight: 700, marginBottom: 18 }} />
        ) : null}
        <Slam delay={4} from={2.2}>
          <div style={{ ...head(fit(headline, 175, 980)), textShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>{headline}</div>
        </Slam>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: 'center', top: 1270 }}>
        <Reveal delay={33} dur={12}>
          <div style={head(fit('ТРЕНИРУЙСЯ', 100))}>ТРЕНИРУЙСЯ</div>
        </Reveal>
        <Reveal delay={37} dur={12}>
          <div style={head(fit('ТРЕНИРУЙСЯ', 100), C.red)}>С НАМИ</div>
        </Reveal>
        <div
          style={{
            marginTop: 56,
            padding: '22px 54px',
            backgroundColor: C.red,
            transform: `scale(${interpolate(stamp, [0, 1], [1.6, 1])}) rotate(${interpolate(stamp, [0, 1], [-8, -2])}deg)`,
            opacity: interpolate(frame - 63, [0, 3], [0, 1], clampOpts),
            boxShadow: '0 20px 60px rgba(227,18,27,0.45)',
          }}
        >
          <div style={{ ...label, fontSize: 52, fontWeight: 700, letterSpacing: '0.14em' }}>{cta}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ===================================================================== */
/* HUD                                                                    */
/* ===================================================================== */

const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [40, 50], [0, 1], clampOpts);
  const secs = (frame / 30).toFixed(2).padStart(5, '0');
  const corner = (s: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: 46,
    height: 46,
    borderColor: 'rgba(244,241,236,0.7)',
    borderStyle: 'solid',
    borderWidth: 0,
    ...s,
  });
  return (
    <AbsoluteFill style={{ opacity: o, pointerEvents: 'none' }}>
      <div style={corner({ left: 44, top: 44, borderLeftWidth: 3, borderTopWidth: 3 })} />
      <div style={corner({ right: 44, top: 44, borderRightWidth: 3, borderTopWidth: 3 })} />
      <div style={corner({ left: 44, bottom: 44, borderLeftWidth: 3, borderBottomWidth: 3 })} />
      <div style={corner({ right: 44, bottom: 44, borderRightWidth: 3, borderBottomWidth: 3 })} />
      <div style={{ position: 'absolute', left: 110, top: 58, ...label, fontSize: 26, letterSpacing: '0.3em' }}>
        <span style={{ color: C.red, opacity: Math.floor(frame / 12) % 2 ? 0.25 : 1 }}>●</span> БОРЬБА
      </div>
      <div
        style={{
          position: 'absolute',
          right: 110,
          top: 58,
          ...label,
          fontSize: 26,
          letterSpacing: '0.2em',
          color: C.mute,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        00:{secs}
      </div>
      <div style={{ position: 'absolute', left: 110, right: 110, bottom: 64, height: 3, background: 'rgba(244,241,236,0.18)' }}>
        <div style={{ width: `${(frame / DURATION) * 100}%`, height: '100%', background: C.red }} />
      </div>
    </AbsoluteFill>
  );
};

/* ===================================================================== */

/** Red panel that sweeps up between the intro and the first scene. */
const RedWipe: React.FC = () => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 16], [100, -100], { ...clampOpts, easing: easeOut });
  return (
    <AbsoluteFill style={{ backgroundColor: C.red, transform: `translateY(${y}%) skewY(-8deg)`, height: '130%', top: '-15%' }} />
  );
};

export const WrestlingPromo: React.FC<WrestlingPromoProps> = (props) => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <Audio src={staticFile('soundtrack.wav')} />
    <Camera>
      <Sequence durationInFrames={45}>
        <Intro {...props} />
      </Sequence>
      <Sequence from={45} durationInFrames={90}>
        <Strength />
      </Sequence>
      <Sequence from={135} durationInFrames={15}>
        <Whip trimBefore={SRC.whip1} />
      </Sequence>
      <Sequence from={150} durationInFrames={105}>
        <Technique />
      </Sequence>
      <Sequence from={255} durationInFrames={75}>
        <Character />
      </Sequence>
      <Sequence from={330} durationInFrames={15}>
        <Whip trimBefore={SRC.whip2} />
      </Sequence>
      <Sequence from={345}>
        <Outro {...props} />
      </Sequence>
      <Sequence from={36} durationInFrames={18}>
        <RedWipe />
      </Sequence>
    </Camera>
    <Vignette />
    <Hud />
    <Flash at={[45, 150, 255, 345]} />
    <Flash at={[300, 307, 315, 322]} peak={0.35} len={4} />
    <Grain />
  </AbsoluteFill>
);
