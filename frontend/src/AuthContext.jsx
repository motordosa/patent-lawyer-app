import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import API from './services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)   // { id, username, display_name, avatar_emoji, is_admin }
    const [token, setToken] = useState(() => localStorage.getItem('patent_token'))
    const [loading, setLoading] = useState(true)

    // On mount: validate existing token
    useEffect(() => {
        if (!token) {
            setLoading(false)
            return
        }
        API.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => {
            setUser(r.data)
        }).catch(() => {
            // Token invalid / expired
            localStorage.removeItem('patent_token')
            setToken(null)
            setUser(null)
        }).finally(() => setLoading(false))
    }, []) // eslint-disable-line

    const login = useCallback(async (username, password) => {
        const r = await API.post('/auth/login', { username, password })
        const { token: newToken, user: newUser } = r.data
        localStorage.setItem('patent_token', newToken)
        setToken(newToken)
        setUser(newUser)
        return newUser
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('patent_token')
        setToken(null)
        setUser(null)
    }, [])

    return (
        <AuthContext.Provider value={{ user, token, isAdmin: !!user?.is_admin, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
