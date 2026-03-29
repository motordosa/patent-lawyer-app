import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { projectsAPI, ideationAPI, clearanceAPI, draftingAPI, auditAPI } from '../services/api'

const STAGES = [
    { key: 'ideation', label: 'Ideation', icon: '💡', color: 'var(--accent-purple)' },
    { key: 'clearance', label: 'Clearance', icon: '🔬', color: 'var(--accent-blue)' },
    { key: 'drafting', label: 'Drafting', icon: '📝', color: 'var(--accent-teal)' },
    { key: 'audit', label: 'Audit', icon: '⚖️', color: 'var(--warning)' },
]

function StageBar({ activeStage, setActiveStage, project }) {
    const progressMap = {
        ideation: project?.ideation_progress || 0,
        clearance: project?.clearance_progress || 0,
        drafting: project?.drafting_progress || 0,
        audit: project?.audit_progress || 0,
    }
    return (
        <div style={{
            display: 'flex', gap: 6, padding: '0 20px 16px',
            overflowX: 'auto', scrollbarWidth: 'none',
        }}>
            {STAGES.map(s => (
                <button
                    key={s.key}
                    onClick={() => setActiveStage(s.key)}
                    style={{
                        flex: '0 0 auto',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '8px 14px',
                        background: activeStage === s.key ? `${s.color}22` : 'var(--glass-bg)',
                        border: `1px solid ${activeStage === s.key ? s.color : 'var(--glass-border)'}`,
                        borderRadius: 14,
                        transition: 'all 0.2s',
                    }}
                >
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: activeStage === s.key ? s.color : 'var(--text-secondary)' }}>
                        {s.label}
                    </span>
                    {progressMap[s.key] > 0 && (
                        <span style={{ fontSize: 9, color: 'var(--success)' }}>✓ {progressMap[s.key]}%</span>
                    )}
                </button>
            ))}
        </div>
    )
}

// ──────────── Ideation Stage ────────────
function IdeationStage({ project, onComplete }) {
    const [idea, setIdea] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    async function handleGenerate() {
        if (!idea.trim() || !project) return
        setLoading(true); setError(null)
        try {
            const res = await ideationAPI.generate({ project_id: project.id, raw_idea: idea })
            setResult(res.data)
            onComplete('ideation')
        } catch (_e) {
            setError('백엔드 서버 연결 실패. 서버가 실행 중인지 확인하세요.')
        } finally { setLoading(false) }
    }

    return (
        <div>
            {!result ? (
                <>
                    <div style={{ marginBottom: 20 }}>
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(94,92,230,0.15), rgba(10,132,255,0.10))',
                            border: '1px solid rgba(94,92,230,0.3)',
                            borderRadius: 20, padding: '16px 18px', marginBottom: 16
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 4 }}>
                                💡 Ideation Engine
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                거친 아이디어를 특허 명세서 수준으로 구체화합니다. 자동차 기술 도메인 AI가 분석합니다.
                            </div>
                        </div>
                        <div className="input-label">아이디어 설명</div>
                        <textarea
                            className="input-field"
                            placeholder="예: 전기차 배터리가 고온에서 성능이 떨어지는 문제를 해결하는 새로운 열관리 방식이 있는데, 위상 변화 물질을 셀 사이에 넣고 AI로 냉각을 제어하는 방식입니다..."
                            value={idea}
                            onChange={e => setIdea(e.target.value)}
                            rows={6}
                            style={{ resize: 'none', lineHeight: 1.6 }}
                        />
                        {error && (
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)', padding: '8px 12px', background: 'rgba(255,69,58,0.1)', borderRadius: 10 }}>
                                {error}
                            </div>
                        )}
                    </div>
                    <button className="btn-primary" onClick={handleGenerate} disabled={loading || !idea.trim() || !project}>
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                <span className="spinner" /> AI 분석 중...
                            </span>
                        ) : '💡 기술 명세서 생성'}
                    </button>
                </>
            ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{
                        background: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.3)',
                        borderRadius: 16, padding: '12px 16px', marginBottom: 16,
                        display: 'flex', alignItems: 'center', gap: 10
                    }}>
                        <span style={{ fontSize: 20 }}>✅</span>
                        <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>기술 명세서 생성 완료</span>
                    </div>

                    <div className="glass-card" style={{ padding: 18, marginBottom: 12 }}>
                        <div className="section-label">발명의 명칭</div>
                        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, marginBottom: 16 }}>
                            {result.tech_spec.invention_title}
                        </div>

                        {[
                            { label: '기술 분야', text: result.tech_spec.technical_field },
                            { label: '해결 과제', text: result.tech_spec.problem_to_solve },
                            { label: '해결 수단', text: result.tech_spec.solution_summary },
                        ].map(item => (
                            <div key={item.label} style={{ marginBottom: 14 }}>
                                <div className="input-label">{item.label}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.text}</div>
                            </div>
                        ))}
                    </div>

                    <div className="glass-card" style={{ padding: 18, marginBottom: 12 }}>
                        <div className="section-label">핵심 기술 특징</div>
                        {result.tech_spec.key_features.map((f, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <span style={{ color: 'var(--accent-purple)', fontWeight: 700, fontSize: 13 }}>·</span>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f}</span>
                            </div>
                        ))}
                    </div>

                    <div className="glass-card" style={{ padding: 18, marginBottom: 12 }}>
                        <div className="section-label">검색 키워드</div>
                        <div>{result.keywords.map(k => <span key={k} className="tag">{k}</span>)}</div>
                        <div style={{ marginTop: 10 }}>
                            <div className="section-label" style={{ marginBottom: 6 }}>IPC 분류코드</div>
                            <div>{result.ipc_codes.map(c => <span key={c} className="tag ipc">{c}</span>)}</div>
                        </div>
                    </div>

                    <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setResult(null)}>
                        다시 작성
                    </button>
                </motion.div>
            )}
        </div>
    )
}

