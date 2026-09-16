import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// @ts-ignore
import { azureProxyApp } from './server/app.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'azure-proxy-embedded-middleware',
      configureServer(server) {
        // Mount Azure DevOps API proxy directly into Vite's dev server middleware pipeline
        server.middlewares.use('/api/azure', azureProxyApp);
      }
    }
  ],
  server: {
    port: 5173,
  },
})
