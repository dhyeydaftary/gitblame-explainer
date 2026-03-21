<p align="center">
  <h1 align="center">🔍 GitBlame Explainer</h1>
  <p align="center">
    <strong>A Chrome extension that brings AI-powered Git blame directly to your cursor on GitHub</strong>
  </p>
  <p align="center">
    Manifest V3 · Vanilla JavaScript · Groq AI Integration
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/javascript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  &nbsp;
  <img src="https://img.shields.io/badge/chrome%20extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome Extension">
  &nbsp;
  <img src="https://img.shields.io/badge/manifest%20v3-0F9D58?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Manifest V3">
  &nbsp;
  <img src="https://img.shields.io/badge/groq%20ai-F55036?style=for-the-badge&logo=meta&logoColor=white" alt="Groq AI">
  &nbsp;
  <img src="https://img.shields.io/badge/github%20api-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub API">
  &nbsp;
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License">
</p>

<p align="center">
  <a href="https://github.com/dhyeydaftary/gitblame-explainer">
    <img src="https://img.shields.io/github/last-commit/dhyeydaftary/gitblame-explainer?style=flat-square&label=last%20commit" alt="Last Commit">
  </a>
  &nbsp;
  <a href="https://github.com/dhyeydaftary/gitblame-explainer">
    <img src="https://img.shields.io/github/repo-size/dhyeydaftary/gitblame-explainer?style=flat-square&label=repo%20size" alt="Repo Size">
  </a>
  &nbsp;
  <a href="https://github.com/dhyeydaftary/gitblame-explainer/stargazers">
    <img src="https://img.shields.io/github/stars/dhyeydaftary/gitblame-explainer?style=flat-square" alt="Stars">
  </a>
  &nbsp;
  <a href="https://github.com/dhyeydaftary/gitblame-explainer/network/members">
    <img src="https://img.shields.io/github/forks/dhyeydaftary/gitblame-explainer?style=flat-square" alt="Forks">
  </a>
  &nbsp;
  <a href="https://github.com/dhyeydaftary/gitblame-explainer/issues">
    <img src="https://img.shields.io/github/issues/dhyeydaftary/gitblame-explainer?style=flat-square" alt="Issues">
  </a>
</p>

---

