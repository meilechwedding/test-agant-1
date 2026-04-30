import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config.js';
import { createTask } from './memory.js';

export const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const taskQueue = new Queue('agent-tasks', { connection });

export async function enqueueTask(goal) {
  const id = createTask(goal);
  await taskQueue.add(
    'run',
    { taskId: id, goal },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    }
  );
  return id;
}
