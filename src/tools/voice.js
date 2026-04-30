// Voice-call tool: place a phone call via Twilio, speak with ElevenLabs voice,
// have the call driven by Claude. Wire into the agent later as a custom tool.
//
// MVP flow:
//  1. Agent calls place_call({ to, objective, max_minutes }).
//  2. We open a Twilio call; Twilio hits our /voice TwiML endpoint.
//  3. Each turn: gather speech -> send to Claude with the objective + transcript ->
//     get reply -> speak with ElevenLabs (or Twilio <Say>) -> repeat.
//  4. On hangup, return transcript to the agent.
//
// This file is the placeholder skeleton — fully wired in a follow-up.

import twilio from 'twilio';
import { config } from '../config.js';

export function twilioClient() {
  if (!config.twilio.sid) throw new Error('Twilio not configured');
  return twilio(config.twilio.sid, config.twilio.token);
}

export async function placeCall({ to, objective }) {
  const client = twilioClient();
  const call = await client.calls.create({
    to,
    from: config.twilio.from,
    url: `${config.publicUrl}/voice/twiml?objective=${encodeURIComponent(objective)}`,
    record: true,
  });
  return { callSid: call.sid, status: call.status };
}
