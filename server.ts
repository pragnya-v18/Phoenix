import { createApp } from './app.js';
import { pipelineJobQueue } from './backend/queues/job-queue.js';
import { AgentSupervisor } from './backend/agents/agents.js';
import { db } from './backend/repositories/db.js';
import { PipelineJob } from './backend/queues/job-queue.js';

async function startServer() {
  const app = createApp();
  const PORT = 3000;

  // Vite development middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

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
