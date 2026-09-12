<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" alt="버전" />
  <img src="https://img.shields.io/badge/Node.js-SEA-339933?style=flat-square&logo=node.js" alt="Node.js SEA" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/DeepSeek-AI-4D6BFE?style=flat-square" alt="DeepSeek" />
  <img src="https://img.shields.io/badge/플랫폼-Windows-0078D4?style=flat-square&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

<p align="center">
  <img src="public/icon.ico" alt="ChillPass 아이콘" width="110" height="110" />
</p>

<h1 align="center">ChillPass</h1>

<p align="center">
  <strong>당신의 AI 학습 파트너 —— 기말고사 마지막 스퍼트부터 논문 작성까지</strong>
</p>

<p align="center">
  <a href="README.md">简体中文</a> &bull;
  <a href="README_EN.md">English</a> &bull;
  <a href="README_RU.md">Русский</a> &bull;
  <a href="README_JA.md">日本語</a> &bull;
  한국어
</p>

<p align="center">
  <a href="#핵심-기능">핵심 기능</a> &bull;
  <a href="#설치">설치</a> &bull;
  <a href="#커뮤니티">커뮤니티</a> &bull;
  <a href="#빠른-시작">빠른 시작</a> &bull;
  <a href="#기술-스택">기술 스택</a> &bull;
  <a href="https://github.com/Koipoppy/ChillPass-Web/releases">다운로드</a>
</p>

<p align="center">
  <a href="https://github.com/Koipoppy/ChillPass-Web/releases/latest">
    <img src="https://img.shields.io/badge/다운로드-ChillPass%20Setup%200.1.0.exe-blue?style=for-the-badge" alt="다운로드" />
  </a>
</p>

---

## ChillPass란?

ChillPass는 수업 자료(PDF, Word, PPTX, TXT, MD)를 **스테이지형 학습 경험**으로 바꿔주는 **데스크톱 앱**입니다. 강의 자료를 업로드하면 AI 엔진이 시험 포인트를 자동으로 추출하고, 예제가 포함된 구조화된 레슨과 적응형 퀴즈를 생성합니다 —— 모든 콘텐츠는 시험에 출제될 확률이 높은 순으로 정렬됩니다.

**v1.2.3**부터 ChillPass는 Node.js SEA(Single Executable Application)로 단일 Windows 실행 파일로 패키징된 **브라우저 방식 웹 앱**으로 재구축되었습니다. Electron도 무거운 런타임도 필요 없습니다 —— 로컬 HTTP 서버를 시작하고 기본 브라우저를 여는 하나의 `chillpass.exe`만 있으면 됩니다. 데이터는 100% 로컬(IndexedDB + localStorage)에 저장되며 완전히 오프라인으로 실행됩니다.

**워크플로:**

```
자료 업로드 → AI가 시험 포인트 추출 → 스테이지 경로 생성 → 하나씩 공략
                                ↓
        필수 / 빈출 / 참고 (3단계 우선순위)
                                ↓
      개념 설명 → 예제 → 퀴즈 → Chill 코인 획득
                                ↓
                   AI 에이전트 Athena
        ┌──────────────┼──────────────┐
    논문 작성        보고서 작성      지식 요약
        └──────────────┼──────────────┘
                복습 계획 수립
```

---

## 핵심 기능

### 스테이지형 학습 엔진

