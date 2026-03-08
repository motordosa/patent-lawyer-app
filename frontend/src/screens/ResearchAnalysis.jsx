import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { projectsAPI, researchAPI, analysisAPI } from '../services/api'

const ANALYSIS_TYPES = [
    { key: 'comprehensive', label: '종합 분석', icon: '🧬', desc: '기술, 시장, 특허 종합 전략' },
    { key: 'competitive', label: '경쟁 분석', icon: '⚔️', desc: '경쟁사 특허 포트폴리오 분석' },
    { key: 'patentability', label: '특허성 분석', icon: '⚖️', desc: '진보성·신규성 등록 가능성' },
    { key: 'market', label: '시장성 분석', icon: '📊', desc: '시장 규모·사업화 전략' },
]

function SourceBadge({ type }) {
    const colors = {
        web: { bg: 'rgba(10,132,255,0.12)', text: 'var(--accent-blue)', label: '웹' },
        academic: { bg: 'rgba(50,210,201,0.12)', text: 'var(--accent-teal)', label: '논문' },
        patents: { bg: 'rgba(94,92,230,0.12)', text: 'var(--accent-purple)', label: '특허' },
    }
    const c = colors[type] || colors.web
    return (
        <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: c.bg, color: c.text }}>
            {c.label}
        </span>
    )
}

function ResearchCard({ item }) {
    const [expanded, setExpanded] = useState(false)
    return (
        <div className="glass-card" style={{ padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <SourceBadge type={item.source_type} />
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{item.source_name}</span>
                        <span style={{ fontSize: 10, color: 'var(--accent-teal)', fontWeight: 600 }}>
                            관련도 {Math.round(item.relevance_score * 100)}%
                        </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{item.title}</div>
                </div>
                {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: 18, lineHeight: 1, flexShrink: 0
                    }} title="원문 보기">🔗</a>
                )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {expanded ? item.content : item.content.slice(0, 150) + (item.content.length > 150 ? '...' : '')}
            </div>
            {item.content.length > 150 && (
                <button onClick={() => setExpanded(!expanded)} style={{
                    fontSize: 11, color: 'var(--accent-blue)', marginTop: 6, background: 'none',
                    border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600
                }}>
                    {expanded ? '접기' : '더 보기'}
                </button>
            )}
        </div>
    )
}

