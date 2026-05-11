import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Đảm bảo mọi thư viện đều trỏ về cùng một bản React trong node_modules của dự án
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    // Khử trùng lặp React để tránh lỗi "Invalid Hook Call"
    dedupe: ['react', 'react-dom'],
  },
})