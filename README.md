<p align="center">
  <img src="https://img.shields.io/badge/version-1.2.3-blue?style=flat-square" alt="版本" />
  <img src="https://img.shields.io/badge/Node.js-SEA-339933?style=flat-square&logo=node.js" alt="Node.js SEA" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/DeepSeek-AI-4D6BFE?style=flat-square" alt="DeepSeek" />
  <img src="https://img.shields.io/badge/Platform-Windows-0078D4?style=flat-square&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="许可证" />
</p>

<h1 align="center">ChillPass Web</h1>

<p align="center">
  <strong>AI 驱动的学习伴侣 — 从期末备考到论文写作，一站搞定。</strong>
</p>

<p align="center">
  <a href="#-核心功能">功能</a> &bull;
  <a href="#-安装方式">安装</a> &bull;
  <a href="#-快速上手">快速上手</a> &bull;
  <a href="#-技术栈">技术栈</a> &bull;
  <a href="https://github.com/Koipoppy/ChillPass-Web/releases">下载</a>
</p>

<p align="center">
  <a href="https://github.com/Koipoppy/ChillPass-Web/releases/latest">
    <img src="https://img.shields.io/badge/⬇️_下载-ChillPass%20Setup%201.2.3.exe-blue?style=for-the-badge" alt="下载" />
  </a>
</p>

---

## 什么是 ChillPass？

ChillPass 将你的课件资料（PDF、PPTX、TXT、MD）转化为**游戏化的闯关学习体验**。上传课件后，AI 引擎自动提取考试重点，生成结构化的闯关关卡和自适应测验——所有内容按考点优先级排序。

从 **v1.2.3** 开始，ChillPass 重构为**基于浏览器架构的 Web 应用**，通过 Node.js SEA（单可执行应用）打包为独立的 Windows 可执行文件。无需 Electron，无需重型运行时——一个 `chillpass.exe` 启动本地 HTTP 服务器并打开默认浏览器。数据 100% 本地存储（IndexedDB + localStorage），完全离线可用。

**工作原理：**

```
上传课件 → AI 提取考点 → 生成闯关关卡 → 你逐个闯关
                    ↓
         必考 / 高频 / 了解（三级优先级）
                    ↓
       知识点 → 例题 → 小测 → 赚取 Chill 币
                    ↓
              Athena 智能体
        ┌──────────────┼──────────────┐
     论文写作      报告写作      知识总结
        └──────────────┼──────────────┘
                 复习计划制定
```

---

## ✨ 核心功能

### 🎮 闯关式学习引擎

| 功能 | 说明 |
|------|------|
| **AI 考点提取** | DeepSeek 分析课件资料，自动提取考试考点，按三级优先级分类 |
| **批量处理** | 200+ 页的 PDF 自动分块、并行提取、去重合并——不遗漏任何内容 |
| **渐进解锁** | 完成当前关卡解锁下一关，每关包含知识点、例题和测验 |
| **自适应测验** | 每题一页，带进度导航。答错自动重出同知识点题目，直到掌握为止 |
| **重出与跳过** | 卡住了？免费重出同知识点新题，或花 10 个 Chill 币跳过 |
| **动态难度** | 题目数量随优先级动态调整——必考出 4-5 题，了解出 2 题 |
| **重复课程检测** | 导入同名课程时弹出替换确认，避免意外重复创建 |

### 🧠 六种题型 + AI 评阅

```
┌─────────────────┬──────────────────────────────────────────────┐
│    题型          │                  行为方式                     │
├─────────────────┼──────────────────────────────────────────────┤
│  单选题         │ 4 个选项，选择后立即反馈对错                      │
│  多选题         │ 4-6 个选项，≥2 个正确，提交后检查                 │
│  填空题         │ 自由文本输入，关键词匹配 + AI 评阅                │
│  简答题         │ 自由文本作答，AI 评估，显示参考答案                │
│  计算题         │ 分步解题，AI 逐步评分                            │
│  论述题         │ 长篇作答，AI 评估结构与逻辑                       │
└─────────────────┴──────────────────────────────────────────────┘
```