## 📑 Table of Contents

  - [Quick Start](#quick-start)
  - [Project Overview](#project-overview)
  - [How It Works](#how-it-works)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Installation Guide](#installation-guide)
  - [Configuration](#configuration)
  - [Key Technical Decisions](#key-technical-decisions)
  - [Troubleshooting](#troubleshooting)
  - [What I Learned](#what-i-learned)
  - [Future Improvements](#future-improvements)
  - [Authors](#authors)
  - [Acknowledgments](#acknowledgments)
  - [License](#license)
---

## ⚡ Quick Start

Get up and running in under 2 minutes:

```bash
# Clone & setup
git clone https://github.com/dhyeydaftary/gitblame-explainer.git

# Configure in Chrome
# 1. Open chrome://extensions
# 2. Toggle Developer mode ON
# 3. Click "Load unpacked" and select the gitblame-explainer folder

# Setup AI Provider
# 1. Click the extension icon in the toolbar
# 2. Paste your Groq API key (from console.groq.com) and Save
# 3. Open any GitHub file and hover over a code line for 1 second!
```

---

## 🔎 Project Overview

### What is GitBlame Explainer?

GitBlame Explainer is a Chrome extension that completely removes the friction of understanding who wrote a line of code and why. Instead of manually switching context to GitHub's Blame view or running `git blame` in your terminal, simply hover over any code line on GitHub.

A sleek tooltip appears beside your cursor, showing the commit author, date, message, and an AI-generated, plain-English explanation of exactly what that commit accomplished.

### Key Capabilities

| Capability | Description |
|-----------|-------------|
| 🖱️ **Hover Detection** | Seamless trigger after 1 second of hovering over code lines |
| 🧑‍💻 **Commit Context** | Instant rendering of commit SHA, date, author, and original commit message |
| 🤖 **AI Explanation** | Fast, plain-English humanization of changes powered by Groq's `llama-3.1-8b-instant` |
| ⚡ **Zero Backend** | 100% serverless operation—securely utilizes local extension background workers |
| 💾 **Intelligent Caching** | Heavy API calls are cached out of the box using `chrome.storage.local` with a 24-hour TTL |

---

## 🏗️ How It Works

The architecture relies heavily on Manifest V3 message-passing protocols to bridge the gap between restricted web page context and privileged extension workers.

```text
User hovers a code line on GitHub
        │
        ▼
content.js (Injected script)
  ├─ Detects hover via mousemove listener
  ├─ Extracts line number from LC{n} element IDs
  └─ Sends message via chrome.runtime.sendMessage
        │
        ▼
background.js (Service Worker)
  ├─ Reads API keys from chrome.storage.local
  ├─ Calls GitHub REST API v3 → fetches commit history
  ├─ Calls Groq API → generates AI explanation
  └─ Caches the result (24hr TTL) and returns data
        │
        ▼
content.js (Injected script)
  └─ Renders interactive tooltip using exact mouse coordinates
     (Shows: SHA badge, date, author, commit message, AI rationale)
```

---

## 💻 Tech Stack

| Technology | Purpose |
|-----------|---------|
| Vanilla JavaScript | Core language (no frameworks, no build tools) |
| HTML + CSS | DOM creation and styling of popup and tooltips |
| Chrome Extension API | Manifest V3 architecture (`storage`, `scripting`, etc.) |
| Service Workers | Background script handling CORS API requests |
| GitHub REST API v3 | Fetching specific line-history and commit shas |
| Groq API | LLM (`llama-3.1-8b-instant`) generation for explanations |

---

## 📂 Project Structure

```text
gitblame-explainer/
├── manifest.json      ← Extension configuration (Manifest V3)
├── background.js      ← Service worker: Handles GitHub & Groq API requests
├── content.js         ← Injected script: Hover detection & UI rendering
├── popup.html         ← Extension icon click UI (Settings)
├── popup.js           ← Logic for saving/loading keys to chrome.storage
├── popup.css          ← Styling for the settings interface
└── icons/             ← Extension branding assets (16px, 48px, 128px)
```

---

## 🚀 Installation Guide

### Step 1: Clone Repository

```bash
git clone https://github.com/dhyeydaftary/gitblame-explainer.git
```

### Step 2: Install Extension

1. Open Google Chrome.
2. In the URL bar, type: `chrome://extensions` and press Enter.
3. In the top right corner, toggle **Developer mode** to **ON**.
4. Click the **Load unpacked** button in the top left.
5. Select the `gitblame-explainer` directory you just cloned.
6. The extension should now appear in your list of loaded extensions.

---

## 🔑 Configuration

To enable the AI capabilities, you need to provide a Groq API key:

1. Click the **GitBlame Explainer** puzzle icon in your Chrome extensions bar.
2. In the popup that opens, you will see a text field for an API Key.
3. Visit [console.groq.com](https://console.groq.com) and create a free account.
4. Generate a new API Key.
5. Paste the key into the extension popup and click **Save**.
6. Refresh any open GitHub tabs for the changes to take effect.

---

## 🧠 Key Technical Decisions

- **Why Service Worker for API calls?**
  Content scripts injected into GitHub are subject to GitHub's strict Content Security Policy (CSP) and CORS restrictions. Moving the GitHub and Groq API fetches to the `background.js` Service Worker securely circumvents these restrictions.
- **Why chrome.storage over localStorage?**
  We needed the API key and caching to be accessible across completely isolated contexts (the popup script, background worker, and content scripts). Standard `localStorage` is completely domain-locked, rendering it useless for this cross-context data sharing.
- **Why Groq?**
  Groq's LPUs offer lightning-fast token generation, crucial for a hover-based UI where latency ruins the UX. Furthermore, their free tier (30 req/min, 14,400/day, no credit card required) is incredibly generous for open-source tools.
- **Caching Strategy**
  Implemented a dual-layer cache structure. In-memory caching handles repeated hovers in the same session, while `chrome.storage.local` provides a robust 24-hour Time-To-Live (TTL) cache to aggressively rate-limit redundant outbound API calls.
- **Handling GitHub's React Renderer**
  GitHub dynamically unmounts and remounts code rows as you scroll. Relying on traditional DOM mutation observers or static node selections fails. I utilized dynamic `mousemove` calculations combined with `document.elementsFromPoint()` fallbacks targeting `LC{n}` coordinate bounds to reliably snap hover intent directly to line numbers.

---

## 🔧 Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| **Tooltip not appearing** | Check `chrome://extensions` for background errors, reload extension |
| **API key invalid** | Ensure no trailing spaces. Get a new key from `console.groq.com` |
| **Groq rate limit hit** | Wait 1 minute. The free tier comfortably allows 30 requests per minute |
| **Extension not loading** | Check `manifest.json` for syntax errors or missing commas |
| **Tooltip appears in wrong position** | Try reloading the GitHub page. Scrolling fast can occasionally offset viewport calculations |
| **No commit history found** | File may be newly added in the current un-merged PR with no prior `git blame` commits |
| **Content script not injecting** | Ensure the URL format perfectly matches `github.com/*/*/blob/*` |

---

## 📚 What I Learned

Building this project was a massive dive into browser extension anatomy:

- **Chrome Extension Architecture:** Deeply navigating the constraints of Manifest V3, ephemeral service workers, and restricted scripting environments.
- **Message Passing:** Structuring reliable, asynchronous JSON payloads bridging isolated extension contexts.
- **DOM Manipulation:** Interjecting custom UI components into massive third-party web apps without breaking their existing JavaScript behavior.
- **Adapting to SPA Virtual DOMs:** Dealing gracefully with GitHub's complex, React-based scrolling canvas file viewer.
- **CORS Mitigation:** Safely proxying data without running afoul of web-standard cross-origin policies.
- **Complex UI Positioning:** Normalizing user `clientX`/`clientY` layout calculations against deeply scrolled, horizontally overflowing offset containers.

---

## 🔮 Future Improvements

### Planned

- [ ] GitHub token support to utilize the extension inside private enterprise repositories
- [ ] Cross-platform support for GitLab and Bitbucket page layouts
- [ ] Keyboard shortcut trigger (e.g., Hold shift + hover) to minimize accidental visual clutter
- [ ] "Pin" functionality to keep the tooltip persistently open while reading long commits

### Under Consideration

- [ ] Multiple AI provider support logic (Claude 3, Gemini 1.5, OpenAI)
- [ ] Natively extending the actual GitHub "Blame" window to color-code AI summaries
- [ ] Porting the underlying logic into a standalone VS Code extension
- [ ] Export explanations natively as inline PR code comments

---

## ✍️ Authors

**Dhyey Daftary** — Creator & Developer

[![GitHub](https://img.shields.io/badge/GitHub-dhyeydaftary-181717?style=flat-square&logo=github)](https://github.com/dhyeydaftary)
&nbsp;
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Dhyey%20Daftary-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/dhyey-daftary/)

*This is a solo project.*

---

## 👏 Acknowledgments

- The creators of the Groq API for making lightning-fast LLM generation accessible via brilliant free tiers.
- GitHub's robust REST API ecosystem which allows tools like this to flourish.

---

<p align="center">
  <strong>⭐ If you found this project useful, please consider giving it a star!</strong>
</p>

<p align="center">
  <a href="https://github.com/dhyeydaftary/gitblame-explainer/issues">Report Bug</a>
  ·
  <a href="https://github.com/dhyeydaftary/gitblame-explainer/issues">Request Feature</a>
</p>

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```text
MIT License — Permissions: ✅ Commercial use, ✅ Modification, ✅ Distribution
Conditions: Include copyright notice · No warranty
```