import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
        },
    },
    server: {
        port: 5173,
        // Allow importing /shared from outside the frontend folder.
        fs: { allow: [repoRoot] },
        // Local API (mock server now, real API later). Same-origin in the browser, so no CORS setup.
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/setupTests.js',
    },
});