答错触发**自适应重练**：
- **选择题** → 选项打乱重组，重新答题
- **填空/简答** → AI 生成同知识点全新题目

### 👤 本地账号系统

完全离线运行的账号系统——无需服务器，无需登录，无数据追踪：

| 能力 | 说明 |
|------|------|
| **自动创建** | 首次启动自动创建默认本地账号，无需注册 |
| **资料编辑** | 设置昵称、从 12 个表情符号中挑选头像、添加个人简介 |
| **导出/导入** | 将账号导出为 JSON 文件，可在其他设备上导入 |
| **隐私优先** | 所有账号数据仅存于浏览器 localStorage，绝不上传 |

### 🤖 Athena — AI 智能体

Athena 不只是聊天机器人，她是一个完整的智能体，具备**能力**、**记忆**和**任务工作流**：

| 能力 | 说明 |
|------|------|
| **自由问答** | 基于 DeepSeek 的上下文感知对话，结合课件内容回答 |
| **论文写作** | 结构化学术论文生成——主题、字数、层次、要求 |
| **报告写作** | 实验报告、研究报告、读书报告——格式规范 |
| **知识总结** | 跨章节核心概念系统梳理 |
| **复习计划** | 根据考试日期和薄弱环节个性化制定学习计划 |
| **能力管理** | 自动发现 + 手动添加技能，支持跨设备导出 |
| **记忆系统** | 宪章记忆（用户管理身份/规则）+ 流动记忆（智能体管理上下文） |
| **图片 OCR** | 拍照 → Tesseract.js 识别 → AI 解析 |
| **状态指示** | 实时状态栏显示空闲 / 思考 / 执行中 |

### 💰 Chill 币经济系统

将学习与即时奖励挂钩的虚拟货币：

- **赚取**：完成关卡测验（30-40 币）+ 每学习 1 分钟得 1 币
- **消费**：解锁关卡（30-40 币）+ 跳过测验题（10 币/题）
- **追踪**：仪表盘、侧边栏、闯关路径实时显示余额，带弹跳动画

### 📝 教师工作台

专为教师设计的工作空间（在设置中开启"我是教师"模式）：

- **AI 出题** — 从课件生成 6 种题型，可调节难度和数量（1-50 题，自由输入）
- **智能题型匹配** — AI 分析每个考点，自动生成最合适的题型（如计算题匹配公式类考点）
- **智能分组** — 题目按类型自动分组，每组可折叠
- **完整内容预览** — 每道题完整展示，支持 KaTeX 公式渲染
- **PDF 导出** — 生成专业试卷，包含：
  - 学生信息栏（姓名、学号、班级）
  - 大题标题和分值
  - 主观题作答区域
  - 独立参考答案页，含计算题解题步骤
  - KaTeX 公式在打印输出中完整渲染
- **5 种语言导出** — 导出前可翻译全部题目内容（中文、英文、日文、韩文、俄文）
- **重试与超时** — 稳健的 API 调用机制，3 次重试、90 秒超时、动态 token 限制

### 🖥️ 系统托盘与自动更新

| 功能 | 说明 |
|------|------|
| **系统托盘图标** | 原生 Windows 托盘图标（基于 PowerShell），支持"在浏览器中打开"和"退出"操作，服务器退出时自动消失 |
| **自动更新检查** | 检查 GitHub Releases 新版本，支持静默模式（自动下载安装）和 GUI 模式（带进度条的 WinForms 弹窗） |
| **代理回退** | 更新下载失败时自动回退到 GitHub 代理 |
| **应用内更新检查** | 设置中一键检查更新，提供下载按钮跳转到最新版本 |

### 🎨 五种主题

| 主题 | 风格 |
|------|------|
| **浅色** | 半透明液态玻璃，简洁清爽 |
| **深色** | 高对比度（#0d0d0f 底色），纯白文字，优化的可读性 |
| **Vista** | Windows Aero Glass 风格——蓝色渐变、毛玻璃效果、光泽按钮 |
| **Win95** | 复古经典——青色桌面、浮雕灰窗、MS Sans Serif 字体 |
| **Codex** | 终端风格——深色底色、等宽字体、黑底绿码美学 |

