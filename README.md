# ⚡ 20 AI Tools in 20 Days

> **Real AI. Real email access. Zero backend.**
> One production-ready automation tool dropping every day for 20 days. Free. No login. Runs 100% in your browser.

**🔴 Live site:** [aimersion.github.io/ai-automations](https://aimersion.github.io/ai-automations/)
**Built by:** [Aimersion AI](https://aimersion.ai)

---

## What is this?

Each day for 20 days, one new AI-powered tool goes live — fully working, no paywall, no account required. Tools connect directly to your Gmail, Outlook, Google Calendar, and Microsoft Calendar via secure OAuth. Your data never touches our servers. Everything runs in your browser tab.

You need one free API key from [Google AI Studio](https://aistudio.google.com/apikey) to get started. That's it.

---

## Tools — Release Status

| Day | Tool | What It Does | Status |
|-----|------|-------------|--------|
| 01 | 📬 **[Inbox Intelligence](https://aimersion.github.io/ai-automations/day-01-inbox-intelligence.html)** | Connects to your Gmail and Outlook inbox, triages emails by priority, and drafts smart replies in your voice | ✅ **Live** |
| 02 | 📝 **[Proposal Generator](https://aimersion.github.io/ai-automations/day-02-proposal-generator.html)** | Turn a prospect's pain points into a polished, tailored sales proposal in minutes | ✅ **Live** |
| 03 | 🎯 **[Competitor Intel Brief](https://aimersion.github.io/ai-automations/day-03-competitor-intel.html)** | Drop in a competitor's URL and get a full battlecard — positioning, strengths, weaknesses, and talking points | ✅ **Live** |
| 04 | 📣 **[Social Content Machine](https://aimersion.github.io/ai-automations/day-04-social-content-machine.html)** | Paste any topic or URL → get a full X thread, LinkedIn post, and 5 viral hooks ready to copy in seconds | ✅ **Live** |
| 05 | 🔒 **[Pipeline Prioritizer](https://aimersion.github.io/ai-automations/day-05-pipeline-prioritizer.html)** | Paste your CRM deals and let AI rank which to work this week — with reasoning and next actions for each | ✅ **Live** |
| 06 | 🗓️ **[Meeting Prep Brief](https://aimersion.github.io/ai-automations/day-06-meeting-prep.html)** | Paste a meeting invite and get a full briefing — attendee research, agenda, talk track, and objection prep | ✅ **Live** |
| 07 | 🤝 **[Client Onboarding Kit](https://aimersion.github.io/ai-automations/day-07-client-onboarding.html)** | Generate a full onboarding package in seconds — welcome email, kickoff agenda, week 1 checklist, and intake questionnaire | ✅ **Live** |
| 08 | 📨 **[Follow-Up Machine](https://aimersion.github.io/ai-automations/day-08-followup-machine.html)** | Meeting just ended? Connect Outlook, add your notes, and send a polished follow-up email with action items and a CRM note — in 60 seconds | ✅ **Live** |
| 09 | 📊 **[Weekly Status Report](https://aimersion.github.io/ai-automations/day-09-weekly-status.html)** | Connect Outlook and Microsoft Calendar — AI reads your sent emails and meetings from the past week and writes your status report for you | ✅ **Live** |
| 10 | 🎯 **[Cold Outreach Personalizer](https://aimersion.github.io/ai-automations/day-10-cold-outreach.html)** | Paste a company name and what you do — AI researches their world and generates a personalized cold email, LinkedIn DM, and 3-touch follow-up sequence | ✅ **Live** |
| 11 | 📄 **[Scope of Work Generator](https://aimersion.github.io/ai-automations/day-11-scope-of-work.html)** | Pull context from your proposal emails, fill in the project details, and generate a complete professional SOW ready to send to the client via Outlook | ✅ **Live** |
| 12 | 🔒 | *Unlocks Day 12* | 🔒 Coming |
| 13 | 🔒 | *Unlocks Day 13* | 🔒 Coming |
| 14 | 🔒 | *Unlocks Day 14* | 🔒 Coming |
| 15 | 🔒 | *Unlocks Day 15* | 🔒 Coming |
| 16 | 🔒 | *Unlocks Day 16* | 🔒 Coming |
| 17 | 🔒 | *Unlocks Day 17* | 🔒 Coming |
| 18 | 🔒 | *Unlocks Day 18* | 🔒 Coming |
| 19 | 🔒 | *Unlocks Day 19* | 🔒 Coming |
| 20 | 🔒 | *Unlocks Day 20* | 🔒 Coming |

*Follow [on X](https://x.com/jimlynchAI) or [LinkedIn](https://linkedin.com/in/jimlynch) — a new tool drops every day.*

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  User's Browser Tab                  │
│                                                     │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │  Gmail OAuth │  │  MSAL.js    │  │  gcal     │  │
│  │  (GIS)       │  │  (Outlook)  │  │  OAuth    │  │
│  └──────┬───────┘  └──────┬──────┘  └─────┬─────┘  │
│         │                 │               │         │
│         └────────────┬────┘               │         │
│                      │    ┌───────────────┘         │
│                      ▼    ▼                         │
│              ┌──────────────────┐                   │
│              │  Tool HTML/JS    │                   │
│              │  (your browser)  │                   │
│              └────────┬─────────┘                   │
│                       │                             │
│          ┌────────────┼────────────┐                │
│          ▼            ▼            ▼                │
│        Gemini API           Anthropic API            │
│        (your key)           (your key)               │
└─────────────────────────────────────────────────────┘
```

- **No backend** — GitHub Pages only, zero server-side code
- **No data storage** — OAuth tokens in `sessionStorage`, API keys in `localStorage`, cleared when you close the tab
- **OAuth 2.0** — Google Identity Services (Gmail/Calendar) + MSAL.js 2.x (Outlook/M365)
- **AI** — Gemini 3.1 Flash Lite Preview (all tools)
- **Open source** — fork it, self-host it, modify it however you want

---

## Getting Started

**To use a tool:**
1. Visit [aimersion.github.io/ai-automations](https://aimersion.github.io/ai-automations/)
2. Get a free Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (no credit card)
3. Paste it when prompted — it saves in your browser
4. Connect Gmail or Outlook via the OAuth button
5. That's it

**To run locally:**
```bash
git clone https://github.com/aimersion/ai-automations.git
cd ai-automations
# Open any .html file directly in Chrome
# Note: OAuth redirect URIs are registered to aimersion.github.io
# For full OAuth support, host on a registered domain
```

**To unlock a Coming Soon tool** (once it's been released):
In the day's HTML file, delete the block between the `═══ COMING SOON OVERLAY` comment markers. In `index.html`, change the `<div class="tool-card-locked">` to `<a href="day-XX-...html" class="tool-card">`.

---

## API Keys

| Key | Where to Get It | Which Tools |
|-----|----------------|-------------|
| Gemini (required) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free | All tools |

Keys are stored in your browser's `localStorage`. They are only ever sent directly to Google's API — never to us.

---

## Contributing

PRs welcome. Each tool is a single self-contained HTML file — no build step, no dependencies to install.

- **Bug fix**: Submit a PR against the relevant `day-XX-*.html` file
- **New tool idea**: Open an issue — we're always looking for the next automation
- **Self-host**: Fork the repo, update the OAuth Client IDs to your own, deploy anywhere

---

## Follow Along

New tool drops every day. Follow the series:
- 🌐 [aimersion.github.io/ai-automations](https://aimersion.github.io/ai-automations/)
- 🐦 Share on X: [Tweet about this](https://twitter.com/intent/tweet?text=11%20of%2020%20free%20AI%20tools%20now%20live%20%E2%80%94%20Day%2011%3A%20Scope%20of%20Work%20Generator%20just%20dropped%20%F0%9F%94%A5%20by%20%40jimlynchAI&url=https://aimersion.github.io/ai-automations/)
- 💼 [Aimersion AI](https://aimersion.ai)

---

*Built by [Aimersion](https://aimersion.ai) · Free & open source · MIT License*
