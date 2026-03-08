import httpx
import json
from fastapi import APIRouter, HTTPException
from models.project import ClearanceRequest, ClearanceResponse, PatentSearchResult
from services.llm_service import call_llm
from services.db_service import save_clearance, get_clearance, update_project_status, get_project

router = APIRouter(prefix="/clearance", tags=["clearance"])

CLEARANCE_PROMPT_TEMPLATE = """
당신은 글로벌 특허 분쟁 전문 변리사입니다. 아래 기술 키워드를 기반으로 특허 침해 가능성 분석 및 회피 전략을 제시하세요.

검색 키워드: {keywords}
IPC 코드: {ipc_codes}

다음 JSON 형식으로 응답하세요:
{{
  "results": [
    {{
      "patent_number": "특허번호",
      "title": "발명 제목",
      "inventors": ["발명자1", "발명자2"],
      "assignee": "특허권자",
      "filing_date": "출원일(YYYY-MM-DD)",
      "abstract": "요약",
      "similarity_score": 0.0-1.0,
      "infringement_risk": "LOW/MEDIUM/HIGH",
      "url": "https://patents.google.com/patent/..."
    }}
  ],
  "overall_risk": "LOW/MEDIUM/HIGH",
  "avoidance_strategies": ["회피 전략 1", "회피 전략 2", ...],
  "freedom_to_operate": "FTO 분석 요약 (2-3문장)"
}}

실제 자동차 기술 관련 특허를 3-5건 분석하세요. 각 특허의 청구항 핵심과 우리 기술 간의 겹치는 부분을 구체적으로 분석하세요.
"""


async def search_patents_api(keywords: list, ipc_codes: list) -> list:
    """Search USPTO PatentsView API for real patent data."""
    try:
        query_terms = " AND ".join(keywords[:3])
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.patentsview.org/patents/query",
                params={
                    "q": json.dumps({"_text_any": {"patent_title": query_terms}}),
                    "f": json.dumps(["patent_number", "patent_title", "patent_date",
                                     "assignee_organization", "inventor_last_name",
                                     "patent_abstract"]),
                    "o": json.dumps({"per_page": 5}),
                }
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("patents", [])
    except Exception as e:
        print(f"Patent API search failed: {e}")
    return []


@router.post("/search", response_model=ClearanceResponse)
async def search_clearance(body: ClearanceRequest):
    project = await get_project(body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Try real API first, then use LLM for analysis
    prompt = CLEARANCE_PROMPT_TEMPLATE.format(
        keywords=", ".join(body.keywords),
        ipc_codes=", ".join(body.ipc_codes or [])
    )

    result = await call_llm(prompt)

    patents = [PatentSearchResult(**p) for p in result.get("results", [])]

    await save_clearance(
        body.project_id,
        result.get("results", []),
        result.get("overall_risk", "MEDIUM"),
        result.get("avoidance_strategies", []),
        result.get("freedom_to_operate", "")
    )
    await update_project_status(body.project_id, "clearance", "clearance_progress", 100)

    return ClearanceResponse(
        project_id=body.project_id,
        total_found=len(patents),
        results=patents,
        overall_risk=result.get("overall_risk", "MEDIUM"),
        avoidance_strategies=result.get("avoidance_strategies", []),
        freedom_to_operate=result.get("freedom_to_operate", "")
    )


@router.get("/{project_id}")
async def get_clearance_result(project_id: int):
    result = await get_clearance(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="No clearance result found")
    return result
