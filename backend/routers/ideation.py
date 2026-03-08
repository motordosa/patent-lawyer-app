import json
from fastapi import APIRouter, HTTPException
from models.project import IdeationRequest, IdeationResponse, TechSpec
from services.llm_service import call_llm
from services.db_service import save_ideation, get_ideation, update_project_status, get_project

router = APIRouter(prefix="/ideation", tags=["ideation"])

IDEATION_PROMPT_TEMPLATE = """
당신은 20년 경력의 자동차 R&D 수석 엔지니어이자 특허 전문가입니다.
아래의 거친 아이디어를 완성도 높은 기술 명세서 수준으로 구체화하세요.

발명자의 아이디어:
"{raw_idea}"

추가 컨텍스트:
"{context}"

다음 JSON 형식으로 응답하세요:
{{
  "invention_title": "발명의 명칭 (한국어, 구체적이고 기술적으로)",
  "technical_field": "기술 분야 설명 (2-3문장)",
  "background": "배경기술 및 종래기술의 문제점 (3-5문장)",
  "problem_to_solve": "해결하고자 하는 과제 (2-3문장)",
  "solution_summary": "과제 해결 수단 요약 (3-5문장)",
  "key_features": ["핵심 기술 특징 1", "핵심 기술 특징 2", ...],
  "advantages": ["발명의 효과 1", "발명의 효과 2", ...],
  "potential_claims": ["잠재적 청구항 방향 1", "잠재적 청구항 방향 2", ...],
  "keywords": ["특허 검색용 영문 키워드 1", "키워드 2", ...],
  "ipc_codes": ["IPC 분류코드 1", "IPC 분류코드 2", ...]
}}
"""


@router.post("/generate", response_model=IdeationResponse)
async def generate_ideation(body: IdeationRequest):
    project = await get_project(body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    prompt = IDEATION_PROMPT_TEMPLATE.format(
        raw_idea=body.raw_idea,
        context=body.context or "없음"
    )

    result = await call_llm(prompt)

    # Extract keywords and IPC codes (may be nested or top-level)
    keywords = result.pop("keywords", [])
    ipc_codes = result.pop("ipc_codes", [])

    tech_spec = TechSpec(**result)

    await save_ideation(body.project_id, result, keywords, ipc_codes)
    await update_project_status(body.project_id, "ideation", "ideation_progress", 100)

    return IdeationResponse(
        project_id=body.project_id,
        tech_spec=tech_spec,
        keywords=keywords,
        ipc_codes=ipc_codes
    )


@router.get("/{project_id}")
async def get_ideation_result(project_id: int):
    result = await get_ideation(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="No ideation result found")
    return result
