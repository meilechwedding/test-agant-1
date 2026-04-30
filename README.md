# Personal WhatsApp Agent

A relentless personal agent you talk to over WhatsApp. Give it a goal — it searches, browses, calls, codes, and executes until done.

## What it can do
- Research & summarize anything on the web
- Browse sites, fill forms, monitor prices, set alerts
- Send emails on your behalf (with approval)
- Place phone calls (Twilio + ElevenLabs voice) — negotiate, book, ask questions
- Write code, build apps, deploy them
- Remember your preferences across tasks
- Run for hours/days; reports back on WhatsApp

You stay in control: it asks for explicit YES before spending money or sending things in your name.

## Free-to-start setup

You need three free signups (no credit card required to begin):

### 1. Anthropic API key (the brain)
- https://console.anthropic.com/ → sign up → get $5 free credit
- Settings → API Keys → create key → copy `sk-ant-...`

### 2. WhatsApp Cloud API (the gateway)
- https://developers.facebook.com/ → log in with Facebook → Create App → "Business"
- Add product: **WhatsApp** → use the free test number Meta gives you
- Copy: **Access Token**, **Phone Number ID**
- Add YOUR phone number as a recipient (free tier allows up to 5 testers)
- Make up any random string for `WHATSAPP_VERIFY_TOKEN` (you'll paste the same one into Meta later)

### 3. Fly.io (the server, free)
- https://fly.io/ → sign up
- Install the CLI: `curl -L https://fly.io/install.sh | sh`
- `fly auth login`

### 4. Upstash Redis (the queue, free)
- https://upstash.com/ → sign up → Create Redis database → copy the `redis://...` URL

### 5. (Optional, later) Twilio for voice calls
- https://www.twilio.com/try-twilio → free trial credit (~$15)
- Buy a phone number, copy SID + Auth Token

## Deploy

```bash
# 1. clone & install
git clone <this repo>
cd whatsapp-personal-agent
cp .env.example .env
# fill in .env with the keys from above

# 2. create Fly app
fly launch --no-deploy --copy-config --name whatsapp-personal-agent

# 3. push secrets to Fly (don't commit .env!)
fly secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  WHATSAPP_TOKEN=EAAG... \
  WHATSAPP_PHONE_NUMBER_ID=... \
  WHATSAPP_VERIFY_TOKEN=... \
  OWNER_PHONE_NUMBER=15551234567 \
  REDIS_URL=redis://... \
  PUBLIC_URL=https://whatsapp-personal-agent.fly.dev

# 4. deploy
fly deploy

# 5. start the worker process too
fly scale count web=1 worker=1
```

## Wire WhatsApp to your server

In Meta Developer Console → WhatsApp → Configuration:
- **Callback URL**: `https://whatsapp-personal-agent.fly.dev/webhook`
- **Verify Token**: same string you put in `.env`
- Subscribe to: `messages`

Test by sending your test number a WhatsApp message. The agent should reply.

## Talking to your agent

Just message it like a person:

- "Find me a flight to Tel Aviv next week, budget $1300, push hard."
- "Research the top 5 GPU rental providers, email summary to me by tomorrow."
- "Build a landing page for my new business at the domain mything.com and deploy it."
- "Watch this YouTube interview <url> and give me the 10 best quotes."

Slash commands:
- `/status` — list recent tasks and statuses
- `/stop` — cancel running tasks

## Cost when free credit runs out
- Server (Fly.io): free tier, or ~$2/mo if you outgrow it
- Redis (Upstash): free
- WhatsApp: free for personal use
- Anthropic API: pay-as-you-go, ~$0.10–$5 per task depending on length
- Twilio voice (optional): $0.013/min outbound

Total: ~$10–50/month for heavy daily use.

## Architecture

```
WhatsApp → Meta Cloud API → /webhook (Express)
                                ↓
                          BullMQ queue (Redis)
                                ↓
                    Worker → Claude Agent SDK → tools:
                                                  - web_search / browse
                                                  - place_call (Twilio)
                                                  - send_email
                                                  - notify_owner (WA reply)
                                                  - save_memory (SQLite)
                                                  - request_approval
```
