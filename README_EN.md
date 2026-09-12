<p align="center">
  <img src="https://img.shields.io/badge/version-0.0.9-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/Node.js-SEA-339933?style=flat-square&logo=node.js" alt="Node.js SEA" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/DeepSeek-AI-4D6BFE?style=flat-square" alt="DeepSeek" />
  <img src="https://img.shields.io/badge/Platform-Windows-0078D4?style=flat-square&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

<p align="center">
  <img src="public/icon.ico" alt="ChillPass icon" width="110" height="110" />
</p>

<h1 align="center">ChillPass</h1>

<p align="center">
  <strong>Your AI study companion — from final-exam sprints to paper writing</strong>
</p>

<p align="center">
  <a href="README.md">简体中文</a> &bull;
  English &bull;
  <a href="README_RU.md">Русский</a> &bull;
  <a href="README_JA.md">日本語</a> &bull;
  <a href="README_KO.md">한국어</a>
</p>

<p align="center">
  <a href="#core-features">Core Features</a> &bull;
  <a href="#installation">Installation</a> &bull;
  <a href="#join-the-community">Community</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="https://github.com/Koipoppy/ChillPass-Web/releases">Download</a>
</p>

<p align="center">
  <a href="https://github.com/Koipoppy/ChillPass-Web/releases/latest">
    <img src="https://img.shields.io/badge/Download-ChillPass%20Setup%200.0.9.exe-blue?style=for-the-badge" alt="Download" />
  </a>
</p>

---

## What is ChillPass?

ChillPass is a **desktop app** that turns your course materials (PDF, Word, PPTX, TXT, MD) into a **quest-style learning experience**. Upload your courseware and the AI engine automatically extracts exam points, builds structured lessons with worked examples, and creates adaptive quizzes — everything ranked by how likely it is to appear on the exam.

Since **v1.2.3**, ChillPass has been rebuilt as a **browser-style web app** packaged into a standalone Windows executable via Node.js SEA (Single Executable Application). No Electron, no heavy runtime — just a single `chillpass.exe` that starts a local HTTP server and opens your default browser. Data is stored 100% locally (IndexedDB + localStorage) and runs fully offline.

**Workflow:**

```
Upload materials → AI extracts exam points → Build quest path → Clear quests one by one
                                ↓
        Must-know / High-frequency / Aware (three priority levels)
                                ↓
      Concept explainers → Worked examples → Quizzes → Earn Chill Coins
                                ↓
                   Athena, the AI agent
        ┌──────────────┼──────────────┐
    Paper writing    Report writing   Knowledge summaries
        └──────────────┼──────────────┘
                Study planning
```

---

## Core Features

### Quest-Style Learning Engine

| Feature | Description |
|---------|-------------|
| **AI exam-point extraction** | DeepSeek analyzes your materials, extracts exam points, and classifies them into three priority levels |
| **Batch processing** | 200+ page PDFs are chunked, processed in parallel, and deduplicated — not a single page missed |
| **Progressive unlock** | Clear one quest to unlock the next. Each quest includes concepts, worked examples, and a clearance quiz |
| **Adaptive quizzes** | One question per page with progress navigation. Wrong answer? A brand-new question on the same point is generated until you master it |
| **Regenerate & skip** | Stuck? Regenerate a new question on the same point for free, or spend 10 Chill Coins to skip |
| **Dynamic difficulty** | Question count scales with priority — 4-5 questions for must-know points, 2 for aware-level ones |
| **Course management** | Export any course (with all generated quests) as JSON to share, import a friend's course, or uninstall courses you no longer need |
| **Duplicate detection** | Importing a course with the same name shows a replace confirmation — no more duplicated courses |

### Six Question Types + AI Grading

```
┌─────────────────┬──────────────────────────────────────────────┐
│    Question type │                   Behavior                   │
├─────────────────┼──────────────────────────────────────────────┤
│  Single choice  │ 4 options, instant right/wrong feedback      │
│  Multiple select│ 4-6 options, at least 2 correct, graded on submit │
│  Fill in blank  │ Free-text input, keyword matching + AI grading │
│  Short answer   │ Free response, AI graded with reference answer │
│  Calculation    │ Step-by-step solutions, graded step by step  │
│  Essay          │ Long-form answers, graded on structure       │
└─────────────────┴──────────────────────────────────────────────┘
```

Wrong answers trigger **adaptive retries**:
- **Choice questions** → options shuffled, try again
- **Fill-in / short answer** → the AI generates a brand-new question on the same point

### Local Account System

A fully offline account system — no servers, no sign-in, no tracking:

