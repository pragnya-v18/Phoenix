import express, { Request, Response, NextFunction } from 'express';
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

  // Global error-handling middleware — catches unhandled route/async errors
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server] Unhandled error:', err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal server error', details: err?.message || String(err) });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RecoverFlow AI] Server running on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`[Server] ${signal} received — shutting down gracefully...`);
    server.close(() => {
      console.log('[Server] HTTP server closed. Exiting.');
      process.exit(0);
    });
    // Force exit after 10s if connections hang
    setTimeout(() => {
      console.error('[Server] Forced exit after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[RecoverFlow AI] Failed to start server:', err);
  process.exit(1);
});
