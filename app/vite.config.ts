import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path';
import svgr from 'vite-plugin-svgr';

const host = process.env.TAURI_DEV_HOST;
const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

// https://vitejs.dev/config/
export default defineConfig({
    root: __dirname,
    plugins: [
        react(),
        svgr(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    server: {
        origin: 'http://localhost:3180',
        port: 3180,
        strictPort: true, // Tauri expects a fixed port, fail if that port is not available
        fs: {
            allow: ['..'], // allow importing from one level up
        },
        host: host || false,
        watch: {
            ignored: ['**/src-tauri/**'], // tell vite to ignore watching `src-tauri`
        },
    },
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    build: {
        outDir: 'dist',
        target: // Tauri uses Chromium on Windows and WebKit on macOS and Linux
            process.env.TAURI_ENV_PLATFORM == 'windows'
                ? 'chrome105'
                : 'safari13',
        minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false, // don't minify for debug builds
        sourcemap: !!process.env.TAURI_ENV_DEBUG, // produce sourcemaps for debug builds
    },

    base: isTauri ? './' : '/martyn-llewelyn/',
    envDir: '../', // load .env from repo root

    clearScreen: false, // prevent vite from obscuring rust errors
})