| Capability | Description |
|-----------|-------------|
| **Auto-created** | A default local account is created on first launch, no registration needed |
| **Profile editing** | Set a nickname, pick from 12 emoji avatars, add a bio |
| **Export / import** | Export the account as a JSON file and import it on a new device to migrate |
| **Privacy first** | All account data lives in browser localStorage and never leaves your machine |

### Athena — the AI Agent

Athena is not just a chatbot; it's a full agent with **abilities**, **memory**, and **task workflows**:

| Ability | Description |
|-----------|-------------|
| **Free Q&A** | DeepSeek-powered, context-aware conversation grounded in your course materials |
| **Paper writing** | Structured academic paper generation — topic, length, outline, and requirements are all customizable |
| **Report writing** | Lab reports, research reports, book reports — proper format, complete structure |
| **Knowledge summaries** | Systematic review of core concepts across chapters |
| **Study planning** | A personalized study plan based on your exam date and weak spots |
| **Ability management** | Auto-discovered + manually added skills, exportable across devices |
| **Memory system** | Charter memory (user-managed identity/rules) + flow memory (agent-managed context) |
| **Image OCR** | Snap a photo → Tesseract.js recognizes it → the AI explains it |
| **Status indicator** | A live status bar showing idle / thinking / working |

### Chill Coins Economy

A virtual currency that ties studying to instant rewards:

- **Earn**: clear quiz quests (30-40 coins) + 1 coin per minute of study time
- **Spend**: unlock quests (30-40 coins) + skip quiz questions (10 coins each)
- **Track**: balance is shown live on the dashboard, sidebar, and quest path, with a bounce animation

### Teacher Workspace

A separate workspace built for teachers (enable "I'm a teacher" in Settings):

- **AI question generation** — generate 6 question types from course materials (single choice, multiple select, fill in blank, short answer, calculation, essay), with adjustable difficulty and question count (1-50, freely typed)
- **Smart type matching** — the AI analyzes each exam point and picks the most suitable question type (formulas → calculation, concepts → short answer)
- **Smart grouping** — questions are auto-grouped by type, each group collapsible
- **Full preview** — every question shown in full, with KaTeX formula rendering
- **PDF export** — professional exam papers:
  - Bordered student info bar (name, student ID, class)
  - Per-section point totals
  - Answer lines for subjective questions
  - A separate answer key page with step-by-step solutions for calculation problems
  - KaTeX formula rendering in print output
- **Export in 5 languages** — the whole paper is translated before export (Chinese, English, Japanese, Korean, Russian)
- **Retries & timeouts** — robust API calls: 3 retries, 90-second timeout, dynamic token cap

### System Tray & Auto Update

| Feature | Description |
|-----------|-------------|
| **System tray icon** | Native Windows tray icon (PowerShell-based) with "Open in Browser" and "Quit" — disappears automatically when the server exits |
| **Update check** | Checks GitHub Releases for new versions; supports silent mode (auto download + install) and GUI mode (WinForms progress dialog) |
| **Proxy fallback** | Falls back to a GitHub proxy mirror when direct downloads fail |
| **In-app update check** | One-click check on the Settings page; says "you're up to date" when current, or shows a confirm dialog to auto download and install |
| **New-version alert** | The task card checks for updates on launch; a persistent banner with one-click download appears when a new version is found (falls back to browser download if auto update is unavailable) |

### Themes (4)

