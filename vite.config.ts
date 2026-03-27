import path from 'path';
import { defineConfig, loadEnv, createLogger } from 'vite';
import react from '@vitejs/plugin-react';

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('Sourcemap') && msg.includes('points to missing source files')) return;
  originalConsoleWarn(...args);
};

const logger = createLogger();
const originalWarn = logger.warn;
logger.warn = (msg, options) => {
  if (msg.includes('Sourcemap') && msg.includes('points to missing source files')) return;
  originalWarn(msg, options);
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      customLogger: logger,
      publicDir: 'public',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/ollama-local': {
            target: 'http://localhost:11434',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/ollama-local/, '')
          },
          '/ollama-cloud': {
            target: 'https://ollama.com',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/ollama-cloud/, '')
          }
        }
      },
      preview: {
        port: 3000,
        host: '0.0.0.0',
        strictPort: true
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              gemini: ['@google/genai']
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        exclude: ['@google/adk', 'express']
      }
    };
});
