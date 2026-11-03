import React from 'react';
import { Composition } from 'remotion';
import { WrestlingPromo, defaultPromoProps } from './WrestlingPromo';
import { loadFonts } from './fonts';
import { DURATION, FPS, H, W } from './theme';

loadFonts();

export const RemotionRoot: React.FC = () => (
  <Composition
    id="WrestlingPromo"
    component={WrestlingPromo}
    durationInFrames={DURATION}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={defaultPromoProps}
  />
);
