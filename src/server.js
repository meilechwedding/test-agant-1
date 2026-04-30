import express from 'express';
import { config } from './config.js';
import { parseIncoming, sendMessage } from './whatsapp.js';
import { enqueueTask } from './queue.js';
import { db, recordMessage } from './memory.js';

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

// WhatsApp webhook verification (Meta calls this once on setup)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Incoming WhatsApp messages
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // ack immediately so Meta doesn't retry
  try {
    const msg = parseIncoming(req.body);
    if (!msg) return;
    if (msg.from !== config.whatsapp.ownerPhone) {
      await sendMessage(msg.from, "Sorry, this is a private agent.");
      return;
    }
    recordMessage({ role: 'user', content: msg.text, from: msg.from });

    // Quick commands
    if (/^\/(stop|cancel)\b/i.test(msg.text)) {
      await sendMessage(msg.from, 'Cancelling active tasks...');
      db.prepare("UPDATE tasks SET status='cancelled' WHERE status IN ('queued','running')").run();
      return;
    }
    if (/^\/(status|tasks)\b/i.test(msg.text)) {
      const rows = db.prepare("SELECT id, goal, status FROM tasks ORDER BY id DESC LIMIT 10").all();
      const summary = rows.length
        ? rows.map(r => `#${r.id} [${r.status}] ${r.goal.slice(0, 60)}`).join('\n')
        : 'No tasks yet.';
      await sendMessage(msg.from, summary);
      return;
    }

    // Otherwise: treat as a goal for the agent
    const taskId = await enqueueTask(msg.text);
    await sendMessage(msg.from, `Got it. Working on task #${taskId}. I'll push hard and report back.`);
  } catch (err) {
    console.error('webhook error', err);
  }
});

app.listen(config.port, () => {
  console.log(`webhook listening on :${config.port}`);
});
