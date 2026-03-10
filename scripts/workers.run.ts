import * as dotenv from 'dotenv';
dotenv.config();

import { taskService } from '../src/services/task.service';

/**
 * Info: (20260130 - Luphia)
 * Worker script to continuously process pending analysis tasks.
 * Run with: npx tsx scripts/workers.run.ts
 */
async function runWorker() {
  console.log('[Worker] Starting Analysis Task Worker...');
  console.log('[Worker] Press Ctrl+C to stop.');

  let isRunning = true;

  // Info: (20260130 - Luphia) Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Worker] Stopping...');
    isRunning = false;
  });

  while (isRunning) {
    try {
      // Info: (20260130 - Luphia) Process one task, if there is no task, wait for 1 minute
      const processed = await taskService.processNextTask();

      // Info: (20260130 - Luphia) Wait before next check to avoid tight loop
      const waitTime = processed ? 5000 : 60000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } catch (error) {
      console.error('[Worker] Error in loop:', error);
      // Info: (20260130 - Luphia) Wait longer on error
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  console.log('[Worker] Stopped.');
  process.exit(0);
}

runWorker().catch(err => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
