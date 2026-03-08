import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { projectsAPI, clearanceAPI } from '../services/api'

export default function Clearance() {
    const [projects, setProjects] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)
    const [keywords, setKeywords] = useState('')

    useEffect(() => {
        projectsAPI.list().then(r => setProjects(r.data)).catch(() => { })
    }, [])

    async function handleSearch() {
        if (!selectedId || !keywords.trim()) return
        setLoading(true)
        try {
            const kws = keywords.split(',').map(k => k.trim()).filter(Boolean)
            const res = await clearanceAPI.search({ project_id: selectedId, keywords: kws })
            setResults(res.data)
        } catch (e) {
            console.error(e)
        } finally { setLoading(false) }
    }

    const riskColor = { LOW: 'var(--success)', MEDIUM: 'var(--warning)', HIGH: 'var(--danger)' }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '56px 20px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Patent Intelligence</div>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, marginBottom: 20 }}>
                    특허 <span className="gradient-text">분석</span>
                </h1>

                <select
                    value={selectedId || ''}
                    onChange={e => setSelectedId(Number(e.target.value))}
                    style={{
                        width: '100%', padding: '12px 16px', marginBottom: 12,
                        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                        borderRadius: 14, color: 'var(--text-primary)', fontSize: 14,
                        appearance: 'none', cursor: 'pointer'
                    }}
                >
                    <option value="" style={{ background: '#1a1a2e' }}>프로젝트 선택...</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id} style={{ background: '#1a1a2e' }}>{p.title}</option>
                    ))}
                </select>

                <div style={{ marginBottom: 12 }}>
                    <div className="input-label">검색 키워드 (쉼표로 구분)</div>
                    <input
                        className="input-field"
                        placeholder="예: EV battery, thermal management, PCM cooling"
                        value={keywords}
                        onChange={e => setKeywords(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={handleSearch} disabled={loading || !selectedId || !keywords.trim()}
                    style={{ marginBottom: 8, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' }}>
                    {loading ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                            <span className="spinner" /> 특허 DB 검색 중...
                        </span>
                    ) : '🔬 특허 DB 검색'}
                </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px', paddingBottom: 100 }}>
                {!results ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <div className="empty-state-title">특허 검색 준비</div>
                        <div className="empty-state-desc">프로젝트와 키워드를 입력하고<br />검색을 시작하세요</div>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Risk Summary */}
                        <div style={{
                            display: 'flex', gap: 10, marginBottom: 20
                        }}>
                            <div className="glass-card" style={{ flex: 1, padding: '14px', textAlign: 'center' }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: riskColor[results.overall_risk] }}>
                                    {results.overall_risk}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>전체 위험도</div>
                            </div>
                            <div className="glass-card" style={{ flex: 1, padding: '14px', textAlign: 'center' }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-blue)' }}>
                                    {results.total_found}건
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>발견된 특허</div>
                            </div>
                        </div>

                        <div className="section-label">유사 특허 목록</div>
                        {results.results.map((p, i) => (
                            <div key={i} className="glass-card" style={{ padding: 16, marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--accent-blue)', fontWeight: 600 }}>{p.patent_number}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginTop: 2 }}>{p.title}</div>
                                    </div>
                                    <span className={`risk-badge ${p.infringement_risk}`}>{p.infringement_risk}</span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                                    {p.assignee} · {p.filing_date} · 유사도 {Math.round(p.similarity_score * 100)}%
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    {p.abstract.slice(0, 120)}...
                                </div>
                            </div>
                        ))}

                        <div className="section-label">회피 전략</div>
                        {results.avoidance_strategies.map((s, i) => (
                            <div key={i} style={{
                                display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 8,
                                background: 'rgba(50,210,201,0.08)', border: '1px solid rgba(50,210,201,0.2)',
                                borderRadius: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5
                            }}>
                                <span style={{ color: 'var(--accent-teal)' }}>→</span>
                                {s}
                            </div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    )
}
