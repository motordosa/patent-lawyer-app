import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { settingsAPI, adminAPI } from '../services/api'
import { useAuth } from '../AuthContext'

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
    { key: 'kipris', label: 'KIPRIS (한국특허정보원)', icon: '🇰🇷', desc: '한국 특허 DB', free: false },
    { key: 'lens', label: 'Lens.org', icon: '🔭', desc: '전세계 오픈 특허 DB', free: false },
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

// Admin-only API key row (write permitted)
function AdminApiKeyRow({ label, keyName, isSet, onSave }) {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState('')
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        if (!val.trim()) return
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
                        {isSet ? '✓ 설정됨 (서버 암호화 저장)' : '미설정'}
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
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6 }}>
                            🔒 입력된 키는 서버에서 Fernet 암호화되어 저장됩니다. 평문은 절대 노출되지 않습니다.
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// Read-only status row for regular users
function ApiStatusRow({ label, isSet }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: 14, padding: '12px 16px', marginBottom: 8
        }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
            <span style={{ fontSize: 12, color: isSet ? 'var(--success)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                {isSet ? '✓ 활성' : '미설정'}
            </span>
        </div>
    )
}

// Admin: User management panel
function UserManagement() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [newUser, setNewUser] = useState({ username: '', password: '', display_name: '', email: '', is_admin: false })
    const [creating, setCreating] = useState(false)
    const [err, setErr] = useState('')
    const { user: currentUser } = useAuth()

    async function load() {
        try {
            const r = await adminAPI.listUsers()
            setUsers(r.data)
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    async function handleCreate() {
        if (!newUser.username.trim() || !newUser.password.trim()) return
        setCreating(true); setErr('')
        try {
            await adminAPI.createUser(newUser)
            setNewUser({ username: '', password: '', display_name: '', email: '', is_admin: false })
            setShowCreate(false)
            load()
        } catch (e) {
            setErr(e.response?.data?.detail || '사용자 생성 실패')
        } finally { setCreating(false) }
    }

    async function handleToggle(id) {
        try { await adminAPI.toggleUser(id); load() } catch (e) { console.error(e) }
    }

    async function handleDelete(id) {
        if (!window.confirm('정말 삭제하시겠습니까?')) return
        try { await adminAPI.deleteUser(id); load() } catch (e) { console.error(e) }
    }

    if (loading) return <div className="loading-overlay"><div className="spinner" style={{ width: 28, height: 28 }} /></div>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>총 {users.length}명의 사용자</div>
                <button onClick={() => setShowCreate(s => !s)} style={{
                    padding: '7px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    background: 'rgba(10,132,255,0.15)', color: 'var(--accent-blue)',
                    border: '1px solid rgba(10,132,255,0.3)'
                }}>
                    {showCreate ? '취소' : '+ 사용자 추가'}
                </button>
            </div>

            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', marginBottom: 14 }}>
                        <div style={{ background: 'rgba(10,132,255,0.05)', border: '1px solid rgba(10,132,255,0.2)', borderRadius: 16, padding: '14px' }}>
                            <div className="input-label">아이디 *</div>
                            <input className="input-field" placeholder="username" value={newUser.username}
                                onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} style={{ marginBottom: 10 }} />
                            <div className="input-label">이름</div>
                            <input className="input-field" placeholder="표시 이름" value={newUser.display_name}
                                onChange={e => setNewUser(p => ({ ...p, display_name: e.target.value }))} style={{ marginBottom: 10 }} />
                            <div className="input-label">이메일</div>
                            <input className="input-field" placeholder="email@example.com" value={newUser.email}
                                onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} style={{ marginBottom: 10 }} />
                            <div className="input-label">초기 비밀번호 *</div>
                            <input className="input-field" type="password" placeholder="초기 비밀번호" value={newUser.password}
                                onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} style={{ marginBottom: 10 }} />
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 14, cursor: 'pointer' }}>
                                <input type="checkbox" checked={newUser.is_admin}
                                    onChange={e => setNewUser(p => ({ ...p, is_admin: e.target.checked }))} />
                                관리자 권한 부여
                            </label>
                            {err && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>⚠️ {err}</div>}
                            <button className="btn-primary" onClick={handleCreate} disabled={creating || !newUser.username.trim() || !newUser.password.trim()}>
                                {creating ? '생성 중...' : '사용자 생성'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {users.map(u => (
                <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', marginBottom: 8, borderRadius: 14,
                    background: 'var(--glass-bg)', border: `1px solid ${u.is_active ? 'var(--glass-border)' : 'rgba(255,69,58,0.2)'}`
                }}>
                    <div style={{ fontSize: 26 }}>{u.avatar_emoji || '👤'}</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {u.display_name || u.username}
                            {u.is_admin ? <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent-purple)', fontWeight: 700 }}>관리자</span> : ''}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>@{u.username}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {u.id !== currentUser?.id && (
                            <>
                                <button onClick={() => handleToggle(u.id)} style={{
                                    padding: '5px 10px', borderRadius: 9, fontSize: 11, fontWeight: 600,
                                    background: u.is_active ? 'rgba(255,159,10,0.12)' : 'rgba(48,209,88,0.12)',
                                    color: u.is_active ? 'var(--warning)' : 'var(--success)',
                                    border: `1px solid ${u.is_active ? 'rgba(255,159,10,0.3)' : 'rgba(48,209,88,0.3)'}`,
                                }}>
                                    {u.is_active ? '비활성' : '활성화'}
                                </button>
                                {!u.is_admin && (
                                    <button onClick={() => handleDelete(u.id)} style={{
                                        padding: '5px 10px', borderRadius: 9, fontSize: 11, fontWeight: 600,
                                        background: 'rgba(255,69,58,0.1)', color: 'var(--danger)',
                                        border: '1px solid rgba(255,69,58,0.3)',
                                    }}>삭제</button>
                                )}
                            </>
                        )}
                        {u.id === currentUser?.id && (
                            <span style={{ fontSize: 11, color: 'var(--accent-blue)' }}>본인</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function Settings() {
    const { user: currentUser, isAdmin } = useAuth()
    const [profile, setProfile] = useState({ name: '', title: '', organization: '', email: '', bio: '', avatar_emoji: '👨‍💼' })
    const [apiStatus, setApiStatus] = useState(null)
    const [adminSettings, setAdminSettings] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [activeTab, setActiveTab] = useState('profile')
    const [preferredLLM, setPreferredLLM] = useState('openai')
    const [preferredSearch, setPreferredSearch] = useState('tavily')

    async function load() {
        try {
            const calls = [settingsAPI.getProfile(), settingsAPI.getApiStatus()]
            if (isAdmin) calls.push(adminAPI.getSettings())
            const results = await Promise.all(calls)
            setProfile(results[0].data)
            setApiStatus(results[1].data)
            setPreferredLLM(results[1].data.preferred_llm || 'openai')
            setPreferredSearch(results[1].data.preferred_search || 'tavily')
            if (isAdmin && results[2]) setAdminSettings(results[2].data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [isAdmin]) // eslint-disable-line

    async function saveProfile() {
        setSaving(true)
        try {
            await settingsAPI.updateProfile(profile)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (_e) { /* ignore */ } finally { setSaving(false) }
    }

    async function saveAdminApiKey(key, value) {
        await adminAPI.updateSettings({ [key]: value })
        load()
    }

    async function savePreference(key, value) {
        await settingsAPI.update({ [key]: value })
        if (key === 'preferred_llm') setPreferredLLM(value)
        else if (key === 'preferred_search') setPreferredSearch(value)
    }

    // Build tabs based on role
    const tabs = [
        { k: 'profile', l: '프로필', icon: '👤' },
        { k: 'llm', l: 'LLM 모델', icon: '🤖' },
        { k: 'search', l: '검색 API', icon: '🔍' },
        { k: 'patent', l: '특허 DB', icon: '📋' },
        ...(isAdmin ? [{ k: 'admin', l: '관리자', icon: '🛡️' }] : []),
    ]

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '56px 20px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Configuration</div>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, marginBottom: 8 }}>
                    <span className="gradient-text">⚙️</span> 설정
                </h1>
                {currentUser && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
                        로그인: {currentUser.display_name || currentUser.username}
                        {isAdmin && <span style={{ marginLeft: 6, color: 'var(--accent-purple)', fontWeight: 700 }}>· 관리자</span>}
                    </div>
                )}
                {/* Sub tabs */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 4 }}>
                    {tabs.map(t => (
                        <button key={t.k} onClick={() => setActiveTab(t.k)} style={{
                            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                            padding: '7px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                            background: activeTab === t.k ? (t.k === 'admin' ? 'var(--accent-purple)' : 'var(--accent-blue)') : 'var(--glass-bg)',
                            color: activeTab === t.k ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${activeTab === t.k ? (t.k === 'admin' ? 'var(--accent-purple)' : 'var(--accent-blue)') : 'var(--glass-border)'}`,
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
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 3 }}>💡 API 키는 관리자가 설정합니다</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            {isAdmin ? 'API 키 설정은 관리자 탭에서 할 수 있습니다.' : 'API 키 관련 문의는 관리자에게 연락하세요.'}
                                        </div>
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
                                                {preferredLLM === m.key && <span style={{ fontSize: 16, color: 'var(--accent-purple)' }}>✓</span>}
                                                {apiStatus?.llm?.[m.key] && (
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <SectionHeader title="API 키 상태" icon="🔑" />
                                    {LLM_MODELS.map(m => (
                                        <ApiStatusRow key={m.key} label={m.label} isSet={!!apiStatus?.llm?.[m.key]} />
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

                                    <SectionHeader title="Search API 상태" icon="🔑" />
                                    {SEARCH_ENGINES.map(s => (
                                        <ApiStatusRow key={s.key} label={s.label} isSet={!!apiStatus?.search?.[s.key]} />
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

                            {/* ── Admin Tab (admin only) ── */}
                            {activeTab === 'admin' && isAdmin && (
                                <div>
                                    <div style={{
                                        padding: '12px 14px', marginBottom: 20, borderRadius: 14,
                                        background: 'rgba(94,92,230,0.08)', border: '1px solid rgba(94,92,230,0.25)'
                                    }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 3 }}>🛡️ 관리자 전용 패널</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>API 키 및 사용자 관리 기능입니다. 이 화면은 관리자만 접근 가능합니다.</div>
                                    </div>

                                    {/* API Keys */}
                                    <SectionHeader title="API 키 관리 (암호화 저장)" icon="🔑" />
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12, lineHeight: 1.6 }}>
                                        🔒 입력된 API 키는 Fernet 대칭 암호화로 서버에 저장됩니다. 평문은 어떤 화면에도 노출되지 않습니다.
                                    </div>

                                    <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>LLM 모델</div>
                                    {LLM_MODELS.map(m => (
                                        <AdminApiKeyRow key={m.key} label={m.label} keyName={`${m.key}_api_key`}
                                            isSet={!!adminSettings?.[`${m.key}_api_key_is_set`]} onSave={saveAdminApiKey} />
                                    ))}

                                    <div style={{ marginTop: 16, marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>검색 API</div>
                                    {SEARCH_ENGINES.map(s => (
                                        <AdminApiKeyRow key={s.key} label={s.label} keyName={`${s.key}_api_key`}
                                            isSet={!!adminSettings?.[`${s.key}_api_key_is_set`]} onSave={saveAdminApiKey} />
                                    ))}

                                    <div style={{ marginTop: 16, marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>특허 DB</div>
                                    {PATENT_DBS.filter(d => !d.free).map(db => (
                                        <AdminApiKeyRow key={db.key} label={db.label} keyName={`${db.key}_api_key`}
                                            isSet={!!adminSettings?.[`${db.key}_api_key_is_set`]} onSave={saveAdminApiKey} />
                                    ))}

                                    {/* User Management */}
                                    <SectionHeader title="사용자 관리" icon="👥" />
                                    <UserManagement />
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}
