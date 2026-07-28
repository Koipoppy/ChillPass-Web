<p align="center">
  <img src="https://img.shields.io/badge/version-1.2.3-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/Node.js-SEA-339933?style=flat-square&logo=node.js" alt="Node.js SEA" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/DeepSeek-AI-4D6BFE?style=flat-square" alt="DeepSeek" />
  <img src="https://img.shields.io/badge/Platform-Windows-0078D4?style=flat-square&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

<h1 align="center">ChillPass Web</h1>

<p align="center">
  <strong>Your AI-powered academic companion — from finals prep to paper writing.</strong>
</p>

<p align="center">
  <a href="#-key-features">Features</a> &bull;
  <a href="#-installation">Install</a> &bull;
  <a href="#-quick-start">Quick Start</a> &bull;
  <a href="#-tech-stack">Tech Stack</a> &bull;
  <a href="https://github.com/Koipoppy/ChillPass-Web/releases">Download</a>
</p>

<p align="center">
  <a href="https://github.com/Koipoppy/ChillPass-Web/releases/latest">
    <img src="https://img.shields.io/badge/⬇️_Download-ChillPass%20Setup%201.2.3.exe-blue?style=for-the-badge" alt="Download" />
  </a>
</p>

---

## What is ChillPass?

ChillPass is a **desktop application** that transforms your course materials (PDF, PPTX, TXT, MD) into a **gamified learning experience**. Upload your lecture slides, and the AI engine automatically extracts exam-critical topics, generates structured lessons with worked examples, and creates adaptive quizzes — all prioritized by how likely each topic is to appear on your exam.

Starting from **v1.2.3**, ChillPass has been rebuilt as a **browser-based web app** packaged as a standalone Windows executable via Node.js SEA (Single Executable Application). No Electron, no heavy runtime — just a single `chillpass.exe` that starts a local HTTP server and opens your default browser. Data stays 100% local (IndexedDB + localStorage), fully offline.

**How it works:**

```
Upload Materials → AI Extracts Topics → Generates Quest Levels → You Play Through
                         ↓
              Must-Know / High-Frequency / Good-to-Know
                         ↓
        Knowledge Points → Examples → Quiz → Earn Chill Coins
                         ↓
                    Athena Agent
          ┌──────────────┼──────────────┐
     Paper Writing   Report Writing   Knowledge Summary
          └──────────────┼──────────────┘
                  Revision Planning
```

---

## ✨ Key Features

### 🎮 Quest-Based Learning Engine

| Feature | Description |
|---------|-------------|
| **AI Topic Extraction** | DeepSeek analyzes your materials and extracts exam topics, classified into 3 priority tiers |
| **Batch Processing** | 200+ page PDFs are split into chunks, extracted in parallel, deduplicated, and consolidated — zero content left behind |
| **Progressive Unlocking** | Complete a level to unlock the next. Each level contains knowledge points, worked examples, and a quiz checkpoint |
| **Adaptive Quizzes** | One question per page with a progress navigator. Answer wrong? The question regenerates on the same topic until you master it |
| **Regenerate & Skip** | Stuck on a question? Regenerate a new question on the same topic (free) or skip it for 10 Chill Coins |
| **Dynamic Difficulty** | Quiz volume scales with topic priority — Must-Know gets 4-5 questions, Good-to-Know gets 2 |
| **Duplicate Course Detection** | Importing a course with an existing name prompts a replace dialog — no more accidental duplicates |

### 🧠 Six Question Types with AI Grading

```
┌─────────────────┬──────────────────────────────────────────────┐
│   Question Type  │                  Behavior                     │
├─────────────────┼──────────────────────────────────────────────┤
│  Single Choice   │ 4 options, instant correct/wrong feedback    │
│  Multiple Choice │ 4-6 options, ≥2 correct, submit to check     │
│  Fill-in-Blank   │ Free text input, keyword matching + AI grade  │
│  Short Answer    │ Free-form response, AI evaluates, ref shown   │
│  Calculation     │ Step-by-step solution, AI grades each step    │
│  Essay           │ Extended response, AI evaluates structure     │
└─────────────────┴──────────────────────────────────────────────┘
```

