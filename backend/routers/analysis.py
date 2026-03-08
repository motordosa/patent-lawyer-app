import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.db_service import (
    save_analysis, get_analysis, get_research_items,
    update_project_status, get_project, get_all_settings
)
from services.llm_service import call_llm

router = APIRouter(prefix="/analysis", tags=["analysis"])


class AnalysisRequest(BaseModel):
    project_id: int
    analysis_type: Optional[str] = "comprehensive"
    # comprehensive | competitive | patentability | market | technical
    custom_prompt: Optional[str] = None
    use_research_data: Optional[bool] = True


def build_analysis_prompt(analysis_type: str, project: dict, research_items: list, custom_prompt: str = None) -> str:
    research_text = ""
    if research_items:
        research_text = "\n\n=== 수집된 리서치 데이터 ===\n"
        for i, item in enumerate(research_items[:8], 1):
            research_text += f"\n[{i}] {item['source_name']} - {item['title']}\n{item['content'][:500]}...\n"

    base_context = f"""
프로젝트: {project['title']}
기술 분야: {project['technology_field']}
설명: {project['description']}
{research_text}
"""

    prompts = {
        "comprehensive": f"""
당신은 자동차 산업 특허 전략 최고 전문가입니다. 아래 발명 프로젝트와 수집된 선행기술/시장 정보를 종합 분석하여 특허 전략 보고서를 작성하세요.

{base_context}

다음 JSON 형식으로 응답하세요:
{{
  "summary": "종합 분석 요약 (3-4문장, 핵심만)",
  "key_findings": [
    "핵심 발견 1 (기술/시장/특허 관점)",
    "핵심 발견 2",
    "핵심 발견 3",
    "핵심 발견 4"
  ],
  "opportunities": [
    "특허 전략 기회 1",
    "특허 전략 기회 2",
    "특허 전략 기회 3"
  ],
  "risks": [
    "주요 위험 요인 1",
    "주요 위험 요인 2",
    "주요 위험 요인 3"
  ],
  "recommendations": [
    "즉시 실행 권고사항 1",
    "즉시 실행 권고사항 2",
    "중기 전략 권고사항 3",
    "중기 전략 권고사항 4"
  ]
}}
""",
        "competitive": f"""
당신은 자동차 산업 경쟁 특허 전략가입니다. 경쟁사 특허 포트폴리오와 시장 트렌드를 분석하세요.

{base_context}

경쟁사 특허 현황, 공백 영역, 차별화 전략을 중심으로 JSON 형식으로 분석하세요:
{{
  "summary": "경쟁 특허 환경 종합 평가",
  "key_findings": ["경쟁사 특허 동향 1", "경쟁사 특허 동향 2", "특허 공백 영역", "차별화 기회"],
  "opportunities": ["경쟁 우위 기회 1", "경쟁 우위 기회 2", "공백 특허 출원 기회"],
  "risks": ["경쟁사 특허 방어망", "침해 위험 영역", "시장 진입 장벽"],
  "recommendations": ["경쟁 전략 1", "경쟁 전략 2", "특허 포트폴리오 구축 전략", "라이선싱 전략"]
}}
""",
        "patentability": f"""
당신은 대한민국 특허청 전문 심사관 출신 변리사입니다. 본 발명의 특허 등록 가능성을 종합 평가하세요.

{base_context}

신규성, 진보성, 산업상 이용가능성 관점에서 JSON 형식으로 분석하세요:
{{
  "summary": "특허 등록 가능성 종합 평가 (등록 가능성 퍼센트 포함)",
  "key_findings": ["신규성 평가", "진보성 평가", "선행기술 대비 차별점", "청구항 전략"],
  "opportunities": ["등록 가능한 청구항 방향 1", "등록 가능한 청구항 방향 2", "분할출원 기회"],
  "risks": ["거절 가능 이유 1", "거절 가능 이유 2", "선행기술 충돌 영역"],
  "recommendations": ["청구항 보정 방향 1", "청구항 보정 방향 2", "분할출원 전략", "PCT 출원 타이밍"]
}}
""",
        "market": f"""
당신은 자동차 산업 IP 비즈니스 전략가입니다. 본 기술의 시장성과 사업화 전략을 분석하세요.

{base_context}

시장 규모, 사업화 경로, ROI 관점에서 JSON 형식으로 분석하세요:
{{
  "summary": "시장성 및 사업화 가능성 종합 평가",
  "key_findings": ["목표 시장 규모", "주요 수요처", "기술 성숙도", "상용화 타임라인"],
  "opportunities": ["라이선싱 기회", "JV/협업 기회", "직접 상용화 경로"],
  "risks": ["시장 진입 장벽", "경쟁 기술 위협", "규제 리스크"],
  "recommendations": ["단기 사업화 전략", "중장기 수익화 전략", "투자 유치 전략", "글로벌 확장 전략"]
}}
"""
    }

    if custom_prompt:
        return f"""
당신은 자동차 특허 전략 전문가입니다.
{base_context}

사용자 요청: {custom_prompt}

JSON 형식으로 응답하세요:
{{
  "summary": "분석 요약",
  "key_findings": ["발견 1", "발견 2", "발견 3"],
  "opportunities": ["기회 1", "기회 2"],
  "risks": ["위험 1", "위험 2"],
  "recommendations": ["권고 1", "권고 2", "권고 3"]
}}
"""

    return prompts.get(analysis_type, prompts["comprehensive"])


@router.post("/analyze")
async def analyze_project(body: AnalysisRequest):
    project = await get_project(body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    settings = await get_all_settings()
    preferred_llm = settings.get("preferred_llm", "openai")

    research_items = []
    if body.use_research_data:
        research_items = await get_research_items(body.project_id)

    prompt = build_analysis_prompt(
        body.analysis_type or "comprehensive",
        project, research_items,
        body.custom_prompt
    )

    result = await call_llm(prompt)

    # Determine which model was used
    llm_model = "Mock AI" if not any([
        settings.get("openai_api_key"), settings.get("anthropic_api_key"),
        settings.get("google_api_key"), settings.get("groq_api_key")
    ]) else f"{preferred_llm} (configured)"

    analysis_id = await save_analysis(
        project_id=body.project_id,
        analysis_type=body.analysis_type or "comprehensive",
        llm_model=llm_model,
        summary=result.get("summary", ""),
        key_findings=result.get("key_findings", []),
        opportunities=result.get("opportunities", []),
        risks=result.get("risks", []),
        recommendations=result.get("recommendations", []),
        raw_content=json.dumps(result, ensure_ascii=False)
    )

    await update_project_status(body.project_id, project["status"], "analysis_progress", 100)

    return {
        "id": analysis_id,
        "project_id": body.project_id,
        "analysis_type": body.analysis_type,
        "llm_model": llm_model,
        "summary": result.get("summary", ""),
        "key_findings": result.get("key_findings", []),
        "opportunities": result.get("opportunities", []),
        "risks": result.get("risks", []),
        "recommendations": result.get("recommendations", []),
    }


@router.get("/{project_id}")
async def get_analyses(project_id: int):
    results = await get_analysis(project_id)
    return {"project_id": project_id, "total": len(results), "analyses": results}