| Theme | Style |
|-------|-------|
| **Light** | Translucent liquid glass, clean and minimal |
| **Dark** | High contrast (#0d0d0f background), pure white text, optimized for reading |
| **Vista** | Translucent glass windows with a classic Aero feel |
| **Codex** | Terminal minimalism in a monospace font |

### 5 Languages

Chinese, English, Russian, Japanese, Korean — switch with one click in Settings, or pick during the first-launch welcome tour. 629 translation keys cover the entire UI plus service-level messages (errors, parsing, update dialogs); this README is also available in all five languages.

### Help System

The round help button next to the focus-mode button opens a help dialog with:
- **Introduction** — what ChillPass is and how to use it
- **Quick tips** — 10 tips covering every major feature
- **Developer contacts** — GitHub repo, WeChat, and the official QQ group QR code

---

## Installation

### Download & install (recommended)

Head to [Releases](https://github.com/Koipoppy/ChillPass-Web/releases) → download `ChillPass-Setup-0.0.9.exe` → install.

> Windows 10/11 (64-bit). Per-user install (no admin rights required). A desktop shortcut is created automatically after install. Your data is preserved when updating.

### Build from source

```bash
git clone https://github.com/Koipoppy/ChillPass-Web.git
cd ChillPass-Web
npm install

# ── Dev mode (browser only) ──
npm run dev                  # Vite dev server at http://localhost:5173

# ── Production build ──
npm run build                # Vite build → dist/

# ── Build the standalone executable ──
# Requires: Node.js 22+ (SEA), NSIS 3.x (installer)
node installer/build-sea.mjs              # Build chillpass.exe via Node.js SEA
makensis installer/installer.nsi          # Wrap the exe into an NSIS installer
```

---

## Join the Community

Scan the QR code below to join the official ChillPass QQ group — get the latest news, share study tips, and reach the developer directly.

<p align="center">
  <img src="public/qrcode.jpg" alt="ChillPass QQ group QR code" width="200" />
</p>

---

## Quick Start

**1.** Open **Settings → API** and paste your [DeepSeek API key](https://platform.deepseek.com/api_keys)

**2.** Click **Import materials** → pick PDF/Word/PPTX files → name the course → wait for the AI to build the quests

**3.** Head into **Quests** → start at quest 1 → read the concepts → study the examples → pass the quiz

**4.** Earn Chill Coins from quizzes and study time, then spend them to unlock quests or skip hard questions (10 coins each). Stuck? Regenerate a new question on the same point for free.

**5.** Open **Athena** → ask anything, or start a task (paper, report, summary, plan) → get structured output

**6.** (Teachers) Enable **Teacher mode** in Settings → open the **Teacher Workspace** → generate questions → export a PDF

**7.** Set your exam date on the dashboard and watch the countdown.

---

## Tech Stack

```
Node.js 22 (SEA)  ── Standalone executable (Single Executable Application)
React 18          ── UI components
TypeScript 5      ── Type safety
Vite 5            ── Build tool
React Router 6    ── Front-end routing
Zustand           ── State management (persisted to localStorage)
Framer Motion     ── Page transitions & animation
DeepSeek API      ── AI chat, grading, exam-point extraction, translation
KaTeX             ── LaTeX formula rendering (placeholder strategy)
Tesseract.js      ── OCR text recognition (loaded from CDN)
PDF.js            ── PDF text extraction
JSZip             ── PPTX / DOCX parsing
IndexedDB         ── Browser-side file storage (course materials)
CSS Modules       ── Scoped styles
SVG Filters       ── Liquid-glass visual effects
NSIS 3            ── Windows installer (per-user, no admin required)
PowerShell        ── System tray + update checker
```

---

## Project Structure

```
src/
├── components/
│   ├── layout/          Sidebar, TitleBar, Background
│   ├── common/          GlassFilter
│   ├── onboarding/      WelcomeModal (welcome tour), GuideCard (task card / notification center)
│   ├── AccountLogin.tsx     Local account creation dialog
│   └── AccountEditor.tsx    Profile editor dialog
├── pages/
│   ├── Dashboard.tsx        Course list, exam countdown, Chill Coins
│   ├── UploadPage.tsx       Material import + AI extraction
│   ├── LessonPathPage.tsx   Progressively unlocked quest path
│   ├── LessonDetailPage.tsx Concepts, examples, quizzes
│   ├── WrongBookPage.tsx    Mistake notebook (grouped by course)
│   ├── AIChatPage.tsx       Athena agent (Q&A, papers, reports, summaries, planning)
│   ├── TeacherWorkspace.tsx Exam paper generation + PDF export
│   ├── SettingsPage.tsx     Account, theme, language, teacher mode
│   └── settings/            ApiSettings, StorageSettings, DataSettings, AboutSettings
├── stores/
│   ├── authStore.ts         Local account (create, edit, export, import)
│   ├── courseStore.ts       Courses, exam points, quests, progress
│   ├── chatStore.ts         Athena chat history
│   ├── athenaStore.ts       Abilities, memories, tasks
│   ├── settingsStore.ts     API key, teacher mode
│   ├── studyTimeStore.ts    Study-time tracking → Chill Coins
│   ├── themeStore.ts        Themes
│   ├── languageStore.ts     5 languages
│   └── wrongQuestionStore.ts Mistake records
├── services/
│   ├── deepseek.ts          API + grading + batch extraction + question generation + translation
│   ├── modelCatalog.ts      Model catalog (live model list + built-in fallback & descriptions)
│   ├── fileParser.ts        PDF / Word / PPTX / TXT / MD text extraction
│   ├── imageService.ts      OCR via Tesseract.js
│   ├── lessonGenerator.ts   Quest content generation pipeline
│   └── browserFileStore.ts  IndexedDB file storage
├── utils/                   markdown (KaTeX placeholders), electronMock
├── i18n/                    Translations in 5 languages (629 keys × 5 languages)
├── styles/                  Global styles + theme variables
└── types/                   TypeScript interfaces

installer/
├── app.cjs                  SEA entry (HTTP server + tray launcher)
├── build-sea.mjs            Build chillpass.exe via Node.js SEA
├── installer.nsi            NSIS installer script
├── updater.ps1              Auto update checker (silent + GUI modes)
└── build-installer.ps1      One-click build script

server.mjs                   Dev server (zero dependencies, Node.js built-ins only)
tray.ps1                     System tray icon (WinForms NotifyIcon)
```

---

## Requirements

| | |
|-|-|
| **OS** | Windows 10/11 (64-bit) |
| **Runtime** | DeepSeek API key ([get one here](https://platform.deepseek.com/api_keys)) |
| **Development** | Node.js 22+ (SEA build), NSIS 3.x (installer) |

---

## Changelog

<details>
<summary><strong>v0.0.9</strong> — 2026-09-06</summary>

- **Full UI localization**: every page, component, and service-level message now ships in Chinese/English/Russian/Japanese/Korean (629 translation keys total) — AI errors, file parsing, and update dialogs included
- **New-version alert & one-click download**: the task card checks for updates on launch, shows a persistent banner with a one-click download button (falls back to browser download when auto update is unavailable)
- **Live model list**: the API settings page can now fetch the models actually available to your account straight from the provider (auto-fetched once a key is saved). The built-in list was also fixed — `deepseek-chat` / `deepseek-reasoner` were retired on 2026-07-24, current models are `deepseek-flash` and `deepseek-v4-pro`, and saved configs migrate automatically. The dropdown is now a custom list that shows a model description on hover
- **Animation polish**: page transitions now slide the old and new pages at identical speed, eliminating any overlap during the switch; the task card morphs into its badge, and notifications and banners animate in smoothly
</details>

<details>
<summary><strong>v0.0.8</strong> — 2026-09-05</summary>

- **Onboarding flow**: first launch shows a welcome wizard (with interface language picker) guiding you through "configure API key → import materials → AI builds quests"; a persistent task card tracks onboarding progress live
- **Notification center**: the task card doubles as a notification hub, pushing notifications when background quest generation finishes; the collapsed icon shows a yellow exclamation mark for unread notices
- **Token usage stats**: the API settings page now shows cumulative/daily usage, call counts, and a 7-day trend chart
- **Word import**: added .doc / .docx parsing (extracted in-browser, with Chinese encoding handling)
- **Zhipu GLM support**: the API settings gained a provider switch for glm-5.3-flash / glm-5.3
- **Win95 theme removed**: former Win95 users are auto-migrated to the light theme
- **UI fixes**: dashboard button alignment, stronger backdrop for the welcome dialog and task card, close button moved to the top-left, and more
</details>

<details>
<summary><strong>v0.0.7</strong> — 2026-08-25</summary>

- **App icon**: ChillPass now has its own icon, applied to the executable and the installer
- **Desktop shortcut**: created automatically after install (no longer an optional checkbox)
- **QQ group QR code**: the in-app help dialog now includes the official QQ community QR code
</details>

<details>
<summary><strong>v0.0.6</strong> — 2026-08-25</summary>

- **Auto update**: the in-app check says "you're up to date" when current; when a new version is found, a confirm dialog auto downloads and installs it
- **Hidden console**: the terminal window at startup is now hidden (GUI subsystem) so the app's server can't be closed by accident
</details>

<details>
<summary><strong>v0.0.5</strong> — 2026-08-25</summary>

- **Locate install folder**: the data management page can reveal the install folder (selects the exe in Explorer)
- **Update check fix**: the checker now points to the correct `ChillPass-Web` repository
</details>

<details>
<summary><strong>v1.2.3</strong> — 2026-07-29</summary>

- **Web architecture rewrite**: rebuilt from Electron into a browser-style web app packaged via Node.js SEA — no Electron dependency, a single `chillpass.exe`
- **Local account system**: offline accounts with nickname, 12 emoji avatars, and bio; auto-created on first launch; JSON export/import for cross-device migration
- **NSIS installer**: per-user install (no admin), with desktop shortcut, Start Menu shortcut, autostart option, and a full uninstaller
- **System tray icon**: native Windows tray (PowerShell WinForms) with "Open in Browser" and "Quit"; disappears automatically when the server exits
- **Auto update check**: wired to GitHub Releases with silent mode (auto download + install) and GUI mode (WinForms dialogs); proxy fallback when downloads fail
- **Duplicate course detection**: importing a course with the same name shows a replace confirmation
- **Mistake notebook empty-state fix**: consistent liquid-glass card styling with other pages
- **Data management**: storage info panel with install path, data path, disk usage, and per-course size breakdown (with progress bars)
- **In-app update check**: one-click check on the Settings page with a download link for the latest version
</details>

<details>
<summary><strong>v1.2.2</strong> — 2026-06-24</summary>

- **Quiz regenerate & skip**: free regeneration on the same point, or spend 10 Chill Coins to skip
- **Help dialog**: round help button in the title bar with introduction, quick tips, and developer contacts
- **Quiz card layout**: removed fixed min-height, unified flex spacing
- **Help dialog fix**: resolved a pointer-events inheritance issue in the title-bar drag region
</details>

<details>
<summary><strong>v1.2.1</strong> — 2026-06-24</summary>

- **Quest grouping**: grouped by source file with collapsible headers; finished groups auto-collapse
- **"Next quest" marker**: a smart badge marks the quest after the most recently completed one (by timestamp), with auto-scroll and group expansion
- **Unlock system**: "skip" renamed to "unlock" — only unlocks the target quest (no cascade), setting its state to `available` instead of `completed`
- **Upload flow**: returns to the dashboard after import, with a three-step progress indicator
- **Option fix**: updated AI prompt examples; `cleanOptionText()` regex strips duplicate prefixes
- **Mistake notebook layout**: `overflow: visible !important` + content height capped with internal scrolling
- **Teacher workspace**: freely typed question count (1-50) replaces fixed buttons, plus smart type matching
- **Smart question generation**: the AI picks the optimal question type per exam point, with 30% calculation questions among single choice
</details>

<details>
<summary><strong>v1.2.0</strong> — 2026-06-23</summary>

- **Athena agent**: the AI assistant upgraded into a full agent with abilities, charter/flow memory, and task workflows (paper, report, summary, planning), export/import
- **Teacher workspace**: AI question generation (6 types), grouped question list, 5-language PDF export
- **Codex theme**: terminal-style dark theme (later folded into the theme system as a dark variant)
- **Calculation questions**: step-by-step solution rendering in quizzes and exam papers
- **Dark theme fixes**: button contrast system (`--btn-primary-bg` / `--btn-primary-fg` variables across 5 themes)
- **API reliability**: 3 retries + exponential backoff, 90-second timeout, dynamic maxTokens
- **Formula rendering**: KaTeX pre-rendering for PDF export, inline markdown in question lists
- **Fill-in input fix**: `user-select: text` on input/textarea elements
- **i18n expansion**: 74+ translation keys covering the entire UI
</details>

<details>
<summary><strong>v1.1.3</strong> — 2026-06-22</summary>

- Chill Coins economy (earned via quizzes + study time, spent on unlocking)
- Multiple-select questions
- Dashboard course renaming
- Reference answers always shown after grading fill-in/short answers
- Large-PDF batch extraction with dedup & merge
</details>

<details>
<summary><strong>v1.1.2</strong> — 2026-06-22</summary>

- Image OCR fully fixed (renderer process + CDN assets)
- KaTeX formula rendering (placeholder strategy)
- One-question-per-page quizzes with progress dots
- Fill-in-blank and short-answer questions with AI grading
- Mistake notebook blank-screen fix
</details>

<details>
<summary><strong>v1.1.1</strong> — 2026-06-22</summary>

- KaTeX math formula rendering
- Vista and Win95 themes (later folded into the theme system)
- DeepSeek platform link in API settings
- Storage info panel
- Dark mode contrast tuning
</details>

<details>
<summary><strong>v1.1.0</strong> — 2026-06-21</summary>

- Standalone mistake notebook, grouped by course
- Incremental import + duplicate detection
- 5-language i18n with instant switching
- Page transition animations (synchronized + absolutely positioned)
</details>

<details>
<summary><strong>v1.0.0</strong> — 2026-06-20</summary>

- First release: upload → AI extraction → quests → AI assistant
</details>

---

## License

This project is open source under the **MIT License**.

## Acknowledgements

[DeepSeek](https://www.deepseek.com/) &bull; [Tesseract.js](https://tesseract.projectnaptha.com/) &bull; [KaTeX](https://katex.org/) &bull; [PDF.js](https://mozilla.github.io/pdf.js/) &bull; [NSIS](https://nsis.sourceforge.io/) &bull; [Framer Motion](https://www.framer.com/motion/) &bull; [Node.js SEA](https://nodejs.org/api/single-executable-applications.html)

---

<p align="center">
  <sub>Built for students who'd rather prepare calmly than cram at the last minute.</sub>
</p>
