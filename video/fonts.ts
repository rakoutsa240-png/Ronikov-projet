import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

const CYRILLIC = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

const faces: Array<[family: string, file: string, weight: string]> = [
  ['Unbounded', 'unbounded', '500'],
  ['Unbounded', 'unbounded', '900'],
  ['Oswald', 'oswald', '500'],
  ['Oswald', 'oswald', '700'],
];

let started = false;

export const loadFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('Loading fonts');
  const loads = faces.flatMap(([family, file, weight]) =>
    (
      [
        ['cyrillic', CYRILLIC],
        ['latin', LATIN],
      ] as const
    ).map(([subset, range]) => {
      const face = new FontFace(
        family,
        `url(${staticFile(`fonts/${file}-${subset}-${weight}-normal.woff2`)}) format('woff2')`,
        { weight, unicodeRange: range },
      );
      document.fonts.add(face);
      return face.load();
    }),
  );
  Promise.all(loads)
    .then(() => continueRender(handle))
    .catch((err) => cancelRender(err));
};
