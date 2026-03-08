import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { projectsAPI } from '../services/api'
import API from '../services/api'

// ─── API calls ────────────────────────────────────────────────────────────────
const pAPI = {
    step1Research: (d) => API.post('/pipeline/step1/research', d),
    step2Analyze: (d) => API.post('/pipeline/step2/analyze', d),
    step3Clearance: (d) => API.post('/pipeline/step3/clearance', d),
    step3Approve: (d) => API.post('/pipeline/step3/approve', d),
    step4Draft: (d) => API.post('/pipeline/step4/draft', d),
    step5Audit: (d) => API.post('/pipeline/step5/audit', d),
    step6Proposal: (id) => API.get(`/pipeline/step6/proposal/${id}`),
    status: (id) => API.get(`/pipeline/status/${id}`),
}

// ─── Phase Definitions ─────────────────────────────────────────────────────────
const PHASES = [
    { id: 1, label: '아이디어', icon: '💡', desc: '발명 아이디어 입력' },
    { id: 2, label: '정보 수집', icon: '🌐', desc: '웹/특허 자동 검색' },
    { id: 3, label: '정보 보완', icon: '📋', desc: '부족한 정보 입력' },
    { id: 4, label: '특허 검색', icon: '🔬', desc: '침해분석 + 회피전략', checkpoint: true },
    { id: 5, label: '출원서 초안', icon: '📝', desc: '자동 초안 작성' },
    { id: 6, label: '가상 심사', icon: '⚖️', desc: 'AI 심사관 검토' },
    { id: 7, label: '제안서', icon: '🏆', desc: '최종 특허 제안서' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhaseBar({ phase }) {
    return (
        <div style={{ overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 480, padding: '0 4px' }}>
                {PHASES.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                            <div style={{
                                width: 30, height: 30, borderRadius: '50%', fontSize: 13,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: phase > p.id ? 'var(--success)' : phase === p.id ? 'var(--accent-blue)' : 'var(--glass-bg)',
                                color: phase >= p.id ? 'white' : 'var(--text-tertiary)',
                                border: `2px solid ${phase > p.id ? 'var(--success)' : phase === p.id ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                                fontWeight: 700, transition: 'all 0.3s', position: 'relative',
                                boxShadow: phase === p.id ? '0 0 10px rgba(10,132,255,0.5)' : 'none',
                            }}>
                                {phase > p.id ? '✓' : p.icon}
                                {p.checkpoint && (
                                    <div style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--warning)', border: '1.5px solid var(--bg-surface)' }} />
                                )}
                            </div>
                            <span style={{ fontSize: 8.5, color: phase >= p.id ? 'var(--text-secondary)' : 'var(--text-tertiary)', textAlign: 'center', maxWidth: 44, whiteSpace: 'nowrap' }}>
                                {p.label}
                            </span>
                        </div>
                        {i < PHASES.length - 1 && (
                            <div style={{
                                flex: 1, height: 2, marginBottom: 14, marginLeft: 2, marginRight: 2,
                                background: phase > p.id ? 'var(--success)' : 'var(--glass-border)', transition: 'all 0.5s'
                            }} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function LoadingCard({ message, sub }) {
    return (
        <div style={{ padding: '28px 20px', background: 'var(--glass-bg)', borderRadius: 20, border: '1px solid var(--glass-border)', textAlign: 'center', marginBottom: 16 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{ width: 36, height: 36, border: '3px solid rgba(10,132,255,0.15)', borderTop: '3px solid var(--accent-blue)', borderRadius: '50%', margin: '0 auto 14px' }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{message}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sub}</div>}
        </div>
    )
}

function RiskBadge({ risk }) {
    const map = { LOW: ['var(--success)', 'rgba(48,209,88,0.1)', '낮음'], MEDIUM: ['var(--warning)', 'rgba(255,159,10,0.1)', '중간'], HIGH: ['var(--danger)', 'rgba(255,69,58,0.1)', '높음'] }
    const [color, bg, label] = map[risk] || map.MEDIUM
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>{label}</span>
}

function ScoreRing({ score }) {
    const color = score >= 75 ? 'var(--success)' : score >= 55 ? 'var(--warning)' : 'var(--danger)'
    return (
        <div style={{
            width: 76, height: 76, borderRadius: '50%', flexShrink: 0,
            background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-surface)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
                <span style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>점</span>
            </div>
        </div>
    )
}

function SectionCard({ title, children, accent }) {
    return (
        <div style={{ borderRadius: 18, border: `1px solid ${accent ? accent + '30' : 'var(--glass-border)'}`, background: accent ? `${accent}08` : 'var(--glass-bg)', padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: accent || 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>{title}</div>
            {children}
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Pipeline() {
    const [phase, setPhase] = useState(1)        // 1=idea, 2=loading search, 3=fill gaps, 4=clearance, 5=draft, 6=audit, 7=proposal
    const [projects, setProjects] = useState([])
    const [selectedProject, setSelectedProject] = useState(null)
    const [idea, setIdea] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingMsg, setLoadingMsg] = useState('')
    const [error, setError] = useState(null)

    // Step results
    const [step1Result, setStep1Result] = useState(null)    // { research_items, gap_analysis }
    const [gapAnswers, setGapAnswers] = useState({})
    const [step2Result, setStep2Result] = useState(null)    // { tech_spec }
    const [step3Result, setStep3Result] = useState(null)    // { clearance_data }
    const [selectedStrategy, setSelectedStrategy] = useState(null)
    const [strategyNotes, setStrategyNotes] = useState('')
    const [step4Result, setStep4Result] = useState(null)    // { draft }
    const [step5Result, setStep5Result] = useState(null)    // { audit_data }
    const [step6Result, setStep6Result] = useState(null)    // final proposal
    const [proposalSection, setProposalSection] = useState('summary')

    const scrollRef = useRef(null)
    const top = () => setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 80)

    useEffect(() => {
        projectsAPI.list().then(r => {
            const list = r.data || []
            setProjects(list)
            // ★ 첫 번째 프로젝트 자동 선택
            if (list.length > 0) setSelectedProject(list[0])
        }).catch(() => { })
    }, [])

    // ── Phase 1 → 2: trigger research ────────────────────────────────────────────
    async function startResearch() {
        if (!selectedProject || !idea.trim()) return
        setError(null); setLoading(true)
        setLoadingMsg('웹/특허/논문 자동 검색 중...')
        setPhase(2); top()
        try {
            const r = await pAPI.step1Research({ project_id: selectedProject.id, initial_idea: idea })
            setStep1Result(r.data)
            // pre-init answers keys so inputs render
            const init = {}
            r.data.gap_analysis?.gap_questions?.forEach(q => { init[q.key] = '' })
            setGapAnswers(init)
            setPhase(3); top()
        } catch (e) {
            setError('정보 수집 실패: ' + (e.response?.data?.detail || e.message))
            setPhase(1)
        } finally { setLoading(false) }
    }

    // ── Phase 3 → 4: analyze gaps ────────────────────────────────────────────────
    async function analyzeTechSpec() {
        setError(null); setLoading(true)
        setLoadingMsg('기술 명세서 생성 중...'); top()
        try {
            const r = await pAPI.step2Analyze({ project_id: selectedProject.id, initial_idea: idea, gap_answers: gapAnswers })
            setStep2Result(r.data)
            // Now auto-run clearance
            setLoadingMsg('특허 선행기술 검색 중...')
            const r3 = await pAPI.step3Clearance({ project_id: selectedProject.id, initial_idea: idea })
            setStep3Result(r3.data)
            setSelectedStrategy(r3.data.clearance_data?.recommended_strategy_id || 'A')
            setPhase(4); top()
        } catch (e) {
            setError('분석 실패: ' + (e.response?.data?.detail || e.message))
            setPhase(3)
        } finally { setLoading(false) }
    }

    // ── Phase 4 → 5: approve strategy → draft ─────────────────────────────────
    async function approveThenDraft() {
        setError(null); setLoading(true)
        setLoadingMsg('전략 승인 및 출원서 초안 작성 중...'); top()
        try {
            await pAPI.step3Approve({ project_id: selectedProject.id, approved_strategy: selectedStrategy, additional_notes: strategyNotes })
            setLoadingMsg('KIPO 표준 명세서 작성 중...')
            const r4 = await pAPI.step4Draft({ project_id: selectedProject.id, patent_office: 'KIPO' })
            setStep4Result(r4.data)
            setPhase(5); top()
        } catch (e) {
            setError('초안 작성 실패: ' + (e.response?.data?.detail || e.message))
            setLoading(false)
        } finally { setLoading(false) }
    }

    // ── Phase 5 → 6: Audit ────────────────────────────────────────────────────
    async function runAudit() {
        setError(null); setLoading(true)
        setLoadingMsg('가상 심사 진행 중...'); top()
        try {
            const r5 = await pAPI.step5Audit({ project_id: selectedProject.id, accepted_amendments: [] })
            setStep5Result(r5.data)
            setLoadingMsg('최종 제안서 조립 중...')
            const r6 = await pAPI.step6Proposal(selectedProject.id)
            setStep6Result(r6.data)
            setPhase(7); top()
        } catch (e) {
            setError('심사 실패: ' + (e.response?.data?.detail || e.message))
            setPhase(5)
        } finally { setLoading(false) }
    }

    // ── Reset ─────────────────────────────────────────────────────────────────
    function reset() {
        setPhase(1); setIdea(''); setGapAnswers({})
        setStep1Result(null); setStep2Result(null); setStep3Result(null)
        setStep4Result(null); setStep5Result(null); setStep6Result(null)
        setSelectedStrategy(null); setError(null)
    }

    const clearanceData = step3Result?.clearance_data || {}
    const strategies = clearanceData.avoidance_strategies || []
    const draft = step4Result?.draft || {}
    const auditData = step5Result?.audit_data || {}
    const gapQuestions = step1Result?.gap_analysis?.gap_questions || []
    const researchItems = step1Result?.research_items || []
    const allRequired = gapQuestions.filter(q => q.required).every(q => (gapAnswers[q.key] || '').trim())

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '56px 20px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 600, marginBottom: 3, letterSpacing: 0.5 }}>Auto Patent Pipeline</div>
                <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.8, marginBottom: 14 }}>
                    아이디어 → <span className="gradient-text">특허 제안서</span>
                </h1>
                <PhaseBar phase={phase} />
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '4px 20px', paddingBottom: 100 }}>
                {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.3)', color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>
                        ⚠️ {error}
                    </motion.div>
                )}

                <AnimatePresence mode="wait">

                    {/* ══ PHASE 1: 아이디어 입력 ══════════════════════════════════════════ */}
                    {phase === 1 && (
                        <motion.div key="p1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                            <div style={{ padding: '14px', marginBottom: 16, borderRadius: 16, background: 'rgba(94,92,230,0.08)', border: '1px solid rgba(94,92,230,0.2)' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 6 }}>🚀 자동 파이프라인 6단계</div>
                                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                    ① 아이디어만 입력 → ② 웹·특허 자동 검색 → ③ 부족한 정보 요청 →<br />
                                    ④ 특허 검색·침해분석·회피전략 <b style={{ color: 'var(--warning)' }}>★ 전략 선택</b> →<br />
                                    ⑤ 출원서 초안 자동 작성 → ⑥ 가상 심사 → ⑦ 최종 특허 제안서
                                </div>
                            </div>

                            <div className="input-label">프로젝트 선택 *</div>
                            {projects.length === 0 ? (
                                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.25)', marginBottom: 14, fontSize: 12, color: 'var(--danger)' }}>
                                    ⚠️ 프로젝트가 없습니다. <b>대시보드</b>에서 먼저 프로젝트를 생성해주세요.
                                </div>
                            ) : (
                                <select value={selectedProject?.id || ''}
                                    onChange={e => setSelectedProject(projects.find(p => p.id === Number(e.target.value)) || null)}
                                    style={{ width: '100%', padding: '12px 16px', marginBottom: 14, background: 'var(--glass-bg)', border: `1px solid ${selectedProject ? 'var(--accent-blue)' : 'var(--glass-border)'}`, borderRadius: 14, color: 'var(--text-primary)', fontSize: 14, appearance: 'none' }}>
                                    {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#1a1a2e' }}>{p.title}</option>)}
                                </select>
                            )}

                            <div className="input-label">발명 아이디어 *</div>
                            <textarea className="input-field"
                                placeholder="거친 아이디어를 자유롭게 입력하세요.&#10;예: 하이브리드 냉매 시스템: 전기차 배터리와 차실을 통합 냉방하는 히트펌프 기반 시스템. 계절별로 냉매 순환 경로를 자동으로 전환하여 에너지 효율을 극대화한다."
                                value={idea} onChange={e => setIdea(e.target.value)} rows={5}
                                style={{ resize: 'none', lineHeight: 1.7, marginBottom: idea.trim() ? 16 : 6, fontSize: 14 }} />

                            {!idea.trim() && (
                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', flexShrink: 0 }} />
                                    위 입력란에 발명 아이디어를 입력하면 버튼이 활성화됩니다
                                </div>
                            )}

                            <button className="btn-primary" onClick={startResearch}
                                disabled={!selectedProject || !idea.trim() || projects.length === 0}
                                style={{ background: selectedProject && idea.trim() ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' : 'var(--glass-bg)', transition: 'all 0.3s' }}>
                                🌐 자동 정보 수집 시작
                            </button>
                        </motion.div>
                    )}

                    {/* ══ PHASE 2: 로딩 ══════════════════════════════════════════════════ */}
                    {phase === 2 && (
                        <motion.div key="p2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <LoadingCard message={loadingMsg} sub="웹·학술논문·특허 데이터베이스 검색 중" />
                            <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>검색 중인 소스</div>
                                {['🌐 웹 기술 동향', '📄 선행 특허 데이터베이스', '📚 학술 논문', '📊 시장 분석'].map(s => (
                                    <div key={s} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)' }} />
                                        </motion.div>
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ══ PHASE 3: 부족한 정보 입력 ════════════════════════════════════════ */}
                    {phase === 3 && step1Result && (
                        <motion.div key="p3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                            {/* Research summary */}
                            <SectionCard title={`🌐 수집된 정보 ${researchItems.length}건`} accent="#0A84FF">
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>
                                    {step1Result.gap_analysis?.tech_summary}
                                </div>
                                {researchItems.slice(0, 3).map((r, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                                        <span style={{ fontSize: 10, color: 'var(--accent-blue)', flexShrink: 0, marginTop: 2 }}>
                                            {r.source_type === 'patents' ? '📄' : r.source_type === 'academic' ? '📚' : '🌐'}
                                        </span>
                                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{r.title}</span>
                                    </div>
                                ))}
                                {step1Result.gap_analysis?.found_prior_art?.length > 0 && (
                                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)' }}>
                                        <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>⚠️ 관련 선행기술 발견: </span>
                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{step1Result.gap_analysis.found_prior_art.join(', ')}</span>
                                    </div>
                                )}
                            </SectionCard>

                            {/* Gap questions */}
                            <SectionCard title="📋 부족한 정보 요청" accent="#5E5CE6">
                                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>
                                    수집된 정보에서 아래 내용이 특정되지 않아 특허 출원에 필요합니다. 아는 내용만 답변해도 됩니다.
                                </div>
                                {gapQuestions.map((q, i) => (
                                    <div key={q.key} style={{ marginBottom: 14 }}>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
                                                Q{i + 1}. {q.label}
                                                {q.required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 10.5, color: 'var(--accent-teal)', marginBottom: 5 }}>💡 {q.why_needed}</div>
                                        <textarea className="input-field" rows={2} placeholder={q.placeholder}
                                            value={gapAnswers[q.key] || ''} onChange={e => setGapAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                                            style={{ resize: 'none', fontSize: 12, lineHeight: 1.6 }} />
                                    </div>
                                ))}
                            </SectionCard>

                            {!allRequired && (
                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 8 }}>
                                    * 표시 필수 항목을 입력해야 다음 단계로 진행됩니다
                                </div>
                            )}

                            {loading ? <LoadingCard message={loadingMsg} /> : (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setPhase(1)} style={{ padding: '13px 16px', borderRadius: 14, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: 14 }}>←</button>
                                    <button className="btn-primary" onClick={analyzeTechSpec} disabled={!allRequired} style={{ flex: 1, background: allRequired ? 'linear-gradient(135deg, var(--accent-teal), var(--accent-blue))' : undefined }}>
                                        🔬 기술 명세서 생성 + 특허 검색 →
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ══ PHASE 4: 특허 검색 결과 + 회피전략 선택 ══════════════════════════ */}
                    {phase === 4 && step3Result && (
                        <motion.div key="p4" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                            <div style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.25)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 20 }}>⚠️</span>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)' }}>사용자 선택 필요: 회피 전략</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>아래 분석 결과를 검토하고 전략을 선택해주세요</div>
                                </div>
                            </div>

                            {/* Tech spec summary */}
                            {step2Result?.tech_spec && (
                                <SectionCard title="💡 생성된 기술 명세서 요약" accent="#5E5CE6">
                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{step2Result.tech_spec.invention_title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step2Result.tech_spec.solution_summary}</div>
                                </SectionCard>
                            )}

                            {/* Clearance result */}
                            <SectionCard title={`🔬 선행특허 검색 결과`} accent={clearanceData.overall_risk === 'HIGH' ? '#FF453A' : clearanceData.overall_risk === 'MEDIUM' ? '#FF9F0A' : '#30D158'}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>전체 침해 위험도</span>
                                    <RiskBadge risk={clearanceData.overall_risk} />
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>{clearanceData.risk_summary}</div>
                                {(clearanceData.prior_art_patents || []).map((p, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: 6 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{p.patent_number}</div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 2 }}>{p.title}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>{p.risk_reason}</div>
                                        </div>
                                        <RiskBadge risk={p.infringement_risk} />
                                    </div>
                                ))}
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, padding: '8px 10px', borderRadius: 10, background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.1)' }}>
                                    FTO: {clearanceData.freedom_to_operate}
                                </div>
                            </SectionCard>

                            {/* Strategy selection */}
                            <SectionCard title="🛡️ 회피 전략을 선택하세요" accent="#32D2C9">
                                <div style={{ fontSize: 11, color: 'var(--accent-teal)', marginBottom: 10, fontWeight: 600 }}>
                                    권고: 전략 {clearanceData.recommended_strategy_id || 'A'} — {clearanceData.recommended_reason}
                                </div>
                                {strategies.map(s => (
                                    <div key={s.strategy_id} onClick={() => setSelectedStrategy(s.strategy_id)}
                                        style={{
                                            padding: '12px 14px', borderRadius: 14, marginBottom: 8, cursor: 'pointer',
                                            background: selectedStrategy === s.strategy_id ? 'rgba(50,210,201,0.10)' : 'var(--glass-bg)',
                                            border: `2px solid ${selectedStrategy === s.strategy_id ? 'var(--accent-teal)' : 'var(--glass-border)'}`,
                                            transition: 'all 0.2s'
                                        }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: selectedStrategy === s.strategy_id ? 'var(--accent-teal)' : 'var(--text-primary)' }}>{s.strategy_name}</span>
                                            {selectedStrategy === s.strategy_id && <span style={{ color: 'var(--accent-teal)', fontSize: 16 }}>✓</span>}
                                        </div>
                                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 6 }}>{s.description}</div>
                                        <div style={{ fontSize: 10.5, color: 'var(--accent-blue)' }}>📝 {s.recommended_claim_changes}</div>
                                    </div>
                                ))}
                                <textarea className="input-field" rows={2} placeholder="추가 의견이나 특별히 반영할 사항을 입력하세요 (선택)"
                                    value={strategyNotes} onChange={e => setStrategyNotes(e.target.value)}
                                    style={{ resize: 'none', fontSize: 12, marginTop: 6 }} />
                            </SectionCard>

                            {loading ? <LoadingCard message={loadingMsg} /> : (
                                <button className="btn-primary" onClick={approveThenDraft} disabled={!selectedStrategy}
                                    style={{ background: selectedStrategy ? 'linear-gradient(135deg, var(--accent-teal), var(--accent-blue))' : undefined }}>
                                    📝 전략 확정 + 출원서 초안 자동 작성 →
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* ══ PHASE 5: 출원서 초안 검토 ════════════════════════════════════════ */}
                    {phase === 5 && step4Result && (
                        <motion.div key="p5" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                            <SectionCard title="📝 KIPO 특허 출원서 초안" accent="#32D2C9">
                                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{draft.invention_title}</div>
                                <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.12)', marginBottom: 10 }}>
                                    <div style={{ fontSize: 10, color: 'var(--accent-blue)', fontWeight: 700, marginBottom: 4 }}>요약 (Abstract)</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{draft.abstract}</div>
                                </div>

                                {Object.values(draft.sections || {}).slice(0, 3).map((sec, i) => (
                                    <div key={i} style={{ marginBottom: 8 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>{sec.title}</div>
                                        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>{(sec.content || '').slice(0, 200)}...</div>
                                    </div>
                                ))}

                                <div style={{ marginTop: 10 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>청구항 ({(draft.claims || []).length}개)</div>
                                    {(draft.claims || []).map((c, i) => (
                                        <div key={i} className={`claim-item ${i === 0 ? 'independent' : ''}`} style={{ fontSize: 11.5, marginBottom: 6 }}>{c}</div>
                                    ))}
                                </div>

                                {draft.claim_strategy_applied && (
                                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(50,210,201,0.07)', border: '1px solid rgba(50,210,201,0.2)', fontSize: 11, color: 'var(--accent-teal)' }}>
                                        🎯 적용된 청구항 전략: {draft.claim_strategy_applied}
                                    </div>
                                )}
                            </SectionCard>

                            <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(48,209,88,0.07)', border: '1px solid rgba(48,209,88,0.2)', marginBottom: 14, fontSize: 11.5, color: 'var(--success)', lineHeight: 1.7 }}>
                                ✅ 초안이 준비되었습니다. 수정 없이 바로 가상 심사 단계로 진행하거나, 내용을 검토 후 진행하세요.
                            </div>

                            {loading ? <LoadingCard message={loadingMsg} /> : (
                                <button className="btn-primary" onClick={runAudit}
                                    style={{ background: 'linear-gradient(135deg, #FF9F0A, #FF453A)' }}>
                                    ⚖️ 가상 심사 진행 →
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* ══ PHASE 6: 심사 진행 중 ════════════════════════════════════════════ */}
                    {phase === 6 && (
                        <motion.div key="p6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <LoadingCard message="가상 심사관이 심사 중..." sub="신규성·진보성·명확성·실시가능성 검토" />
                            <div style={{ padding: '14px', background: 'var(--glass-bg)', borderRadius: 16, border: '1px solid var(--glass-border)' }}>
                                {['§29조 1항: 신규성 검토', '§29조 2항: 진보성 검토', '§42조 4항: 청구항 명확성', '§42조 3항: 실시가능성', '보정 청구항 생성'].map((s, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)' }} />
                                        </motion.div>
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ══ PHASE 7: 최종 특허 제안서 ════════════════════════════════════════ */}
                    {phase === 7 && step6Result && (
                        <motion.div key="p7" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            {/* Hero */}
                            <div style={{ textAlign: 'center', padding: '18px', marginBottom: 16, borderRadius: 20, background: 'linear-gradient(135deg, rgba(48,209,88,0.10), rgba(50,210,201,0.07))', border: '1px solid rgba(48,209,88,0.25)' }}>
                                <div style={{ fontSize: 36, marginBottom: 6 }}>🏆</div>
                                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>최종 특허 제안서 완성</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step6Result.invention_title}</div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: step6Result.executive_summary?.allowability_score >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                                            {step6Result.executive_summary?.allowability_score}점
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>등록 가능성</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <RiskBadge risk={step6Result.executive_summary?.risk_level} />
                                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>침해 위험</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-blue)' }}>{step6Result.executive_summary?.research_sources || 0}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>참고 자료</div>
                                    </div>
                                </div>
                            </div>

                            {/* Tab Nav */}
                            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 14 }}>
                                {[
                                    { k: 'summary', l: '요약', icon: '📋' },
                                    { k: 'clearance', l: '침해분석', icon: '🔬' },
                                    { k: 'draft', l: '명세서', icon: '📄' },
                                    { k: 'audit', l: '심사결과', icon: '⚖️' },
                                    { k: 'actions', l: '조치사항', icon: '📌' },
                                ].map(t => (
                                    <button key={t.k} onClick={() => setProposalSection(t.k)} style={{
                                        flexShrink: 0, padding: '7px 11px', borderRadius: 10, fontSize: 11.5, fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                                        background: proposalSection === t.k ? 'var(--accent-blue)' : 'var(--glass-bg)',
                                        color: proposalSection === t.k ? 'white' : 'var(--text-secondary)',
                                        border: `1px solid ${proposalSection === t.k ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                                        transition: 'all 0.2s'
                                    }}>
                                        {t.icon} {t.l}
                                    </button>
                                ))}
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div key={proposalSection} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                                    {proposalSection === 'summary' && (
                                        <div>
                                            <SectionCard title="발명 개요" accent="#5E5CE6">
                                                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{step6Result.tech_spec?.invention_title}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>{step6Result.tech_spec?.solution_summary}</div>
                                                {(step6Result.tech_spec?.key_features || []).map((f, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                                                        <span style={{ color: 'var(--accent-purple)', fontSize: 13 }}>•</span>
                                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f}</span>
                                                    </div>
                                                ))}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                                                    {(step6Result.tech_spec?.ipc_codes || []).map(c => <span key={c} className="tag ipc">{c}</span>)}
                                                    {(step6Result.tech_spec?.keywords || []).map(k => <span key={k} className="tag">{k}</span>)}
                                                </div>
                                            </SectionCard>
                                            <SectionCard title="등록 가능성 예측" accent="#30D158">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                    <ScoreRing score={step6Result.audit?.allowability_score || 0} />
                                                    <div>
                                                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{step6Result.audit?.overall_verdict}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step6Result.audit?.estimated_grant_probability}</div>
                                                    </div>
                                                </div>
                                            </SectionCard>
                                        </div>
                                    )}

                                    {proposalSection === 'clearance' && (
                                        <div>
                                            <SectionCard title={`침해 위험도: ${step6Result.clearance?.overall_risk}`} accent={step6Result.clearance?.overall_risk === 'HIGH' ? '#FF453A' : step6Result.clearance?.overall_risk === 'MEDIUM' ? '#FF9F0A' : '#30D158'}>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 10 }}>{step6Result.clearance?.risk_summary}</div>
                                                {(step6Result.clearance?.prior_art_patents || []).map((p, i) => (
                                                    <div key={i} style={{ padding: '10px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: 6 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                                            <span style={{ fontSize: 11, fontWeight: 700 }}>{p.patent_number}</span>
                                                            <RiskBadge risk={p.infringement_risk} />
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.title} — {p.assignee}</div>
                                                    </div>
                                                ))}
                                            </SectionCard>
                                            <SectionCard title={`채택된 회피 전략: ${step6Result.clearance?.adopted_strategy?.strategy_name || ''}`} accent="#32D2C9">
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step6Result.clearance?.adopted_strategy?.description}</div>
                                                <div style={{ fontSize: 11.5, color: 'var(--accent-teal)', marginTop: 6, fontWeight: 600 }}>📝 {step6Result.clearance?.adopted_strategy?.recommended_claim_changes}</div>
                                            </SectionCard>
                                            <SectionCard title="FTO (실시 자유도)" accent="#0A84FF">
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step6Result.clearance?.freedom_to_operate}</div>
                                            </SectionCard>
                                        </div>
                                    )}

                                    {proposalSection === 'draft' && (
                                        <div>
                                            <SectionCard title={`${step6Result.patent_draft?.patent_office} 특허 명세서 초안`} accent="#32D2C9">
                                                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{step6Result.patent_draft?.invention_title}</div>
                                                <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(10,132,255,0.07)', marginBottom: 10 }}>
                                                    <div style={{ fontSize: 10, color: 'var(--accent-blue)', fontWeight: 700, marginBottom: 4 }}>요약</div>
                                                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step6Result.patent_draft?.abstract}</div>
                                                </div>
                                                {Object.values(step6Result.patent_draft?.sections || {}).map((sec, i) => (
                                                    <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < 3 ? '1px solid var(--glass-border)' : 'none' }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>{sec.title}</div>
                                                        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>{sec.content}</div>
                                                    </div>
                                                ))}
                                                <div className="input-label" style={{ marginBottom: 6 }}>청구항</div>
                                                {(step6Result.patent_draft?.claims || []).map((c, i) => (
                                                    <div key={i} className={`claim-item ${i === 0 ? 'independent' : ''}`} style={{ fontSize: 11.5, marginBottom: 6 }}>{c}</div>
                                                ))}
                                            </SectionCard>
                                        </div>
                                    )}

                                    {proposalSection === 'audit' && (
                                        <div>
                                            <SectionCard title="가상 심사 결과" accent="#FF9F0A">
                                                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
                                                    <ScoreRing score={step6Result.audit?.allowability_score || 0} />
                                                    <div>
                                                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{step6Result.audit?.overall_verdict}</div>
                                                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step6Result.audit?.overall_assessment}</div>
                                                    </div>
                                                </div>
                                                {(step6Result.audit?.issues || []).map((issue, i) => (
                                                    <div key={i} className={`issue-card ${issue.severity}`} style={{ marginBottom: 8 }}>
                                                        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                                            <span style={{ fontSize: 10, fontWeight: 700, color: issue.severity === 'major' ? 'var(--danger)' : 'var(--warning)', textTransform: 'uppercase' }}>{issue.severity}</span>
                                                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>청구항 {issue.claim_number}</span>
                                                        </div>
                                                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 4 }}>{issue.description}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--accent-teal)' }}>→ {issue.suggestion}</div>
                                                    </div>
                                                ))}
                                            </SectionCard>
                                            {(step6Result.audit?.amended_claims || []).length > 0 && (
                                                <SectionCard title="📝 보정 제안 청구항" accent="#30D158">
                                                    {step6Result.audit.amended_claims.map((a, i) => (
                                                        <div key={i} className="claim-item claim-amended" style={{ fontSize: 11.5, marginBottom: 8 }}>{a.amended || a}</div>
                                                    ))}
                                                </SectionCard>
                                            )}
                                        </div>
                                    )}

                                    {proposalSection === 'actions' && (
                                        <div>
                                            <SectionCard title="📌 필수 후속 조치" accent="#5E5CE6">
                                                {(step6Result.audit?.next_actions || []).map((a, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-purple)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a}</div>
                                                    </div>
                                                ))}
                                            </SectionCard>
                                            <SectionCard title="심사관 종합 의견" accent="#FF9F0A">
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step6Result.audit?.examiner_remarks}</div>
                                            </SectionCard>
                                            <button className="btn-primary" onClick={reset} style={{ marginTop: 8, background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' }}>
                                                🔄 새 아이디어로 시작
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    )
}
