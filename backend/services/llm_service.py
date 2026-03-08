"""
LLM Service — Multi-provider support
Priority (from DB settings preferred_llm): groq → openai → anthropic → google → mock
"""
import os
import json
import re
import httpx
from typing import Optional

# ── System prompt ────────────────────────────────────────────────────────────
AUTOMOTIVE_SYSTEM_PROMPT = """You are an expert automotive technology patent attorney and engineer with 20+ years of experience.
You specialize in:
- Electric Vehicle (EV) technology: batteries, BMS, thermal management, charging systems
- Autonomous driving: ADAS, sensor fusion, LiDAR, perception algorithms
- Powertrain: ICE, hybrid systems, transmission, fuel systems
- Body & Chassis: safety systems, structural innovations, NVH
- Software-defined vehicles, V2X communication, OTA updates
- Global patent law: USPTO, EPO, KIPO, PCT

CRITICAL INSTRUCTION: Always respond ONLY in valid JSON format as specified. No markdown, no explanation, only pure JSON.
한국어로 답변하세요 (Respond in Korean unless the prompt specifies English).
"""

# ── Load .env OPENAI_API_KEY as bootstrap (Settings DB takes priority at runtime) ──
from dotenv import load_dotenv
load_dotenv()

# For backward-compat: if OPENAI_API_KEY env var set, treat as bootstrap key
_ENV_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
_ENV_MOCK = os.getenv("MOCK_MODE", "false").lower() == "true"
MOCK_MODE = _ENV_MOCK  # will be overridden at call time if DB has keys


# ── Provider caller functions ─────────────────────────────────────────────────

async def _call_openai(prompt: str, system: str, api_key: str) -> dict:
    """Call OpenAI GPT-4o."""
    async with httpx.AsyncClient(timeout=90.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.3,
                "max_tokens": 4000
            }
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        return json.loads(content)


async def _call_anthropic(prompt: str, system: str, api_key: str) -> dict:
    """Call Anthropic Claude 3.5 Sonnet."""
    async with httpx.AsyncClient(timeout=90.0) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            },
            json={
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 4000,
                "system": system + "\nIMPORTANT: Respond only with valid JSON, no other text.",
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        r.raise_for_status()
        content = r.json()["content"][0]["text"]
        # Claude sometimes adds markdown code fences
        content = re.sub(r"^```(?:json)?\s*", "", content.strip())
        content = re.sub(r"\s*```$", "", content.strip())
        return json.loads(content)


async def _call_google(prompt: str, system: str, api_key: str) -> dict:
    """Call Google Gemini 1.5 Pro."""
    async with httpx.AsyncClient(timeout=90.0) as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_key}",
            headers={"Content-Type": "application/json"},
            json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 4000,
                    "responseMimeType": "application/json"
                }
            }
        )
        r.raise_for_status()
        content = r.json()["candidates"][0]["content"]["parts"][0]["text"]
        content = re.sub(r"^```(?:json)?\s*", "", content.strip())
        content = re.sub(r"\s*```$", "", content.strip())
        return json.loads(content)


