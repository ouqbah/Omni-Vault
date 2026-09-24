import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiRouter } from './server/apiApp';
import { setupLiveVoiceServer } from './server/liveVoiceServer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = express();
app.use(express.json());
app.use('/api', createApiRouter());

// Serve static production build
app.use(express.static(path.resolve(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

const httpServer = http.createServer(app);
setupLiveVoiceServer(httpServer);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[OmniVault] Server running at http://0.0.0.0:${PORT} (WebSocket live voice active at /live)`);
});