Wrong answers trigger **adaptive retry**:
- **Choice questions** → Options are shuffled, try again
- **Fill-in / Short answer** → AI generates a brand-new question on the same topic

### 👤 Local Account System

A fully offline account system — no servers, no login, no tracking:

| Capability | Description |
|-----------|-------------|
| **Auto-Create** | A default local account is created on first launch — no signup needed |
| **Profile Editing** | Set nickname, pick from 12 emoji avatars, add a bio |
| **Export / Import** | Export your account as a JSON file and import it on another device |
| **Privacy-First** | All account data lives in the browser's localStorage — never uploaded anywhere |

### 🤖 Athena — AI Agent

Athena is not just a chatbot. She's a full agent with **abilities**, **memory**, and **task workflows**:

| Capability | Description |
|-----------|-------------|
| **Free Q&A** | Context-aware chat powered by DeepSeek, grounded in your course materials |
| **Paper Writing** | Structured academic paper generation — topic, word count, level, requirements |
| **Report Writing** | Lab reports, research reports, reading reports — formatted and structured |
| **Knowledge Summary** | Systematic review of core concepts across chapters |
| **Revision Planning** | Personalized study schedule based on exam date and weak areas |
| **Ability Management** | Auto-discovered + manually added skills, exportable across devices |
| **Memory System** | Charter memory (user-managed identity/rules) + Flow memory (agent-managed context) |
| **Image OCR** | Snap a photo → Tesseract.js recognition → AI explanation |
| **Status Indicator** | Real-time status bar showing idle / thinking / tasking state |

### 💰 Chill Coin Economy

A virtual currency that ties studying to tangible rewards:

- **Earn**: Complete quiz levels (30-40 coins) + 1 coin per minute of study time
- **Spend**: Unlock levels (30-40 coins) + Skip quiz questions (10 coins each)
- **Track**: Real-time balance on dashboard, sidebar, and quest path with bounce animation

### 📝 Teacher Workspace

A dedicated workspace for educators (enable in Settings → "I am a Teacher"):

- **AI Question Generation** — Generate 6 question types (choice, multi, fill, short, calculation, essay) from course materials with adjustable difficulty and count (1-50, free input)
- **Smart Type Matching** — AI analyzes each exam point and generates the most appropriate question type (e.g., calculation for formulas, short answer for concepts)
- **Smart Grouping** — Questions auto-grouped by type, each group collapsible
- **Full Content Preview** — Every question displayed in full with KaTeX formula rendering
- **PDF Export** — Generate professional exam papers with:
  - Student info fields (name, ID, class) in a bordered frame
  - Section headers with point totals
  - Answer lines for subjective questions
  - Separate answer key page with solution steps for calculation problems
  - KaTeX formula rendering in print output
- **5-Language Export** — Full translation of all question content before export (Chinese, English, Japanese, Korean, Russian)
- **Retry & Timeout** — Robust API calls with 3 retries, 90s timeout, and dynamic token limits

### 🖥️ System Tray & Auto-Update

| Feature | Description |
|-----------|-------------|
| **System Tray Icon** | A native Windows tray icon (PowerShell-based) with "Open in Browser" and "Quit" actions — auto-disappears when the server exits |
| **Auto-Update Checker** | Checks GitHub Releases for new versions; supports silent mode (auto-download + install) and GUI mode (WinForms dialog with progress bar) |
| **Proxy Fallback** | Update downloads automatically fall back to a GitHub proxy if direct download fails |
| **In-App Update Check** | One-click update check from Settings, with download button linking to the latest release |

### 🎨 Five Themes