async def _call_groq(prompt: str, system: str, api_key: str) -> dict:
    """Call Groq (llama-3.1-70b-versatile) — free tier, very fast."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.1-70b-versatile",
                "messages": [
                    {"role": "system", "content": system + "\nIMPORTANT: Return ONLY valid JSON, no markdown."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 4000,
                "response_format": {"type": "json_object"}
            }
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        content = re.sub(r"^```(?:json)?\s*", "", content.strip())
        content = re.sub(r"\s*```$", "", content.strip())
        return json.loads(content)


# ── Provider map ──────────────────────────────────────────────────────────────
_PROVIDERS = {
    "openai":    (_call_openai,    "openai_api_key"),
    "anthropic": (_call_anthropic, "anthropic_api_key"),
    "google":    (_call_google,    "google_api_key"),
    "groq":      (_call_groq,      "groq_api_key"),
}

# Default priority when preferred_llm not set
_DEFAULT_PRIORITY = ["groq", "openai", "anthropic", "google"]


async def call_llm(
    user_prompt: str,
    system_prompt: str = AUTOMOTIVE_SYSTEM_PROMPT,
    response_format: str = "json_object"
) -> dict:
    """
    Call LLM with automatic provider selection and fallback.
    Provider priority:
      1. DB preferred_llm setting
      2. Default: groq → openai → anthropic → google
      3. Falls back to mock if no keys available
    """
    # Import here to avoid circular imports
    from services.db_service import get_all_settings
    settings = await get_all_settings()

    preferred = settings.get("preferred_llm", "").lower()

    # Build ordered provider list
    if preferred and preferred in _PROVIDERS:
        order = [preferred] + [p for p in _DEFAULT_PRIORITY if p != preferred]
    else:
        order = _DEFAULT_PRIORITY[:]

    # Add bootstrap env key for openai if not in DB
    all_keys = dict(settings)
    if _ENV_OPENAI_KEY and not all_keys.get("openai_api_key"):
        all_keys["openai_api_key"] = _ENV_OPENAI_KEY

    # Try each provider in order
    last_error = None
    for provider in order:
        fn, key_name = _PROVIDERS[provider]
        api_key = all_keys.get(key_name, "")
        if not api_key or api_key.startswith("sk-your"):
            continue
        try:
            print(f"[LLM] Trying {provider}...")
            result = await fn(user_prompt, system_prompt, api_key)
            print(f"[LLM] Success with {provider}")
            return result
        except Exception as e:
            print(f"[LLM] {provider} failed: {e}")
            last_error = e
            continue

    # All providers failed or no keys — use mock
    print(f"[LLM] All providers failed (last: {last_error}), using mock")
    return await get_mock_response(user_prompt)


# ── Mock responses (used when no API keys available) ─────────────────────────

async def get_mock_response(prompt: str) -> dict:
    """Return realistic mock responses for demo/testing."""
    p = prompt.lower()

    # ── Step1: gap analysis after web search ──────────────────────────────
    if "gap_questions" in p or "found_prior_art" in p or "tech_summary" in p:
        return {
            "tech_summary": "하이브리드 냉매 시스템 분야는 히트펌프 기반 통합 열관리가 핵심 트렌드입니다. Denso(US11273693B2)가 EV 히트펌프 통합 시스템을 선점했으며, Valeo는 멀티-루프 냉매 시스템(EP3936361A1)을 특허화했습니다. 계절별 냉매 경로 자동 전환 + AI 최적화 조합에서 차별화 기회가 있습니다.",
            "found_prior_art": [
                "US11273693B2 — EV 히트펌프 통합 냉난방 시스템 (Denso, 2022)",
                "EP3936361A1 — 멀티-루프 냉매 사이클 (Valeo, 2021)",
                "KR102456123B1 — 하이브리드 차량 통합 열관리 (현대자동차, 2022)"
            ],
            "identified_risks": [
                "히트펌프 기반 통합 냉난방 영역에 Denso 선행특허",
                "계절별 모드 전환은 청구항 차별화 필요"
            ],
            "market_insight": "글로벌 EV 열관리 시장 2024년 120억 달러 규모. 히트펌프 탑재율 2026년까지 65% 도달 전망.",
            "gap_questions": [
                {
                    "key": "core_mechanism",
                    "label": "핵심 작동 메커니즘",
                    "question": "배터리-차실 통합 냉방에서 냉매 경로 전환 방식이 Denso US11273693B2와 구체적으로 어떻게 다른가요?",
                    "why_needed": "진보성 확보를 위한 핵심 차별화 포인트 — 독립항 핵심 특징",
                    "placeholder": "예: 4방향 전자 팽창 밸브(EEV) 3개를 직렬 배치하여 냉매 경로를 5가지 모드로 전환, 기존 2방향 전환 대비 효율 25% 향상",
                    "required": True
                },
                {
                    "key": "differentiation",
                    "label": "선행기술 대비 차별점",
                    "question": "발견된 Denso/Valeo 선행기술과 비교해 발명만의 핵심 차별점은 무엇인가요?",
                    "why_needed": "진보성(inventive step) 심사 통과를 위한 핵심 근거",
                    "placeholder": "예: 기존 특허는 냉방/난방 전환만 하지만, 본 발명은 배터리 상태(SOC, 온도)와 외기 조건을 실시간 분석하여 냉매 분배 비율을 무단 조절",
                    "required": True
                },
                {
                    "key": "technical_specs",
                    "label": "핵심 수치/사양",
                    "question": "시스템을 특징짓는 구체적인 수치나 범위가 있나요?",
                    "why_needed": "청구항 한정값 설정 — 균등 침해 방지 및 진보성 강화",
                    "placeholder": "예: COP(성능계수) 여름 3.2, 겨울 2.8 이상, 냉매 R-744(CO2), 압축기 회전수 1000-8000 RPM 가변",
                    "required": False
                },
                {
                    "key": "implementation",
                    "label": "제조/구현 방법",
                    "question": "시스템을 실제로 어떻게 구현하나요?",
                    "why_needed": "실시가능성 요건 충족 — 명세서 실시예 작성",
                    "placeholder": "예: 전동 압축기 + 실내 열교환기 + 배터리 칠러를 3-way 밸브로 연결, MCU가 CAN 신호로 밸브 제어",
                    "required": False
                },
                {
                    "key": "advantages",
                    "label": "정량적 효과",
                    "question": "실험 데이터 또는 시뮬레이션 결과가 있나요?",
                    "why_needed": "진보성 심사 대응 — 수치 입증 자료",
                    "placeholder": "예: 기존 개별 냉각 대비 에너지 소비 28% 절감, 배터리 온도 균일도 ±1.5°C 이내, 난방 효율 COP 2.5→3.1 개선",
                    "required": False
                }
            ]
        }

    # ── Step2: tech spec ──────────────────────────────────────────────────
    if any(k in p for k in ["solution_summary", "key_features", "invention_title", "tech_spec", "ipc_codes"]):
        return {
            "invention_title": "전기차 배터리-차실 통합 냉방을 위한 히트펌프 기반 다중 모드 냉매 순환 시스템",
            "technical_field": "본 발명은 전기자동차의 배터리 팩과 차량 실내를 통합적으로 냉난방하는 히트펌프 시스템에 관한 것이다.",
            "background": "종래 EV 열관리 시스템은 배터리 냉각과 차실 냉난방을 별도 시스템으로 운영하여 에너지 효율이 낮고 시스템이 복잡하다.",
            "problem_to_solve": "배터리 열관리와 차실 공조를 단일 냉매 사이클로 통합하여 에너지 효율을 극대화하는 하이브리드 시스템 필요.",
            "solution_summary": "히트펌프 기반 냉매 사이클에서 전자 팽창 밸브와 AI 제어 알고리즘으로 배터리-차실 냉매 경로를 계절별·조건별 자동 최적화하는 통합 열관리 시스템.",
            "key_features": [
                "배터리 칠러와 실내 응축기를 단일 냉매 루프로 통합",
                "4방향 전자 팽창 밸브(EEV)로 냉매 경로 5모드 자동 전환",
                "AI 예측 알고리즘으로 냉매 분배 비율 실시간 최적화",
                "외기 온도·SOC·배터리 온도 복합 조건 기반 모드 선택",
                "R-744(CO2) 냉매 적용으로 GWP 1의 친환경 시스템"
            ],
            "advantages": [
                "기존 독립 시스템 대비 에너지 소비 28% 절감",
                "배터리 온도 균일도 ±1.5°C 이내",
                "난방 효율 COP 2.5→3.1 개선",
                "부품 수 30% 감소로 경량화"
            ],
            "ipc_codes": ["B60H 1/32", "B60H 1/00", "F25B 30/02", "B60L 58/26", "F25B 13/00"],
            "keywords": ["heat pump", "EV", "thermal management", "refrigerant cycle", "battery cooling", "HVAC integration"]
        }

    # ── Step3: clearance + avoidance ─────────────────────────────────────
    if any(k in p for k in ["clearance", "prior_art_patents", "avoidance_strategies", "infringement"]):
        return {
            "prior_art_patents": [
                {
                    "patent_number": "US11273693B2",
                    "title": "Heat pump system for electric vehicle with integrated battery thermal management",
                    "assignee": "Denso Corporation",
                    "filing_date": "2020-05-12",
                    "key_claims": "히트펌프와 배터리 칠러 통합 냉매 사이클 (독립항 1-6)",
                    "similarity_score": 0.74,
                    "infringement_risk": "MEDIUM",
                    "risk_reason": "히트펌프 통합 구조 유사. 단, 계절별 다중 모드 자동 전환 및 AI 최적화는 미개시"
                },
                {
                    "patent_number": "EP3936361A1",
                    "title": "Multi-loop refrigerant cycle for combined battery and cabin thermal management",
                    "assignee": "Valeo Systemes Thermiques",
                    "filing_date": "2021-02-20",
                    "key_claims": "병렬 냉매 루프를 이용한 배터리+차실 통합 냉각 (독립항 1-9)",
                    "similarity_score": 0.61,
                    "infringement_risk": "MEDIUM",
                    "risk_reason": "멀티 루프 냉매 개념 유사. 5모드 EEV 제어 방식은 다름"
                },
                {
                    "patent_number": "KR102456123B1",
                    "title": "하이브리드 차량의 통합 열관리 시스템 및 제어 방법",
                    "assignee": "현대자동차주식회사",
                    "filing_date": "2021-09-07",
                    "key_claims": "배터리-차실 통합 냉각 제어 방법 (독립항 1-8)",
                    "similarity_score": 0.66,
                    "infringement_risk": "MEDIUM",
                    "risk_reason": "통합 제어 개념 유사. CO2 냉매 및 AI 예측 제어는 미기재"
                }
            ],
            "overall_risk": "MEDIUM",
            "risk_summary": "중간 수준의 침해 위험이 있습니다. Denso, Valeo, 현대차 선행특허가 개별적으로는 유사성이 있으나, AI 기반 다중 모드 자동 전환 + CO2 냉매 조합은 선행특허에서 미개시입니다.",
            "avoidance_strategies": [
                {
                    "strategy_id": "A",
                    "strategy_name": "전략 A: EEV 다중 모드 수치 구체화",
                    "description": "4방향 EEV 3개를 이용한 5가지 냉매 경로 모드(모드 1~5)와 각 모드의 밸브 개도율 범위(10-90%)를 독립항에 구체적으로 기재하여 Denso 특허와 명확히 차별화합니다.",
                    "pros": ["Denso 특허와 명확한 구조적 차별성", "심사 통과 가능성 높음", "침해 회피 확실"],
                    "cons": ["청구항 범위가 좁아질 수 있음", "경쟁사 우회 가능성"],
                    "recommended_claim_changes": "독립항 1에 '5개 냉매 경로 모드', 'EEV 개도율 10-90%' 수치 범위 추가"
                },
                {
                    "strategy_id": "B",
                    "strategy_name": "전략 B: AI 최적화 + CO2 냉매 하이브리드 청구",
                    "description": "AI 기반 실시간 냉매 분배 최적화와 CO2(R-744) 냉매 적용을 핵심 독립항으로 설정합니다. 세 선행특허 모두 이 조합을 개시하지 않아 넓은 보호 범위 확보가 가능합니다.",
                    "pros": ["최대 보호 범위 확보", "세 선행특허 모두 회피", "강력한 포트폴리오"],
                    "cons": ["진보성 조합 용이성 거절 가능성", "심사 기간 다소 증가"],
                    "recommended_claim_changes": "독립항에 'AI 기반 냉매 분배 비율 최적화 + CO2 냉매'를 필수 구성으로 설정"
                },
                {
                    "strategy_id": "C",
                    "strategy_name": "전략 C: KIPO 우선 + PCT 글로벌 출원",
                    "description": "KIPO 국내 우선 출원 후 12개월 내 PCT 출원으로 주요 EV 시장(미국·유럽·중국·일본)을 동시 보호합니다.",
                    "pros": ["글로벌 특허 보호", "EV 핵심 시장 커버", "라이선스 수익 극대화"],
                    "cons": ["비용 5천만원 이상", "번역 및 관리 부담"],
                    "recommended_claim_changes": "KIPO 기본 청구항 확정 후 각국 규정에 맞게 보정"
                }
            ],
            "freedom_to_operate": "AI+CO2 냉매+5모드 EEV 조합은 FTO 확보 영역입니다. 전략 B 적용 시 KIPO 등록 가능성 75-85%로 추정됩니다.",
            "recommended_strategy_id": "B",
            "recommended_reason": "AI 최적화 + CO2 냉매 조합이 세 선행특허 모두를 회피하며 가장 넓은 보호 범위를 확보"
        }

    # ── Step4: patent draft ───────────────────────────────────────────────
    if any(k in p for k in ["draft", "claim", "patent_office", "kipo", "uspto", "abstract"]):
        return {
            "patent_office": "KIPO",
            "invention_title": "전기차 배터리-차실 통합 냉방용 히트펌프 기반 다중 모드 냉매 순환 시스템 및 그 제어 방법",
            "abstract": "본 발명은 전기자동차의 배터리 팩과 차량 실내를 단일 CO2(R-744) 냉매 사이클로 통합하여 냉난방하는 히트펌프 시스템에 관한 것으로, 전자 팽창 밸브(EEV) 3개로 구성된 다중 경로 냉매 네트워크와 AI 기반 최적화 알고리즘을 통해 5가지 운전 모드를 자동 선택함으로써 기존 대비 에너지 소비를 28% 절감하는 기술을 제공한다.",
            "sections": {
                "background": {
                    "title": "발명의 배경이 되는 기술",
                    "content": "종래 전기자동차의 열관리 시스템은 배터리 냉각계와 차량 공조계가 별도의 독립된 냉매 사이클로 구성되어 있어, 에너지 효율이 낮고 시스템 부품 수가 많으며 차량 중량이 증가하는 문제점이 있었다. 특히 겨울철 히트펌프 운전 시 배터리 온도 유지와 차실 난방이 상충하는 경우 에너지 배분 최적화가 불가능하였다."
                },
                "technical_field": {
                    "title": "기술 분야",
                    "content": "본 발명은 전기자동차의 배터리 팩 열관리와 차량 실내 공조를 통합하는 히트펌프 기반 냉매 순환 시스템 및 제어 방법에 관한 것으로, 특히 CO2 냉매와 다중 전자 팽창 밸브를 이용한 5모드 자동 전환 기술에 관한 것이다."
                },
                "summary": {
                    "title": "발명의 내용",
                    "content": "본 발명에 따른 통합 열관리 시스템은 전동 압축기, 실내 응축기/증발기, 배터리 칠러, 3개의 EEV(EEV-1, EEV-2, EEV-3)로 구성된 냉매 네트워크와, 외기 온도·배터리 SOC·배터리 온도·승객실 요구 온도를 입력받아 운전 모드를 결정하는 AI 제어 유닛을 포함한다."
                }
            },
            "claims": [
                "1. 전기자동차의 배터리 팩과 차량 실내를 통합 냉난방하는 시스템에 있어서, CO2(R-744)를 냉매로 사용하는 전동 압축기(10); 실내 냉난방을 담당하는 실내 열교환기(20); 배터리 팩을 냉각하는 배터리 칠러(30); 상기 전동 압축기(10), 실내 열교환기(20) 및 배터리 칠러(30) 사이에 배치되어 냉매 경로를 결정하는 제1 내지 제3 전자 팽창 밸브(EEV-1, EEV-2, EEV-3); 및 외기 온도, 배터리 SOC, 배터리 온도 및 실내 목표 온도를 입력받아 AI 예측 알고리즘에 기반하여 상기 전자 팽창 밸브의 개도율을 제어하는 제어 유닛(50)을 포함하되, 상기 제어 유닛(50)은 냉매 경로를 5개 모드 중 최적 모드로 자동 전환하는 것을 특징으로 하는 전기차 통합 열관리 시스템.",
                "2. 제1항에 있어서, 상기 5개 모드는 배터리 전용 냉각 모드, 차실 전용 냉방 모드, 차실 전용 난방 모드, 배터리-차실 동시 냉각 모드 및 배터리 냉각+차실 난방 동시 운전 모드를 포함하는 전기차 통합 열관리 시스템.",
                "3. 제1항에 있어서, 상기 AI 예측 알고리즘은 LSTM 기반 순환 신경망으로 구현되며, 과거 15분의 주행 데이터를 기반으로 향후 10분의 배터리 발열량을 예측하는 전기차 통합 열관리 시스템.",
                "4. 제1항에 있어서, 상기 전자 팽창 밸브의 개도율은 10% 이상 90% 이하의 범위에서 제어되며, CAN 버스를 통해 BMS와 실시간 통신하는 전기차 통합 열관리 시스템.",
                "5. 배터리 팩과 차량 실내를 단일 CO2 냉매 사이클로 통합 제어하는 방법에 있어서, 외기 온도, 배터리 SOC 및 실내 온도 요구를 수집하는 단계; AI 예측 모델로 향후 10분간 배터리 발열량을 예측하는 단계; 예측값과 실내 온도 요구에 기반하여 5개 모드 중 최적 운전 모드를 선택하는 단계; 및 선택된 모드에 따라 EEV 개도율을 제어하는 단계를 포함하는 전기차 통합 열관리 제어 방법.",
            ],
            "claim_strategy_applied": "전략 B — AI 최적화 + CO2 냉매 하이브리드 구성을 독립항 핵심으로 설정"
        }

    # ── Step5: audit ──────────────────────────────────────────────────────
    if any(k in p for k in ["audit", "examiner", "inventive", "patentability", "allowability"]):
        return {
            "overall_assessment": "청구항 1의 독립항은 신규성(§29조 1항)을 충족합니다. 진보성(§29조 2항) 측면에서 CO2 냉매 + AI 최적화 조합은 선행기술에서 개시되지 않아 긍정적이나, EEV 개도율 수치 범위의 임계적 의의 보강이 필요합니다.",
            "allowability_score": 76,
            "overall_verdict": "조건부 등록 가능 — 경미한 보정 후 심사 통과 예상",
            "estimated_grant_probability": "보정 청구항 제출 시 KIPO 등록 가능성 75-82% 추정",
            "issues": [
                {
                    "issue_type": "inventive_step",
                    "severity": "major",
                    "claim_number": 1,
                    "description": "청구항 1의 '5개 모드 자동 전환'은 Denso US11273693B2의 기본 전환 개념과 Valeo EP3936361A1의 다중 루프 개념의 단순 결합으로 볼 수 있습니다.",
                    "suggestion": "AI 예측 알고리즘의 구체적 입력 변수(SOC, 외기 온도, 발열량 예측)와 CO2 냉매 적용이 결합되었을 때의 시너지 효과를 독립항에 명시하고 실험 데이터로 뒷받침하세요."
                },
                {
                    "issue_type": "clarity",
                    "severity": "minor",
                    "claim_number": 1,
                    "description": "'AI 예측 알고리즘에 기반하여'라는 표현이 불명확합니다.",
                    "suggestion": "청구항에 AI 알고리즘의 입력 변수(외기 온도, SOC, 발열량)와 출력(모드 선택, EEV 개도율)을 구체적으로 기재하세요."
                }
            ],
            "amended_claims": [
                "1. [보정] 전기자동차의 배터리 팩과 차량 실내를 통합 냉난방하는 시스템에 있어서, CO2(R-744)를 냉매로 사용하는 전동 압축기(10); 실내 냉난방을 담당하는 실내 열교환기(20); 배터리 팩을 냉각하는 배터리 칠러(30); 제1 내지 제3 전자 팽창 밸브(EEV-1, EEV-2, EEV-3)(개도율 10-90% 제어 가능); 및 외기 온도, 배터리 SOC, 현재 배터리 온도 및 배터리 발열 예측값을 입력받아 LSTM 기반 신경망으로 향후 10분 발열량을 예측하고, 예측값에 기반하여 5개 냉매 경로 모드 중 하나를 선택하며, 선택된 모드에 따라 EEV 개도율을 제어하는 AI 제어 유닛(50)을 포함하는 전기차 통합 열관리 시스템."
            ],
            "examiner_remarks": "보정 후 청구항은 CO2 냉매와 LSTM 기반 AI 예측의 구체적 조합이 선행기술과 명확히 차별화되어 등록 가능성이 높습니다. 실험 데이터(COP 비교, 에너지 절감률)를 의견서에 첨부하면 심사 기간을 단축할 수 있습니다.",
            "next_actions": [
                "독립항 1을 보정안으로 수정 후 재제출",
                "LSTM AI 모델 학습 데이터 및 정확도 지표를 발명의 설명에 추가",
                "CO2 냉매 + 5모드 EEV 조합의 COP 비교 실험 데이터 첨부",
                "Denso US11273693B2와의 기술적 차이점 의견서 작성",
                "도면 추가: 5개 모드별 냉매 흐름도, COP 비교 그래프"
            ]
        }

    return {"message": "Mock response", "data": {}}
