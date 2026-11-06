import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    root: path.resolve(__dirname, '..', '..'),
    base: './',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '..', '..', 'src'),
        },
    },
    plugins: [
        react(),
    ],
    server: {
        port: 8080
    }
})
