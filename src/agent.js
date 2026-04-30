import { query } from '@anthropic-ai/claude-agent-sdk';
import { config } from './config.js';
import { notifyOwner } from './whatsapp.js';
import { recallAll, remember, updateTask, recordMessage } from './memory.js';

const SYSTEM_PROMPT = `
You are the user's PERSONAL AGENT — a tireless senior operator who gets things done end-to-end.
The user talks to you over WhatsApp. Treat every message as a goal to accomplish, not a question to answer.

CORE PRINCIPLES:
1. PUSH HARD. The user has explicitly told you: "you don't push hard enough to find what I'm looking for." Do not give up. If one approach fails, try another. If a website blocks you, try a different site, an API, an email, a phone call. Exhaust real options before reporting failure.
2. LONG HORIZON. A task may take hours or days. That's fine. Keep going. Use the queue to spawn sub-tasks. Save progress to memory.
3. RESULT-ORIENTED. Don't return "here's what you could do" — actually do it. Book the flight, draft the email and send it, build the app and deploy it.
4. PROACTIVE NEGOTIATION. If you find a flight at $1500 and budget is $1300, search for alternative dates, alternative airports, contact travel agents, set price alerts, call airlines via the call_phone tool. Don't just report the $1500.
5. NOTIFY ON PROGRESS. Use notify_owner for: (a) major milestones, (b) needing approval for spending/sending, (c) needing info you don't have, (d) final result. Do NOT spam — at most every 30 min unless asked.
6. ASK FOR APPROVAL before: spending money, sending messages/emails in user's name, signing up for paid services, irreversible actions.
7. REMEMBER. Use save_memory for anything that should persist (preferences, contacts, ongoing context). Memory is automatically loaded next time.

You have tools: web search, web browsing (Playwright), code execution, file operations, sending email, making phone calls (via Twilio + ElevenLabs), notifying the owner on WhatsApp, and saving/recalling memory.

Begin every task by:
1. Stating the goal back in one line.
2. Listing the concrete steps you will take.
3. Executing step 1.
`.trim();

function buildTools() {
  return [
    {
      name: 'notify_owner',
      description: 'Send a WhatsApp message to the owner. Use for progress updates, questions, approval requests, or final results.',
      input_schema: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
      },
      handler: async ({ message }) => {
        await notifyOwner(message);
        return 'sent';
      },
    },
    {
      name: 'save_memory',
      description: 'Persist a key/value memory about the user (preferences, contacts, ongoing project state). Survives across tasks.',
      input_schema: {
        type: 'object',
        properties: { key: { type: 'string' }, value: { type: 'string' } },
        required: ['key', 'value'],
      },
      handler: async ({ key, value }) => {
        remember(key, value);
        return 'saved';
      },
    },
    {
      name: 'request_approval',
      description: 'Ask the owner via WhatsApp for explicit approval before an irreversible/spending action. Returns owner reply.',
      input_schema: {
        type: 'object',
        properties: { question: { type: 'string' } },
        required: ['question'],
      },
      handler: async ({ question }) => {
        await notifyOwner(`APPROVAL NEEDED: ${question}\nReply YES or NO.`);
        // For now: pause and surface to human. A future iteration polls the approvals table.
        return 'pending — owner notified, retry the action after they reply';
      },
    },
  ];
}

export async function runAgent({ taskId, goal }) {
  const memorySnapshot = recallAll().map(m => `- ${m.key}: ${m.value}`).join('\n') || '(none)';
  const userPrompt = `
GOAL: ${goal}

KNOWN MEMORY:
${memorySnapshot}

Begin now. Push hard until done.
`.trim();

  updateTask(taskId, { status: 'running' });
  recordMessage({ taskId, role: 'user', content: goal });

  let final = '';
  try {
    const stream = query({
      prompt: userPrompt,
      options: {
        systemPrompt: SYSTEM_PROMPT,
        model: 'claude-opus-4-7',
        apiKey: config.anthropicApiKey,
        // Built-in tools available via the Agent SDK: web_search, bash, str_replace_editor, etc.
        // Plus our custom tools below.
        tools: buildTools(),
        maxTurns: 200, // long-horizon
        permissionMode: 'auto', // tools auto-run; request_approval gates the dangerous ones
      },
    });

    for await (const event of stream) {
      if (event.type === 'assistant_message' && event.text) {
        final = event.text;
      }
    }
    updateTask(taskId, { status: 'done', result: final.slice(0, 4000) });
    recordMessage({ taskId, role: 'assistant', content: final });
    await notifyOwner(`Task #${taskId} complete.\n\n${final.slice(0, 3000)}`);
  } catch (err) {
    console.error('agent error', err);
    updateTask(taskId, { status: 'error', result: String(err).slice(0, 1000) });
    await notifyOwner(`Task #${taskId} hit an error: ${err.message}. I'll retry.`);
    throw err;
  }
}
