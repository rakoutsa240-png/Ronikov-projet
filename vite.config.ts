import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

// Start downloading the two main fonts (Latin letters) with the page itself, instead of
// waiting for the app's code to run: text shows in the right font sooner and jumps less.
function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml(_html, ctx) {
      const files = Object.keys(ctx.bundle ?? {}).filter((f) =>
        /(figtree|bricolage-grotesque)-latin-wght-normal-[\w-]+\.woff2$/.test(f),
      );
      return files.map((f) => ({
        tag: 'link',
        attrs: { rel: 'preload', href: `/${f}`, as: 'font', type: 'font/woff2', crossorigin: '' },
        injectTo: 'head' as const,
      }));
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), preloadFonts()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // The API server (npm run dev:api) answers /api in development.
      proxy: {
        '/api': `http://localhost:${process.env.PORT ?? 4000}`,
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
