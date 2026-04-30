import { request } from 'undici';
import { config } from './config.js';

const GRAPH_URL = `https://graph.facebook.com/v21.0/${config.whatsapp.phoneNumberId}/messages`;

export async function sendMessage(to, text) {
  const chunks = splitForWhatsApp(text);
  for (const chunk of chunks) {
    const res = await request(GRAPH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whatsapp.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: chunk, preview_url: true },
      }),
    });
    if (res.statusCode >= 300) {
      const body = await res.body.text();
      throw new Error(`WhatsApp send failed (${res.statusCode}): ${body}`);
    }
    await res.body.dump();
  }
}

export async function notifyOwner(text) {
  return sendMessage(config.whatsapp.ownerPhone, text);
}

function splitForWhatsApp(text, max = 3500) {
  if (text.length <= max) return [text];
  const out = [];
  let buf = '';
  for (const line of text.split('\n')) {
    if ((buf + '\n' + line).length > max) {
      out.push(buf);
      buf = line;
    } else {
      buf = buf ? `${buf}\n${line}` : line;
    }
  }
  if (buf) out.push(buf);
  return out;
}

export function parseIncoming(body) {
  const entry = body?.entry?.[0]?.changes?.[0]?.value;
  const msg = entry?.messages?.[0];
  if (!msg) return null;
  const from = msg.from;
  const text = msg.text?.body
    || msg.button?.text
    || msg.interactive?.button_reply?.title
    || msg.interactive?.list_reply?.title
    || '';
  return { from, text, messageId: msg.id, type: msg.type };
}
