import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { apiRouter } from './backend/routes/routes.js';

export function createApp() {
  const app = express();

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
    // In dev, Vite middleware is added by server.ts
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

  return app;
}