| 기능 | 설명 |
|---------|-------------|
| **AI 시험 포인트 추출** | DeepSeek가 자료를 분석하여 시험 포인트를 추출하고 3단계 우선순위로 분류 |
| **일괄 처리** | 200페이지 이상의 PDF를 분할 추출, 병렬 처리, 중복 제거 —— 한 페이지도 빠뜨리지 않습니다 |
| **점진적 잠금 해제** | 한 스테이지를 클리어하면 다음 스테이지가 열립니다. 각 스테이지에는 개념 설명, 예제, 클리어 퀴즈가 포함됩니다 |
| **적응형 퀴즈** | 한 문제씩 한 페이지, 진행 네비게이션 포함. 틀리면 같은 포인트의 새 문제를 계속 생성하여 완전히 익힐 때까지 반복 |
| **재생성 및 스킵** | 막히셨나요? 같은 포인트의 새 문제를 무료로 재생성하거나 10 Chill코인으로 스킵하세요 |
| **동적 난이도** | 문제 수는 우선순위에 따라 조정 —— 필수 포인트는 4-5문제, 참고 수준은 2문제 |
| **코스 관리** | 코스를 생성된 스테이지 전체와 함께 JSON으로 내보내 공유하거나, 친구의 코스를 가져오거나, 더 이상 필요 없는 코스를 삭제할 수 있습니다 |
| **중복 코스 감지** | 같은 이름의 코스를 가져올 때 교체 확인창이 뜹니다 —— 더 이상 중복 코스가 생기지 않습니다 |

### 6가지 문제 유형 + AI 채점

```
┌────────────────┬──────────────────────────────────────────────┐
│    문제 유형    │                   동작                        │
├────────────────┼──────────────────────────────────────────────┤
│  단일 선택      │ 4개 선택지, 즉시 정오 피드백                    │
│  복수 선택      │ 4-6개 선택지, 정답 2개 이상, 제출 후 채점         │
│  빈칸 채우기    │ 자유 입력, 키워드 매칭 + AI 채점                 │
│  단답형         │ 자유 서술, AI 채점, 참고 답안 포함                │
│  계산 문제      │ 단계별 풀이, AI가 각 단계를 채점                  │
│  논술           │ 긴 답변, AI가 구조에 따라 채점                   │
└────────────────┴──────────────────────────────────────────────┘
```

오답 시 **적응형 재시도**가 시작됩니다:
- **선택형 문제** → 선택지가 섞여 다시 시도
- **빈칸 / 단답형** → AI가 같은 포인트의 완전히 새로운 문제를 재생성

### 로컬 계정 시스템

완전 오프라인 계정 체계 —— 서버 없음, 로그인 없음, 추적 없음:

| 기능 | 설명 |
|-----------|-------------|
| **자동 생성** | 최초 실행 시 기본 로컬 계정이 자동 생성되며 등록이 필요 없습니다 |
| **프로필 편집** | 별명 설정, 12가지 이모지 아바타 선택, 자기소개 추가 |
| **내보내기 / 가져오기** | 계정을 JSON 파일로 내보내고 새 기기에서 가져오기만 하면 마이그레이션됩니다 |
| **프라이버시 우선** | 모든 계정 데이터는 브라우저 localStorage에 저장되며 절대 외부로 전송되지 않습니다 |

### Athena —— AI 에이전트

Athena는 단순한 챗봇이 아니라 **능력**, **기억**, **태스크 워크플로**를 갖춘 본격적인 에이전트입니다:

| 능력 | 설명 |
|-----------|-------------|
| **자유 질문** | DeepSeek 기반의 문맥 인식 대화, 수업 자료에 기반하여 답변 |
| **논문 작성** | 구조화된 학술 논문 생성 —— 주제, 분량, 구성, 요구사항 모두 커스터마이즈 가능 |
| **보고서 작성** | 실험 보고서, 조사 보고서, 독후감 —— 규범적인 형식과 완전한 구조 |
| **지식 요약** | 여러 장에 걸친 핵심 개념의 체계적 정리 |
| **복습 계획** | 시험 일정과 취약점에 따른 맞춤형 복습 계획 수립 |
| **능력 관리** | 자동 발견 + 수동 추가 스킬, 기기 간 내보내기 지원 |
| **기억 시스템** | 헌장 기억(사용자가 관리하는 규칙) + 흐름 기억(에이전트가 관리하는 문맥) |
| **이미지 OCR** | 사진 촬영 → Tesseract.js 인식 → AI 해설 |
| **상태 표시기** | 대기 중 / 생각 중 / 작업 중을 실시간 표시 |

