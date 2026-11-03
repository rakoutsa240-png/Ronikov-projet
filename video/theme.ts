export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const DURATION = 450; // 15 s

export const C = {
  bg: '#08080a',
  red: '#e3121b',
  redDeep: '#6e0207',
  white: '#f4f1ec',
  mute: 'rgba(244,241,236,0.62)',
};

export const HEAD = "'Unbounded', sans-serif";
export const COND = "'Oswald', sans-serif";

// Frames with a big hit in the soundtrack (see scripts/make-soundtrack.py).
export const IMPACTS = [10, 45, 150, 255, 345, 378, 408];
// Smaller hits: montage panels and the word stutter.
export const MINOR_HITS = [262, 270, 285, 300, 307, 315, 322];

// Source-footage frame numbers (footage.mp4 is 30 fps).
export const SRC = {
  guy1: 0, // 0 - 63: first speaker
  whip1: 63, // 63 - 78: whip-pan
  guy2: 78, // 78 - 168: second speaker
  whip2: 168, // 168 - 186: whip-pan back
};

/** Rough font size so a single word in Unbounded Black fits `width` px. */
export const fit = (text: string, max: number, width = 920) =>
  Math.min(max, Math.floor(width / (text.length * 0.9)));
