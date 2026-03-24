import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { projectsAPI } from '../services/api'
import API from '../services/api'

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

const PHASES = [
    { id: 1, label: '아이디어', icon: '💡' },
    { id: 2, label: '정보 수집', icon: '🌐' },
    { id: 3, label: '정보 보완', icon: '📋' },
    { id: 3.5, label: '특허성 검토', icon: '🔍' },
    { id: 4, label: '특허 검색', icon: '🔬', checkpoint: true },
    { id: 5, label: '출원서 초안', icon: '📝' },
    { id: 6, label: '가상 심사', icon: '⚖️' },
    { id: 7, label: '제안서', icon: '🏆' },
]

// Only whole-number phases shown in bar
const BAR_PHASES = PHASES.filter(p => Number.isInteger(p.id))

// ── Sub-components ────────────────────────────────────────────────────────────

function PhaseBar({ phase }) {
    return (
        <div style={{ overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 480, padding: '0 4px' }}>
                {BAR_PHASES.map((p, i) => {
                    const isCurrent = Math.floor(phase) === p.id || (phase === 3.5 && p.id === 3)
                    const isDone = phase > p.id
                    return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                                <div style={{
                                    width: 30, height: 30, borderRadius: '50%', fontSize: 13,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: isDone ? 'var(--success)' : isCurrent ? 'var(--accent-blue)' : 'var(--glass-bg)',
                                    color: (isDone || isCurrent) ? 'white' : 'var(--text-tertiary)',
                                    border: `2px solid ${isDone ? 'var(--success)' : isCurrent ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                                    fontWeight: 700, transition: 'all 0.3s',
                                    boxShadow: isCurrent ? '0 0 10px rgba(10,132,255,0.5)' : 'none',
                                    position: 'relative',
                                }}>
                                    {isDone ? '✓' : p.icon}
                                    {p.checkpoint && (
                                        <div style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--warning)', border: '1.5px solid var(--bg-surface)' }} />
                                    )}
                                </div>
                                <span style={{ fontSize: 8.5, color: (isDone || isCurrent) ? 'var(--text-secondary)' : 'var(--text-tertiary)', textAlign: 'center', maxWidth: 44, whiteSpace: 'nowrap' }}>
                                    {p.label}
                                </span>
                            </div>
                            {i < BAR_PHASES.length - 1 && (
                                <div style={{
                                    flex: 1, height: 2, marginBottom: 14, marginLeft: 2, marginRight: 2,
                                    background: isDone ? 'var(--success)' : 'var(--glass-border)', transition: 'all 0.5s'
                                }} />
                            )}
                        </div>
                    )
                })}
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
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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

// Real-time progress graph
function ProgressGraph({ phase, phaseTimes, autoRunning }) {
    const steps = [
        { id: 1, label: '아이디어 입력', icon: '💡' },
        { id: 2, label: '웹/특허 검색', icon: '🌐' },
        { id: 3, label: '정보 보완', icon: '📋' },
        { id: 4, label: '특허 선행검색', icon: '🔬' },
        { id: 5, label: '출원서 초안', icon: '📝' },
        { id: 6, label: '가상 심사', icon: '⚖️' },
        { id: 7, label: '최종 제안서', icon: '🏆' },
    ]
    return (
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: '14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span>📊 파이프라인 진행 현황</span>
                {autoRunning && (
                    <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                        style={{ fontSize: 10, color: 'var(--accent-blue)', fontWeight: 600 }}>● 자동 진행 중</motion.span>
                )}
            </div>
            {steps.map((s, i) => {
                const phaseNum = Math.floor(phase)
                const isDone = phaseNum > s.id
                const isCurrent = phaseNum === s.id
                const elapsed = phaseTimes[s.id]
                return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0, fontSize: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isDone ? 'var(--success)' : isCurrent ? 'var(--accent-blue)' : 'var(--glass-bg)',
                            border: `1.5px solid ${isDone ? 'var(--success)' : isCurrent ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                            boxShadow: isCurrent ? '0 0 8px rgba(10,132,255,0.4)' : 'none',
                            transition: 'all 0.4s',
                        }}>
                            {isCurrent ? (
                                <motion.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    style={{ display: 'inline-block', fontSize: 10 }}>⟳</motion.span>
                            ) : isDone ? '✓' : s.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11.5, fontWeight: isCurrent ? 700 : 500, color: isDone ? 'var(--text-secondary)' : isCurrent ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                {s.label}
                            </div>
                            {elapsed && (
                                <div style={{ fontSize: 9.5, color: 'var(--text-tertiary)' }}>{elapsed}초 소요</div>
                            )}
                        </div>
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--glass-border)', overflow: 'hidden' }}>
                            <motion.div
                                style={{ height: '100%', borderRadius: 2, background: isDone ? 'var(--success)' : isCurrent ? 'var(--accent-blue)' : 'transparent' }}
                                animate={{ width: isDone ? '100%' : isCurrent ? '60%' : '0%' }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default function Pipeline() {
    const [phase, setPhase] = useState(1)
    const [projects, setProjects] = useState([])
    const [selectedProject, setSelectedProject] = useState(null)
    const [idea, setIdea] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingMsg, setLoadingMsg] = useState('')
    const [error, setError] = useState(null)
    const [autoRunning, setAutoRunning] = useState(false)
    const [phaseTimes, setPhaseTimes] = useState({})
    const phaseStartRef = useRef(null)
    const [step1Result, setStep1Result] = useState(null)
    const [gapAnswers, setGapAnswers] = useState({})
    const [step2Result, setStep2Result] = useState(null)
    const [step3Result, setStep3Result] = useState(null)
    const [selectedStrategy, setSelectedStrategy] = useState(null)
    const [strategyNotes, setStrategyNotes] = useState('')
    const [step4Result, setStep4Result] = useState(null)
    const [step5Result, setStep5Result] = useState(null)
    const [step6Result, setStep6Result] = useState(null)
    const [proposalSection, setProposalSection] = useState('summary')
    const [patentabilityResult, setPatentabilityResult] = useState(null)
    const [supplementedIdea, setSupplementedIdea] = useState('')
    const scrollRef = useRef(null)
    const top = () => setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 80)

    function markPhaseTime(phaseId) {
        if (phaseStartRef.current) {
            const elapsed = Math.round((Date.now() - phaseStartRef.current) / 1000)
            setPhaseTimes(p => ({ ...p, [phaseId]: elapsed }))
        }
        phaseStartRef.current = Date.now()
    }

    useEffect(() => {
        projectsAPI.list().then(r => {
            const list = r.data || []
            setProjects(list)
            if (list.length > 0) setSelectedProject(list[0])
        }).catch(() => {})
    }, [])

    async function startResearch() {
        if (!selectedProject || !idea.trim() || loading) return
        setError(null); setLoading(true); setLoadingMsg('웹/특허/논문 자동 검색 중...')
        phaseStartRef.current = Date.now()
        setPhase(2); top()
        try {
            const r = await pAPI.step1Research({ project_id: selectedProject.id, initial_idea: idea })
            markPhaseTime(2)
            setStep1Result(r.data)
            const init = {}
            r.data.gap_analysis?.gap_questions?.forEach(q => { init[q.key] = '' })
            setGapAnswers(init)
            setPhase(3); top()
        } catch (e) {
            setError('정보 수집 실패: ' + (e.response?.data?.detail || e.message))
            setPhase(1)
        } finally { setLoading(false) }
    }

    async function analyzeTechSpec() {
        setError(null); setLoading(true); setLoadingMsg('기술 명세서 생성 중...'); top()
        try {
            const r = await pAPI.step2Analyze({ project_id: selectedProject.id, initial_idea: idea, gap_answers: gapAnswers })
            markPhaseTime(3)
            setStep2Result(r.data)
            setPatentabilityResult(r.data.patentability || {})
            setPhase(3.5); top()
        } catch (e) {
            setError('분석 실패: ' + (e.response?.data?.detail || e.message))
            setPhase(3)
        } finally { setLoading(false) }
    }

    async function proceedToClearance() {
        setError(null); setLoading(true); setLoadingMsg('특허 선행기술 검색 중...'); top()
        try {
            const r3 = await pAPI.step3Clearance({ project_id: selectedProject.id, initial_idea: idea })
            setStep3Result(r3.data)
            setSelectedStrategy(r3.data.clearance_data?.recommended_strategy_id || 'A')
            markPhaseTime(4)
            setPhase(4); top()
        } catch (e) {
            setError('특허 검색 실패: ' + (e.response?.data?.detail || e.message))
            setPhase(3.5)
        } finally { setLoading(false) }
    }

    async function approveThenAutoRun() {
        setError(null); setLoading(true); setAutoRunning(true); setLoadingMsg('전략 승인 중...'); top()
        try {
            await pAPI.step3Approve({ project_id: selectedProject.id, approved_strategy: selectedStrategy, additional_notes: strategyNotes })
            setLoadingMsg('KIPO 명세서 작성 중...')
            const r4 = await pAPI.step4Draft({ project_id: selectedProject.id, patent_office: 'KIPO' })
            setStep4Result(r4.data)
            markPhaseTime(5)
            setPhase(5); top()
            setLoadingMsg('가상 심사 진행 중...')
            setPhase(6); top()
            const r5 = await pAPI.step5Audit({ project_id: selectedProject.id, accepted_amendments: [] })
            setStep5Result(r5.data)
            markPhaseTime(6)
            setLoadingMsg('최종 제안서 조립 중...')
            const r6 = await pAPI.step6Proposal(selectedProject.id)
            setStep6Result(r6.data)
            markPhaseTime(7)
            setPhase(7); top()
        } catch (e) {
            setError('자동 파이프라인 실패: ' + (e.response?.data?.detail || e.message))
        } finally { setLoading(false); setAutoRunning(false) }
    }

    function reset() {
        setPhase(1); setIdea(''); setGapAnswers({}); setStep1Result(null); setStep2Result(null)
        setStep3Result(null); setStep4Result(null); setStep5Result(null); setStep6Result(null)
        setSelectedStrategy(null); setError(null); setPatentabilityResult(null)
        setAutoRunning(false); setPhaseTimes({}); setProposalSection('summary')
    }

    const clearanceData = step3Result?.clearance_data || {}
    const strategies = clearanceData.avoidance_strategies || []
    const gapQuestions = step1Result?.gap_analysis?.gap_questions || []
    const researchItems = step1Result?.research_items || []
    const needsMoreInfo = step1Result?.gap_analysis?.needs_more_info === true
    const totalRequired = gapQuestions.filter(q => q.required).length
    const minRequired = Math.ceil(totalRequired * 0.5)
    const requiredAnsweredCount = gapQuestions.filter(q => q.required && (gapAnswers[q.key] || '').trim()).length
    const canProceed = !needsMoreInfo || requiredAnsweredCount >= minRequired

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '56px 20px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 600, marginBottom: 3 }}>Auto Patent Pipeline</div>
                <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.8, marginBottom: 14 }}>
                    아이디어 → <span className="gradient-text">특허 제안서</span>
                </h1>
                <PhaseBar phase={phase} />
            </div>
            <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '4px 20px', paddingBottom: 100 }}>
                {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.3)', color: 'var(--danger)', fontSize: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <span>⚠️ {error}</span>
                        <button onClick={() => { setError(null); setPhase(1) }} style={{ flexShrink: 0, padding: '3px 10px', borderRadius: 8, background: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.4)', color: 'var(--danger)', fontSize: 11 }}>처음으로</button>
                    </motion.div>
                )}
                {phase > 1 && phase < 7 && <ProgressGraph phase={phase} phaseTimes={phaseTimes} autoRunning={autoRunning} />}
                <AnimatePresence mode="wait">
                {/* PHASE 1 */}
                {phase === 1 && (
                    <motion.div key="p1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                        <div style={{ padding: '14px', marginBottom: 16, borderRadius: 16, background: 'rgba(94,92,230,0.08)', border: '1px solid rgba(94,92,230,0.2)' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 6 }}>🚀 자동 파이프라인 7단계</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                ① 아이디어 입력 → ② 웹·특허 자동 검색 → ③ 부족한 정보 요청 →<br />
                                ④ 특허성 검토·아이디어 확인 → <b style={{ color: 'var(--warning)' }}>★ 승인</b> ⑤ 특허 검색 →<br />
                                ⑥ 출원서+가상심사+제안서 <b style={{ color: 'var(--success)' }}>자동 완료</b>
                            </div>
                        </div>
                        <div className="input-label">프로젝트 선택 *</div>
                        {projects.length === 0 ? (
                            <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.25)', marginBottom: 14, fontSize: 12, color: 'var(--danger)' }}>
                                ⚠️ 프로젝트가 없습니다. 대시보드에서 먼저 생성해주세요.
                            </div>
                        ) : (
                            <select value={selectedProject?.id || ''} onChange={e => setSelectedProject(projects.find(p => p.id === Number(e.target.value)) || null)}
                                style={{ width: '100%', padding: '12px 16px', marginBottom: 14, background: 'var(--glass-bg)', border: `1px solid ${selectedProject ? 'var(--accent-blue)' : 'var(--glass-border)'}`, borderRadius: 14, color: 'var(--text-primary)', fontSize: 14, appearance: 'none' }}>
                                {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#1a1a2e' }}>{p.title}</option>)}
                            </select>
                        )}
                        <div className="input-label">발명 아이디어 *</div>
                        <textarea className="input-field" placeholder="거친 아이디어를 자유롭게 입력하세요." value={idea} onChange={e => setIdea(e.target.value)} rows={5} style={{ resize: 'none', lineHeight: 1.7, marginBottom: 16, fontSize: 14 }} />
                        <button className="btn-primary" onClick={startResearch} disabled={!selectedProject || !idea.trim() || projects.length === 0}
                            style={{ background: (selectedProject && idea.trim()) ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' : 'var(--glass-bg)', transition: 'all 0.3s' }}>
                            🌐 자동 정보 수집 시작
                        </button>
                    </motion.div>
                )}
                {/* PHASE 2 */}
                {phase === 2 && (
                    <motion.div key="p2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <LoadingCard message={loadingMsg} sub="웹·학술논문·특허 데이터베이스 검색 중" />
                    </motion.div>
                )}
                {/* PHASE 3 */}
                {phase === 3 && step1Result && (
                    <motion.div key="p3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                        <SectionCard title={`🌐 수집된 정보 ${researchItems.length}건`} accent="#0A84FF">
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>{step1Result.gap_analysis?.tech_summary}</div>
                            {researchItems.slice(0, 3).map((r, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                                    <span style={{ fontSize: 10, color: 'var(--accent-blue)', flexShrink: 0, marginTop: 2 }}>
                                        {r.source_type === 'patents' ? '📄' : r.source_type === 'academic' ? '📚' : '🌐'}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{r.title}</span>
                                </div>
                            ))}
                        </SectionCard>
                        {needsMoreInfo && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.35)', marginBottom: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)', marginBottom: 4 }}>⚠️ 정보 보완 필요</div>
                                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                    최소 <b style={{ color: 'var(--warning)' }}>{minRequired}개</b> 항목에 답변해주세요. ({requiredAnsweredCount}/{minRequired} 완료)
                                </div>
                            </motion.div>
                        )}
                        <SectionCard title="📋 추가 정보 요청" accent="#5E5CE6">
                            {gapQuestions.map((q, i) => (
                                <div key={q.key} style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                        Q{i + 1}. {q.label}{q.required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
                                    </div>
                                    <div style={{ fontSize: 10.5, color: 'var(--accent-teal)', marginBottom: 5 }}>💡 {q.why_needed}</div>
                                    <textarea className="input-field" rows={2} placeholder={q.placeholder}
                                        value={gapAnswers[q.key] || ''} onChange={e => setGapAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                                        style={{ resize: 'none', fontSize: 12 }} />
                                </div>
                            ))}
                        </SectionCard>
                        {loading ? <LoadingCard message={loadingMsg} /> : (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setPhase(1)} style={{ padding: '13px 16px', borderRadius: 14, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: 14 }}>←</button>
                                <button className="btn-primary" onClick={analyzeTechSpec} disabled={!canProceed}
                                    style={{ flex: 1, background: canProceed ? 'linear-gradient(135deg, var(--accent-teal), var(--accent-blue))' : 'var(--glass-bg)', opacity: canProceed ? 1 : 0.6 }}>
                                    {canProceed ? '🔍 특허성 검토 →' : `⚠️ 필수 항목 ${minRequired - requiredAnsweredCount}개 더 필요`}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
                {/* PHASE 3.5 — patentability */}
                {phase === 3.5 && step2Result && (
                    <motion.div key="p35" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                        {patentabilityResult?.patentable === false ? (
                            <div>
                                <div style={{ padding: '16px', borderRadius: 18, background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.3)', marginBottom: 14 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>⚠️ 특허성 부족 판정</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 10 }}>현재 아이디어는 신규성 또는 진보성이 부족합니다.</div>
                                    {(patentabilityResult.rejection_reasons || []).map((r, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                            <span style={{ color: 'var(--danger)' }}>✗</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r}</span>
                                        </div>
                                    ))}
                                </div>
                                <SectionCard title="💡 AI 보완 제안" accent="#5E5CE6">
                                    {(patentabilityResult.improvement_suggestions || []).map((s, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(94,92,230,0.06)', border: '1px solid rgba(94,92,230,0.15)' }}>
                                            <span style={{ color: 'var(--accent-purple)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s}</span>
                                        </div>
                                    ))}
                                </SectionCard>
                                <div className="input-label">보완된 아이디어</div>
                                <textarea className="input-field" rows={4} placeholder="위 제안을 반영한 보완된 아이디어를..."
                                    value={supplementedIdea} onChange={e => setSupplementedIdea(e.target.value)} style={{ resize: 'none', lineHeight: 1.7, marginBottom: 14 }} />
                                <button className="btn-primary" onClick={() => { if (supplementedIdea.trim()) setIdea(supplementedIdea); setPhase(3); setStep1Result(null); setStep2Result(null); setPatentabilityResult(null) }}
                                    disabled={!supplementedIdea.trim()} style={{ background: supplementedIdea.trim() ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' : 'var(--glass-bg)' }}>
                                    🔄 보완 후 재시도
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ padding: '14px', borderRadius: 18, background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.3)', marginBottom: 14 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)', marginBottom: 6 }}>✅ 특허성 확인</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        입력하신 아이디어는 특허 출원 요건을 갖추었습니다.
                                        {patentabilityResult?.patentability_score && <span style={{ marginLeft: 6, fontWeight: 700, color: 'var(--success)' }}>(점수: {patentabilityResult.patentability_score}점)</span>}
                                    </div>
                                </div>
                                <SectionCard title="💡 구체화된 발명 아이디어" accent="#30D158">
                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{step2Result.tech_spec?.invention_title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>{patentabilityResult?.refined_idea || step2Result.tech_spec?.solution_summary}</div>
                                    {(step2Result.tech_spec?.key_features || []).map((f, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}><span style={{ color: 'var(--success)' }}>•</span><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f}</span></div>
                                    ))}
                                </SectionCard>
                                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,159,10,0.07)', border: '1px solid rgba(255,159,10,0.2)', marginBottom: 14, fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                    ⚠️ 위 내용이 의도한 발명과 일치하면 아래 버튼을 눌러주세요. 승인 후 나머지 단계가 <b style={{ color: 'var(--success)' }}>자동으로 진행</b>됩니다.
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setPhase(3)} style={{ padding: '13px 16px', borderRadius: 14, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: 14 }}>←</button>
                                    {loading ? <div style={{ flex: 1 }}><LoadingCard message={loadingMsg} /></div> : (
                                        <button className="btn-primary" onClick={proceedToClearance} style={{ flex: 1, background: 'linear-gradient(135deg, var(--success), var(--accent-teal))' }}>
                                            ✓ 의도한 내용이 맞습니다 → 특허 검색 진행
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* PHASE 4 — Clearance + Strategy selection */}
                {phase === 4 && step3Result && (
                    <motion.div key="p4" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                        <div style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.25)', marginBottom: 14 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)' }}>⚠️ 마지막 사용자 확인: 회피 전략 선택</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>전략 승인 후 나머지 단계가 자동 완료됩니다</div>
                        </div>
                        <SectionCard title="🔬 선행특허 검색 결과" accent={clearanceData.overall_risk === 'HIGH' ? '#FF453A' : clearanceData.overall_risk === 'MEDIUM' ? '#FF9F0A' : '#30D158'}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>전체 침해 위험도</span>
                                <RiskBadge risk={clearanceData.overall_risk} />
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>{clearanceData.risk_summary}</div>
                            {(clearanceData.prior_art_patents || []).map((p, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: 6 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700 }}>{p.patent_number}</div>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>{p.title}</div>
                                    </div>
                                    <RiskBadge risk={p.infringement_risk} />
                                </div>
                            ))}
                        </SectionCard>
                        <SectionCard title="🛡️ 회피 전략 선택" accent="#32D2C9">
                            <div style={{ fontSize: 11, color: 'var(--accent-teal)', marginBottom: 10, fontWeight: 600 }}>권고: 전략 {clearanceData.recommended_strategy_id || 'A'}</div>
                            {strategies.map(s => (
                                <div key={s.strategy_id} onClick={() => setSelectedStrategy(s.strategy_id)}
                                    style={{ padding: '12px 14px', borderRadius: 14, marginBottom: 8, cursor: 'pointer', background: selectedStrategy === s.strategy_id ? 'rgba(50,210,201,0.10)' : 'var(--glass-bg)', border: `2px solid ${selectedStrategy === s.strategy_id ? 'var(--accent-teal)' : 'var(--glass-border)'}`, transition: 'all 0.2s' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: selectedStrategy === s.strategy_id ? 'var(--accent-teal)' : 'var(--text-primary)' }}>{s.strategy_name}</span>
                                        {selectedStrategy === s.strategy_id && <span style={{ color: 'var(--accent-teal)' }}>✓</span>}
                                    </div>
                                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{s.description}</div>
                                </div>
                            ))}
                            <textarea className="input-field" rows={2} placeholder="추가 의견 (선택)" value={strategyNotes} onChange={e => setStrategyNotes(e.target.value)} style={{ resize: 'none', fontSize: 12, marginTop: 6 }} />
                        </SectionCard>
                        <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(48,209,88,0.07)', border: '1px solid rgba(48,209,88,0.2)', marginBottom: 14, fontSize: 11.5, color: 'var(--success)' }}>
                            ✅ 전략 확정 후 출원서 초안 → 가상 심사 → 최종 제안서가 <b>자동으로 진행</b>됩니다.
                        </div>
                        {loading ? <LoadingCard message={loadingMsg} /> : (
                            <button className="btn-primary" onClick={approveThenAutoRun} disabled={!selectedStrategy}
                                style={{ background: selectedStrategy ? 'linear-gradient(135deg, var(--success), var(--accent-teal))' : undefined }}>
                                🚀 전략 확정 + 자동 완료 시작 →
                            </button>
                        )}
                    </motion.div>
                )}

                {/* PHASES 5 & 6 — Auto-running */}
                {(phase === 5 || phase === 6) && (
                    <motion.div key={`p${phase}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <LoadingCard
                            message={phase === 5 ? 'KIPO 출원서 자동 작성 중...' : '가상 심사관이 심사 중...'}
                            sub={phase === 5 ? '특허 명세서 섹션별 생성' : '신규성·진보성·명확성·실시가능성 검토'}
                        />
                        <div style={{ padding: '14px', background: 'var(--glass-bg)', borderRadius: 16, border: '1px solid var(--glass-border)' }}>
                            {(phase === 5
                                ? ['📝 발명의 명칭 및 요약', '🔬 기술분야 및 배경기술', '💡 발명의 내용', '📋 청구범위 (독립항·종속항)', '⚙️ 실시예 및 도면']
                                : ['§29 1항: 신규성', '§29 2항: 진보성', '§42 4항: 청구항 명확성', '§42 3항: 실시가능성', '보정 청구항 생성']
                            ).map((s, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: phase === 5 ? 'var(--accent-blue)' : 'var(--warning)' }} />
                                    </motion.div>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* PHASE 7 — Final Proposal */}
                {phase === 7 && step6Result && (
                    <motion.div key="p7" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div style={{ textAlign: 'center', padding: '20px', marginBottom: 14, borderRadius: 20, background: 'linear-gradient(135deg, rgba(48,209,88,0.10), rgba(50,210,201,0.07))', border: '1px solid rgba(48,209,88,0.25)' }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
                            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>최종 특허 제안서 완성</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>{step6Result.invention_title}</div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: (step6Result.executive_summary?.allowability_score || 0) >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                                        {step6Result.executive_summary?.allowability_score || 0}점
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>출원 가능 확률</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <RiskBadge risk={step6Result.executive_summary?.risk_level} />
                                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>침해 위험</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-blue)' }}>{step6Result.executive_summary?.research_sources || 0}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>참고 자료</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 16, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: 12 }}>
                            <ScoreRing score={step6Result.audit?.allowability_score || step6Result.executive_summary?.allowability_score || 0} />
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{step6Result.audit?.overall_verdict}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step6Result.audit?.overall_assessment}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 12 }}>
                            {[{ k: 'summary', l: '요약', icon: '📋' }, { k: 'clearance', l: '침해분석', icon: '🔬' }, { k: 'draft', l: '명세서', icon: '📄' }, { k: 'audit', l: '심사', icon: '⚖️' }, { k: 'actions', l: '조치사항', icon: '📌' }].map(t => (
                                <button key={t.k} onClick={() => setProposalSection(t.k)} style={{ flexShrink: 0, padding: '7px 11px', borderRadius: 10, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: proposalSection === t.k ? 'var(--accent-blue)' : 'var(--glass-bg)', color: proposalSection === t.k ? 'white' : 'var(--text-secondary)', border: `1px solid ${proposalSection === t.k ? 'var(--accent-blue)' : 'var(--glass-border)'}`, transition: 'all 0.2s' }}>
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
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step6Result.tech_spec?.solution_summary}</div>
                                            {(step6Result.tech_spec?.key_features || []).map((f, i) => (
                                                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, marginTop: 6 }}><span style={{ color: 'var(--accent-purple)' }}>•</span><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f}</span></div>
                                            ))}
                                        </SectionCard>
                                        {(step6Result.audit?.next_actions || []).length > 0 && (
                                            <SectionCard title="✅ 추가 확인 사항" accent="#FF9F0A">
                                                {step6Result.audit.next_actions.slice(0, 3).map((a, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--warning)', color: 'var(--bg-surface)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a}</div>
                                                    </div>
                                                ))}
                                            </SectionCard>
                                        )}
                                        {(step6Result.audit?.issues || []).length > 0 && (
                                            <SectionCard title="🔧 AI 보완 제안" accent="#32D2C9">
                                                {step6Result.audit.issues.slice(0, 3).map((issue, i) => (
                                                    <div key={i} style={{ marginBottom: 8, padding: '8px 10px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: issue.severity === 'major' ? 'var(--danger)' : 'var(--warning)', marginBottom: 3 }}>{issue.issue_type}</div>
                                                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{issue.suggestion}</div>
                                                    </div>
                                                ))}
                                            </SectionCard>
                                        )}
                                    </div>
                                )}
                                {proposalSection === 'clearance' && (
                                    <SectionCard title={`침해 위험: ${step6Result.clearance?.overall_risk}`} accent={step6Result.clearance?.overall_risk === 'HIGH' ? '#FF453A' : '#FF9F0A'}>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 10 }}>{step6Result.clearance?.risk_summary}</div>
                                        {(step6Result.clearance?.prior_art_patents || []).map((p, i) => (
                                            <div key={i} style={{ padding: '10px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: 6 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700 }}>{p.patent_number}</span>
                                                    <RiskBadge risk={p.infringement_risk} />
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.title}</div>
                                            </div>
                                        ))}
                                    </SectionCard>
                                )}
                                {proposalSection === 'draft' && (
                                    <SectionCard title="KIPO 특허 명세서 초안" accent="#32D2C9">
                                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{step6Result.patent_draft?.invention_title}</div>
                                        <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(10,132,255,0.07)', marginBottom: 10 }}>
                                            <div style={{ fontSize: 10, color: 'var(--accent-blue)', fontWeight: 700, marginBottom: 4 }}>요약</div>
                                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step6Result.patent_draft?.abstract}</div>
                                        </div>
                                        <div className="input-label">청구항</div>
                                        {(step6Result.patent_draft?.claims || []).map((c, i) => (
                                            <div key={i} style={{ fontSize: 11.5, marginBottom: 6, padding: '8px 10px', borderRadius: 8, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>{c}</div>
                                        ))}
                                    </SectionCard>
                                )}
                                {proposalSection === 'audit' && (
                                    <SectionCard title="가상 심사 결과" accent="#FF9F0A">
                                        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
                                            <ScoreRing score={step6Result.audit?.allowability_score || 0} />
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{step6Result.audit?.overall_verdict}</div>
                                                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{step6Result.audit?.overall_assessment}</div>
                                            </div>
                                        </div>
                                        {(step6Result.audit?.issues || []).map((issue, i) => (
                                            <div key={i} style={{ marginBottom: 8, padding: '10px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                                                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: issue.severity === 'major' ? 'var(--danger)' : 'var(--warning)', textTransform: 'uppercase' }}>{issue.severity}</span>
                                                </div>
                                                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 4 }}>{issue.description}</div>
                                                <div style={{ fontSize: 11, color: 'var(--accent-teal)' }}>→ {issue.suggestion}</div>
                                            </div>
                                        ))}
                                    </SectionCard>
                                )}
                                {proposalSection === 'actions' && (
                                    <div>
                                        <SectionCard title="📌 필수 후속 조치" accent="#5E5CE6">
                                            {(step6Result.audit?.next_actions || []).map((a, i) => (
                                                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-purple)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a}</div>
                                                </div>
                                            ))}
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
