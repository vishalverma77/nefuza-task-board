import express from 'express';
import cors from 'cors';
import { azureProxyApp } from './app.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Global CORS & JSON parser
app.use(cors());
app.use(express.json());

// Root health check endpoint (specifically used by Render health checks)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root welcome & status endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'Azure DevOps Proxy Server',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/health',
      '/api/azure/health',
      '/api/azure/validate',
      '/api/azure/proxy',
      '/api/azure/sync-google-sheet',
      '/api/azure/board-tasks',
      '/api/azure/board-card-hours',
      '/api/azure/create-card-hours',
      '/api/azure/create-tasquee-card'
    ]
  });
});

// Mount Azure Proxy router at /api/azure (and fallback at root for convenience)
app.use('/api/azure', azureProxyApp);
app.use('/', azureProxyApp);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Azure DevOps Proxy Standalone Server] Listening on port ${PORT} (0.0.0.0)`);
});

