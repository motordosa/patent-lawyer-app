import httpx
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.db_service import (
    save_research_item, get_research_items, delete_research_items,
    update_project_status, get_project, get_all_settings
)
from services.llm_service import call_llm, MOCK_MODE

router = APIRouter(prefix="/research", tags=["research"])


class ResearchRequest(BaseModel):
    project_id: int
    query: str
    keywords: Optional[List[str]] = []
    sources: Optional[List[str]] = ["web", "patents", "academic"]
    max_results: Optional[int] = 10


RESEARCH_MOCK_DATA = [
    {
        "source_type": "web",
        "source_name": "McKinsey & Company",
        "title": "전기차 배터리 열관리 기술 동향 2024",
        "content": "전기차 배터리 팩의 열관리는 배터리 수명과 안전성에 직결된다. 최신 연구에 따르면 위상 변화 물질(Phase Change Material, PCM) 기반 열관리 시스템이 기존 액체 냉각 대비 에너지 효율을 35-45% 향상시키는 것으로 나타났다. 특히 CATL, BYD, 파나소닉 등 주요 배터리 업체들이 PCM 복합 냉각 시스템 개발에 집중하고 있으며, 2025년까지 양산 적용을 목표로 하고 있다.",
        "url": "https://www.mckinsey.com/ev-battery-thermal",
        "relevance_score": 0.95
    },
    {
        "source_type": "academic",
        "source_name": "Journal of Power Sources",
        "title": "Phase Change Material Integration in Lithium-Ion Battery Packs: A Review",
        "content": "본 리뷰 논문은 리튬이온 배터리 팩에서 PCM(위상 변화 물질) 통합 기술의 최신 연구 동향을 종합 분석한다. 파라핀 왁스, 지방산, 폴리에틸렌 글리콜 등 다양한 PCM 소재와 그 열적 특성을 비교하였다. 마이크로캡슐화 PCM을 활용한 시스템이 가장 높은 열 흡수 효율(230 kJ/kg 이상)을 보였으며, 배터리 온도 균일도 개선에 효과적임을 확인하였다.",
        "url": "https://doi.org/10.1016/j.jpowsour.2024.01.234",
        "relevance_score": 0.92
    },
    {
        "source_type": "patents",
        "source_name": "USPTO Patent Database",
        "title": "US20240087890A1: Adaptive Battery Thermal Management with AI Prediction",
        "content": "본 특허는 AI 기반 예측 알고리즘을 활용한 적응형 배터리 열관리 시스템을 개시한다. LSTM 신경망을 이용하여 배터리 온도 상승을 5분 전 예측하고, 이를 기반으로 냉각 시스템을 선제적으로 제어한다. 청구항 1: 복수의 배터리 셀을 포함하는 배터리 팩; AI 예측 모듈; 및 적응형 냉각 제어 유닛을 포함하는 열관리 시스템. 출원인: LG에너지솔루션, 출원일: 2023-11-15.",
        "url": "https://patents.google.com/patent/US20240087890A1",
        "relevance_score": 0.88
    },
    {
        "source_type": "web",
        "source_name": "Bloomberg NEF",
        "title": "글로벌 EV 배터리 시장 전망: 열관리 기술 경쟁",
        "content": "2024년 글로벌 전기차 배터리 시장 규모는 1,205억 달러로 추정되며, 이 중 배터리 열관리 시스템 시장은 85억 달러 규모다. 열관리 기술 특허 출원은 2020년 대비 340% 급증하였으며, 한국(현대/LG/삼성), 중국(CATL/BYD), 일본(파나소닉/도요타) 기업들이 주요 출원인이다. PCM 복합 냉각 방식이 차세대 표준으로 부상하고 있다.",
        "url": "https://about.bnef.com/ev-battery-2024",
        "relevance_score": 0.85
    },
    {
        "source_type": "academic",
        "source_name": "Applied Thermal Engineering",
        "title": "Experimental Study on PCM-based Thermal Management for 21700 Cylindrical Cells",
        "content": "21700 원통형 리튬이온 셀 6개로 구성된 모듈에서 파라핀/그래핀 복합 PCM(위상전환온도 30°C, 잠열 215 kJ/kg)을 적용한 열관리 실험을 수행하였다. 1C 방전 시 최대 셀 온도가 기존 자연대류 방식 대비 8.3°C 낮아졌으며, 셀 간 온도 편차도 2.1°C에서 0.7°C로 감소하였다. 결론적으로 제안된 PCM 복합 냉각 방식은 배터리 수명을 약 18% 연장하는 것으로 추정된다.",
        "url": "https://doi.org/10.1016/j.applthermaleng.2024.122891",
        "relevance_score": 0.90
    }
]