| Theme | Style |
|-------|-------|
| **Light** | Translucent liquid glass, clean and minimal |
| **Dark** | High-contrast (#0d0d0f base), pure white text, optimized readability |
| **Vista** | Windows Aero Glass — blue gradient, frosted windows, glossy buttons |
| **Win95** | Retro classic — teal desktop, beveled gray windows, MS Sans Serif |
| **Codex** | Terminal-inspired — dark base, monospace accents, green-on-black code aesthetic |

### 🌐 5 Languages

Chinese, English, Russian, Japanese, Korean — switch instantly from settings. 74+ translation keys covering all UI elements.

### ❓ Help System

A circular help button next to the focus mode toggle opens a modal with:
- **Software introduction** — what ChillPass does and how it works
- **Quick start guide** — 10 step-by-step tips covering all major features
- **Developer contact** — GitHub repository and WeChat ID

---

## 📦 Installation

### Download (Recommended)

Go to [Releases](https://github.com/Koipoppy/ChillPass-Web/releases) → Download `ChillPass-Setup-1.2.3.exe` → Install.

> Windows 10/11 (64-bit). Per-user install (no admin needed). Data auto-preserved on updates.

### Build from Source

```bash
git clone https://github.com/Koipoppy/ChillPass-Web.git
cd ChillPass-Web
npm install

# ── Dev mode (browser only) ──
npm run dev                  # Vite dev server at http://localhost:5173

# ── Production build ──
npm run build                # Vite build → dist/

# ── Build standalone executable ──
# Requires: Node.js 22+ (for SEA), NSIS 3.x (for installer)
node installer/build-sea.mjs              # Builds chillpass.exe via Node.js SEA
makensis installer/installer.nsi          # Wraps exe into NSIS installer
```

---

## 🚀 Quick Start

**1.** Open **Settings → API Config** → Enter your [DeepSeek API Key](https://platform.deepseek.com/api_keys)

**2.** Click **Import Materials** → Select your PDF/PPTX files → Name your course → Wait for AI to generate levels

**3.** Enter **Quest Sprint** → Start from Level 1 → Read key points → Study examples → Pass the quiz

**4.** Earn Chill Coins from quizzes and study time. Use them to unlock levels or skip difficult quiz questions (10 coins each). Stuck? Regenerate a new question on the same topic for free.

**5.** Open **Athena** → Ask anything, or start a task (paper, report, summary, plan) → Get structured output

**6.** (Teachers) Enable **Teacher Mode** in Settings → Open **Teacher Workspace** → Generate questions → Export PDF

**7.** Set your exam date on the dashboard to see a countdown timer.

---

## 🛠️ Tech Stack

```
Node.js 22 (SEA)  ── Standalone executable (Single Executable Application)
React 18          ── UI components
TypeScript 5      ── Type safety
Vite 5            ── Build pipeline
React Router 6    ── Client-side routing
Zustand           ── State management (persist to localStorage)
Framer Motion     ── Page transitions & animations
DeepSeek API      ── AI chat, grading, topic extraction, translation
KaTeX             ── LaTeX formula rendering (placeholder strategy)
Tesseract.js      ── OCR (CDN-loaded, renderer process)
PDF.js            ── PDF text extraction
JSZip             ── PPTX parsing
IndexedDB         ── Browser-side file storage (course materials)
CSS Modules       ── Scoped styling
SVG Filters       ── Liquid glass visual effects
NSIS 3            ── Windows installer (per-user, no admin)
PowerShell        ── System tray + auto-update checker
```

---

## 📁 Architecture

```
src/
├── components/
│   ├── layout/          Sidebar, TitleBar, Background
│   ├── common/          GlassFilter
│   ├── AccountLogin.tsx     Local account creation modal
│   └── AccountEditor.tsx    Profile editing modal
├── pages/
│   ├── Dashboard.tsx        Course list, exam countdown, Chill Coins
│   ├── UploadPage.tsx       Material import + AI extraction
│   ├── LessonPathPage.tsx   Quest path with progressive unlocking
│   ├── LessonDetailPage.tsx Knowledge points, examples, quiz
│   ├── WrongBookPage.tsx    Mistake notebook (grouped by course)
│   ├── AIChatPage.tsx       Athena agent (Q&A, paper, report, summary, plan)
│   ├── TeacherWorkspace.tsx Exam paper generation + PDF export
│   ├── SettingsPage.tsx     Account, theme, language, teacher mode
│   └── settings/            ApiSettings, StorageSettings, DataSettings, AboutSettings
├── stores/
│   ├── authStore.ts         Local account (create, edit, export, import)
│   ├── courseStore.ts       Courses, exam points, lessons, progress
│   ├── chatStore.ts         Athena chat history
│   ├── athenaStore.ts       Abilities, memories, tasks
│   ├── settingsStore.ts     API key, teacher mode
│   ├── studyTimeStore.ts    Study time tracking → Chill Coins
│   ├── themeStore.ts        5 themes
│   ├── languageStore.ts     5 languages
│   └── wrongQuestionStore.ts Mistake records
├── services/
│   ├── deepseek.ts          API + grading + batch extraction + exam gen + translation
│   ├── fileParser.ts        PDF / PPTX / TXT / MD text extraction
│   ├── imageService.ts      OCR via Tesseract.js
│   ├── lessonGenerator.ts   Lesson content generation pipeline
│   └── browserFileStore.ts  IndexedDB file storage
├── utils/                   markdown (KaTeX placeholder), electronMock
├── i18n/                    5-language translations (74+ keys)
├── styles/                  Global CSS + 5 theme variable sets
└── types/                   TypeScript interfaces

installer/
├── app.cjs                  SEA entry point (HTTP server + tray launcher)
├── build-sea.mjs            Builds chillpass.exe via Node.js SEA
├── installer.nsi            NSIS installer script
├── updater.ps1              Auto-update checker (silent + GUI modes)
└── build-installer.ps1      One-click build helper

server.mjs                   Dev server (zero-dependency, Node.js built-ins)
tray.ps1                     System tray icon (WinForms NotifyIcon)
```

---

## 🔑 Requirements

| | |
|-|-|
| **OS** | Windows 10/11 (64-bit) |
| **Runtime** | DeepSeek API Key ([get one](https://platform.deepseek.com/api_keys)) |
| **Dev** | Node.js 22+ (for SEA build), NSIS 3.x (for installer) |

---

## 📝 Changelog

<details>
<summary><strong>v1.2.3</strong> — 2026-07-29</summary>

- **Web Architecture Rewrite**: Rebuilt from Electron to a browser-based web app packaged as a standalone executable via Node.js SEA (Single Executable Application) — no Electron dependency, single `chillpass.exe`
- **Local Account System**: Offline account with nickname, 12 emoji avatars, and bio; auto-created on first launch; export/import as JSON for cross-device migration
- **NSIS Installer**: Per-user Windows installer (no admin) with desktop shortcut, Start Menu shortcuts, auto-start option, and full uninstaller
- **System Tray Icon**: Native Windows tray (PowerShell WinForms) with "Open in Browser" and "Quit"; auto-disappears when server exits
- **Auto-Update Checker**: GitHub Releases integration with silent mode (auto-download + install) and GUI mode (WinForms dialog with progress); proxy fallback for downloads
- **Course Duplicate Detection**: Importing a course with an existing name now prompts a replace dialog instead of creating duplicates
- **Wrong Book Empty State**: Fixed to use liquid-glass card styling consistent with other pages
- **Data Management**: Storage info panel with install path, data path, disk usage, and per-course size breakdown with progress bars
- **In-App Update Check**: One-click update check from Settings with download link to latest release
</details>

<details>
<summary><strong>v1.2.2</strong> — 2026-06-24</summary>

- **Quiz Regenerate & Skip**: Regenerate same-topic questions (free) or skip for 10 Chill Coins
- **Help Modal**: Circular help button in title bar with software intro, quick start guide, and developer contact
- **Quiz Card Layout**: Removed fixed min-height, unified spacing with flex gap
- **Help Modal Fix**: Resolved pointer-events inheritance from title bar drag region
</details>

<details>
<summary><strong>v1.2.1</strong> — 2026-06-24</summary>

- **Lesson Grouping**: Lessons grouped by source file with collapsible headers, auto-collapse on full completion
- **"Next Up" Marker**: Smart badge marking the lesson after the most recently completed one (by timestamp), with auto-scroll and group expansion
- **Unlock System**: "Skip" renamed to "Unlock", only unlocks target lesson (no cascade), sets status to `available` not `completed`
- **Upload Flow**: Navigate to home after import, 3-step progress indicator
- **Quiz Option Fix**: AI prompt examples updated, `cleanOptionText()` regex strips duplicate prefixes
- **Wrong Book Layout**: `overflow: visible !important` + content height limits with internal scroll
- **Teacher Workspace**: Free number input (1-50) replacing fixed buttons, smart question type matching
- **Smart Exam Generation**: AI analyzes exam points for optimal question type, 30% calculation in choice questions
</details>

<details>
<summary><strong>v1.2.0</strong> — 2026-06-23</summary>

- **Athena Agent**: Upgraded AI tutor to full agent with abilities, charter/flow memory, task workflows (paper, report, summary, plan), export/import
- **Teacher Workspace**: AI question generation (6 types), grouped question list, PDF export with 5-language translation
- **Codex Theme**: Terminal-inspired dark theme
- **Calculation Questions**: Step-by-step solution rendering in quizzes and exam papers
- **Dark Theme Fix**: Button contrast system (`--btn-primary-bg` / `--btn-primary-fg` variables across 5 themes)
- **API Reliability**: 3-retry with exponential backoff, 90s timeout, dynamic maxTokens
- **Formula Rendering**: KaTeX pre-rendering for PDF export, inline markdown in question list
- **Fill-in Input Fix**: `user-select: text` for input/textarea elements
- **i18n Expansion**: 74+ translation keys, all UI elements localized
</details>

<details>
<summary><strong>v1.1.3</strong> — 2026-06-22</summary>

- Chill Coin economy system (earn from quizzes + study time, spend to skip levels)
- Multiple choice questions in quizzes
- Course renaming from dashboard
- Standard answer always shown after fill-in/short-answer grading
- Large PDF batch extraction with deduplication and consolidation
</details>

<details>
<summary><strong>v1.1.2</strong> — 2026-06-22</summary>

- Image OCR fully fixed (renderer process + CDN resources)
- KaTeX formula rendering (placeholder strategy)
- One-question-per-page quiz with progress dots
- Fill-in-the-blank and short answer with AI grading
- Mistake notebook white screen fix
</details>

<details>
<summary><strong>v1.1.1</strong> — 2026-06-22</summary>

- KaTeX math formula rendering
- Vista and Win95 themes
- DeepSeek platform link in API settings
- Storage info panel
- Dark mode contrast optimization
</details>

<details>
<summary><strong>v1.1.0</strong> — 2026-06-21</summary>

- Standalone mistake notebook with course grouping
- Incremental import with duplicate detection
- 5-language i18n with instant switch
- Page transition animation (sync + absolute positioning)
</details>

<details>
<summary><strong>v1.0.0</strong> — 2026-06-20</summary>

- Initial release: upload → AI extraction → quest levels → AI tutor
</details>

---

## 📄 License

This project is licensed under the **MIT License**.

## 🙏 Acknowledgments

[DeepSeek](https://www.deepseek.com/) &bull; [Tesseract.js](https://tesseract.projectnaptha.com/) &bull; [KaTeX](https://katex.org/) &bull; [PDF.js](https://mozilla.github.io/pdf.js/) &bull; [NSIS](https://nsis.sourceforge.io/) &bull; [Framer Motion](https://www.framer.com/motion/) &bull; [Node.js SEA](https://nodejs.org/api/single-executable-applications.html)

---

<p align="center">
  <sub>Built with ❤️ for students who'd rather chill than cram.</sub>
</p>
