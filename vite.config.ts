import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // listen on '::' so the dev server answers on BOTH 127.0.0.1 and [::1]
  // (the default 'localhost' binding can resolve to IPv6 only)
  server: { host: '::', port: 5180, strictPort: true },
})
