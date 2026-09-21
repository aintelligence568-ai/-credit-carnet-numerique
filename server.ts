import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase, seedCheikhInitialData } from './server/db';
import { apiRouter } from './server/routes/api';

async function startServer() {
  // Initialize database tables & seed data for Cheikh
  initializeDatabase();
  seedCheikhInitialData();

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mount API routes first
  app.use('/api', apiRouter);

  // Vite middleware for development or static fallback for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Carnet de Crédit backend running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