### 🌐 5 种语言

中文、英文、俄文、日文、韩文——设置中一键切换。74+ 个翻译键覆盖所有 UI 元素。

### ❓ 帮助系统

专注模式按钮旁的圆形帮助按钮打开弹窗，包含：
- **软件介绍** — ChillPass 的功能和使用方式
- **快速入门指南** — 10 条分步提示覆盖所有主要功能
- **开发者联系方式** — GitHub 仓库和微信

---

## 📦 安装方式

### 下载安装（推荐）

前往 [Releases](https://github.com/Koipoppy/ChillPass-Web/releases) → 下载 `ChillPass-Setup-1.2.3.exe` → 安装。

> Windows 10/11（64 位）。按用户安装（无需管理员权限）。更新时自动保留数据。

### 从源码构建

```bash
git clone https://github.com/Koipoppy/ChillPass-Web.git
cd ChillPass-Web
npm install

# ── 开发模式（仅浏览器） ──
npm run dev                  # Vite 开发服务器 http://localhost:5173

# ── 生产构建 ──
npm run build                # Vite 构建 → dist/

# ── 构建独立可执行文件 ──
# 需要：Node.js 22+（用于 SEA），NSIS 3.x（用于安装程序）
node installer/build-sea.mjs              # 通过 Node.js SEA 构建 chillpass.exe
makensis installer/installer.nsi          # 打包为 NSIS 安装程序
```

---

## 🚀 快速上手

**1.** 打开 **设置 → API 配置** → 输入你的 [DeepSeek API Key](https://platform.deepseek.com/api_keys)

**2.** 点击 **导入课件** → 选择 PDF/PPTX 文件 → 命名课程名称 → 等待 AI 生成关卡

**3.** 进入 **闯关模式** → 从第 1 关开始 → 阅读知识点 → 学习例题 → 通过测验

**4.** 从测验和学习时间中赚取 Chill 币，用于解锁关卡或跳过难题（10 币/题）。卡住了？免费重出同知识点新题。

**5.** 打开 **Athena** → 提问任何问题，或开始一项任务（论文、报告、总结、计划）→ 获取结构化输出

**6.** （教师）在设置中开启 **教师模式** → 打开 **教师工作台** → 生成试题 → 导出 PDF

**7.** 在仪表盘上设置考试日期，查看倒计时。

---

## 🛠️ 技术栈

```
Node.js 22 (SEA)  ── 单可执行应用（Single Executable Application）
React 18          ── UI 组件
TypeScript 5      ── 类型安全
Vite 5            ── 构建工具
React Router 6    ── 客户端路由
Zustand           ── 状态管理（持久化到 localStorage）
Framer Motion     ── 页面过渡与动画
DeepSeek API      ── AI 聊天、评阅、考点提取、翻译
KaTeX             ── LaTeX 公式渲染（占位符策略）
Tesseract.js      ── OCR 识别（CDN 加载）
PDF.js            ── PDF 文本提取
JSZip             ── PPTX 解析
IndexedDB         ── 浏览器端文件存储（课件资料）
CSS Modules       ── 样式隔离
SVG Filters       ── 液态玻璃视觉效果
NSIS 3            ── Windows 安装程序（按用户安装，无需管理员）
PowerShell        ── 系统托盘 + 自动更新检查
```

---

## 📁 项目架构

```
src/
├── components/
│   ├── layout/          侧边栏、标题栏、背景
│   ├── common/          玻璃滤镜
│   ├── AccountLogin.tsx     本地账号创建弹窗
│   └── AccountEditor.tsx    资料编辑弹窗
├── pages/
│   ├── Dashboard.tsx        课程列表、考试倒计时、Chill 币
│   ├── UploadPage.tsx       课件导入 + AI 提取
│   ├── LessonPathPage.tsx   闯关路径（渐进解锁）
│   ├── LessonDetailPage.tsx 知识点、例题、测验
│   ├── WrongBookPage.tsx    错题本（按课程分组）
│   ├── AIChatPage.tsx       Athena 智能体（问答、论文、报告、总结、计划）
│   ├── TeacherWorkspace.tsx 试卷生成 + PDF 导出
│   ├── SettingsPage.tsx     账号、主题、语言、教师模式
│   └── settings/            API 配置、存储信息、数据管理、关于
├── stores/
│   ├── authStore.ts         本地账号（创建、编辑、导出、导入）
│   ├── courseStore.ts       课程、考点、关卡、进度
│   ├── chatStore.ts         Athena 聊天历史
│   ├── athenaStore.ts       能力、记忆、任务
│   ├── settingsStore.ts     API Key、教师模式
│   ├── studyTimeStore.ts    学习时间追踪 → Chill 币
│   ├── themeStore.ts        5 种主题
│   ├── languageStore.ts     5 种语言
│   └── wrongQuestionStore.ts 错题记录
├── services/
│   ├── deepseek.ts          API + 评阅 + 批量提取 + 出题 + 翻译
│   ├── fileParser.ts        PDF / PPTX / TXT / MD 文本提取
│   ├── imageService.ts      Tesseract.js OCR 识别
│   ├── lessonGenerator.ts   关卡内容生成管线
│   └── browserFileStore.ts  IndexedDB 文件存储
├── utils/                   markdown（KaTeX 占位符）、electronMock
├── i18n/                    5 种语言翻译（74+ 键）
├── styles/                  全局 CSS + 5 套主题变量
└── types/                   TypeScript 接口定义

installer/
├── app.cjs                  SEA 入口点（HTTP 服务器 + 托盘启动器）
├── build-sea.mjs            通过 Node.js SEA 构建 chillpass.exe
├── installer.nsi            NSIS 安装脚本
├── updater.ps1              自动更新检查（静默 + GUI 模式）
└── build-installer.ps1      一键构建辅助脚本

server.mjs                   开发服务器（零依赖，Node.js 内置模块）
tray.ps1                     系统托盘图标（WinForms NotifyIcon）
```

---

## 🔑 系统要求

| | |
|-|-|
| **操作系统** | Windows 10/11（64 位） |
| **运行时** | DeepSeek API Key（[获取](https://platform.deepseek.com/api_keys)） |
| **开发环境** | Node.js 22+（用于 SEA 构建），NSIS 3.x（用于安装程序） |

---

## 📝 更新日志

<details>
<summary><strong>v1.2.3</strong> — 2026-07-29</summary>

- **Web 架构重构**：从 Electron 重构为基于浏览器的 Web 应用，通过 Node.js SEA 打包为独立可执行文件——无需 Electron 依赖，单个 `chillpass.exe`
- **本地账号系统**：离线账号，支持昵称、12 个表情头像、个人简介；首次启动自动创建；支持 JSON 导出/导入跨设备迁移
- **NSIS 安装程序**：按用户安装（无需管理员），含桌面快捷方式、开始菜单、开机自启选项、完整卸载程序
- **系统托盘图标**：原生 Windows 托盘（PowerShell WinForms），支持"在浏览器中打开"和"退出"；服务器退出时自动消失
- **自动更新检查**：集成 GitHub Releases，支持静默模式（自动下载安装）和 GUI 模式（带进度条的 WinForms 弹窗）；下载失败时自动回退代理
- **课程重复检测**：导入同名课程时弹出替换对话框，不再意外创建重复
- **错题本空状态**：修复为与本页其他组件一致的液态玻璃卡片样式
- **数据管理**：存储信息面板，显示安装路径、数据路径、磁盘使用情况和按课程大小分类的进度条
- **应用内更新检查**：设置中一键检查更新，提供下载链接跳转到最新版本
</details>

<details>
<summary><strong>v1.2.2</strong> — 2026-06-24</summary>

- **测验重出与跳过**：免费重出同知识点题目，或花 10 个 Chill 币跳过
- **帮助弹窗**：标题栏圆形帮助按钮，含软件介绍、快速入门指南和开发者联系方式
- **测验卡片布局**：移除固定最小高度，统一使用 flex gap 间距
- **帮助弹窗修复**：解决标题栏拖拽区域指针事件继承问题
</details>

<details>
<summary><strong>v1.2.1</strong> — 2026-06-24</summary>

- **关卡分组**：按源文件分组，带可折叠标题，全部完成后自动折叠
- **"下一关"标记**：智能徽章标记最近完成关卡之后的下一个关卡，自动滚动并展开分组
- **解锁系统**："跳过"更名为"解锁"，仅解锁目标关卡（不级联），状态设为 `available` 而非 `completed`
- **上传流程**：导入后自动跳转首页，3 步进度指示器
- **测验选项修复**：AI 提示示例更新，`cleanOptionText()` 正则去除重复前缀
- **错题本布局**：`overflow: visible !important` + 内容高度限制 + 内部滚动
- **教师工作台**：自由数字输入（1-50）替代固定按钮，智能题型匹配
- **智能出题**：AI 分析考点选择最优题型，选择题中 30% 计算题
</details>

<details>
<summary><strong>v1.2.0</strong> — 2026-06-23</summary>

- **Athena 智能体**：AI 导师升级为完整智能体，具备能力、宪章/流动记忆、任务工作流（论文、报告、总结、计划）、导出/导入
- **教师工作台**：AI 出题（6 种题型）、分组题目列表、PDF 导出（5 种语言翻译）
- **Codex 主题**：终端风格深色主题
- **计算题**：测验和试卷中支持分步解题渲染
- **深色主题修复**：按钮对比度系统（5 种主题的 `--btn-primary-bg` / `--btn-primary-fg` 变量）
- **API 可靠性**：3 次重试 + 指数退避、90 秒超时、动态 maxTokens
- **公式渲染**：KaTeX 预渲染用于 PDF 导出，题目列表中内联 markdown
- **填空题输入修复**：为 input/textarea 元素添加 `user-select: text`
- **国际化扩展**：74+ 翻译键，所有 UI 元素本地化
</details>

<details>
<summary><strong>v1.1.3</strong> — 2026-06-22</summary>

- Chill 币经济系统（从测验和学习时间赚取，消费用于跳过关卡）
- 测验中的多选题支持
- 从仪表盘重命名课程
- 填空/简答评阅后始终显示标准答案
- 大 PDF 批量提取，去重合并
</details>

<details>
<summary><strong>v1.1.2</strong> — 2026-06-22</summary>

- 图片 OCR 完全修复（渲染进程 + CDN 资源）
- KaTeX 公式渲染（占位符策略）
- 每题一页的测验，带进度点导航
- 填空题和简答题的 AI 评阅
- 错题本白屏修复
</details>

<details>
<summary><strong>v1.1.1</strong> — 2026-06-22</summary>

- KaTeX 数学公式渲染
- Vista 和 Win95 主题
- API 设置中的 DeepSeek 平台链接
- 存储信息面板
- 深色模式对比度优化
</details>

<details>
<summary><strong>v1.1.0</strong> — 2026-06-21</summary>

- 独立错题本，按课程分组
- 增量导入，重复检测
- 5 种语言国际化，即时切换
- 页面过渡动画（同步 + 绝对定位）
</details>

<details>
<summary><strong>v1.0.0</strong> — 2026-06-20</summary>

- 初始发布：上传 → AI 提取 → 闯关关卡 → AI 助教
</details>

---

## 📄 许可证

本项目基于 **MIT 许可证** 开源。

## 🙏 致谢

[DeepSeek](https://www.deepseek.com/) &bull; [Tesseract.js](https://tesseract.projectnaptha.com/) &bull; [KaTeX](https://katex.org/) &bull; [PDF.js](https://mozilla.github.io/pdf.js/) &bull; [NSIS](https://nsis.sourceforge.io/) &bull; [Framer Motion](https://www.framer.com/motion/) &bull; [Node.js SEA](https://nodejs.org/api/single-executable-applications.html)

---

<p align="center">
  <sub>用心为每一个不想临时抱佛脚的同学打造。</sub>
</p>