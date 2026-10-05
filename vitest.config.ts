import {defineConfig, mergeConfig} from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'app',
            include: ['src/**/*.test.{ts,tsx}'],
            environment: 'jsdom',
            setupFiles: ['./src/test/setup.ts'],
            css: false,
          },
        },
        {
          test: {
            name: 'server',
            include: ['server/**/*.test.ts'],
            environment: 'node',
          },
        },
      ],
    },
  }),
);