// ──────────── Clearance Stage ────────────
function ClearanceStage({ project, ideationResult, onComplete }) {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    async function handleSearch() {
        if (!project || !ideationResult) return
        setLoading(true); setError(null)
        try {
            const res = await clearanceAPI.search({
                project_id: project.id,
                keywords: ideationResult.keywords || ['EV battery', 'thermal management'],
                ipc_codes: ideationResult.ipc_codes || []
            })
            setResult(res.data)
            onComplete('clearance')
        } catch (_e) {
            setError('백엔드 서버 연결 실패.')
        } finally { setLoading(false) }
    }

    const riskColors = { LOW: 'var(--success)', MEDIUM: 'var(--warning)', HIGH: 'var(--danger)' }

    return (
        <div>
            {!result ? (
                <>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(10,132,255,0.15), rgba(50,210,201,0.10))',
                        border: '1px solid rgba(10,132,255,0.3)',
                        borderRadius: 20, padding: '16px 18px', marginBottom: 20
                    }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 4 }}>
                            🔬 Clearance Engine
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            USPTO, EPO, KIPO 특허 DB를 검색하여 침해 가능성과 회피 전략을 분석합니다.
                        </div>
                    </div>
                    {!ideationResult && (
                        <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(255,159,10,0.1)', borderRadius: 12, fontSize: 13, color: 'var(--warning)' }}>
                            ⚠️ Ideation 단계를 먼저 완료하세요
                        </div>
                    )}
                    {error && (
                        <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--danger)', padding: '8px 12px', background: 'rgba(255,69,58,0.1)', borderRadius: 10 }}>
                            {error}
                        </div>
                    )}
                    <button className="btn-primary" onClick={handleSearch} disabled={loading || !ideationResult || !project}
                        style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-teal))' }}>
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                <span className="spinner" /> 특허 DB 검색 중...
                            </span>
                        ) : '🔬 선행기술 검색 시작'}
                    </button>
                </>
            ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Overall Risk */}
                    <div style={{
                        background: `${riskColors[result.overall_risk]}18`,
                        border: `1px solid ${riskColors[result.overall_risk]}44`,
                        borderRadius: 20, padding: '16px 18px', marginBottom: 16,
                        display: 'flex', alignItems: 'center', gap: 14
                    }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%',
                            background: `${riskColors[result.overall_risk]}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22
                        }}>
                            {result.overall_risk === 'LOW' ? '🟢' : result.overall_risk === 'MEDIUM' ? '🟡' : '🔴'}
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>전체 침해 위험도</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: riskColors[result.overall_risk] }}>
                                {result.overall_risk} RISK
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>검색된 특허 {result.total_found}건</div>
                        </div>
                    </div>

                    {/* Patent Results */}
                    <div className="section-label">유사 특허 분석</div>
                    {result.results.map((p, i) => (
                        <div key={i} className="glass-card" style={{ padding: 16, marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div style={{ flex: 1, marginRight: 8 }}>
                                    <div style={{ fontSize: 10, color: 'var(--accent-blue)', fontWeight: 600, marginBottom: 3 }}>
                                        {p.patent_number}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{p.title}</div>
                                </div>
                                <span className={`risk-badge ${p.infringement_risk}`}>{p.infringement_risk}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                                {p.assignee} · {p.filing_date}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                                {p.abstract.slice(0, 150)}...
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                    유사도: <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
                                        {Math.round(p.similarity_score * 100)}%
                                    </span>
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Avoidance Strategies */}
                    <div className="section-label" style={{ marginTop: 8 }}>회피 설계 전략</div>
                    {result.avoidance_strategies.map((s, i) => (
                        <div key={i} style={{
                            display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 8,
                            background: 'rgba(50,210,201,0.08)', border: '1px solid rgba(50,210,201,0.2)',
                            borderRadius: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5
                        }}>
                            <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>→</span>
                            <span>{s}</span>
                        </div>
                    ))}

                    {/* FTO */}
                    <div className="glass-card" style={{ padding: 16, marginTop: 4 }}>
                        <div className="section-label">FTO 분석 요약</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {result.freedom_to_operate}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    )
}

// ──────────── Drafting Stage ────────────
function DraftingStage({ project, ideationResult, clearanceResult, onComplete }) {
    const [loading, setLoading] = useState(false)
    const [draft, setDraft] = useState(null)
    const [office, setOffice] = useState('KIPO')
    const [error, setError] = useState(null)

    async function handleGenerate() {
        if (!project || !ideationResult) return
        setLoading(true); setError(null)
        try {
            const techSpec = ideationResult.tech_spec
            const res = await draftingAPI.generate({
                project_id: project.id,
                tech_spec: techSpec,
                patent_office: office,
                avoidance_strategies: clearanceResult?.avoidance_strategies || []
            })
            setDraft(res.data.draft)
            onComplete('drafting')
        } catch (_e) {
            setError('초안 생성 실패.')
        } finally { setLoading(false) }
    }

    return (
        <div>
            {!draft ? (
                <>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(50,210,201,0.15), rgba(48,209,88,0.10))',
                        border: '1px solid rgba(50,210,201,0.3)',
                        borderRadius: 20, padding: '16px 18px', marginBottom: 20
                    }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-teal)', marginBottom: 4 }}>
                            📝 Drafting Engine
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            KIPO/USPTO 표준 양식에 맞는 특허 명세서 초안을 자동 생성합니다.
                        </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <div className="input-label">출원 특허청</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {['KIPO', 'USPTO'].map(o => (
                                <button key={o} onClick={() => setOffice(o)} style={{
                                    flex: 1, padding: '10px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                                    background: office === o ? 'var(--accent-teal)' : 'var(--glass-bg)',
                                    color: office === o ? 'white' : 'var(--text-secondary)',
                                    border: `1px solid ${office === o ? 'var(--accent-teal)' : 'var(--glass-border)'}`,
                                    transition: 'all 0.2s'
                                }}>{o}</button>
                            ))}
                        </div>
                    </div>

                    {!ideationResult && (
                        <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(255,159,10,0.1)', borderRadius: 12, fontSize: 13, color: 'var(--warning)' }}>
                            ⚠️ Ideation 단계를 먼저 완료하세요
                        </div>
                    )}
                    {error && (
                        <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--danger)', padding: '8px 12px', background: 'rgba(255,69,58,0.1)', borderRadius: 10 }}>
                            {error}
                        </div>
                    )}
                    <button className="btn-primary" onClick={handleGenerate} disabled={loading || !ideationResult || !project}
                        style={{ background: 'linear-gradient(135deg, var(--accent-teal), var(--success))' }}>
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                <span className="spinner" /> 특허 초안 작성 중...
                            </span>
                        ) : `📝 ${office} 특허 초안 생성`}
                    </button>
                </>
            ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{
                        background: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.3)',
                        borderRadius: 16, padding: '12px 16px', marginBottom: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>✅</span>
                            <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                                {draft.patent_office} 특허 초안 완성
                            </span>
                        </div>
                        <span className="risk-badge LOW">{draft.claims.length}개 청구항</span>
                    </div>

                    {/* Invention Title */}
                    <div className="glass-card" style={{ padding: 18, marginBottom: 12 }}>
                        <div className="input-label">발명의 명칭</div>
                        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>{draft.invention_title}</div>
                    </div>

                    {/* Abstract */}
                    <div className="glass-card" style={{ padding: 18, marginBottom: 12 }}>
                        <div className="input-label">요약서</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{draft.abstract}</div>
                    </div>

                    {/* Sections */}
                    {[draft.background, draft.technical_field, draft.summary, draft.detailed_description].map((sec, i) => (
                        sec && <div key={i} className="glass-card" style={{ padding: 18, marginBottom: 12 }}>
                            <div className="input-label">{sec.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, maxHeight: 120, overflow: 'auto' }}>
                                {sec.content}
                            </div>
                        </div>
                    ))}

                    {/* Claims */}
                    <div className="section-label">청구항</div>
                    {draft.claims.map((claim, i) => (
                        <div key={i} className={`claim-item ${i === 0 ? 'independent' : ''}`}>
                            {claim}
                        </div>
                    ))}

                    <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setDraft(null)}>
                        다시 생성
                    </button>
                </motion.div>
            )}
        </div>
    )
}

// ──────────── Audit Stage ────────────
function AuditStage({ project, draftResult, onComplete }) {
    const [loading, setLoading] = useState(false)
    const [audit, setAudit] = useState(null)
    const [error, setError] = useState(null)

    async function handleAudit() {
        if (!project || !draftResult) return
        setLoading(true); setError(null)
        try {
            const res = await auditAPI.review({
                project_id: project.id,
                draft: draftResult,
            })
            setAudit(res.data)
            onComplete('audit')
        } catch (_e) {
            setError('심사 실패.')
        } finally { setLoading(false) }
    }

    const scoreColor = audit
        ? audit.allowability_score >= 80 ? 'var(--success)'
            : audit.allowability_score >= 60 ? 'var(--warning)'
                : 'var(--danger)'
        : 'var(--text-tertiary)'

    return (
        <div>
            {!audit ? (
                <>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(255,159,10,0.15), rgba(255,69,58,0.10))',
                        border: '1px solid rgba(255,159,10,0.3)',
                        borderRadius: 20, padding: '16px 18px', marginBottom: 20
                    }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)', marginBottom: 4 }}>
                            ⚖️ Audit Engine
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            가상 특허청 심사관이 진보성/신규성을 엄격히 검토하고 보정 방향을 제시합니다.
                        </div>
                    </div>
                    {!draftResult && (
                        <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(255,159,10,0.1)', borderRadius: 12, fontSize: 13, color: 'var(--warning)' }}>
                            ⚠️ Drafting 단계를 먼저 완료하세요
                        </div>
                    )}
                    {error && (
                        <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--danger)', padding: '8px 12px', background: 'rgba(255,69,58,0.1)', borderRadius: 10 }}>
                            {error}
                        </div>
                    )}
                    <button className="btn-primary" onClick={handleAudit} disabled={loading || !draftResult || !project}
                        style={{ background: 'linear-gradient(135deg, var(--warning), var(--danger))' }}>
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                <span className="spinner" /> 가상 심사 진행 중...
                            </span>
                        ) : '⚖️ 가상 심사 시작'}
                    </button>
                </>
            ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Score */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        background: `${scoreColor}12`, border: `1px solid ${scoreColor}33`,
                        borderRadius: 20, padding: '16px 18px', marginBottom: 16
                    }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: `conic-gradient(${scoreColor} ${audit.allowability_score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'var(--bg-surface)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                                    {audit.allowability_score}
                                </div>
                                <div style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>점</div>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>등록 가능성 점수</div>
                            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: 'var(--text-primary)' }}>
                                {audit.overall_assessment.slice(0, 80)}...
                            </div>
                        </div>
                    </div>

                    {/* Issues */}
                    <div className="section-label">심사 의견 ({audit.issues.length}건)</div>
                    {audit.issues.map((issue, i) => (
                        <div key={i} className={`issue-card ${issue.severity}`}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                <span className={`risk-badge ${issue.severity === 'major' ? 'HIGH' : 'MEDIUM'}`}>
                                    {issue.severity.toUpperCase()}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    {issue.issue_type} {issue.claim_number ? `· 청구항 ${issue.claim_number}` : ''}
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                                {issue.description}
                            </div>
                            <div style={{
                                fontSize: 12, color: 'var(--accent-teal)', lineHeight: 1.5,
                                padding: '8px 10px', background: 'rgba(50,210,201,0.08)', borderRadius: 8
                            }}>
                                💡 {issue.suggestion}
                            </div>
                        </div>
                    ))}

                    {/* Amended Claims */}
                    {audit.amended_claims.length > 0 && (
                        <>
                            <div className="section-label" style={{ marginTop: 8 }}>보정 청구항 (AI 제안)</div>
                            {audit.amended_claims.map((c, i) => (
                                <div key={i} className="claim-item claim-amended">{c}</div>
                            ))}
                        </>
                    )}

                    {/* Next Actions */}
                    <div className="section-label" style={{ marginTop: 8 }}>다음 조치 사항</div>
                    {audit.next_actions.map((a, i) => (
                        <div key={i} style={{
                            display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 8,
                            background: 'rgba(10,132,255,0.08)', border: '1px solid rgba(10,132,255,0.2)',
                            borderRadius: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5
                        }}>
                            <span style={{ color: 'var(--accent-blue)', fontWeight: 700, minWidth: 16 }}>{i + 1}.</span>
                            <span>{a}</span>
                        </div>
                    ))}

                    <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setAudit(null)}>
                        재심사
                    </button>
                </motion.div>
            )}
        </div>
    )
}

