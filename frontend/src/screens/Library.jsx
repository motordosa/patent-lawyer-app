import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { projectsAPI, ideationAPI, draftingAPI, auditAPI } from '../services/api'

function LibraryCard({ project, onClick, isSelected }) {
    const stages = [
        { key: 'ideation', label: 'I', prog: project.ideation_progress },
        { key: 'clearance', label: 'C', prog: project.clearance_progress },
        { key: 'drafting', label: 'D', prog: project.drafting_progress },
        { key: 'audit', label: 'A', prog: project.audit_progress },
    ]
    const overall = Math.round(stages.reduce((a, s) => a + s.prog, 0) / 4)

    return (
        <motion.div
            className="glass-card"
            style={{
                padding: 16, marginBottom: 10, cursor: 'pointer',
                border: isSelected ? '1px solid var(--accent-purple)' : '1px solid var(--glass-border)',
                background: isSelected ? 'rgba(94,92,230,0.08)' : 'var(--glass-bg)'
            }}
            onClick={onClick}
            whileTap={{ scale: 0.98 }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3 }}>{project.technology_field}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{project.title}</div>
                </div>
                <div style={{
                    padding: '3px 8px', borderRadius: 8,
                    background: overall === 100 ? 'rgba(48,209,88,0.15)' : 'rgba(10,132,255,0.12)',
                    color: overall === 100 ? 'var(--success)' : 'var(--accent-blue)',
                    fontSize: 12, fontWeight: 700
                }}>
                    {overall}%
                </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
                {stages.map(s => (
                    <div key={s.key} style={{ flex: 1 }}>
                        <div className="progress-track" style={{ height: 4 }}>
                            <div className={`progress-fill ${s.key}`} style={{ width: `${s.prog}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    )
}

function DetailPanel({ project, onClose }) {
    const [tab, setTab] = useState('ideation')
    const [data, setData] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const results = {}
            try { results.ideation = (await ideationAPI.get(project.id)).data } catch { /* ignore */ }
            try { results.draft = (await draftingAPI.get(project.id)).data } catch { /* ignore */ }
            try { results.audit = (await auditAPI.get(project.id)).data } catch { /* ignore */ }
            setData(results)
            setLoading(false)
        }
        load()
    }, [project.id])

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'flex-end',
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                style={{
                    width: '100%', maxWidth: 430, margin: '0 auto',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '32px 32px 0 0',
                    padding: '20px 20px 48px',
                    maxHeight: '85vh',
                    display: 'flex', flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 16px' }} />
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{project.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>{project.technology_field}</div>

                {/* Tab Switcher */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexShrink: 0 }}>
                    {[
                        { k: 'ideation', l: '명세서' },
                        { k: 'draft', l: '특허 초안' },
                        { k: 'audit', l: '심사 결과' },
                    ].map(t => (
                        <button key={t.k} onClick={() => setTab(t.k)} style={{
                            flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                            background: tab === t.k ? 'var(--accent-purple)' : 'var(--glass-bg)',
                            color: tab === t.k ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${tab === t.k ? 'var(--accent-purple)' : 'var(--glass-border)'}`,
                        }}>{t.l}</button>
                    ))}
                </div>

                <div style={{ flex: 1, overflow: 'auto' }}>
                    {loading ? (
                        <div className="loading-overlay"><div className="spinner" /><div className="loading-text">로딩 중...</div></div>
                    ) : tab === 'ideation' ? (
                        data.ideation ? (
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                                    {data.ideation.tech_spec?.invention_title}
                                </div>
                                {[
                                    { l: '기술 분야', v: data.ideation.tech_spec?.technical_field },
                                    { l: '해결 과제', v: data.ideation.tech_spec?.problem_to_solve },
                                    { l: '해결 수단', v: data.ideation.tech_spec?.solution_summary },
                                ].map(item => item.v && (
                                    <div key={item.l} style={{ marginBottom: 12 }}>
                                        <div className="input-label">{item.l}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.v}</div>
                                    </div>
                                ))}
                                <div>
                                    {data.ideation.keywords?.map(k => <span key={k} className="tag">{k}</span>)}
                                    {data.ideation.ipc_codes?.map(c => <span key={c} className="tag ipc">{c}</span>)}
                                </div>
                            </div>
                        ) : <div className="empty-state"><div className="empty-state-icon">💡</div><div className="empty-state-desc">Ideation 결과 없음</div></div>
                    ) : tab === 'draft' ? (
                        data.draft ? (
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                                    {data.draft.draft_content?.invention_title}
                                </div>
                                <div className="input-label">요약서</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                                    {data.draft.draft_content?.abstract}
                                </div>
                                <div className="input-label">청구항 ({data.draft.draft_content?.claims?.length || 0}개)</div>
                                {data.draft.draft_content?.claims?.map((c, i) => (
                                    <div key={i} className={`claim-item ${i === 0 ? 'independent' : ''}`} style={{ fontSize: 11 }}>{c}</div>
                                ))}
                            </div>
                        ) : <div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-desc">특허 초안 없음</div></div>
                    ) : (
                        data.audit ? (
                            <div>
                                <div style={{
                                    display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16,
                                    padding: '12px', background: 'var(--glass-bg)', borderRadius: 14
                                }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                                        background: `conic-gradient(var(--accent-blue) ${data.audit.allowability_score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-surface)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 14, fontWeight: 800, color: 'var(--accent-blue)'
                                        }}>
                                            {data.audit.allowability_score}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        {data.audit.overall_assessment}
                                    </div>
                                </div>
                                {data.audit.next_actions?.map((a, i) => (
                                    <div key={i} style={{
                                        display: 'flex', gap: 8, padding: '10px 12px', marginBottom: 6,
                                        background: 'rgba(10,132,255,0.08)', borderRadius: 10,
                                        fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5
                                    }}>
                                        <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{i + 1}.</span>
                                        {a}
                                    </div>
                                ))}
                            </div>
                        ) : <div className="empty-state"><div className="empty-state-icon">⚖️</div><div className="empty-state-desc">심사 결과 없음</div></div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}

export default function Library() {
    const [projects, setProjects] = useState([])
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        projectsAPI.list().then(r => { setProjects(r.data || []); setLoading(false) }).catch(() => setLoading(false))
    }, [])

    const filtered = projects.filter(p => {
        if (filter === 'all') return true
        if (filter === 'active') return p.status !== 'complete'
        if (filter === 'complete') return p.status === 'complete'
        return true
    })

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '56px 20px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>IP Archive</div>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, marginBottom: 16 }}>
                    내 <span className="gradient-text">서재</span>
                </h1>

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                    {[
                        { k: 'all', l: `전체 (${projects.length})` },
                        { k: 'active', l: '진행 중' },
                        { k: 'complete', l: '완료' },
                    ].map(f => (
                        <button key={f.k} onClick={() => setFilter(f.k)} style={{
                            padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                            background: filter === f.k ? 'var(--accent-blue)' : 'var(--glass-bg)',
                            color: filter === f.k ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${filter === f.k ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                            transition: 'all 0.2s'
                        }}>{f.l}</button>
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '0 20px', paddingBottom: 100 }}>
                {loading ? (
                    <div className="loading-overlay"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📚</div>
                        <div className="empty-state-title">특허 서재 비어있음</div>
                        <div className="empty-state-desc">대시보드에서 프로젝트를 생성하고<br />특허 파이프라인을 시작하세요</div>
                    </div>
                ) : filtered.map(p => (
                    <LibraryCard
                        key={p.id}
                        project={p}
                        isSelected={selected?.id === p.id}
                        onClick={() => setSelected(p)}
                    />
                ))}
            </div>

            {selected && <DetailPanel project={selected} onClose={() => setSelected(null)} />}
        </div>
    )
}
