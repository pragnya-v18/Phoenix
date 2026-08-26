import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { apiRouter } from './backend/routes/routes.js';
import { pipelineJobQueue } from './backend/queues/job-queue.js';
import { AgentSupervisor } from './backend/agents/agents.js';
import { db } from './backend/repositories/db.js';
import { PipelineJob } from './backend/queues/job-queue.js';

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

  // Bug 3 fix: initialize job queue BEFORE app.listen() so no jobs are
  // dropped in the window between accepting connections and starting the processor.
  pipelineJobQueue.init(async (job: PipelineJob) => {
    const latestCase = db.getCase(job.caseId);
    if (!latestCase) {
      console.warn(`[JobQueue] Case ${job.caseId} not found — skipping job ${job.id}.`);
      return;
    }
    if (latestCase.status === 'RECOVERED' || latestCase.status === 'DISMISSED') {
      return;
    }
    await AgentSupervisor.executeRecoveryPipeline(latestCase, job.fallbackChannel);
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RecoverFlow AI] Server running on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[Server] ${signal} received — shutting down gracefully...`);

    // Stop accepting new connections, drain job queue
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      try {
        await pipelineJobQueue.shutdown();
        console.log('[Server] Job queue drained. Exiting.');
      } catch (err) {
        console.error('[Server] Error draining job queue:', err);
      }
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
