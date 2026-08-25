import express from 'express';
import path from 'path';
import { apiRouter } from './backend/routes.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Express JSON parser with raw body buffer preservation for webhook signature verification
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  }));

  // Mount Backend API Router
  app.use('/api', apiRouter);

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
    console.log(`[RecoverFlow AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[RecoverFlow AI] Failed to start server:', err);
  process.exit(1);
});