function AnalysisCard({ item }) {
    const typeLabel = ANALYSIS_TYPES.find(t => t.key === item.analysis_type)
    return (
        <div className="glass-card" style={{ padding: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{typeLabel?.icon || '🧬'}</span>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{typeLabel?.label || item.analysis_type}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{item.llm_model} · {item.created_at?.slice(0, 10)}</div>
                    </div>
                </div>
            </div>

            <div style={{
                fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12, fontStyle: 'italic',
                borderLeft: '2px solid var(--accent-blue)', paddingLeft: 10
            }}>
                {item.summary}
            </div>

            {[
                { data: item.key_findings, label: '🔎 핵심 발견', color: 'var(--accent-blue)' },
                { data: item.opportunities, label: '✨ 기회', color: 'var(--success)' },
                { data: item.risks, label: '⚠️ 위험', color: 'var(--warning)' },
                { data: item.recommendations, label: '📌 권고사항', color: 'var(--accent-purple)' },
            ].map(section => section.data?.length > 0 && (
                <div key={section.label} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: section.color, marginBottom: 5 }}>{section.label}</div>
                    {section.data.map((d, i) => (
                        <div key={i} style={{
                            display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-secondary)',
                            paddingBottom: 4, lineHeight: 1.5
                        }}>
                            <span style={{ color: section.color, flexShrink: 0 }}>•</span>
                            {d}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}

export default function ResearchAnalysis() {
    const [projects, setProjects] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [activeTab, setActiveTab] = useState('research')
    const [researchItems, setResearchItems] = useState([])
    const [analyses, setAnalyses] = useState([])
    const [query, setQuery] = useState('')
    const [analysisType, setAnalysisType] = useState('comprehensive')
    const [loading, setLoading] = useState(false)
    const [loadingAnalysis, setLoadingAnalysis] = useState(false)
    const [customPrompt, setCustomPrompt] = useState('')
    const [showCustom, setShowCustom] = useState(false)

    useEffect(() => {
        projectsAPI.list().then(r => setProjects(r.data)).catch(() => { })
    }, [])

    async function loadData(id) {
        if (!id) return
        const [rRes, aRes] = await Promise.all([
            researchAPI.get(id).catch(() => ({ data: { items: [] } })),
            analysisAPI.get(id).catch(() => ({ data: { analyses: [] } })),
        ])
        setResearchItems(rRes.data.items || [])
        setAnalyses(aRes.data.analyses || [])
    }

    function handleSelect(id) {
        setSelectedId(id)
        const p = projects.find(x => x.id === id)
        if (p) setQuery(p.title + ' ' + (p.technology_field || ''))
        loadData(id)
    }

    async function handleCollect() {
        if (!selectedId) return
        setLoading(true)
        try {
            await researchAPI.collect({
                project_id: selectedId,
                query: query,
                keywords: query.split(' ').filter(Boolean).slice(0, 5),
                max_results: 8
            })
            await loadData(selectedId)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    async function handleAnalyze() {
        if (!selectedId) return
        setLoadingAnalysis(true)
        try {
            await analysisAPI.analyze({
                project_id: selectedId,
                analysis_type: showCustom ? 'comprehensive' : analysisType,
                custom_prompt: showCustom ? customPrompt : null,
                use_research_data: researchItems.length > 0
            })
            await loadData(selectedId)
            setActiveTab('analysis')
        } catch (e) { console.error(e) }
        finally { setLoadingAnalysis(false) }
    }

    const tabStyle = (k) => ({
        flex: 1, padding: '9px 8px', borderRadius: 12, fontSize: 13, fontWeight: 600,
        background: activeTab === k ? 'var(--accent-teal)' : 'var(--glass-bg)',
        color: activeTab === k ? 'white' : 'var(--text-secondary)',
        border: `1px solid ${activeTab === k ? 'var(--accent-teal)' : 'var(--glass-border)'}`,
        transition: 'all 0.2s'
    })

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '56px 20px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Intelligence Engine</div>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, marginBottom: 16 }}>
                    리서치 &amp; <span className="gradient-text">분석</span>
                </h1>

                {/* Project selector */}
                <select
                    value={selectedId || ''}
                    onChange={e => handleSelect(Number(e.target.value))}
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

                {/* Tab switcher */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <button style={tabStyle('research')} onClick={() => setActiveTab('research')}>🔍 정보 수집</button>
                    <button style={tabStyle('analyze')} onClick={() => setActiveTab('analyze')}>🧬 AI 분석</button>
                    <button style={tabStyle('analysis')} onClick={() => setActiveTab('analysis')}>
                        📊 결과 {analyses.length > 0 && `(${analyses.length})`}
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px', paddingBottom: 100 }}>
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>

                        {/* ── Research Tab ── */}
                        {activeTab === 'research' && (
                            <div>
                                <div className="input-label">검색 쿼리</div>
                                <textarea
                                    className="input-field"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="예: EV 배터리 열관리 위상변화물질 PCM cooling automotive"
                                    rows={3}
                                    style={{ resize: 'none', marginBottom: 10 }}
                                />
                                <button
                                    className="btn-primary"
                                    onClick={handleCollect}
                                    disabled={loading || !selectedId || !query.trim()}
                                    style={{ marginBottom: 16, background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-blue))' }}
                                >
                                    {loading ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                            <span className="spinner" /> AI 정보 수집 중...
                                        </span>
                                    ) : `🌐 정보 수집 (${researchItems.length > 0 ? '업데이트' : '시작'})`}
                                </button>

                                {researchItems.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">🌐</div>
                                        <div className="empty-state-title">정보 수집 준비</div>
                                        <div className="empty-state-desc">프로젝트를 선택하고 검색 쿼리를<br />입력한 후 정보 수집을 시작하세요.<br /><br />Tavily/Serper API 키 설정 시<br />실제 웹 검색이 이루어집니다.</div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="section-label">수집된 정보 ({researchItems.length}건)</div>
                                        {researchItems.map(item => <ResearchCard key={item.id} item={item} />)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Analyze Tab ── */}
                        {activeTab === 'analyze' && (
                            <div>
                                {researchItems.length > 0 && (
                                    <div style={{
                                        padding: '10px 14px', marginBottom: 16,
                                        background: 'rgba(50,210,201,0.08)', border: '1px solid rgba(50,210,201,0.2)',
                                        borderRadius: 12, fontSize: 12, color: 'var(--accent-teal)'
                                    }}>
                                        ✓ {researchItems.length}건의 수집된 정보가 분석에 활용됩니다
                                    </div>
                                )}

                                <div className="input-label">분석 유형</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                                    {ANALYSIS_TYPES.map(t => (
                                        <button key={t.key} onClick={() => { setAnalysisType(t.key); setShowCustom(false) }} style={{
                                            padding: '10px 12px', borderRadius: 12, textAlign: 'left',
                                            background: (!showCustom && analysisType === t.key) ? 'rgba(94,92,230,0.15)' : 'var(--glass-bg)',
                                            border: `1px solid ${(!showCustom && analysisType === t.key) ? 'var(--accent-purple)' : 'var(--glass-border)'}`,
                                            transition: 'all 0.2s'
                                        }}>
                                            <div style={{ fontSize: 18, marginBottom: 3 }}>{t.icon}</div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{t.label}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>{t.desc}</div>
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setShowCustom(!showCustom)}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                        background: showCustom ? 'rgba(255,159,10,0.12)' : 'var(--glass-bg)',
                                        border: `1px solid ${showCustom ? 'var(--warning)' : 'var(--glass-border)'}`,
                                        color: showCustom ? 'var(--warning)' : 'var(--text-secondary)',
                                        marginBottom: 10
                                    }}
                                >
                                    ✍️ 커스텀 쿼리로 분석
                                </button>

                                {showCustom && (
                                    <textarea
                                        className="input-field"
                                        value={customPrompt}
                                        onChange={e => setCustomPrompt(e.target.value)}
                                        placeholder="예: 이 발명을 중국 시장에서 특허 보호하기 위한 전략을 분석해주세요..."
                                        rows={4}
                                        style={{ resize: 'none', marginBottom: 12 }}
                                    />
                                )}

                                <button
                                    className="btn-primary"
                                    onClick={handleAnalyze}
                                    disabled={loadingAnalysis || !selectedId || (showCustom && !customPrompt.trim())}
                                    style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' }}
                                >
                                    {loadingAnalysis ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                            <span className="spinner" /> AI 종합 분석 중 (30~60초)...
                                        </span>
                                    ) : '🧬 AI 종합 분석 실행'}
                                </button>
                            </div>
                        )}

                        {/* ── Analysis Results Tab ── */}
                        {activeTab === 'analysis' && (
                            <div>
                                {analyses.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">📊</div>
                                        <div className="empty-state-title">분석 결과 없음</div>
                                        <div className="empty-state-desc">AI 분석 탭에서 분석을 실행하세요</div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="section-label">분석 보고서 ({analyses.length}건)</div>
                                        {analyses.map(item => <AnalysisCard key={item.id} item={item} />)}
                                    </div>
                                )}
                            </div>
                        )}

                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}
