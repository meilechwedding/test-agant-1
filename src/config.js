import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  anthropicApiKey: required('ANTHROPIC_API_KEY'),
  whatsapp: {
    token: required('WHATSAPP_TOKEN'),
    phoneNumberId: required('WHATSAPP_PHONE_NUMBER_ID'),
    verifyToken: required('WHATSAPP_VERIFY_TOKEN'),
    ownerPhone: required('OWNER_PHONE_NUMBER'),
  },
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_PHONE_NUMBER,
  },
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
  },
  redisUrl: required('REDIS_URL'),
  port: Number(process.env.PORT || 8080),
  publicUrl: process.env.PUBLIC_URL,
};
