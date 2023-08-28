import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

const pathResolver = (rPath: string) => path.resolve(__dirname, rPath);

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': pathResolver('./src'),
    },
  },
  plugins: [react()],
})
