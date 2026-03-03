# 20 Automations in 20 Days

Real AI-powered tools built with Gmail, Outlook, Google Calendar, Gemini 2.5 Flash, and xAI Grok.

🚀 **Live site:** [aimersion.github.io/ai-automations](https://aimersion.github.io/ai-automations/)

---

## Tools

| Day | Tool | What It Does |
|-----|------|-------------|
| 1 | Inbox Intelligence | Triages Gmail + Outlook with Gemini AI |
| 2 | Proposal Generator | Writes proposals using your email context |
| 3 | Competitor Intel | Live competitive research via Gemini + Google Search |
| 4 | Social Creator | X threads + LinkedIn posts via Gemini or Grok |
| 5 | Meeting Prep | AI-powered prep briefs from your calendar |

---

## Architecture

- **100% client-side** — no backend, no server, no data stored anywhere
- **OAuth 2.0** — Gmail/Calendar via Google Identity Services, Outlook/M365 via MSAL.js
- **AI** — Gemini 2.5 Flash (primary), xAI Grok (social tool)
- **Hosted** on GitHub Pages (free, HTTPS)

## API Keys Needed

Each tool prompts for the keys it needs:
- **Gemini API key** — [aistudio.google.com](https://aistudio.google.com) (free tier available)
- **xAI Grok API key** — [console.x.ai](https://console.x.ai) (Day 4 only)
- Keys are stored in `localStorage` on your device only — never sent anywhere except the respective AI API

## OAuth Setup

- **Google** — Authorized via Google Cloud Console (Client ID pre-configured)
- **Microsoft** — Authorized via Azure App Registration (Client ID pre-configured)

---

*Built by [Aimersion](https://aimersion.ai)*
