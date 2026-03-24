import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../AuthContext'

export default function Login() {
    const { login } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPw, setShowPw] = useState(false)

    async function handleLogin(e) {
        e.preventDefault()
        if (!username.trim() || !password.trim()) return
        setLoading(true)
        setError('')
        try {
            await login(username.trim(), password)
        } catch (err) {
            setError(err.response?.data?.detail || '로그인에 실패했습니다. 아이디/비밀번호를 확인하세요.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden'
        }}>
            {/* Background orbs */}
            <div style={{
                position: 'absolute', width: 400, height: 400, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(94,92,230,0.18) 0%, transparent 70%)',
                top: '-100px', left: '-100px', filter: 'blur(40px)'
            }} />
            <div style={{
                position: 'absolute', width: 350, height: 350, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(10,132,255,0.14) 0%, transparent 70%)',
                bottom: '-80px', right: '-80px', filter: 'blur(40px)'
            }} />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                    width: '100%', maxWidth: 380, margin: '20px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
                    borderRadius: 28, padding: '40px 32px', position: 'relative', zIndex: 1,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.5)'
                }}
            >
                {/* Logo / Brand */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '20px', margin: '0 auto 16px',
                        background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 32, boxShadow: '0 8px 32px rgba(94,92,230,0.4)'
                    }}>⚖️</div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>
                        특허 AI 플랫폼
                    </h1>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: 0.2 }}>
                        Automotive IP Strategy Platform
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    {/* Username */}
                    <div style={{ marginBottom: 14 }}>
                        <div className="input-label">아이디</div>
                        <input
                            id="login-username"
                            className="input-field"
                            type="text"
                            placeholder="사용자 아이디 입력"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoComplete="username"
                            autoFocus
                            style={{ fontSize: 15 }}
                        />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: 24 }}>
                        <div className="input-label">비밀번호</div>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="login-password"
                                className="input-field"
                                type={showPw ? 'text' : 'password'}
                                placeholder="비밀번호 입력"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="current-password"
                                style={{ fontSize: 15, paddingRight: 48 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(p => !p)}
                                style={{
                                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', fontSize: 16, cursor: 'pointer',
                                    color: 'var(--text-tertiary)', padding: 4
                                }}
                            >{showPw ? '🙈' : '👁'}</button>
                        </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{
                                    padding: '10px 14px', borderRadius: 12, marginBottom: 14,
                                    background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.3)',
                                    color: 'var(--danger)', fontSize: 12, lineHeight: 1.5
                                }}
                            >
                                ⚠️ {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Submit */}
                    <button
                        id="login-submit"
                        type="submit"
                        className="btn-primary"
                        disabled={loading || !username.trim() || !password.trim()}
                        style={{
                            background: (username.trim() && password.trim())
                                ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))'
                                : 'var(--glass-bg)',
                            transition: 'all 0.3s',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.25)', borderTop: '2px solid white', borderRadius: '50%' }}
                                />
                                로그인 중...
                            </span>
                        ) : '🔐 로그인'}
                    </button>
                </form>

                {/* Footer note */}
                <p style={{
                    textAlign: 'center', marginTop: 24, fontSize: 11,
                    color: 'var(--text-tertiary)', lineHeight: 1.6
                }}>
                    접근 권한은 관리자가 부여합니다.<br />
                    계정이 없다면 담당자에게 문의하세요.
                </p>
            </motion.div>
        </div>
    )
}