### Chill코인 경제

학습과 즉각적인 보상을 연결하는 가상 화폐:

- **획득**: 퀴즈 스테이지 클리어(30-40코인) + 학습 시간 분당 1코인
- **사용**: 스테이지 잠금 해제(30-40코인) + 퀴즈 문제 스킵(문제당 10코인)
- **추적**: 대시보드, 사이드바, 스테이지 경로에 잔액을 실시간 표시, 바운스 애니메이션 포함

### 교사 워크스페이스

교사를 위한 독립적인 작업 공간(설정 → "저는 교사입니다"로 활성화):

- **AI 출제** — 수업 자료에서 6가지 유형의 문제 생성(단답 선택, 복수 선택, 빈칸, 단답형, 계산, 논술), 난이도와 문제 수(1-50, 자유 입력) 조정 가능
- **스마트 유형 매칭** — AI가 각 시험 포인트를 분석하여 가장 적합한 문제 유형을 자동 선택(공식은 계산 문제, 개념은 단답형에)
- **스마트 그룹화** — 문제가 유형별로 자동 그룹화, 각 그룹은 접기 가능
- **전체 미리보기** — 모든 문제를 완전히 표시, KaTeX 수식 렌더링 지원
- **PDF 내보내기** — 전문적인 시험지 생성:
  - 테두리가 있는 응시자 정보란(이름, 학번, 반)
  - 총점이 표시된 소문제별 배점 제목
  - 주관식 답안 작성선
  - 계산 문제의 풀이 단계가 포함된 별도 답안 페이지
  - 인쇄 출력에서 KaTeX 수식 렌더링
- **5개 언어 내보내기** — 내보내기 전 전체 번역(중국어, 영어, 일본어, 한국어, 러시아어)
- **재시도 및 타임아웃** — 견고한 API 호출: 3회 재시도, 90초 타임아웃, 동적 토큰 상한

### 시스템 트레이 및 자동 업데이트

| 기능 | 설명 |
|-----------|-------------|
| **시스템 트레이 아이콘** | 네이티브 Windows 트레이 아이콘(PowerShell 구현), "브라우저에서 열기"와 "종료" 지원 —— 서버 종료 시 자동으로 사라집니다 |
| **업데이트 자동 확인** | GitHub Releases의 새 버전 확인. 자동 모드(다운로드+설치)와 GUI 모드(WinForms 진행 대화상자) 지원 |
| **프록시 폴백** | 직접 다운로드 실패 시 GitHub 프록시 미러로 자동 전환 |
| **앱 내 업데이트 확인** | 설정 페이지에서 원클릭 업데이트 확인. 최신 버전이면 "업데이트 불필요"라고 표시하고, 새 버전이 있으면 대화상자로 확인 후 자동 다운로드 및 설치 |
| **새 버전 알림** | 작업 카드가 실행 시 업데이트를 자동 확인하고, 새 버전이 감지되면 상시 표시 배너와 원클릭 다운로드를 제공(자동 업데이트를 사용할 수 없으면 브라우저 다운로드로 폴백) |

### 테마 (4가지)

