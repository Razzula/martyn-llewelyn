import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    root: __dirname,
    plugins: [react()],
    build: {
        outDir: 'dist',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@shared': path.resolve(__dirname, '../shared'),
        },
    },
    server: {
        port: 3180,
        proxy: {
            '/martyn-llewelyn/truelayer': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/martyn-llewelyn\/truelayer/, '/truelayer'),
            }
        },
        fs: {
            allow: ['..'], // allow importing from one level up
        },
    },
    base: '/martyn-llewelyn/',
    envDir: '../', // load .env from repo root
})
