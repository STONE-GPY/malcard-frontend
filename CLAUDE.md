# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MalCard는 고려인 및 러시아어권 성인 한국어 학습자를 위한 **카드 기반 발화 유도 + AI 발음 교정** 웹 서비스이다. 물리적 카드의 발화 유도 효과를 디지털로 구현하고, AI로 음소 단위 발음 분석 및 억양 피드백을 제공한다.

- **프론트엔드 전용 레포** — 백엔드(Python FastAPI)는 별도 레포
- **모바일 퍼스트** (390px 기준) — `#root`가 max-width: 390px로 제한됨
- **DB/인증 없음** — 카드 데이터는 JSON 정적 파일, 학습 기록은 localStorage

## Build & Dev Commands

```bash
npm run dev        # Vite dev server (localhost:5173)
npm run build      # tsc -b && vite build
npm run lint       # eslint
npx tsc -b         # TypeScript type check only
```

## Architecture

### Tech Stack
- Vite + React 19 + TypeScript (ES2023 target)
- Zustand (상태 관리)
- React Router DOM (클라이언트 라우팅)
- Recharts (F0 피치 곡선 그래프)
- Pretendard (웹폰트)

### Routing (4 screens)
| Route | Page | 설명 |
|---|---|---|
| `/` | CardSelectPage | 카드 선택 (홈) — 카테고리 필터, 상황별 카드덱, 문장 리스트 |
| `/learn` | CardLearnPage | 카드 학습 — TTS 재생, 마이크 녹음 (Web Audio API) |
| `/loading` | LoadingPage | 분석 로딩 — 단계별 진행 표시 (upload→phoneme→intonation→feedback) |
| `/result` | ResultPage | 결과 — 음소 분석, F0 그래프, AI 코칭 피드백 |

### State Management
단일 Zustand 스토어 (`stores/useCardStore.ts`)가 전체 앱 상태를 관리:
- **카드 선택**: 카테고리 필터, 현재 카드, 카드 인덱스
- **녹음**: isRecording, audioBlob
- **분석**: analysisStep (진행 단계), analysisResult (최종 결과)

### Data Flow
1. 사용자가 카드 선택 → `setCurrentCard()` → `/learn`으로 이동
2. 녹음 완료 → `audioBlob` 저장 → `/loading`으로 이동
3. 로딩 화면에서 백엔드 API 호출 (현재는 mock) → `setAnalysisResult()` → `/result`로 이동
4. 결과 화면에서 "다시 녹음" 또는 "다음 카드"

### Backend API (미구현, 연동 예정)
```
POST /api/analyze   — audio file + target_text → 음소 분석 + 억양 + LLM 피드백
POST /api/transcribe — audio file → Whisper STT 텍스트
```
현재 LoadingPage에서 mock 데이터로 시뮬레이션 중. 실제 연동 시 `audioBlob`을 FormData로 POST.

### Design System
- CSS 변수 기반 (`index.css` :root) — 색상, border-radius 등
- 컬러: primary `#6C5CE7` (보라), success `#66BB6A`, warning `#FFA726`, error `#EF5350`
- 배경: warm off-white `#F8F6F2`
- 카드 메타포: 흰색 카드 + 상단 gradient stripe + 하단 스택 그림자

### Figma
디자인 파일: `figma.com/design/aUoKyUShNhwSKShsMRFFkV/MalCard`
`mockup/` 디렉토리에 4개 화면의 HTML 목업이 있으며, Figma 캡처 스크립트가 포함되어 있음.

## Key Conventions

- 카드 데이터는 `src/data/cards.ts`에 정적으로 정의 — DB 미사용
- 러시아어 번역(`translation` 필드)은 모든 카드에 필수
- 음소 힌트(`phonemeHints`)는 IPA 표기 포함
- 타입은 `src/types/index.ts`에 중앙 집중 관리
- 인라인 스타일 사용 중 (CSS-in-JS 미도입 상태)
- `noUnusedLocals`, `noUnusedParameters` 활성화 — 미사용 변수는 빌드 에러
