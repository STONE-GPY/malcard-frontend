# MalCard (프론트엔드)

고려인·러시아어권 성인 한국어 학습자를 위한 **카드 기반 발화 유도 + AI 발음 교정** 웹 서비스.
모바일 퍼스트(390px). 카드 데이터는 정적 JSON, 학습 기록은 localStorage. 백엔드(FastAPI)는
git submodule(`backend/`)로 연결됩니다.

## 빠른 시작 (명령어 하나)

Windows에서 저장소를 클론한 뒤, 한 줄이면 끝납니다:

```bat
scripts\start.bat
```

이 한 줄이 알아서 전부 처리합니다:

- 백엔드 **서브모듈 자동 fetch** (`git submodule update --init --recursive`)
- 포터블 **Python · Node 자동 다운로드**(머신당 1회 캐시) + 백엔드·프론트 의존성 설치
- **백엔드(FastAPI:8000) + 프론트엔드(Vite:5173) 기동**
- **Cloudflare 공개 터널 + QR** 출력 → 폰 카메라로 스캔해 바로 접속
- 그 창에서 **Ctrl+C** → 백엔드·프론트·터널 전부 종료

> **사전 요구는 git 뿐**입니다(Python·Node는 자동 설치). 첫 실행은 런타임·백엔드 의존성
> (torch 등)을 받느라 몇 분 걸리고, 이후엔 캐시 재사용으로 즉시 뜹니다.

프로세스가 남았을 때를 위한 fallback:

```bat
scripts\stop.bat
```

> 참고: `start.bat` / `stop.bat`은 **Windows 전용**입니다. macOS/Linux는 아래 수동 명령을 쓰세요.

## 접속 경로

| 위치 | URL |
|---|---|
| 로컬 PC | `http://localhost:5173` |
| 같은 Wi-Fi 폰 | `http://<PC-IP>:5173` |
| 외부(터널) | `start.bat` 창에 출력되는 `https://….trycloudflare.com` (QR 스캔) |

프론트는 항상 **같은 출처**로 백엔드를 호출하고, Vite dev 서버가 `/analysis`·`/tts` 등을
`127.0.0.1:8000`으로 프록시합니다. 덕분에 로컬·LAN·터널이 단일 URL로 동작합니다.

> 터널 URL은 실행마다 바뀌므로(quick 터널), 폰 localStorage(학습 기록)는 세션 단위로 유지됩니다.

## 수동 개발 (스크립트 없이)

이 저장소는 **pnpm** 프로젝트입니다.

```bash
git submodule update --init --recursive   # 최초 1회: 백엔드 받기
pnpm install
pnpm dev          # Vite dev 서버 (localhost:5173)
pnpm build        # tsc -b && vite build
pnpm lint         # eslint
pnpm test         # vitest
```

백엔드는 `backend/`에서 별도로 실행합니다(`uvicorn app.main:app --host 127.0.0.1 --port 8000` — 프론트가 프록시로 호출하므로 로컬 바인딩이면 충분).

## 라우트

| 경로 | 화면 |
|---|---|
| `/` | 카드 선택 (홈) |
| `/learn` | 카드 학습 — TTS 재생, 마이크 녹음 |
| `/loading` | 분석 로딩 |
| `/result` | 결과 — 음소 분석, F0 그래프, AI 코칭 |
| `/situations/:id/step1~3` | 상황 기반 3단계 학습 |

## 기술 스택

Vite + React 19 + TypeScript · Zustand · React Router · Recharts · Pretendard

## 구조 메모

- 카드 데이터: `src/data/` (정적), 타입: `src/types/index.ts`
- 상태: 단일 Zustand 스토어 + `useHistoryStore`(localStorage 영속)
- API: `src/api/` — `VITE_USE_MOCK_API=false`면 실제 백엔드 호출, 기본은 mock
- 자세한 작업 가이드는 [`CLAUDE.md`](CLAUDE.md) 참고