// ──────────── Main Ideation Screen ────────────
export default function Ideation() {
    const location = useLocation()
    const [projects, setProjects] = useState([])
    const [selectedProject, setSelectedProject] = useState(null)
    const [activeStage, setActiveStage] = useState('ideation')
    const [showProjectPicker, setShowProjectPicker] = useState(false)

    // Stage results (passed down)
    const [ideationResult, setIdeationResult] = useState(null)
    const [clearanceResult, setClearanceResult] = useState(null)
    const [draftResult, setDraftResult] = useState(null)

    useEffect(() => {
        projectsAPI.list().then(res => {
            setProjects(res.data)
            const preselected = location.state?.projectId
            if (preselected) {
                const p = res.data.find(p => p.id === preselected)
                if (p) setSelectedProject(p)
            }
        }).catch(() => { })
    }, [location.state])

    async function refreshProject() {
        if (!selectedProject) return
        try {
            const res = await projectsAPI.get(selectedProject.id)
            setSelectedProject(res.data)
        } catch (_e) { /* ignore */ }
    }

    function handleStageComplete(_stage) {
        refreshProject()
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '56px 20px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    4-Module Pipeline
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8 }}>
                        아이디어 <span className="gradient-text">구체화</span>
                    </h1>
                </div>

                {/* Project selector */}
                <button
                    onClick={() => setShowProjectPicker(true)}
                    style={{
                        width: '100%', padding: '12px 16px', marginBottom: 16,
                        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                        borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        color: selectedProject ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        fontSize: 14, transition: 'all 0.2s'
                    }}
                >
                    <span>{selectedProject ? selectedProject.title : '프로젝트 선택...'}</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>›</span>
                </button>
            </div>

            {/* Stage Tabs */}
            <StageBar activeStage={activeStage} setActiveStage={setActiveStage} project={selectedProject} />

            {/* Stage Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 20px', paddingBottom: 100 }}>
                <AnimatePresence mode="wait">
                    {activeStage === 'ideation' && (
                        <motion.div key="ideation" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <IdeationStage project={selectedProject} onComplete={(_s) => { setIdeationResult(null); refreshProject() }}
                                setResult={setIdeationResult} />
                        </motion.div>
                    )}
                    {activeStage === 'clearance' && (
                        <motion.div key="clearance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <ClearanceStage project={selectedProject} ideationResult={ideationResult}
                                onComplete={(_s) => { setClearanceResult(null); refreshProject() }} />
                        </motion.div>
                    )}
                    {activeStage === 'drafting' && (
                        <motion.div key="drafting" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <DraftingStage project={selectedProject} ideationResult={ideationResult}
                                clearanceResult={clearanceResult}
                                onComplete={(_s) => { setDraftResult(null); refreshProject() }} />
                        </motion.div>
                    )}
                    {activeStage === 'audit' && (
                        <motion.div key="audit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <AuditStage project={selectedProject} draftResult={draftResult}
                                onComplete={handleStageComplete} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Project Picker Modal */}
            <AnimatePresence>
                {showProjectPicker && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 100,
                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'flex-end',
                        }}
                        onClick={() => setShowProjectPicker(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            style={{
                                width: '100%', maxWidth: 430, margin: '0 auto',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '32px 32px 0 0',
                                padding: '24px 20px 48px',
                                maxHeight: '70vh', overflow: 'auto'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 20px' }} />
                            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>프로젝트 선택</div>
                            {projects.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                                    프로젝트가 없습니다. 대시보드에서 먼저 생성하세요.
                                </div>
                            ) : (
                                projects.map(p => (
                                    <button key={p.id} onClick={() => { setSelectedProject(p); setShowProjectPicker(false) }}
                                        style={{
                                            width: '100%', padding: '14px 16px', marginBottom: 8,
                                            background: selectedProject?.id === p.id ? 'rgba(10,132,255,0.15)' : 'var(--glass-bg)',
                                            border: `1px solid ${selectedProject?.id === p.id ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                                            borderRadius: 14, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{p.title}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{p.technology_field}</div>
                                    </button>
                                ))
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
