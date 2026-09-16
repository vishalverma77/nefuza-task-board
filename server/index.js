import express from 'express';
import { azureProxyApp } from './app.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use('/api/azure', azureProxyApp);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Azure DevOps Proxy Standalone Server] Listening on http://127.0.0.1:${PORT}`);
});
