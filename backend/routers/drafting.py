from fastapi import APIRouter, HTTPException
from models.project import DraftingRequest, DraftingResponse, PatentDraft, PatentSection
from services.llm_service import call_llm
from services.db_service import save_draft, get_draft, update_project_status, get_project

router = APIRouter(prefix="/drafting", tags=["drafting"])

KIPO_DRAFT_PROMPT = """
당신은 대한민국 특허청(KIPO) 등록 변리사입니다. 특허법에 따른 표준 형식에 맞게 완성도 높은 특허 명세서를 작성하세요.

기술 명세:
- 발명의 명칭: {invention_title}
- 기술 분야: {technical_field}
- 배경기술: {background}
- 해결과제: {problem_to_solve}
- 해결수단: {solution_summary}
- 핵심 특징: {key_features}
- 효과: {advantages}
- 회피 전략 (참고): {avoidance_strategies}

특허청: {patent_office}

다음 JSON 형식으로 응답하세요:
{{
  "patent_office": "{patent_office}",
  "invention_title": "발명의 명칭",
  "abstract": "요약서 (150자 내외)",
  "background": {{"title": "발명의 배경이 되는 기술", "content": "상세 내용..."}},
  "technical_field": {{"title": "기술 분야", "content": "상세 내용..."}},
  "summary": {{"title": "발명의 내용", "content": "상세 내용..."}},
  "detailed_description": {{"title": "발명을 실시하기 위한 구체적인 내용", "content": "도면 참조 포함 상세 내용..."}},
  "claims": [
    "1. [독립항] ...",
    "2. [종속항] 제 1항에 있어서, ...",
    "3. [종속항] ...",
    "4. [종속항] ...",
    "5. [방법 청구항] ..."
  ],
  "brief_description_of_drawings": "도면의 간단한 설명"
}}

청구항은 반드시 독립항 1개 이상, 종속항 3개 이상, 방법 청구항 1개를 포함하세요.
모든 내용은 특허출원 바로 가능한 수준으로 작성하세요.
"""


@router.post("/generate", response_model=DraftingResponse)
async def generate_draft(body: DraftingRequest):
    project = await get_project(body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    spec = body.tech_spec
    prompt = KIPO_DRAFT_PROMPT.format(
        invention_title=spec.invention_title,
        technical_field=spec.technical_field,
        background=spec.background,
        problem_to_solve=spec.problem_to_solve,
        solution_summary=spec.solution_summary,
        key_features=", ".join(spec.key_features),
        advantages=", ".join(spec.advantages),
        avoidance_strategies=", ".join(body.avoidance_strategies or []),
        patent_office=body.patent_office
    )

    result = await call_llm(prompt)

    draft = PatentDraft(
        project_id=body.project_id,
        patent_office=result.get("patent_office", body.patent_office),
        invention_title=result.get("invention_title", spec.invention_title),
        abstract=result.get("abstract", ""),
        background=PatentSection(**result.get("background", {"title": "", "content": ""})),
        technical_field=PatentSection(**result.get("technical_field", {"title": "", "content": ""})),
        summary=PatentSection(**result.get("summary", {"title": "", "content": ""})),
        detailed_description=PatentSection(**result.get("detailed_description", {"title": "", "content": ""})),
        claims=result.get("claims", []),
        brief_description_of_drawings=result.get("brief_description_of_drawings", "")
    )

    await save_draft(body.project_id, body.patent_office, result)
    await update_project_status(body.project_id, "drafting", "drafting_progress", 100)

    return DraftingResponse(project_id=body.project_id, draft=draft)


@router.get("/{project_id}")
async def get_draft_result(project_id: int):
    result = await get_draft(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="No draft found")
    return result
