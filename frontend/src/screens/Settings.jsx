import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { settingsAPI } from '../services/api'

const LLM_MODELS = [
    { key: 'openai', label: 'OpenAI GPT-4o', icon: '🤖', desc: 'Most capable, best for patent drafting' },
    { key: 'anthropic', label: 'Claude 3.5 Sonnet', icon: '🧠', desc: 'Excellent reasoning, long context' },
    { key: 'google', label: 'Gemini 1.5 Pro', icon: '💎', desc: 'Multimodal, large context window' },
    { key: 'groq', label: 'Groq LLaMA 3', icon: '⚡', desc: 'Ultra-fast inference speed' },
    { key: 'perplexity', label: 'Perplexity', icon: '🌐', desc: 'Web-connected AI search' },
]

const SEARCH_ENGINES = [
    { key: 'tavily', label: 'Tavily AI Search', icon: '🔍', desc: 'AI-optimized web search API' },
    { key: 'serper', label: 'Google Search (Serper)', icon: '🌍', desc: 'Real Google Search results' },
    { key: 'exa', label: 'Exa.ai', icon: '🧬', desc: 'Semantic search for research' },
]

const PATENT_DBS = [
    { key: 'kipris', label: 'KIPRIS (한국특허정보원)', icon: '🇰🇷', desc: '무료 한국 특허 DB — open.kipris.or.kr', free: false },
    { key: 'lens', label: 'Lens.org', icon: '🔭', desc: '무료 전세계 특허 DB — lens.org', free: false },
    { key: 'uspto', label: 'USPTO PatentsView', icon: '🇺🇸', desc: '무료 — 별도 API 키 불필요', free: true },
    { key: 'patsnap', label: 'PatSnap', icon: '📊', desc: '유료 상용 특허 분석 DB', free: false },
]

const AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍💻', '👩‍💻', '🧑‍🏭', '👨‍⚖️', '👩‍⚖️', '🧑‍🚀']

function SectionHeader({ title, icon }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 24 }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span className="section-label" style={{ marginBottom: 0 }}>{title}</span>
        </div>
    )
}