async def search_with_tavily(query: str, api_key: str, max_results: int = 5) -> list:
    """실제 Tavily AI 검색 API 호출"""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": api_key,
                    "query": query,
                    "search_depth": "advanced",
                    "include_answer": True,
                    "max_results": max_results,
                    "include_domains": []
                }
            )
            if response.status_code == 200:
                data = response.json()
                results = []
                for r in data.get("results", []):
                    results.append({
                        "source_type": "web",
                        "source_name": r.get("source", "Web"),
                        "title": r.get("title", ""),
                        "content": r.get("content", ""),
                        "url": r.get("url", ""),
                        "relevance_score": r.get("score", 0.5)
                    })
                return results
    except Exception as e:
        print(f"Tavily search failed: {e}")
    return []


async def search_with_serper(query: str, api_key: str, max_results: int = 5) -> list:
    """실제 Serper (Google Search) API 호출"""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
                json={"q": query, "num": max_results, "gl": "us", "hl": "ko"}
            )
            if response.status_code == 200:
                data = response.json()
                results = []
                for r in data.get("organic", []):
                    results.append({
                        "source_type": "web",
                        "source_name": r.get("source", r.get("link", "").split("/")[2] if r.get("link") else "Web"),
                        "title": r.get("title", ""),
                        "content": r.get("snippet", ""),
                        "url": r.get("link", ""),
                        "relevance_score": 1.0 / (r.get("position", 5))
                    })
                return results
    except Exception as e:
        print(f"Serper search failed: {e}")
    return []


SUMMARIZE_PROMPT = """
다음 검색 결과들을 자동차 특허 전략 관점에서 분석하고 각 항목에 대해 핵심 내용만 간략히 요약하세요.
검색어: {query}

결과들:
{results_text}

각 결과에 대해 다음 JSON 형식으로 응답:
{{
  "items": [
    {{
      "title": "원본 제목",
      "summary": "핵심 내용 요약 (2-3문장)",
      "relevance_score": 0.0-1.0,
      "patent_relevance": "이 정보가 특허 전략에 주는 시사점"
    }}
  ]
}}
"""


@router.post("/collect")
async def collect_research(body: ResearchRequest):
    project = await get_project(body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    settings = await get_all_settings()
    tavily_key = settings.get("tavily_api_key", "")
    serper_key = settings.get("serper_api_key", "")

    collected = []
    query = body.query
    if body.keywords:
        query += " " + " ".join(body.keywords[:3])

    # Try real APIs
    if tavily_key:
        results = await search_with_tavily(query, tavily_key, body.max_results)
        collected.extend(results)
    elif serper_key:
        results = await search_with_serper(query, serper_key, body.max_results)
        collected.extend(results)
    else:
        # Mock mode - use predefined automotive research data
        collected = RESEARCH_MOCK_DATA[:body.max_results]

    # Clear old research for this project and save new
    await delete_research_items(body.project_id)

    saved_items = []
    for item in collected:
        item_id = await save_research_item(
            project_id=body.project_id,
            source_type=item.get("source_type", "web"),
            source_name=item.get("source_name", "Unknown"),
            title=item.get("title", ""),
            content=item.get("content", ""),
            url=item.get("url", ""),
            relevance_score=float(item.get("relevance_score", 0.5))
        )
        saved_items.append({**item, "id": item_id})

    await update_project_status(body.project_id, project["status"], "research_progress", 100)

    return {
        "project_id": body.project_id,
        "total_collected": len(saved_items),
        "items": saved_items,
        "source_mode": "api" if (tavily_key or serper_key) else "mock"
    }


@router.get("/{project_id}")
async def get_research(project_id: int):
    items = await get_research_items(project_id)
    return {"project_id": project_id, "total": len(items), "items": items}


@router.delete("/{project_id}")
async def clear_research(project_id: int):
    await delete_research_items(project_id)
    return {"message": "Research data cleared"}
