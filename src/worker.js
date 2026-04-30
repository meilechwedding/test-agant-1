import { Worker } from 'bullmq';
import { connection } from './queue.js';
import { runAgent } from './agent.js';

const worker = new Worker(
  'agent-tasks',
  async (job) => {
    const { taskId, goal } = job.data;
    console.log(`[worker] starting task #${taskId}: ${goal.slice(0, 80)}`);
    await runAgent({ taskId, goal });
  },
  {
    connection,
    concurrency: 2, // run up to 2 long tasks in parallel
    lockDuration: 60 * 60 * 1000, // 1h lock; agent jobs are long
  }
);

worker.on('completed', (job) => console.log(`[worker] done task #${job.data.taskId}`));
worker.on('failed', (job, err) => console.error(`[worker] failed task #${job?.data?.taskId}:`, err.message));

console.log('[worker] up — waiting for tasks');
