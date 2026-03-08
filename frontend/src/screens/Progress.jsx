import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { projectsAPI } from '../services/api'
import API from '../services/api'

const pipelineAPI = { getResult: (id) => API.get(`/pipeline/result/${id}`) }

const STAGES = [
    { key: 'ideation_progress', label: '기술 명세서', icon: '💡', color: '#5E5CE6', desc: '아이디어 → 기술 명세서' },
    { key: 'clearance_progress', label: '선행기술 조사', icon: '🔬', color: '#0A84FF', desc: '특허 DB 검색 및 위험 분석' },
    { key: 'drafting_progress', label: '특허 초안', icon: '📝', color: '#32D2C9', desc: 'KIPO 표준 명세서 작성' },
    { key: 'audit_progress', label: '가상 심사', icon: '⚖️', color: '#FF9F0A', desc: '진보성·신규성 심사 & 보정' },
    { key: 'research_progress', label: '리서치 DB', icon: '🌐', color: '#30D158', desc: '선행기술 정보 수집' },
    { key: 'analysis_progress', label: 'AI 종합분석', icon: '🧬', color: '#FF453A', desc: 'LLM 기반 전략 분석' },
]

function AnimatedBar({ progress, color, height = 8, delay = 0 }) {
    const [displayed, setDisplayed] = useState(0)
    useEffect(() => {
        const timer = setTimeout(() => setDisplayed(progress), delay)
        return () => clearTimeout(timer)
    }, [progress, delay])
    return (
        <div className="progress-track" style={{ height }}>
            <motion.div
                animate={{ width: `${displayed}%` }}
                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                style={{
                    height: '100%', borderRadius: 99,
                    background: `linear-gradient(90deg, ${color}aa, ${color})`,
                }}
            />
        </div>
    )
}

function StageCard({ stage, value, idx }) {
    const done = value === 100
    const active = value > 0 && value < 100
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            style={{
                padding: '14px 16px', marginBottom: 10, borderRadius: 18,
                background: done ? 'rgba(48,209,88,0.06)' : active ? `${stage.color}0A` : 'var(--glass-bg)',
                border: `1px solid ${done ? 'rgba(48,209,88,0.25)' : active ? stage.color + '30' : 'var(--glass-border)'}`,
                transition: 'all 0.4s'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: done ? 'rgba(48,209,88,0.15)' : active ? `${stage.color}20` : 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    border: `1px solid ${done ? 'rgba(48,209,88,0.3)' : active ? stage.color + '40' : 'var(--glass-border)'}`,
                }}>
                    {done ? '✅' : stage.icon}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: done ? 'var(--success)' : 'var(--text-primary)' }}>
                        {stage.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{stage.desc}</div>
                </div>
                <div style={{
                    fontSize: 16, fontWeight: 800,
                    color: done ? 'var(--success)' : active ? stage.color : 'var(--text-tertiary)'
                }}>{value}%</div>
            </div>
            <AnimatedBar progress={value} color={done ? '#30D158' : stage.color} height={6} delay={idx * 100} />
        </motion.div>
    )
}

