import { Config } from '@remotion/cli/config';

// Remotion lives in video/ so it stays separate from the Vite app.
Config.setEntryPoint('video/index.ts');
Config.setPublicDir('video/public');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
