# 🚗 Patent Lawyer App — 자동차 IP 전략 플랫폼

> 아이디어 하나로 특허 제안서까지 — AI 자동 파이프라인

## 🌐 배포 주소
- **프론트엔드**: *(Vercel 배포 후 URL 추가)*
- **백엔드 API**: *(Railway 배포 후 URL 추가)*

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 🚀 자동 파이프라인 | 아이디어 입력 → 6단계 자동 처리 → 특허 제안서 |
| 🔍 실제 특허 검색 | KIPRIS(한국), Google Patents, Lens.org |
| 🤖 다중 LLM 지원 | GPT-4o / Claude 3.5 / Gemini 1.5 / Groq LLaMA-3.1 |
| 📋 출원서 자동 초안 | KIPO/USPTO 표준 명세서 자동 생성 |
| ⚖️ 가상 심사 | AI 특허심사관 시뮬레이션 |
| 📊 프로젝트 관리 | 대시보드, 진행상황, 내 서재 |

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 18, Vite, Framer Motion |
| Backend | FastAPI, Python 3.11+, aiosqlite |
| LLM | OpenAI GPT-4o, Anthropic Claude, Google Gemini, Groq |
| 검색 | Tavily AI, Serper (Google), KIPRIS, Lens.org |
| 배포 | Vercel (FE), Railway (BE) |

---

## 🚀 로컬 실행

### 백엔드
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # API 키 입력
uvicorn main:app --reload --port 8000
```

### 프론트엔드
```bash
cd frontend
npm install
# .env.local 생성 (필요 시):
# VITE_API_URL=http://localhost:8000
npm run dev
```

→ http://localhost:5173 접속

---

## ⚙️ API 키 설정

앱 실행 후 ⚙️ **설정 탭**에서 API 키를 입력합니다.

| 서비스 | 용도 | 무료 여부 |
|--------|------|---------|
| [Groq](https://console.groq.com) | LLaMA 3.1 LLM | ✅ 완전 무료 |
| [OpenAI](https://platform.openai.com) | GPT-4o | 유료 ($) |
| [Anthropic](https://console.anthropic.com) | Claude 3.5 | 유료 ($) |
| [Tavily](https://tavily.com) | AI 웹 검색 | ✅ 월 1,000건 무료 |
| [Serper](https://serper.dev) | Google 검색 | ✅ 월 2,500건 무료 |
| [KIPRIS](https://open.kipris.or.kr) | 한국 특허 DB | ✅ 무료 |

---

## 📁 프로젝트 구조

```
Patent_Lawyer_app/
├── frontend/          # React/Vite SPA
│   ├── src/screens/   # Pipeline, Dashboard, Library, Settings
│   └── src/services/  # API client
└── backend/           # FastAPI
    ├── routers/       # pipeline, research, projects, settings
    └── services/      # llm_service, db_service
```

---

## 📄 라이선스

MIT License
