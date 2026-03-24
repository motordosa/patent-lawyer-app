import aiosqlite
import json
import os
from datetime import datetime
from services.auth_service import encrypt_value, decrypt_value, hash_password

DATABASE_URL = os.getenv("DATABASE_URL", "./patent_app.db")

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    technology_field TEXT DEFAULT '자동차 기술',
    status TEXT DEFAULT 'ideation',
    ideation_progress INTEGER DEFAULT 0,
    clearance_progress INTEGER DEFAULT 0,
    drafting_progress INTEGER DEFAULT 0,
    audit_progress INTEGER DEFAULT 0,
    research_progress INTEGER DEFAULT 0,
    analysis_progress INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ideation_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    tech_spec TEXT NOT NULL,
    keywords TEXT NOT NULL,
    ipc_codes TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS clearance_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    results TEXT NOT NULL,
    overall_risk TEXT NOT NULL,
    avoidance_strategies TEXT NOT NULL,
    freedom_to_operate TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    patent_office TEXT NOT NULL,
    draft_content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS audit_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    overall_assessment TEXT NOT NULL,
    allowability_score INTEGER NOT NULL,
    issues TEXT NOT NULL,
    amended_claims TEXT NOT NULL,
    examiner_remarks TEXT NOT NULL,
    next_actions TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name TEXT NOT NULL DEFAULT '사용자',
    title TEXT DEFAULT '자동차 R&D 헤드',
    organization TEXT DEFAULT '',
    email TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    avatar_emoji TEXT DEFAULT '👨‍💼',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT DEFAULT '',
    hashed_password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    display_name TEXT DEFAULT '',
    avatar_emoji TEXT DEFAULT '👤',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS research_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    url TEXT DEFAULT '',
    relevance_score REAL DEFAULT 0.0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    analysis_type TEXT NOT NULL,
    llm_model TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_findings TEXT NOT NULL,
    opportunities TEXT NOT NULL,
    risks TEXT NOT NULL,
    recommendations TEXT NOT NULL,
    raw_content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