function PipelineFlowDiagram({ project }) {
    // 4-node horizontal flow diagram
    const nodes = [
        { icon: '💡', label: '아이디어', key: 'ideation_progress' },
        { icon: '🔬', label: '클리어런스', key: 'clearance_progress' },
        { icon: '📝', label: '초안', key: 'drafting_progress' },
        { icon: '⚖️', label: '심사', key: 'audit_progress' },
        { icon: '🏆', label: '완료', key: 'complete' },
    ]
    const isComplete = (key) => {
        if (key === 'complete') return project.status === 'complete'
        return (project[key] || 0) === 100
    }
    const isActive = (key) => {
        if (key === 'complete') return false
        const v = project[key] || 0
        return v > 0 && v < 100
    }

    return (
        <div style={{ padding: '16px', background: 'var(--glass-bg)', borderRadius: 20, border: '1px solid var(--glass-border)', marginBottom: 16 }}>
            <div className="input-label" style={{ marginBottom: 12 }}>파이프라인 흐름</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {nodes.map((n, i) => (
                    <div key={n.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: '0 0 auto' }}>
                            <motion.div
                                animate={isActive(n.key) ? { scale: [1, 1.15, 1], boxShadow: ['0 0 0px transparent', '0 0 14px #0A84FF80', '0 0 0px transparent'] } : {}}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                style={{
                                    width: 38, height: 38, borderRadius: 12,
                                    background: isComplete(n.key) ? 'rgba(48,209,88,0.18)' : isActive(n.key) ? 'rgba(10,132,255,0.18)' : 'rgba(255,255,255,0.04)',
                                    border: `2px solid ${isComplete(n.key) ? '#30D158' : isActive(n.key) ? '#0A84FF' : 'rgba(255,255,255,0.08)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                                    transition: 'all 0.4s'
                                }}
                            >
                                {isComplete(n.key) ? '✓' : n.icon}
                            </motion.div>
                            <span style={{ fontSize: 9, color: isComplete(n.key) ? 'var(--success)' : isActive(n.key) ? 'var(--accent-blue)' : 'var(--text-tertiary)', textAlign: 'center', maxWidth: 40 }}>
                                {n.label}
                            </span>
                        </div>
                        {i < nodes.length - 1 && (
                            <div style={{
                                flex: 1, height: 2, margin: '0 4px', marginBottom: 14,
                                background: isComplete(n.key) ? 'var(--success)' : 'rgba(255,255,255,0.07)', transition: 'all 0.5s'
                            }} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function OverallRing({ overall }) {
    const color = overall >= 75 ? 'var(--success)' : overall >= 40 ? 'var(--accent-blue)' : 'var(--text-tertiary)'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: 'var(--glass-bg)', borderRadius: 20, border: '1px solid var(--glass-border)', marginBottom: 14 }}>
            <div style={{
                width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                background: `conic-gradient(${color} ${overall * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1 }}>{overall}%</span>
                    <span style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>완료</span>
                </div>
            </div>
            <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>전체 파이프라인</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {overall === 100 ? '✅ 특허 제안서 완성!' : overall >= 75 ? '🔄 거의 완성 단계' : overall >= 25 ? '⚡ 진행 중' : '💡 시작 단계'}
                </div>
            </div>
        </div>
    )
}

export default function Progress() {
    const [projects, setProjects] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        projectsAPI.list().then(r => setProjects(r.data)).catch(() => { })
    }, [])

    const selected = projects.find(p => p.id === selectedId)
    const overall = selected
        ? Math.round(STAGES.reduce((a, s) => a + (selected[s.key] || 0), 0) / STAGES.length)
        : 0

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '56px 20px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Pipeline Progress</div>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, marginBottom: 16 }}>
                    진행 <span className="gradient-text">현황</span>
                </h1>

                <select
                    value={selectedId || ''}
                    onChange={e => setSelectedId(Number(e.target.value))}
                    style={{
                        width: '100%', padding: '12px 16px', marginBottom: 4,
                        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                        borderRadius: 14, color: selectedId ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        fontSize: 14, appearance: 'none', cursor: 'pointer'
                    }}
                >
                    <option value="" style={{ background: '#1a1a2e' }}>프로젝트 선택...</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id} style={{ background: '#1a1a2e' }}>{p.title}</option>
                    ))}
                </select>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px', paddingBottom: 100 }}>
                {!selectedId ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📊</div>
                        <div className="empty-state-title">프로젝트를 선택하세요</div>
                        <div className="empty-state-desc">파이프라인 진행 현황을<br />시각적으로 확인할 수 있습니다</div>
                        <button className="btn-primary" style={{ marginTop: 16, width: 'auto', padding: '12px 24px' }}
                            onClick={() => navigate('/pipeline')}>
                            🚀 파이프라인 시작
                        </button>
                    </div>
                ) : selected ? (
                    <AnimatePresence>
                        <motion.div key={selectedId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

                            {/* Overall Ring */}
                            <OverallRing overall={overall} />

                            {/* Flow Diagram */}
                            <PipelineFlowDiagram project={selected} />

                            {/* Stage breakdown */}
                            <div className="input-label">단계별 진행률</div>
                            {STAGES.map((stage, i) => (
                                <StageCard key={stage.key} stage={stage} value={selected[stage.key] || 0} idx={i} />
                            ))}

                            {/* CTA */}
                            {overall < 100 && (
                                <button
                                    className="btn-primary"
                                    onClick={() => navigate('/pipeline')}
                                    style={{ marginTop: 8, background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' }}
                                >
                                    ⚡ 파이프라인 계속 진행
                                </button>
                            )}
                            {overall === 100 && (
                                <div style={{
                                    marginTop: 8, padding: '16px', background: 'rgba(48,209,88,0.08)',
                                    border: '1px solid rgba(48,209,88,0.25)', borderRadius: 18, textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 24, marginBottom: 6 }}>🏆</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>특허 제안서 완성!</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>모든 파이프라인 단계가 완료되었습니다</div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                ) : null}
            </div>
        </div>
    )
}
