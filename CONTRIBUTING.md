# 贡献指南

ChillPass 是一个面向学生的 AI 闯关式备考助手。欢迎提 Issue、报 Bug、提 Pull Request 或改进翻译。

**在提交 Pull Request 之前，请先读一遍「许可证与 CLA」一节——那里有一件必须先同意的事。**

---

## 报告问题

提 Issue 时请尽量包含：

- 你用的是**安装版**还是**浏览器里跑的开发版**（两者的日志位置不同）；安装版的话附上版本号（设置页可查）
- 复现步骤，以及你期望的结果和实际结果
- 相关截图或报错文本
- 若问题与 AI 输出有关，请说明用的是哪个**接口提供商与模型**（DeepSeek / 智谱的模型行为差异较大）

**请勿在 Issue 或截图里粘贴你的 API Key。**

## 本地开发

需要 **Node.js 22+**（SEA 打包要求）与 npm。

```bash
npm install
npm run dev            # Vite 开发服务器 → http://localhost:5173
```

打包后的应用由本地 HTTP 服务提供，端口是 **5174**（`installer/app.cjs`），别和开发端口搞混。

## 构建

```bash
npm run build                          # 前端 → dist/
node installer/build-sea.mjs           # Node SEA → build/sea/chillpass.exe
powershell installer/build-installer.ps1   # 一键：前端 + SEA + NSIS → release/
```

`build-installer.ps1` 支持 `-SkipBuild` / `-SkipSea` 复用已有产物；NSIS 与 rcedit 会在首次构建时自动下载（本机已有副本则跳过）。

## 代码约定

- **技术栈**：TypeScript + React 函数组件，状态用 zustand，路由用 react-router（Hash 路由），动画用 framer-motion
- **样式**：一律用 CSS Modules，类名写在同名 `.module.css` 里；不要在组件里写全局样式。需要跨模块命中（例如主题、按界面风格分支）时用 `:global(...)`，仓库里已有先例
- **路径别名**：`@`、`@components`、`@stores`、`@i18n`、`@services`、`@types`、`@utils`、`@styles`，定义在 `vite.config.ts`
- **提交信息**：沿用仓库惯例，`feat:` / `fix:` / `chore:` 前缀 + 中文描述，说明"改了什么、为什么"

## 两个容易踩的坑

**1. 新增界面文案必须补齐五种语言。**
`src/i18n/translations.ts` 里 `TranslationKey` 是联合类型，五种语言各自声明为 `Record<TranslationKey, string>`。所以只要你往联合类型里加了 key 却漏了某个语言，`npm run build` 之外的 `npx tsc --noEmit` 会直接报错——这是编译器在替你把关，别绕过它。当前语言：`zh / en / ru / ja / ko`。

**2. 界面有新旧两套，改动要分别在两套下确认。**
标题栏左上角的开关在 `classic`（左侧栏 + 全幅页面）与 `dock`（底部三栏 + 关卡区）之间切换，状态存在 `chillpass-ui-style`，并会写到根元素的 `data-ui-style` 上。**旧版界面需要保持可用**，所以新布局相关逻辑请用 `data-ui-style` 作用域或 `isDock` / `isRail` 之类的分支隔离，不要直接改掉旧版的行为。

## 提交前自检

- **`npm run build` 必须通过**——这是本仓库的构建门槛。
- `npx tsc --noEmit` 目前会报出**若干既有错误**（主要是 `@types/index` 的路径别名问题，以及 `window.electronAPI` 的可选性），它们与构建无关、也不是你引入的。请**只关注与你改动相关的文件**，不要顺手"修"这些历史问题——那会把 PR 搅得很乱。若你有意修复，请单独提一个 PR。
- 仓库目前**没有自动化测试**，请在浏览器里实际点一遍受影响的流程，并在 PR 描述里写清你验证了什么。

## 版本发布（维护者）

版本号散落在多处，发布时需一并更新：`package.json`、`package-lock.json`（两处）、`installer/app.cjs`、`installer/app.mjs`、`src/utils/electronMock.ts`、`src/components/layout/TitleBar.tsx` 的帮助弹窗，以及五种语言 README 的版本徽章、下载文件名与更新日志。安装包的版本另有两处：`installer/installer.nsi` 的 `APP_VERSION` 与 `VIProductVersion` / `VIFileVersion`。

注意 **`installer/app.cjs` 才是被 SEA 构建内嵌的入口**（`build-sea.mjs` 里的 `APP_SRC` 指向它），`app.mjs` 是历史遗留的重复文件（当前无人引用，可考虑删除）。`build-sea.mjs` 本身不含版本号——它从 `package.json` 读取。

改完务必核对 PE 元数据：安装包与内层 `chillpass.exe` 的版本、版权信息由**两条独立路径**写入（`.nsi` 的 `VIAddVersionKey` 与 `build-sea.mjs` 里的 resedit），只改一处会出现外层正确、内层还是旧值的错位。

发布到 GitHub Releases 后应用才能检测到更新：自动更新读取 `releases/latest` 的 tag（去掉前缀 `v` 后比较），并取第一个 `.exe` 资源作为下载地址。

---

## 许可证与 CLA

本项目以 **Apache License 2.0** 授权，全文见 [LICENSE](LICENSE)，归属声明见 [NOTICE](NOTICE)。`LICENSE` 会被 `vite build` 一并打进 `dist/`，随安装包分发给用户。

> 更换许可证时注意：许可证名称同时写在 `installer/installer.nsi` 的 `VIAddVersionKey "LegalCopyright"` 与 `installer/build-sea.mjs` 的 `LegalCopyright` 两处，分别对应安装包与内层 exe 的资源信息，两处都要改。

**在向本项目提交 Pull Request 或任何其他形式的贡献时，即表示你已阅读并同意 [CLA.md](CLA.md)（贡献者许可协议）。**

这份协议的核心只有一句：**你保留自己贡献的版权，同时授予维护者一项永久、不可撤销、可再许可的许可，使其能够以任何条款（包括日后的其他开源许可证或商业授权）对本项目整体进行再许可。** 这样维护者才不必为了调整许可证去逐个联系历史上的每一位贡献者。

若你代表雇主提交，或你的贡献包含受第三方许可证约束的代码，请先阅读 CLA 第 4、5 条。

### For contributors writing in English

ChillPass is licensed under the **Apache License 2.0** (see [LICENSE](LICENSE), attribution in [NOTICE](NOTICE)). **By submitting a pull request or any other contribution, you agree to the terms of [CLA.md](CLA.md)** — in short: you keep the copyright of your contribution, and you grant the maintainer a perpetual, irrevocable, sublicensable license to use, distribute and **relicense** it, and the project as a whole, under any terms. Your contribution is provided "as is". If you contribute on behalf of an employer, or your contribution contains third-party licensed code, please read sections 4 and 5 of the CLA first. The development notes above are in Chinese; feel free to open an issue if you need them in English.
