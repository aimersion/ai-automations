# ⚡ 20 AI Tools in 20 Days

> **Real AI. Real email access. Zero backend.**
> 20 production-ready automation tools — all live, all free. No login. Runs 100% in your browser.

**🔴 Live site:** [aimersion.github.io/ai-automations](https://aimersion.github.io/ai-automations/)
**Built by:** [Aimersion AI](https://aimersion.ai)

---

## What is this?

20 free AI-powered tools — all live. Connect your Outlook and Microsoft Calendar via secure OAuth. Your data never touches our servers. Everything runs in your browser tab.

You need one free API key from [Google AI Studio](https://aistudio.google.com/apikey) to get started. That's it.

---

## Tools — All 20 Live

| Day | Tool | What It Does | Status |
|-----|------|-------------|--------|
| 01 | 📬 **[Inbox Intelligence](https://aimersion.github.io/ai-automations/day-01-inbox-intelligence.html)** | Connects to Outlook, triages emails by priority, and drafts smart replies in your voice | ✅ **Live** |
| 02 | 📝 **[Proposal Generator](https://aimersion.github.io/ai-automations/day-02-proposal-generator.html)** | Turn a prospect's pain points into a polished, tailored sales proposal in minutes | ✅ **Live** |
| 03 | 🔍 **[Competitor Intel Brief](https://aimersion.github.io/ai-automations/day-03-competitor-intel.html)** | Drop in a competitor's name and get a full battlecard — positioning, strengths, weaknesses, and talking points | ✅ **Live** |
| 04 | 📱 **[Social Content Machine](https://aimersion.github.io/ai-automations/day-04-social-content-machine.html)** | Paste a topic → get a full week of X, LinkedIn, and Facebook posts ready to copy | ✅ **Live** |
| 05 | 📊 **[Pipeline Prioritizer](https://aimersion.github.io/ai-automations/day-05-pipeline-prioritizer.html)** | Paste your CRM deals and let AI rank which to work this week — with reasoning and next actions | ✅ **Live** |
| 06 | 🎯 **[Meeting Prep Brief](https://aimersion.github.io/ai-automations/day-06-meeting-prep.html)** | Paste a meeting invite and get a full briefing — agenda, talk track, and objection prep | ✅ **Live** |
| 07 | 🎉 **[Client Onboarding Kit](https://aimersion.github.io/ai-automations/day-07-client-onboarding.html)** | Generate a full onboarding package — welcome email, kickoff agenda, week 1 checklist, intake questionnaire | ✅ **Live** |
| 08 | 📨 **[Follow-Up Machine](https://aimersion.github.io/ai-automations/day-08-followup-machine.html)** | Meeting just ended? Add your notes, send a polished follow-up with action items via Outlook in 60 seconds | ✅ **Live** |
| 09 | 📊 **[Weekly Status Report](https://aimersion.github.io/ai-automations/day-09-weekly-status.html)** | Connect Outlook + Calendar — AI reads your week and writes your status report for you | ✅ **Live** |
| 10 | 🎯 **[Cold Outreach Personalizer](https://aimersion.github.io/ai-automations/day-10-cold-outreach.html)** | Paste a company name — AI generates a personalized cold email, LinkedIn DM, and 3-touch follow-up sequence | ✅ **Live** |
| 11 | 📄 **[Scope of Work Generator](https://aimersion.github.io/ai-automations/day-11-scope-of-work.html)** | Pull context from proposal emails, fill in project details, generate a complete SOW ready to send via Outlook | ✅ **Live** |
| 12 | 💰 **[Invoice & Quote Generator](https://aimersion.github.io/ai-automations/day-12-invoice-generator.html)** | Add line items, toggle Invoice/Quote mode, get a polished document with auto-calculated totals, send via Outlook | ✅ **Live** |
| 13 | 💼 **[Job Description Writer](https://aimersion.github.io/ai-automations/day-13-job-description.html)** | Enter role details → full JD, LinkedIn version, candidate outreach email, and internal hiring brief | ✅ **Live** |
| 14 | ⭐ **[Performance Review Writer](https://aimersion.github.io/ai-automations/day-14-performance-review.html)** | Rate on 5 dimensions, paste accomplishments → complete balanced review with summary email and talking points | ✅ **Live** |
| 15 | 📋 **[Contract Summarizer](https://aimersion.github.io/ai-automations/day-15-contract-summarizer.html)** | Paste any contract or pull from Outlook → key terms, obligations, red flags, and action items in 30 seconds | ✅ **Live** |
| 16 | 🗓️ **[Standup Generator](https://aimersion.github.io/ai-automations/day-16-standup-generator.html)** | Connect Outlook + Calendar → AI reads your last 24 hours and writes your standup in seconds | ✅ **Live** |
| 17 | 📧 **[Email Sequence Builder](https://aimersion.github.io/ai-automations/day-17-email-sequence.html)** | Describe your goal → complete 5-email sequence with subject lines, copy, and timing. Edit inline. Send Email 1 now. | ✅ **Live** |
| 18 | 🏆 **[Deal Room Builder](https://aimersion.github.io/ai-automations/day-18-deal-room.html)** | Enter deal details → full strategy doc with stakeholder map, value props, objection guide, and champion email | ✅ **Live** |
| 19 | 🧠 **[AI Chief of Staff](https://aimersion.github.io/ai-automations/day-19-chief-of-staff.html)** | Connect Outlook + Calendar → full morning brief in 30 seconds. What happened, what matters, what to do first. | ✅ **Live** |
| 20 | 🚀 **[AI Command Center](https://aimersion.github.io/ai-automations/day-20-command-center.html)** | One screen. Five modules. Inbox triage, morning brief, AI compose, deal tracker, sequence launcher. The whole series in one tab. | ✅ **Live** |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  User's Browser Tab                  │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  MSAL.js 2.x  (Outlook / Microsoft 365)     │    │
│  │  Mail.Read · Mail.Send · Calendars.Read      │    │
│  └──────────────────────┬──────────────────────┘    │
│                         │                           │
│              ┌──────────▼──────────┐                │
│              │  Tool HTML/JS        │                │
│              │  (your browser)      │                │
│              └──────────┬──────────┘                │
│                         │                           │
│                         ▼                           │
│              Gemini 3.1 Flash Lite Preview           │
│              (your free API key)                    │
└─────────────────────────────────────────────────────┘
```

- **No backend** — GitHub Pages only, zero server-side code
- **No data storage** — OAuth tokens in `sessionStorage`, API keys in `localStorage`
- **OAuth 2.0** — MSAL.js 2.x for Outlook/Microsoft 365
- **AI** — Gemini 3.1 Flash Lite Preview (all 20 tools)
- **Open source** — fork it, self-host it, modify it however you want

---

## Getting Started

1. Visit [aimersion.github.io/ai-automations](https://aimersion.github.io/ai-automations/)
2. Get a free Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (no credit card)
3. Paste it when prompted — it saves in your browser for all 20 tools
4. For email/calendar tools: click the Outlook connect button (one-time popup)
5. That's it

**To run locally:**
```bash
git clone https://github.com/aimersion/ai-automations.git
cd ai-automations
# Open any .html file directly in Chrome
# Note: OAuth redirect URIs are registered to aimersion.github.io
```

---

## API Keys

| Key | Where to Get It | Which Tools |
|-----|----------------|-------------|
| Gemini (required) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free | All 20 tools |

Keys are stored in your browser's `localStorage`. They are only ever sent directly to Google's API — never to us.

---

## Contributing

PRs welcome. Each tool is a single self-contained HTML file — no build step, no dependencies to install.

- **Bug fix**: Submit a PR against the relevant `day-XX-*.html` file
- **New tool idea**: Open an issue
- **Self-host**: Fork the repo, update the Azure Client ID to your own app registration, deploy anywhere

---

## Follow Along

- 🌐 [aimersion.github.io/ai-automations](https://aimersion.github.io/ai-automations/)
- 𝕏 [@jimlynchAI](https://x.com/jimlynchAI)
- 💼 [Aimersion AI](https://aimersion.ai)

---

*Built by [Aimersion](https://aimersion.ai) · Free & open source · MIT License*