"""



async def init_db():
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.executescript(CREATE_TABLES_SQL)
        await db.commit()

        # ── Runtime migrations: add missing columns to existing DB files ──────
        migration_stmts = [
            "ALTER TABLE projects ADD COLUMN technology_field TEXT DEFAULT '자동차 기술'",
            "ALTER TABLE projects ADD COLUMN research_progress INTEGER DEFAULT 0",
            "ALTER TABLE projects ADD COLUMN analysis_progress INTEGER DEFAULT 0",
        ]
        for stmt in migration_stmts:
            try:
                await db.execute(stmt)
                await db.commit()
            except Exception:
                pass  # column already exists → ignore

        # ── Seed default admin account if not exists ──────────────────────────
        now = datetime.utcnow().isoformat()
        cursor = await db.execute("SELECT id FROM users WHERE username = 'admin'")
        if not await cursor.fetchone():
            admin_pw = os.getenv("ADMIN_PASSWORD", "admin1234")
            hashed = hash_password(admin_pw)
            await db.execute(
                "INSERT INTO users (username, email, hashed_password, is_admin, is_active, display_name, avatar_emoji, created_at, updated_at) "
                "VALUES (?, ?, ?, 1, 1, '관리자', '👨‍💼', ?, ?)",
                ("admin", "admin@patent-app.local", hashed, now, now)
            )
            await db.commit()
            print(f"[INFO] Default admin account created. Username: admin, Password: {admin_pw}")
            print("[WARNING] Please change the admin password immediately!")



async def get_all_projects():
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM projects ORDER BY updated_at DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_project(project_id: int):
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def create_project(title: str, description: str, technology_field: str) -> dict:
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        cursor = await db.execute(
            "INSERT INTO projects (title, description, technology_field, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (title, description, technology_field, "ideation", now, now)
        )
        await db.commit()
        project_id = cursor.lastrowid
        return await get_project(project_id)


async def update_project_status(project_id: int, status: str, progress_field: str = None, progress_value: int = None):
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        if progress_field and progress_value is not None:
            await db.execute(
                f"UPDATE projects SET status = ?, {progress_field} = ?, updated_at = ? WHERE id = ?",
                (status, progress_value, now, project_id)
            )
        else:
            await db.execute(
                "UPDATE projects SET status = ?, updated_at = ? WHERE id = ?",
                (status, now, project_id)
            )
        await db.commit()


async def save_ideation(project_id: int, tech_spec: dict, keywords: list, ipc_codes: list):
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute(
            "INSERT OR REPLACE INTO ideation_results (project_id, tech_spec, keywords, ipc_codes, created_at) VALUES (?, ?, ?, ?, ?)",
            (project_id, json.dumps(tech_spec, ensure_ascii=False), json.dumps(keywords), json.dumps(ipc_codes), now)
        )
        await db.commit()


async def get_ideation(project_id: int):
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM ideation_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
            (project_id,)
        )
        row = await cursor.fetchone()
        if row:
            r = dict(row)
            r['tech_spec'] = json.loads(r['tech_spec'])
            r['keywords'] = json.loads(r['keywords'])
            r['ipc_codes'] = json.loads(r['ipc_codes'])
            return r
        return None


async def save_clearance(project_id: int, results: list, overall_risk: str, avoidance_strategies: list, freedom_to_operate: str):
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute(
            "INSERT OR REPLACE INTO clearance_results (project_id, results, overall_risk, avoidance_strategies, freedom_to_operate, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (project_id, json.dumps(results, ensure_ascii=False), overall_risk, json.dumps(avoidance_strategies, ensure_ascii=False), freedom_to_operate, now)
        )
        await db.commit()


async def get_clearance(project_id: int):
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM clearance_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
            (project_id,)
        )
        row = await cursor.fetchone()
        if row:
            r = dict(row)
            r['results'] = json.loads(r['results'])
            r['avoidance_strategies'] = json.loads(r['avoidance_strategies'])
            return r
        return None


async def save_draft(project_id: int, patent_office: str, draft_content: dict):
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        # Check if draft exists
        cursor = await db.execute("SELECT id FROM drafts WHERE project_id = ?", (project_id,))
        existing = await cursor.fetchone()
        if existing:
            await db.execute(
                "UPDATE drafts SET patent_office = ?, draft_content = ?, updated_at = ? WHERE project_id = ?",
                (patent_office, json.dumps(draft_content, ensure_ascii=False), now, project_id)
            )
        else:
            await db.execute(
                "INSERT INTO drafts (project_id, patent_office, draft_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (project_id, patent_office, json.dumps(draft_content, ensure_ascii=False), now, now)
            )
        await db.commit()


async def get_draft(project_id: int):
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM drafts WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1",
            (project_id,)
        )
        row = await cursor.fetchone()
        if row:
            r = dict(row)
            r['draft_content'] = json.loads(r['draft_content'])
            return r
        return None


async def save_audit(project_id: int, overall_assessment: str, allowability_score: int,
                     issues: list, amended_claims: list, examiner_remarks: str, next_actions: list):
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute(
            "INSERT INTO audit_results (project_id, overall_assessment, allowability_score, issues, amended_claims, examiner_remarks, next_actions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (project_id, overall_assessment, allowability_score,
             json.dumps(issues, ensure_ascii=False), json.dumps(amended_claims, ensure_ascii=False),
             examiner_remarks, json.dumps(next_actions, ensure_ascii=False), now)
        )
        await db.commit()


async def get_audit(project_id: int):
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM audit_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
            (project_id,)
        )
        row = await cursor.fetchone()
        if row:
            r = dict(row)
            r['issues'] = json.loads(r['issues'])
            r['amended_claims'] = json.loads(r['amended_claims'])
            r['next_actions'] = json.loads(r['next_actions'])
            return r
        return None


async def delete_project(project_id: int):
    """Delete a project and all related data."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        for table in ['ideation_results', 'clearance_results', 'drafts',
                      'audit_results', 'research_items', 'analysis_results']:
            await db.execute(f"DELETE FROM {table} WHERE project_id = ?", (project_id,))
        await db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        await db.commit()
    return True


# ── User Profile ──────────────────────────────────────────────────────────
async def get_user_profile() -> dict:
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM user_profile WHERE id = 1")
        row = await cursor.fetchone()
        if row:
            return dict(row)
        # Create default profile
        await db.execute(
            "INSERT INTO user_profile (id, name, title, organization, email, bio, avatar_emoji, updated_at) VALUES (1, '사용자', '자동차 R&D 헤드', '', '', '', '👨‍💼', ?)",
            (now,)
        )
        await db.commit()
        cursor = await db.execute("SELECT * FROM user_profile WHERE id = 1")
        row = await cursor.fetchone()
        return dict(row)


async def update_user_profile(name: str, title: str, organization: str,
                               email: str, bio: str, avatar_emoji: str) -> dict:
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute(
            "INSERT INTO user_profile (id, name, title, organization, email, bio, avatar_emoji, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET name=excluded.name, title=excluded.title, organization=excluded.organization, "
            "email=excluded.email, bio=excluded.bio, avatar_emoji=excluded.avatar_emoji, updated_at=excluded.updated_at",
            (name, title, organization, email, bio, avatar_emoji, now)
        )
        await db.commit()
    return await get_user_profile()


# ── App Settings (API Keys, Preferences) ──────────────────────────────────
API_KEY_FIELDS = {
    "openai_api_key", "anthropic_api_key", "google_api_key", "groq_api_key",
    "perplexity_api_key", "tavily_api_key", "serper_api_key", "exa_api_key",
    "kipris_api_key", "patsnap_api_key", "lens_api_key",
}


async def get_all_settings() -> dict:
    """Get all settings, decrypting API keys for internal use."""
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT key, value FROM app_settings")
        rows = await cursor.fetchall()
        result = {}
        for r in rows:
            k, v = r['key'], r['value']
            # Decrypt API keys transparently
            if k in API_KEY_FIELDS and v:
                result[k] = decrypt_value(v)
            else:
                result[k] = v
        return result


