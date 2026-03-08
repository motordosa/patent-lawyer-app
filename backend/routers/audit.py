from fastapi import APIRouter, HTTPException
from models.project import AuditRequest, AuditResponse, AuditIssue
from services.llm_service import call_llm
from services.db_service import save_audit, get_audit, update_project_status, get_project

router = APIRouter(prefix="/audit", tags=["audit"])

AUDIT_PROMPT_TEMPLATE = """
당신은 대한민국 특허청(KIPO)의 수석 심사관입니다. 20년 경력의 자동차/기계 분야 전문심사관 페르소나로, 아래 특허 초안을 엄격하게 심사하세요.

특허 초안:
- 발명의 명칭: {invention_title}
- 청구항:
{claims}
- 선행기술 참고: {prior_art}

특허법 제29조(신규성/진보성) 기준으로 엄격히 심사하고, 다음 JSON 형식으로 응답하세요:
{{
  "overall_assessment": "전체적인 심사 의견 (3-4문장)",
  "allowability_score": 0-100 (등록 가능성 점수),
  "issues": [
    {{
      "issue_type": "novelty/inventive_step/clarity/enablement",
      "severity": "major/minor",
      "claim_number": 청구항 번호 또는 null,
      "description": "구체적인 거절 이유",
      "suggestion": "구체적인 보정 방향"
    }}
  ],
  "amended_claims": [
    "1. [보정] 보정된 독립항...",
    "..."
  ],
  "examiner_remarks": "심사관 의견 (등록 가능성, 강점, 약점)",
  "next_actions": ["다음 행동 1", "다음 행동 2", ...]
}}

반드시 진보성(inventive step), 명확성(clarity), 실시가능성(enablement)을 각각 검토하세요.
보정 청구항은 심사를 통과할 수 있도록 최대한 구체적으로 작성하세요.
"""


@router.post("/review", response_model=AuditResponse)
async def review_draft(body: AuditRequest):
    project = await get_project(body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    claims_text = "\n".join(body.draft.claims)
    prior_art = ", ".join(body.prior_art_references or ["없음"])

    prompt = AUDIT_PROMPT_TEMPLATE.format(
        invention_title=body.draft.invention_title,
        claims=claims_text,
        prior_art=prior_art
    )

    result = await call_llm(prompt)

    issues = [AuditIssue(**i) for i in result.get("issues", [])]

    await save_audit(
        body.project_id,
        result.get("overall_assessment", ""),
        result.get("allowability_score", 50),
        result.get("issues", []),
        result.get("amended_claims", []),
        result.get("examiner_remarks", ""),
        result.get("next_actions", [])
    )
    await update_project_status(body.project_id, "audit", "audit_progress", 100)

    return AuditResponse(
        project_id=body.project_id,
        overall_assessment=result.get("overall_assessment", ""),
        allowability_score=result.get("allowability_score", 50),
        issues=issues,
        amended_claims=result.get("amended_claims", []),
        examiner_remarks=result.get("examiner_remarks", ""),
        next_actions=result.get("next_actions", [])
    )


@router.get("/{project_id}")
async def get_audit_result(project_id: int):
    result = await get_audit(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="No audit result found")
    return result