function ApiKeyRow({ label, keyName, value, isSet, onSave }) {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState('')
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        await onSave(keyName, val)
        setSaving(false)
        setEditing(false)
        setVal('')
    }

    return (
        <div style={{
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: 14, padding: '12px 16px', marginBottom: 8
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 11, color: isSet ? 'var(--success)' : 'var(--text-tertiary)', marginTop: 2 }}>
                        {isSet ? `✓ ${value}` : '미설정'}
                    </div>
                </div>
                <button
                    onClick={() => setEditing(!editing)}
                    style={{
                        padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                        background: isSet ? 'rgba(48,209,88,0.15)' : 'rgba(10,132,255,0.15)',
                        color: isSet ? 'var(--success)' : 'var(--accent-blue)',
                        border: `1px solid ${isSet ? 'rgba(48,209,88,0.3)' : 'rgba(10,132,255,0.3)'}`,
                    }}
                >
                    {editing ? '취소' : isSet ? '변경' : '+ 설정'}
                </button>
            </div>
            <AnimatePresence>
                {editing && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ paddingTop: 10, display: 'flex', gap: 8 }}>
                            <input
                                className="input-field"
                                type="password"
                                placeholder={`${label} API Key 입력...`}
                                value={val}
                                onChange={e => setVal(e.target.value)}
                                style={{ flex: 1, fontSize: 13 }}
                                autoComplete="off"
                            />
                            <button
                                onClick={handleSave}
                                disabled={saving || !val.trim()}
                                style={{
                                    padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                    background: 'var(--accent-blue)', color: 'white',
                                    opacity: (saving || !val.trim()) ? 0.5 : 1,
                                }}
                            >
                                {saving ? '저장...' : '저장'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function Settings() {
    const [profile, setProfile] = useState({ name: '', title: '', organization: '', email: '', bio: '', avatar_emoji: '👨‍💼' })
    const [settings, setSettings] = useState({})
    const [apiStatus, setApiStatus] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [activeTab, setActiveTab] = useState('profile')
    const [preferredLLM, setPreferredLLM] = useState('openai')
    const [preferredSearch, setPreferredSearch] = useState('tavily')

    async function load() {
        try {
            const [profileRes, settingsRes, statusRes] = await Promise.all([
                settingsAPI.getProfile(),
                settingsAPI.get(),
                settingsAPI.getApiStatus(),
            ])
            setProfile(profileRes.data)
            setSettings(settingsRes.data)
            setApiStatus(statusRes.data)
            setPreferredLLM(statusRes.data.preferred_llm || 'openai')
            setPreferredSearch(statusRes.data.preferred_search || 'tavily')
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    async function saveProfile() {
        setSaving(true)
        try {
            await settingsAPI.updateProfile(profile)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (e) { } finally { setSaving(false) }
    }

    async function saveApiKey(key, value) {
        await settingsAPI.update({ [key]: value })
        load()
    }

    async function savePreference(key, value) {
        await settingsAPI.update({ [key]: value })
        if (key === 'preferred_llm') setPreferredLLM(value)
        else if (key === 'preferred_search') setPreferredSearch(value)
    }

    const tabs = [
        { k: 'profile', l: '프로필', icon: '👤' },
        { k: 'llm', l: 'LLM 모델', icon: '🤖' },
        { k: 'search', l: '검색 API', icon: '🔍' },
        { k: 'patent', l: '특허 DB', icon: '📋' },
    ]

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '56px 20px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Configuration</div>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, marginBottom: 16 }}>
                    <span className="gradient-text">⚙️</span> 설정
                </h1>

                {/* Sub tabs */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 4 }}>
                    {tabs.map(t => (
                        <button key={t.k} onClick={() => setActiveTab(t.k)} style={{
                            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                            padding: '7px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                            background: activeTab === t.k ? 'var(--accent-blue)' : 'var(--glass-bg)',
                            color: activeTab === t.k ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${activeTab === t.k ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                            transition: 'all 0.2s'
                        }}>
                            <span>{t.icon}</span> {t.l}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', paddingBottom: 100 }}>
                {loading ? (
                    <div className="loading-overlay"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                            {/* ── Profile Tab ── */}
                            {activeTab === 'profile' && (
                                <div>
                                    {/* Avatar */}
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                                        <div style={{
                                            width: 80, height: 80, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 40, boxShadow: '0 8px 32px rgba(94,92,230,0.4)'
                                        }}>
                                            {profile.avatar_emoji}
                                        </div>
                                    </div>

                                    {/* Avatar picker */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                                        {AVATAR_OPTIONS.map(a => (
                                            <button key={a} onClick={() => setProfile(p => ({ ...p, avatar_emoji: a }))} style={{
                                                width: 44, height: 44, borderRadius: 12, fontSize: 22,
                                                background: profile.avatar_emoji === a ? 'rgba(94,92,230,0.2)' : 'var(--glass-bg)',
                                                border: `2px solid ${profile.avatar_emoji === a ? 'var(--accent-purple)' : 'transparent'}`,
                                                transition: 'all 0.2s'
                                            }}>{a}</button>
                                        ))}
                                    </div>

                                    {[
                                        { label: '이름', key: 'name', placeholder: '홍길동' },
                                        { label: '직책/역할', key: 'title', placeholder: '자동차 R&D 헤드' },
                                        { label: '소속 기관', key: 'organization', placeholder: '현대자동차 R&D본부' },
                                        { label: '이메일', key: 'email', placeholder: 'user@company.com' },
                                    ].map(f => (
                                        <div key={f.key} style={{ marginBottom: 12 }}>
                                            <div className="input-label">{f.label}</div>
                                            <input
                                                className="input-field"
                                                placeholder={f.placeholder}
                                                value={profile[f.key] || ''}
                                                onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                                            />
                                        </div>
                                    ))}
                                    <div style={{ marginBottom: 16 }}>
                                        <div className="input-label">소개</div>
                                        <textarea
                                            className="input-field"
                                            placeholder="자신에 대한 간단한 소개..."
                                            value={profile.bio || ''}
                                            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                                            rows={3}
                                            style={{ resize: 'none', lineHeight: 1.5 }}
                                        />
                                    </div>
                                    <button className="btn-primary" onClick={saveProfile} disabled={saving}>
                                        {saving ? '저장 중...' : saved ? '✓ 저장됨' : '프로필 저장'}
                                    </button>
                                </div>
                            )}

                            {/* ── LLM Tab ── */}
                            {activeTab === 'llm' && (
                                <div>
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(94,92,230,0.15), rgba(10,132,255,0.10))',
                                        border: '1px solid rgba(94,92,230,0.3)',
                                        borderRadius: 16, padding: '12px 14px', marginBottom: 16
                                    }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 3 }}>💡 API 키 없이도 Mock 모드로 동작합니다</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>API 키를 설정하면 실제 LLM이 특허 분석에 사용됩니다.</div>
                                    </div>

                                    <SectionHeader title="선호 LLM 모델" icon="⭐" />
                                    <div style={{ marginBottom: 16 }}>
                                        {LLM_MODELS.map(m => (
                                            <button key={m.key} onClick={() => savePreference('preferred_llm', m.key)} style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '12px 14px', marginBottom: 8, borderRadius: 14, textAlign: 'left',
                                                background: preferredLLM === m.key ? 'rgba(94,92,230,0.15)' : 'var(--glass-bg)',
                                                border: `1px solid ${preferredLLM === m.key ? 'var(--accent-purple)' : 'var(--glass-border)'}`,
                                                transition: 'all 0.2s'
                                            }}>
                                                <span style={{ fontSize: 22 }}>{m.icon}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{m.label}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.desc}</div>
                                                </div>
                                                {preferredLLM === m.key && (
                                                    <span style={{ fontSize: 16, color: 'var(--accent-purple)' }}>✓</span>
                                                )}
                                                {apiStatus?.llm?.[m.key] && (
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <SectionHeader title="API 키 설정" icon="🔑" />
                                    {LLM_MODELS.map(m => (
                                        <ApiKeyRow
                                            key={m.key}
                                            label={m.label}
                                            keyName={`${m.key}_api_key`}
                                            value={settings[`${m.key}_api_key`] || ''}
                                            isSet={!!apiStatus?.llm?.[m.key]}
                                            onSave={saveApiKey}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* ── Search Tab ── */}
                            {activeTab === 'search' && (
                                <div>
                                    <SectionHeader title="선호 검색 엔진" icon="⭐" />
                                    {SEARCH_ENGINES.map(s => (
                                        <button key={s.key} onClick={() => savePreference('preferred_search', s.key)} style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 14px', marginBottom: 8, borderRadius: 14, textAlign: 'left',
                                            background: preferredSearch === s.key ? 'rgba(10,132,255,0.15)' : 'var(--glass-bg)',
                                            border: `1px solid ${preferredSearch === s.key ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                                            transition: 'all 0.2s'
                                        }}>
                                            <span style={{ fontSize: 22 }}>{s.icon}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.desc}</div>
                                            </div>
                                            {preferredSearch === s.key && <span style={{ color: 'var(--accent-blue)' }}>✓</span>}
                                            {apiStatus?.search?.[s.key] && (
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                                            )}
                                        </button>
                                    ))}

                                    <SectionHeader title="Search API 키" icon="🔑" />
                                    {SEARCH_ENGINES.map(s => (
                                        <ApiKeyRow
                                            key={s.key}
                                            label={s.label}
                                            keyName={`${s.key}_api_key`}
                                            value={settings[`${s.key}_api_key`] || ''}
                                            isSet={!!apiStatus?.search?.[s.key]}
                                            onSave={saveApiKey}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* ── Patent DB Tab ── */}
                            {activeTab === 'patent' && (
                                <div>
                                    <SectionHeader title="특허 데이터베이스" icon="📋" />
                                    {PATENT_DBS.map(db => (
                                        <div key={db.key} style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 14px', marginBottom: 8, borderRadius: 14,
                                            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)'
                                        }}>
                                            <span style={{ fontSize: 22 }}>{db.icon}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{db.label}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{db.desc}</div>
                                            </div>
                                            {db.free ? (
                                                <span className="risk-badge LOW">무료</span>
                                            ) : apiStatus?.patent?.[db.key] ? (
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                                            ) : null}
                                        </div>
                                    ))}

                                    <SectionHeader title="상용 DB API 키" icon="🔑" />
                                    {PATENT_DBS.filter(d => !d.free).map(db => (
                                        <ApiKeyRow
                                            key={db.key}
                                            label={db.label}
                                            keyName={`${db.key}_api_key`}
                                            value={settings[`${db.key}_api_key`] || ''}
                                            isSet={!!apiStatus?.patent?.[db.key]}
                                            onSave={saveApiKey}
                                        />
                                    ))}

                                    {/* API Status Summary */}
                                    <div style={{ marginTop: 20, padding: '14px', background: 'var(--glass-bg)', borderRadius: 16, border: '1px solid var(--glass-border)' }}>
                                        <div className="section-label">연동 현황</div>
                                        {apiStatus && Object.entries({ ...apiStatus.llm, ...apiStatus.search }).map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k}</span>
                                                <span style={{ fontSize: 12, color: v ? 'var(--success)' : 'var(--text-tertiary)' }}>{v ? '✓ 연동됨' : '미설정'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}
