from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ProjectStatus(str, Enum):
    IDEATION = "ideation"
    CLEARANCE = "clearance"
    DRAFTING = "drafting"
    AUDIT = "audit"
    COMPLETE = "complete"


class ProjectCreate(BaseModel):
    title: str
    description: str
    technology_field: Optional[str] = "자동차 기술"


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None


class Project(BaseModel):
    id: int
    title: str
    description: str
    technology_field: str
    status: ProjectStatus
    ideation_progress: int = 0
    clearance_progress: int = 0
    drafting_progress: int = 0
    audit_progress: int = 0
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class TechSpec(BaseModel):
    invention_title: str
    technical_field: str
    background: str
    problem_to_solve: str
    solution_summary: str
    key_features: List[str]
    advantages: List[str]
    potential_claims: List[str]


class IdeationRequest(BaseModel):
    project_id: int
    raw_idea: str
    context: Optional[str] = None


class IdeationResponse(BaseModel):
    project_id: int
    tech_spec: TechSpec
    keywords: List[str]
    ipc_codes: List[str]


class PatentSearchResult(BaseModel):
    patent_number: str
    title: str
    inventors: List[str]
    assignee: str
    filing_date: str
    abstract: str
    similarity_score: float
    infringement_risk: str  # LOW / MEDIUM / HIGH
    url: str


class ClearanceRequest(BaseModel):
    project_id: int
    keywords: List[str]
    ipc_codes: Optional[List[str]] = None


class ClearanceResponse(BaseModel):
    project_id: int
    total_found: int
    results: List[PatentSearchResult]
    overall_risk: str
    avoidance_strategies: List[str]
    freedom_to_operate: str


class PatentSection(BaseModel):
    title: str
    content: str


class PatentDraft(BaseModel):
    project_id: int
    patent_office: str  # KIPO / USPTO
    invention_title: str
    abstract: str
    background: PatentSection
    technical_field: PatentSection
    summary: PatentSection
    detailed_description: PatentSection
    claims: List[str]
    brief_description_of_drawings: str


class DraftingRequest(BaseModel):
    project_id: int
    tech_spec: TechSpec
    patent_office: str = "KIPO"
    avoidance_strategies: Optional[List[str]] = None


class DraftingResponse(BaseModel):
    project_id: int
    draft: PatentDraft


class AuditIssue(BaseModel):
    issue_type: str  # novelty / inventive_step / clarity / enablement
    severity: str    # major / minor
    claim_number: Optional[int] = None
    description: str
    suggestion: str


class AuditRequest(BaseModel):
    project_id: int
    draft: PatentDraft
    prior_art_references: Optional[List[str]] = None


class AuditResponse(BaseModel):
    project_id: int
    overall_assessment: str
    allowability_score: int  # 0-100
    issues: List[AuditIssue]
    amended_claims: List[str]
    examiner_remarks: str
    next_actions: List[str]
