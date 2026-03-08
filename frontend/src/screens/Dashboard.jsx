import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { projectsAPI, settingsAPI } from '../services/api'

const STATUS_LABELS = {
    ideation: '아이디어 구체화',
    clearance: '특허 클리어런스',
    drafting: '초안 작성',
    audit: '가상 심사',
    complete: '완료',
}

function ProjectCard({ project, onClick, onDelete }) {
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const stages = [
        { key: 'ideation', label: '아이디어', progress: project.ideation_progress },
        { key: 'clearance', label: '클리어런스', progress: project.clearance_progress },
        { key: 'drafting', label: '초안', progress: project.drafting_progress },
        { key: 'audit', label: '심사', progress: project.audit_progress },
        { key: 'research', label: '리서치', progress: project.research_progress || 0 },
        { key: 'analysis', label: '분석', progress: project.analysis_progress || 0 },
    ]
    const overall = Math.round(stages.reduce((a, s) => a + s.progress, 0) / stages.length)

    async function handleDelete(e) {
        e.stopPropagation()
        if (!confirmDelete) { setConfirmDelete(true); return }
        setDeleting(true)
        await onDelete(project.id)
    }

    return (
        <motion.div
            className="glass-card patent-card"
            onClick={onClick}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            layout
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                    <div className="input-label" style={{ marginBottom: 4 }}>{project.technology_field}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{project.title}</div>
                    {project.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.4 }}>
                            {project.description.slice(0, 60)}{project.description.length > 60 ? '...' : ''}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    {/* Progress ring */}
                    <div style={{
                        minWidth: 42, height: 42, borderRadius: '50%',
                        background: `conic-gradient(var(--accent-blue) ${overall * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-surface)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700
                        }}>{overall}%</div>
                    </div>
                    {/* Delete button */}
                    <button
                        onClick={handleDelete}
                        style={{
                            fontSize: confirmDelete ? 10 : 14, padding: '3px 8px', borderRadius: 8,
                            background: confirmDelete ? 'rgba(255,69,58,0.15)' : 'rgba(255,255,255,0.05)',
                            color: confirmDelete ? 'var(--danger)' : 'var(--text-tertiary)',
                            border: `1px solid ${confirmDelete ? 'var(--danger)' : 'transparent'}`,
                            opacity: deleting ? 0.5 : 1, transition: 'all 0.2s'
                        }}
                    >
                        {deleting ? '삭제 중...' : confirmDelete ? '확인' : '🗑️'}
                    </button>
                </div>
            </div>

            {/* 6-stage progress bars */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
                {stages.map(s => (
                    <div key={s.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{s.label}</span>
                            <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{s.progress}%</span>
                        </div>
                        <div className="progress-track" style={{ height: 3 }}>
                            <div className={`progress-fill ${s.key === 'research' ? 'clearance' : s.key === 'analysis' ? 'audit' : s.key}`}
                                style={{ width: `${s.progress}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    상태: <span style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>
                        {STATUS_LABELS[project.status] || project.status}
                    </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {project.updated_at?.slice(0, 10)}
                </div>
            </div>
        </motion.div>
    )
}

function NewProjectModal({ onClose, onCreated }) {
    const [title, setTitle] = useState('')
    const [desc, setDesc] = useState('')
    const [field, setField] = useState('자동차 기술')
    const [loading, setLoading] = useState(false)

    const TECH_FIELDS = ['전기차 기술', 'ADAS/자율주행', '파워트레인', '배터리/에너지', '섀시/안전', '차량 통신/V2X', '경량화 소재', '열관리 시스템']

    async function handleCreate() {
        if (!title.trim()) return
        setLoading(true)
        try {
            await projectsAPI.create({ title, description: desc, technology_field: field })
            onCreated()
        } catch (e) {
            console.error(e)
        } finally { setLoading(false) }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'flex-end',
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                style={{
                    width: '100%', maxWidth: 430, margin: '0 auto',
                    background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
                    borderRadius: '32px 32px 0 0', padding: '24px 24px 44px', maxHeight: '85vh', overflow: 'auto'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 20px' }} />
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>새 특허 프로젝트</div>

                <div className="section-spacing">
                    <div className="input-label">발명의 명칭 *</div>
                    <input className="input-field" placeholder="예: EV 배터리 열관리 시스템" value={title} onChange={e => setTitle(e.target.value)} />
                </div>

                <div className="section-spacing">
                    <div className="input-label">기술 분야</div>
                    <select value={field} onChange={e => setField(e.target.value)} style={{
                        width: '100%', padding: '12px 16px', background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)', borderRadius: 14,
                        color: 'var(--text-primary)', fontSize: 14, appearance: 'none'
                    }}>
                        {TECH_FIELDS.map(f => <option key={f} value={f} style={{ background: '#1a1a2e' }}>{f}</option>)}
                    </select>
                </div>

                <div className="section-spacing">
                    <div className="input-label">간단한 설명</div>
                    <textarea className="input-field" placeholder="해결하려는 기술 문제와 아이디어를 간략하게..."
                        value={desc} onChange={e => setDesc(e.target.value)}
                        rows={3} style={{ resize: 'none', lineHeight: 1.5 }} />
                </div>
                <button className="btn-primary" onClick={handleCreate} disabled={loading || !title.trim()}>
                    {loading ? '생성 중...' : '🚀 프로젝트 시작'}
                </button>
            </motion.div>
        </motion.div>
    )
}

export default function Dashboard() {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [profile, setProfile] = useState({ name: '사용자', avatar_emoji: '👨‍💼', title: '' })
    const navigate = useNavigate()

    async function loadAll() {
        try {
            const [pRes, uRes] = await Promise.all([
                projectsAPI.list(),
                settingsAPI.getProfile().catch(() => ({ data: { name: '사용자', avatar_emoji: '👨‍💼', title: '' } }))
            ])
            setProjects(pRes.data)
            setProfile(uRes.data)
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }

    useEffect(() => { loadAll() }, [])

    async function handleDelete(id) {
        try {
            await projectsAPI.delete(id)
            setProjects(prev => prev.filter(p => p.id !== id))
        } catch (e) { console.error(e) }
    }

    const inProgress = projects.filter(p => p.status !== 'complete').length
    const complete = projects.filter(p => p.status === 'complete').length

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '56px 20px 0', flexShrink: 0 }}>
                {/* User greeting */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                    }}>{profile.avatar_emoji}</div>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>안녕하세요,</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{profile.name} {profile.title && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>· {profile.title}</span>}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8 }}>
                        특허 <span className="gradient-text">대시보드</span>
                    </h1>
                    <button
                        onClick={() => setShowModal(true)}
                        style={{
                            width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-blue)',
                            color: 'white', fontSize: 22, fontWeight: 300,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 16px rgba(10,132,255,0.4)'
                        }}
                    >+</button>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    {[
                        { label: '진행 중', value: inProgress, color: 'var(--accent-blue)' },
                        { label: '완료', value: complete, color: 'var(--success)' },
                        { label: '총 프로젝트', value: projects.length, color: 'var(--accent-purple)' },
                    ].map(stat => (
                        <div key={stat.label} className="glass-card" style={{ flex: 1, padding: '12px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Project List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 20px', paddingBottom: 100 }}>
                {loading ? (
                    <div className="loading-overlay"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
                ) : projects.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🚗</div>
                        <div className="empty-state-title">특허 프로젝트 없음</div>
                        <div className="empty-state-desc">+ 버튼을 눌러 첫 번째<br />특허 프로젝트를 시작하세요</div>
                        <button className="btn-primary" style={{ marginTop: 16, width: 'auto', padding: '12px 24px' }} onClick={() => setShowModal(true)}>
                            프로젝트 시작
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="section-label">특허 프로젝트 ({projects.length})</div>
                        <AnimatePresence>
                            {projects.map(p => (
                                <ProjectCard
                                    key={p.id}
                                    project={p}
                                    onClick={() => navigate('/ideation', { state: { projectId: p.id } })}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showModal && (
                    <NewProjectModal
                        onClose={() => setShowModal(false)}
                        onCreated={() => { setShowModal(false); loadAll() }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