async def get_settings_status() -> dict:
    """Get is_set booleans only (safe to send to frontend)."""
    raw = await get_all_settings()
    status = {}
    for k, v in raw.items():
        if k in API_KEY_FIELDS:
            status[f"{k}_is_set"] = bool(v)
        else:
            status[k] = v
    return status


async def set_setting(key: str, value: str):
    now = datetime.utcnow().isoformat()
    # Encrypt API keys before storage
    stored_value = encrypt_value(value) if key in API_KEY_FIELDS and value else value
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
            (key, stored_value, now)
        )
        await db.commit()


async def set_settings_bulk(settings: dict):
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        for key, value in settings.items():
            stored_value = encrypt_value(str(value)) if key in API_KEY_FIELDS and value else str(value)
            await db.execute(
                "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
                (key, stored_value, now)
            )
        await db.commit()


# ── Research Items ─────────────────────────────────────────────────────────
async def save_research_item(project_id: int, source_type: str, source_name: str,
                              title: str, content: str, url: str = '', relevance_score: float = 0.0):
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        cursor = await db.execute(
            "INSERT INTO research_items (project_id, source_type, source_name, title, content, url, relevance_score, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (project_id, source_type, source_name, title, content, url, relevance_score, now)
        )
        await db.commit()
        return cursor.lastrowid


async def get_research_items(project_id: int) -> list:
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM research_items WHERE project_id = ? ORDER BY relevance_score DESC, created_at DESC",
            (project_id,)
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def delete_research_items(project_id: int):
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute("DELETE FROM research_items WHERE project_id = ?", (project_id,))
        await db.commit()


# ── Analysis Results ────────────────────────────────────────────────────────
async def save_analysis(project_id: int, analysis_type: str, llm_model: str,
                         summary: str, key_findings: list, opportunities: list,
                         risks: list, recommendations: list, raw_content: str):
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        cursor = await db.execute(
            "INSERT INTO analysis_results (project_id, analysis_type, llm_model, summary, key_findings, "
            "opportunities, risks, recommendations, raw_content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (project_id, analysis_type, llm_model, summary,
             json.dumps(key_findings, ensure_ascii=False),
             json.dumps(opportunities, ensure_ascii=False),
             json.dumps(risks, ensure_ascii=False),
             json.dumps(recommendations, ensure_ascii=False),
             raw_content, now)
        )
        await db.commit()
        return cursor.lastrowid


async def get_analysis(project_id: int) -> list:
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM analysis_results WHERE project_id = ? ORDER BY created_at DESC",
            (project_id,)
        )
        rows = await cursor.fetchall()
        result = []
        for r in rows:
            item = dict(r)
            item['key_findings'] = json.loads(item['key_findings'])
            item['opportunities'] = json.loads(item['opportunities'])
            item['risks'] = json.loads(item['risks'])
            item['recommendations'] = json.loads(item['recommendations'])
            result.append(item)
        return result


# ── User Management ─────────────────────────────────────────────────────────
async def get_user_by_username(username: str) -> dict | None:
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_user_by_id(user_id: int) -> dict | None:
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_all_users() -> list:
    async with aiosqlite.connect(DATABASE_URL) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id, username, email, is_admin, is_active, display_name, avatar_emoji, created_at, updated_at FROM users ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def create_user(username: str, email: str, password: str, is_admin: bool = False, display_name: str = "", avatar_emoji: str = "👤") -> dict:
    now = datetime.utcnow().isoformat()
    hashed = hash_password(password)
    async with aiosqlite.connect(DATABASE_URL) as db:
        cursor = await db.execute(
            "INSERT INTO users (username, email, hashed_password, is_admin, is_active, display_name, avatar_emoji, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)",
            (username, email, hashed, int(is_admin), display_name or username, avatar_emoji, now, now)
        )
        await db.commit()
        return await get_user_by_id(cursor.lastrowid)


async def toggle_user_active(user_id: int) -> dict | None:
    user = await get_user_by_id(user_id)
    if not user:
        return None
    new_active = 0 if user["is_active"] else 1
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute("UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?", (new_active, now, user_id))
        await db.commit()
    return await get_user_by_id(user_id)


async def update_user_password(user_id: int, new_password: str) -> bool:
    now = datetime.utcnow().isoformat()
    hashed = hash_password(new_password)
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute("UPDATE users SET hashed_password = ?, updated_at = ? WHERE id = ?", (hashed, now, user_id))
        await db.commit()
    return True


async def delete_user(user_id: int) -> bool:
    async with aiosqlite.connect(DATABASE_URL) as db:
        await db.execute("DELETE FROM user_sessions WHERE user_id = ?", (user_id,))
        await db.execute("DELETE FROM users WHERE id = ? AND is_admin = 0", (user_id,))
        await db.commit()
    return True