| 테마 | 스타일 |
|-------|-------|
| **라이트** | 반투명 리퀴드 글래스, 깔끔하고 심플 |
| **다크** | 고대비(#0d0d0f 배경), 순백 텍스트, 읽기 최적화 |
| **Vista** | 반투명 글래스 창, 클래식한 Aero 느낌 |
| **Codex** | 터미널 미니멀리즘, 고정폭 글꼴 |

### 5개 언어

중국어, 영어, 러시아어, 일본어, 한국어 —— 설정에서 원클릭 전환, 최초 실행 웰컴 투어에서도 선택 가능합니다. 629개 번역 키가 전체 UI와 서비스 레벨 메시지(오류, 파싱, 업데이트 대화상자 등)를 커버하며, 이 README 역시 5개 언어로 제공됩니다.

### 도움말 시스템

집중 모드 버튼 옆의 원형 도움말 버튼을 누르면 도움말 대화상자가 열립니다:
- **소프트웨어 소개** —— ChillPass란 무엇인가, 사용 방법
- **빠른 팁** —— 모든 주요 기능을 다루는 10가지 사용 팁
- **개발자 연락처** —— GitHub 저장소, WeChat, 공식 QQ 그룹 QR 코드

---

## 설치

### 다운로드 후 설치 (권장)

[Releases](https://github.com/Koipoppy/ChillPass-Web/releases)로 이동 → `ChillPass-Setup-0.1.0.exe` 다운로드 → 설치.

> Windows 10/11 (64비트). 사용자 단위 설치(관리자 권한 불필요). 설치 후 바탕화면 바로가기가 자동 생성됩니다. 업데이트 시에도 데이터는 자동으로 보존됩니다.

### 소스에서 빌드

```bash
git clone https://github.com/Koipoppy/ChillPass-Web.git
cd ChillPass-Web
npm install

# ── 개발 모드 (브라우저 전용) ──
npm run dev                  # Vite 개발 서버 http://localhost:5173

# ── 프로덕션 빌드 ──
npm run build                # Vite 빌드 → dist/

# ── 단독 실행 파일 빌드 ──
# 필요 환경: Node.js 22+ (SEA), NSIS 3.x (인스톨러)
node installer/build-sea.mjs              # Node.js SEA로 chillpass.exe 빌드
makensis installer/installer.nsi          # exe를 NSIS 인스톨러로 패키징
```

---

## 커뮤니티

아래 QR 코드를 스캔하여 ChillPass 공식 QQ 그룹에 참여하세요 —— 최신 소식 접수, 학습 팁 공유, 개발자와의 직접 소통이 가능합니다.

<p align="center">
  <img src="public/qrcode.jpg" alt="ChillPass QQ 그룹 QR 코드" width="200" />
</p>

---

## 빠른 시작

**1.** **설정 → API**를 열고 [DeepSeek API 키](https://platform.deepseek.com/api_keys)를 입력하세요

**2.** **자료 가져오기** 클릭 → PDF/Word/PPTX 파일 선택 → 코스 이름 지정 → AI가 스테이지를 생성할 때까지 대기

**3.** **스테이지**로 이동 → 1스테이지부터 시작 → 개념 읽기 → 예제 학습 → 퀴즈 통과

**4.** 퀴즈와 학습 시간으로 Chill코인을 모아 스테이지를 잠금 해제하거나 어려운 문제를 스킵하세요(문제당 10코인). 막히셨나요? 같은 포인트의 새 문제를 무료로 재생성하세요.

**5.** **Athena** 열기 → 자유롭게 질문하거나 태스크 시작(논문, 보고서, 요약, 계획) → 구조화된 결과물 받기

**6.** (교사) 설정에서 **교사 모드** 활성화 → **교사 워크스페이스** 열기 → 문제 생성 → PDF 내보내기

**7.** 대시보드에서 시험 날짜를 설정하고 카운트다운을 확인하세요.

---

## 기술 스택

```
Node.js 22 (SEA)  ── 단독 실행 파일 (Single Executable Application)
React 18          ── UI 컴포넌트
TypeScript 5      ── 타입 안전성
Vite 5            ── 빌드 도구
React Router 6    ── 프론트엔드 라우팅
Zustand           ── 상태 관리 (localStorage에 영속화)
Framer Motion     ── 페이지 전환 및 애니메이션
DeepSeek API      ── AI 대화, 채점, 시험 포인트 추출, 번역
KaTeX             ── LaTeX 수식 렌더링 (플레이스홀더 방식)
Tesseract.js      ── OCR 문자 인식 (CDN에서 로드)
PDF.js            ── PDF 텍스트 추출
JSZip             ── PPTX / DOCX 파싱
IndexedDB         ── 브라우저 측 파일 저장소 (수업 자료)
CSS Modules       ── 스코프 스타일
SVG 필터          ── 리퀴드 글래스 시각 효과
NSIS 3            ── Windows 인스톨러 (사용자 단위, 관리자 불필요)
PowerShell        ── 시스템 트레이 + 업데이트 확인
```

---

## 프로젝트 구조

```
src/
├── components/
│   ├── layout/          Sidebar, TitleBar, Background
│   ├── common/          GlassFilter
│   ├── onboarding/      WelcomeModal (웰컴 투어), GuideCard (작업 카드 / 알림 센터)
│   ├── AccountLogin.tsx     로컬 계정 생성 대화상자
│   └── AccountEditor.tsx    프로필 편집 대화상자
├── pages/
│   ├── Dashboard.tsx        코스 목록, 시험 카운트다운, Chill코인
│   ├── UploadPage.tsx       자료 가져오기 + AI 추출
│   ├── LessonPathPage.tsx   점진적 잠금 해제 스테이지 경로
│   ├── LessonDetailPage.tsx 개념, 예제, 퀴즈
│   ├── WrongBookPage.tsx    오답 노트 (코스별 그룹화)
│   ├── AIChatPage.tsx       Athena 에이전트 (질문, 논문, 보고서, 요약, 계획)
│   ├── TeacherWorkspace.tsx 시험지 생성 + PDF 내보내기
│   ├── SettingsPage.tsx     계정, 테마, 언어, 교사 모드
│   └── settings/            ApiSettings, StorageSettings, DataSettings, AboutSettings
├── stores/
│   ├── authStore.ts         로컬 계정 (생성, 편집, 내보내기, 가져오기)
│   ├── courseStore.ts       코스, 시험 포인트, 스테이지, 진행도
│   ├── chatStore.ts         Athena 채팅 기록
│   ├── athenaStore.ts       능력, 기억, 태스크
│   ├── settingsStore.ts     API 키, 교사 모드
│   ├── studyTimeStore.ts    학습 시간 추적 → Chill코인
│   ├── themeStore.ts        테마
│   ├── languageStore.ts     5개 언어
│   └── wrongQuestionStore.ts 오답 기록
├── services/
│   ├── deepseek.ts          API + 채점 + 일괄 추출 + 출제 + 번역
│   ├── modelCatalog.ts      모델 카탈로그(실시간 조회 + 내장 폴백 및 설명)
│   ├── fileParser.ts        PDF / Word / PPTX / TXT / MD 텍스트 추출
│   ├── imageService.ts      Tesseract.js 기반 OCR
│   ├── lessonGenerator.ts   스테이지 콘텐츠 생성 파이프라인
│   └── browserFileStore.ts  IndexedDB 파일 저장소
├── utils/                   markdown (KaTeX 플레이스홀더), electronMock
├── i18n/                    5개 언어 번역 (629키 × 5개 언어)
├── styles/                  전역 스타일 + 테마 변수
└── types/                   TypeScript 인터페이스

installer/
├── app.cjs                  SEA 엔트리 (HTTP 서버 + 트레이 런처)
├── build-sea.mjs            Node.js SEA로 chillpass.exe 빌드
├── installer.nsi            NSIS 인스톨러 스크립트
├── updater.ps1              업데이트 체커 (자동 + GUI 모드)
└── build-installer.ps1      원클릭 빌드 스크립트

server.mjs                   개발 서버 (의존성 없음, Node.js 내장 모듈만 사용)
tray.ps1                     시스템 트레이 아이콘 (WinForms NotifyIcon)
```

---

## 시스템 요구 사항

| | |
|-|-|
| **운영체제** | Windows 10/11 (64비트) |
| **런타임** | DeepSeek API 키 ([발급받기](https://platform.deepseek.com/api_keys)) |
| **개발 환경** | Node.js 22+ (SEA 빌드), NSIS 3.x (인스톨러) |

---

## 변경 로그

<details>
<summary><strong>v0.1.0</strong> — 2026-09-12</summary>

- **모델 목록 실시간 조회**: API 설정 페이지에서 계정이 실제 사용할 수 있는 모델을 공급자 API에서 바로 가져올 수 있습니다(키가 저장되어 있으면 자동 조회). 내장 목록도 수정했습니다 — `deepseek-chat` / `deepseek-reasoner`는 2026-07-24에 종료되었고 현재 모델은 `deepseek-flash`와 `deepseek-v4-pro`이며, 기존 설정은 자동 마이그레이션됩니다. 드롭다운이 사용자 지정 목록으로 바뀌어 항목에 커서를 올리면 설명이 표시됩니다
- **답안 재검토**: 퀴즈 답이 참고 답안과 일치하지 않으면 AI가 먼저 독립적으로 문제를 풀고 판정합니다. 참고 답안 자체가 틀렸고(최대항/최소항 혼동 등) 사용자가 맞았다면 정답으로 변경하고, 문제의 답을 자동 수정하며 오답 노트에 기록하지 않습니다. 출제 프롬프트에도 자기 일관성 규칙을 추가했습니다
</details>

<details>
<summary><strong>v0.0.9</strong> — 2026-09-06</summary>

- **UI 완전 현지화**: 모든 페이지, 컴포넌트, 서비스 레벨 메시지가 중국어/영어/러시아어/일본어/한국어로 제공됩니다(총 629개 번역 키). AI 오류, 파일 파싱, 업데이트 대화상자 포함
- **새 버전 알림 및 원클릭 다운로드**: 작업 카드가 실행 시 업데이트를 확인하고, 새 버전이 감지되면 상시 표시 배너와 원클릭 다운로드 버튼 제공(자동 업데이트 불가 시 브라우저 다운로드로 폴백)
- **애니메이션 개선**: 페이지 전환 시 이전/새 페이지를 동일 속도로 슬라이드하여 전환 중 겹침을 해소. 작업 카드와 배지의 형태 변형 연결, 알림·배너의 부드러운 등장
</details>

<details>
<summary><strong>v0.0.8</strong> — 2026-09-05</summary>

- **온보딩 플로우**: 최초 실행 시 웰컴 위저드(인터페이스 언어 선택 포함)가 표시되어 "API 키 설정 → 자료 가져오기 → AI 스테이지 생성" 흐름을 안내. 작업 카드가 진행 상황을 실시간 표시
- **알림 센터**: 작업 카드가 알림 허브로 작동하여 백그라운드 스테이지 생성 완료 시 알림을 푸시. 읽지 않은 알림이 있으면 접힌 아이콘에 노란색 느낌표
- **토큰 사용량 통계**: API 설정 페이지에 누적/금일 소비량, 호출 횟수, 최근 7일 추이 그래프 추가
- **Word 가져오기 지원**: .doc / .docx 파싱 추가(브라우저에서 직접 추출, 중국어 인코딩 처리 포함)
- **Zhipu GLM 지원**: API 설정에 공급자 전환 추가, glm-5.3-flash / glm-5.3 지원
- **Win95 테마 제거**: 기존 Win95 사용자는 시작 시 라이트 테마로 자동 마이그레이션
- **UI 수정**: 대시보드 버튼 정렬, 웰컴 대화상자와 작업 카드 배경 강화, 닫기 버튼 좌상단 이동 등
</details>

<details>
<summary><strong>v0.0.7</strong> — 2026-08-25</summary>

- **앱 아이콘**: ChillPass가 전용 아이콘을 갖게 되었으며 실행 파일과 인스톨러에 적용
- **바탕화면 바로가기**: 설치 후 자동 생성(더 이상 선택 체크박스가 아님)
- **QQ 그룹 QR 코드**: 앱 내 도움말 대화상자에 공식 QQ 커뮤니티 QR 코드 추가
</details>

<details>
<summary><strong>v0.0.6</strong> — 2026-08-25</summary>

- **자동 업데이트**: 앱 내 확인 시 최신 버전이면 "업데이트 불필요"라고 표시. 새 버전이 감지되면 대화상자로 확인 후 자동 다운로드 및 설치
- **콘솔 숨김**: 시작 시 터미널 창이 숨겨져(GUI 서브시스템) 사용자가 앱 서버를 실수로 닫을 수 없음
</details>

<details>
<summary><strong>v0.0.5</strong> — 2026-08-25</summary>

- **설치 위치 찾기**: 데이터 관리 페이지에서 설치 폴더를 찾을 수 있음(탐색기에서 exe 선택)
- **업데이트 확인 수정**: 업데이트 확인이 올바른 `ChillPass-Web` 저장소를 가리키도록 수정
</details>

<details>
<summary><strong>v1.2.3</strong> — 2026-07-29</summary>

- **웹 아키텍처 재작성**: Electron에서 브라우저 방식 웹 앱으로 재구축하고 Node.js SEA로 패키징 —— Electron 의존성 제거, 단일 `chillpass.exe`
- **로컬 계정 시스템**: 오프라인 계정, 별명, 12가지 이모지 아바타, 자기소개 지원. 최초 실행 시 자동 생성, JSON 내보내기/가져오기로 기기 간 마이그레이션
- **NSIS 인스톨러**: 사용자 단위 설치(관리자 불필요), 바탕화면 바로가기, 시작 메뉴 바로가기, 자동 시작 옵션, 전체 제거 프로그램 포함
- **시스템 트레이 아이콘**: 네이티브 Windows 트레이(PowerShell WinForms), "브라우저에서 열기"와 "종료" 지원. 서버 종료 시 자동으로 사라짐
- **업데이트 자동 확인**: GitHub Releases 연동, 자동 모드(다운로드+설치)와 GUI 모드(WinForms 대화상자). 다운로드 실패 시 프록시 폴백
- **중복 코스 감지**: 같은 이름의 코스를 가져올 때 교체 확인창 표시
- **오답 노트 빈 상태 수정**: 다른 페이지와 일관된 리퀴드 글래스 카드 스타일
- **데이터 관리**: 설치 경로, 데이터 경로, 디스크 사용량, 코스별 크기 내역(진행 바 포함)을 담은 스토리지 정보 패널
- **앱 내 업데이트 확인**: 설정 페이지에서 원클릭 확인, 최신 버전 다운로드 링크 제공
</details>

<details>
<summary><strong>v1.2.2</strong> — 2026-06-24</summary>

- **퀴즈 재생성 및 스킵**: 같은 포인트 무료 재생성, 또는 10 Chill코인으로 스킵
- **도움말 대화상자**: 제목 표시줄의 원형 도움말 버튼, 소개·빠른 팁·개발자 연락처 포함
- **퀴즈 카드 레이아웃**: 고정 최소 높이 제거, flex 간격 통일
- **도움말 대화상자 수정**: 제목 표시줄 드래그 영역의 pointer-events 상속 문제 해결
</details>

<details>
<summary><strong>v1.2.1</strong> — 2026-06-24</summary>

- **스테이지 그룹화**: 원본 파일별 그룹화, 접기 가능한 제목, 전부 완료된 그룹 자동 접기
- **"다음 스테이지" 마커**: 가장 최근 완료한 스테이지(타임스탬프 기준) 다음을 스마트 배지로 표시, 자동 스크롤 및 그룹 펼치기
- **잠금 해제 시스템**: "스킵"이 "잠금 해제"로 변경 —— 대상 스테이지만 잠금 해제(연쇄 없음), 상태가 `completed`가 아닌 `available`로 설정
- **업로드 흐름**: 가져온 후 홈으로 돌아가며 3단계 진행 표시기 제공
- **선택지 수정**: AI 프롬프트 예시 업데이트, `cleanOptionText()` 정규식으로 중복 접두사 제거
- **오답 노트 레이아웃**: `overflow: visible !important` + 콘텐츠 높이 제한으로 내부 스크롤
- **교사 워크스페이스**: 고정 버튼 대신 자유 입력 문제 수(1-50), 스마트 유형 매칭
- **스마트 출제**: AI가 시험 포인트별 최적 문제 유형 선택, 단일 선택 중 30%를 계산 문제로 구성
</details>

<details>
<summary><strong>v1.2.0</strong> — 2026-06-23</summary>

- **Athena 에이전트**: AI 조교가 능력, 헌장/흐름 기억, 태스크 워크플로(논문, 보고서, 요약, 계획), 내보내기/가져오기를 갖춘 본격 에이전트로 업그레이드
- **교사 워크스페이스**: AI 출제(6가지 유형), 그룹화된 문제 목록, 5개 언어 PDF 내보내기
- **Codex 테마**: 터미널 스타일 다크 테마(이후 테마 체계의 다크 변형으로 통합)
- **계산 문제**: 퀴즈와 시험지에서의 단계별 풀이 렌더링
- **다크 테마 수정**: 버튼 대비 체계(5개 테마의 `--btn-primary-bg` / `--btn-primary-fg` 변수)
- **API 신뢰성**: 3회 재시도 + 지수 백오프, 90초 타임아웃, 동적 maxTokens
- **수식 렌더링**: PDF 내보내기용 KaTeX 프리렌더링, 문제 목록 인라인 마크다운
- **빈칸 입력 수정**: input/textarea 요소에 `user-select: text`
- **i18n 확장**: 74+ 번역 키로 전체 UI 현지화
</details>

<details>
<summary><strong>v1.1.3</strong> — 2026-06-22</summary>

- Chill코인 경제 시스템(퀴즈 + 학습 시간으로 획득, 잠금 해제에 사용)
- 복수 선택 문제
- 대시보드 코스 이름 변경
- 빈칸/단답 채점 후 항상 참고 답안 표시
- 대형 PDF 일괄 추출, 중복 제거 후 병합
</details>

<details>
<summary><strong>v1.1.2</strong> — 2026-06-22</summary>

- 이미지 OCR 완전 수정(렌더러 프로세스 + CDN 리소스)
- KaTeX 수식 렌더링 (플레이스홀더 방식)
- 한 문제씩 한 페이지 퀴즈, 진행 도트 포함
- 빈칸 채우기와 단답형 + AI 채점
- 오답 노트 백화 현상 수정
</details>

<details>
<summary><strong>v1.1.1</strong> — 2026-06-22</summary>

- KaTeX 수학 수식 렌더링
- Vista 및 Win95 테마 (이후 테마 체계에 통합)
- API 설정의 DeepSeek 플랫폼 링크
- 스토리지 정보 패널
- 다크 모드 대비 최적화
</details>

<details>
<summary><strong>v1.1.0</strong> — 2026-06-21</summary>

- 코스별 그룹화된 독립 오답 노트
- 증분 가져오기 + 중복 감지
- 즉시 전환 가능한 5개 언어 i18n
- 페이지 전환 애니메이션 (동기화 + 절대 배치)
</details>

<details>
<summary><strong>v1.0.0</strong> — 2026-06-20</summary>

- 첫 출시: 업로드 → AI 추출 → 스테이지 → AI 조교
</details>

---

## 라이선스

이 프로젝트는 **MIT License**로 오픈소스화되어 있습니다.

## 감사의 말

[DeepSeek](https://www.deepseek.com/) &bull; [Tesseract.js](https://tesseract.projectnaptha.com/) &bull; [KaTeX](https://katex.org/) &bull; [PDF.js](https://mozilla.github.io/pdf.js/) &bull; [NSIS](https://nsis.sourceforge.io/) &bull; [Framer Motion](https://www.framer.com/motion/) &bull; [Node.js SEA](https://nodejs.org/api/single-executable-applications.html)

---

<p align="center">
  <sub>벼락치기 대신 여유 있게 시험을 준비하고 싶은 학생들을 위해 만들었습니다.</sub>
</p>
