"""Small SETSPF public-content CMS server using only the Python standard library.

Run with SETSPF_ADMIN_EMAIL and SETSPF_ADMIN_PASSWORD set for the first launch.
This manages public website content only; it must not store member records.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import threading
import time
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "cms.sqlite3"
SESSION_SECONDS = 8 * 60 * 60
SESSION_IDLE_SECONDS = 60 * 60
MAX_REQUEST_BYTES = 1_000_000
MAX_FIELD_LENGTHS = {
    "email": 254,
    "name": 120,
    "password": 256,
    "type": 30,
    "title": 180,
    "slug": 120,
    "summary": 500,
    "body": 100_000,
}
CONTENT_TYPES = {"news", "faq", "document", "trustee", "provider", "page"}
ADMIN_TRANSITIONS = {
    "draft": {"draft", "review", "published", "archived"},
    "review": {"review", "approved", "published", "archived"},
    "approved": {"approved", "published", "archived"},
    "published": {"published", "archived"},
    "archived": {"archived"},
}
TRUSTEE_TRANSITIONS = {"review": {"review", "approved"}}
PUBLIC_EXTENSIONS = {
    ".css",
    ".gif",
    ".html",
    ".ico",
    ".jpg",
    ".jpeg",
    ".js",
    ".pdf",
    ".png",
    ".svg",
    ".webp",
}
PUBLIC_ROOT_FILES = {"index.html"}
ADMIN_FILES = {
    "admin/admin.css",
    "admin/admin.js",
    "admin/index.html",
}
FAILED_LOGIN_LIMIT = 5
FAILED_LOGIN_WINDOW_SECONDS = 15 * 60
FAILED_LOGIN_DELAY_SECONDS = 0.35
LOGIN_ATTEMPTS: dict[str, list[float]] = {}
LOGIN_LOCK = threading.Lock()


def db():
    DB_PATH.parent.mkdir(exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys=ON")
    connection.execute("PRAGMA busy_timeout=5000")
    return connection


def password_hash(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    result = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}:{result.hex()}"


DUMMY_PASSWORD_HASH = password_hash("setspf-invalid-login-dummy")


def password_valid(password: str, stored: str) -> bool:
    try:
        salt_hex, expected = stored.split(":", 1)
        candidate = password_hash(password, bytes.fromhex(salt_hex)).split(":", 1)[1]
        return hmac.compare_digest(candidate, expected)
    except (ValueError, TypeError):
        return False


def setup_database():
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
              role TEXT NOT NULL CHECK(role IN ('admin','trustee')), password_hash TEXT NOT NULL,
              active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
              token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS content_items (
              id INTEGER PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, slug TEXT NOT NULL,
              summary TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', metadata TEXT NOT NULL DEFAULT '{}',
              status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','review','approved','published','archived')),
              author_id INTEGER NOT NULL REFERENCES users(id), updated_by INTEGER NOT NULL REFERENCES users(id),
              created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, published_at INTEGER,
              UNIQUE(type, slug)
            );
            CREATE TABLE IF NOT EXISTS audit_log (
              id INTEGER PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action TEXT NOT NULL,
              entity_type TEXT NOT NULL, entity_id INTEGER, detail TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS content_type_status ON content_items(type,status,updated_at);
            CREATE INDEX IF NOT EXISTS audit_created ON audit_log(created_at);
            """
        )
        session_columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(sessions)").fetchall()
        }
        if "last_seen_at" not in session_columns:
            conn.execute(
                "ALTER TABLE sessions ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0"
            )
            conn.execute("UPDATE sessions SET last_seen_at=expires_at")
        if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
            email = os.environ.get("SETSPF_ADMIN_EMAIL", "").strip().lower()
            password = os.environ.get("SETSPF_ADMIN_PASSWORD", "")
            if email and len(password) >= 12:
                conn.execute(
                    "INSERT INTO users(email,name,role,password_hash,created_at) VALUES(?,?,?,?,?)",
                    (
                        email,
                        "SETSPF Administrator",
                        "admin",
                        password_hash(password),
                        int(time.time()),
                    ),
                )


def public_relative_path(path: str) -> str | None:
    decoded = unquote(path).replace("\\", "/")
    relative = decoded.lstrip("/")
    if relative in {"", "admin", "admin/"}:
        return "admin/index.html" if relative.startswith("admin") else "index.html"
    parts = Path(relative).parts
    if any(part in {"", ".", ".."} or part.startswith(".") for part in parts):
        return None
    if any(part in {"data", "tmp", "__pycache__", ".vscode", ".agents"} for part in parts):
        return None
    normalized = "/".join(parts)
    if normalized in ADMIN_FILES or normalized in PUBLIC_ROOT_FILES:
        return normalized
    if Path(normalized).suffix.lower() not in PUBLIC_EXTENSIONS:
        return None
    return normalized


class CMSHandler(SimpleHTTPRequestHandler):
    server_version = "SETSPF"
    sys_version = ""

    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def log_message(self, format, *args):
        return

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; "
            "font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; "
            "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        )
        if os.environ.get("SETSPF_HTTPS") == "1":
            self.send_header("Strict-Transport-Security", "max-age=31536000")
        super().end_headers()

    def send_json(self, status, payload, extra_headers=None):
        body = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            return None
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            return None
        if length < 1 or length > MAX_REQUEST_BYTES:
            return None
        try:
            payload = json.loads(self.rfile.read(length))
        except (OSError, json.JSONDecodeError):
            return None
        return payload if isinstance(payload, dict) else None

    def client_key(self):
        return self.client_address[0]

    def login_throttled(self):
        now = time.time()
        with LOGIN_LOCK:
            attempts = [
                timestamp
                for timestamp in LOGIN_ATTEMPTS.get(self.client_key(), [])
                if now - timestamp < FAILED_LOGIN_WINDOW_SECONDS
            ]
            LOGIN_ATTEMPTS[self.client_key()] = attempts
            return len(attempts) >= FAILED_LOGIN_LIMIT

    def record_failed_login(self):
        with LOGIN_LOCK:
            LOGIN_ATTEMPTS.setdefault(self.client_key(), []).append(time.time())

    def audit(self, actor_id, action, entity_type, entity_id=None, detail=None):
        with db() as conn:
            conn.execute(
                "INSERT INTO audit_log(actor_id,action,entity_type,entity_id,detail,created_at) VALUES(?,?,?,?,?,?)",
                (
                    actor_id,
                    action,
                    entity_type,
                    entity_id,
                    json.dumps(detail or {}),
                    int(time.time()),
                ),
            )

    def session(self):
        jar = cookies.SimpleCookie(self.headers.get("Cookie", ""))
        morsel = jar.get("setspf_cms") or jar.get("__Host-setspf_cms")
        if not morsel:
            return None
        token_hash = hashlib.sha256(morsel.value.encode()).hexdigest()
        now = int(time.time())
        with db() as conn:
            row = conn.execute(
                "SELECT s.csrf_token,s.expires_at,s.last_seen_at,u.id,u.email,u.name,u.role,u.active "
                "FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?",
                (token_hash,),
            ).fetchone()
            if not row or not row["active"] or row["expires_at"] < now:
                return None
            if now - row["last_seen_at"] > SESSION_IDLE_SECONDS:
                conn.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash,))
                return None
            conn.execute(
                "UPDATE sessions SET last_seen_at=? WHERE token_hash=?",
                (now, token_hash),
            )
            return dict(row)

    def require_session(self, write=False):
        user = self.session()
        if not user:
            self.send_json(401, {"error": "Sign in required"})
            return None
        if write and not hmac.compare_digest(
            self.headers.get("X-CSRF-Token", ""), user["csrf_token"]
        ):
            self.audit(user["id"], "csrf_failure", "session")
            self.send_json(403, {"error": "Security token expired. Refresh and try again."})
            return None
        return user

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/auth/me":
            user = self.require_session()
            if user:
                self.send_json(
                    200,
                    {
                        "user": {key: user[key] for key in ("id", "email", "name", "role")},
                        "csrf": user["csrf_token"],
                    },
                )
            return
        if path == "/api/content":
            user = self.require_session()
            if not user:
                return
            with db() as conn:
                rows = conn.execute(
                    "SELECT c.*,u.name author_name FROM content_items c "
                    "JOIN users u ON u.id=c.author_id ORDER BY c.updated_at DESC"
                ).fetchall()
            self.send_json(200, {"items": [dict(row) for row in rows]})
            return
        if path == "/api/public/content":
            with db() as conn:
                rows = conn.execute(
                    "SELECT id,type,title,slug,summary,body,metadata,published_at,updated_at "
                    "FROM content_items WHERE status='published' ORDER BY published_at DESC"
                ).fetchall()
            self.send_json(200, {"items": [dict(row) for row in rows]})
            return
        if path == "/api/audit":
            user = self.require_session()
            if not user:
                return
            if user["role"] != "admin":
                self.audit(user["id"], "authorization_failure", "audit")
                self.send_json(403, {"error": "Administrator access required"})
                return
            with db() as conn:
                rows = conn.execute(
                    "SELECT a.*,u.name actor_name FROM audit_log a "
                    "LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 200"
                ).fetchall()
            self.send_json(200, {"items": [dict(row) for row in rows]})
            return
        if path == "/api/users":
            user = self.require_session()
            if not user:
                return
            if user["role"] != "admin":
                self.audit(user["id"], "authorization_failure", "users")
                self.send_json(403, {"error": "Administrator access required"})
                return
            with db() as conn:
                rows = conn.execute(
                    "SELECT id,email,name,role,active,created_at FROM users ORDER BY name"
                ).fetchall()
            self.send_json(200, {"items": [dict(row) for row in rows]})
            return
        if path == "/admin":
            self.send_response(302)
            self.send_header("Location", "/admin/")
            self.end_headers()
            return
        if public_relative_path(path):
            super().do_GET()
            return
        self.send_error(404, "Not found")

    def unsupported_method(self):
        self.send_json(405, {"error": "Method not allowed"}, {"Allow": "GET, HEAD, POST"})

    do_PUT = unsupported_method
    do_PATCH = unsupported_method
    do_DELETE = unsupported_method
    do_OPTIONS = unsupported_method

    def do_POST(self):
        path = urlparse(self.path).path
        payload = self.read_json()
        if payload is None:
            self.send_json(400, {"error": "Invalid JSON request"})
            return

        if path == "/api/auth/login":
            email = payload.get("email")
            password = payload.get("password")
            if (
                not isinstance(email, str)
                or not isinstance(password, str)
                or not email
                or len(email) > MAX_FIELD_LENGTHS["email"]
                or not password
                or len(password) > MAX_FIELD_LENGTHS["password"]
            ):
                self.send_json(400, {"error": "Email and password are required"})
                return
            email = email.strip().lower()
            throttled = self.login_throttled()
            with db() as conn:
                user = conn.execute(
                    "SELECT * FROM users WHERE email=? AND active=1", (email,)
                ).fetchone()
            valid = password_valid(password, user["password_hash"] if user else DUMMY_PASSWORD_HASH)
            if throttled or not user or not valid:
                self.record_failed_login()
                self.audit(None, "failed_login", "session", detail={"reason": "invalid_credentials"})
                time.sleep(FAILED_LOGIN_DELAY_SECONDS)
                self.send_json(429 if throttled else 401, {"error": "Email or password is incorrect"})
                return
            token = secrets.token_urlsafe(32)
            csrf = secrets.token_urlsafe(24)
            now = int(time.time())
            with db() as conn:
                conn.execute("DELETE FROM sessions WHERE expires_at<?", (now,))
                conn.execute(
                    "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at,last_seen_at) VALUES(?,?,?,?,?)",
                    (hashlib.sha256(token.encode()).hexdigest(), user["id"], csrf, now + SESSION_SECONDS, now),
                )
            self.audit(user["id"], "login", "session")
            secure = os.environ.get("SETSPF_HTTPS") == "1"
            cookie_name = "__Host-setspf_cms" if secure else "setspf_cms"
            secure_attribute = "; Secure" if secure else ""
            self.send_json(
                200,
                {"ok": True},
                {
                    "Set-Cookie": (
                        f"{cookie_name}={token}; Path=/; HttpOnly; SameSite=Strict; "
                        f"Max-Age={SESSION_SECONDS}{secure_attribute}"
                    )
                },
            )
            return

        if path == "/api/auth/logout":
            user = self.require_session(write=True)
            if not user:
                return
            jar = cookies.SimpleCookie(self.headers.get("Cookie", ""))
            morsel = jar.get("setspf_cms") or jar.get("__Host-setspf_cms")
            if morsel:
                token_hash = hashlib.sha256(morsel.value.encode()).hexdigest()
                with db() as conn:
                    conn.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash,))
            self.audit(user["id"], "logout", "session")
            cookie_name = "__Host-setspf_cms" if os.environ.get("SETSPF_HTTPS") == "1" else "setspf_cms"
            secure_attribute = "; Secure" if cookie_name.startswith("__Host-") else ""
            self.send_json(
                200,
                {"ok": True},
                {
                    "Set-Cookie": (
                        f"{cookie_name}=; Path=/; HttpOnly; SameSite=Strict; "
                        f"Max-Age=0{secure_attribute}"
                    )
                },
            )
            return

        if path == "/api/content":
            user = self.require_session(write=True)
            if not user:
                return
            fields = {
                key: payload.get(key, "")
                for key in ("type", "title", "slug", "summary", "body")
            }
            metadata = payload.get("metadata", {})
            if (
                not all(isinstance(value, str) for value in fields.values())
                or not fields["type"].strip() in CONTENT_TYPES
                or not fields["title"].strip()
                or not fields["slug"].strip().replace("-", "").isalnum()
                or any(
                    len(fields[key]) > MAX_FIELD_LENGTHS[key]
                    for key in ("title", "slug", "summary", "body")
                )
                or not isinstance(metadata, dict)
            ):
                self.send_json(400, {"error": "Content fields are invalid or too long"})
                return
            kind = fields["type"].strip()
            title = fields["title"].strip()
            slug = fields["slug"].strip().lower()
            summary = fields["summary"].strip()
            body = fields["body"].strip()
            now = int(time.time())
            requested_status = payload.get("status", "draft")
            status = "review" if user["role"] == "trustee" else requested_status
            if not isinstance(status, str):
                self.send_json(400, {"error": "Invalid content status"})
                return
            if status not in {"draft", "review", "published"}:
                self.send_json(400, {"error": "Invalid content status"})
                return
            published = now if status == "published" else None
            try:
                with db() as conn:
                    cur = conn.execute(
                        "INSERT INTO content_items(type,title,slug,summary,body,metadata,status,author_id,updated_by,created_at,updated_at,published_at) "
                        "VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                        (kind, title, slug, summary, body, json.dumps(metadata), status, user["id"], user["id"], now, now, published),
                    )
                self.audit(user["id"], "create", "content", cur.lastrowid, {"status": status, "type": kind})
                self.send_json(201, {"ok": True, "id": cur.lastrowid})
            except sqlite3.IntegrityError:
                self.send_json(409, {"error": "That content address already exists"})
            return

        if path == "/api/users":
            user = self.require_session(write=True)
            if not user:
                return
            if user["role"] != "admin":
                self.audit(user["id"], "authorization_failure", "users")
                self.send_json(403, {"error": "Administrator access required"})
                return
            email = payload.get("email")
            name = payload.get("name")
            role = payload.get("role", "trustee")
            password = payload.get("password")
            if (
                not all(isinstance(value, str) for value in (email, name, role, password))
                or not email
                or "@" not in email
                or len(email) > MAX_FIELD_LENGTHS["email"]
                or not name
                or len(name) > MAX_FIELD_LENGTHS["name"]
                or role not in {"admin", "trustee"}
                or len(password) < 12
                or len(password) > MAX_FIELD_LENGTHS["password"]
            ):
                self.send_json(400, {"error": "Name, valid email, role and a password of at least 12 characters are required"})
                return
            email = email.strip().lower()
            name = name.strip()
            role = role.strip()
            now = int(time.time())
            try:
                with db() as conn:
                    cur = conn.execute(
                        "INSERT INTO users(email,name,role,password_hash,created_at) VALUES(?,?,?,?,?)",
                        (email, name, role, password_hash(password), now),
                    )
                self.audit(user["id"], "account_create", "user", cur.lastrowid, {"role": role})
                self.send_json(201, {"ok": True, "id": cur.lastrowid})
            except sqlite3.IntegrityError:
                self.send_json(409, {"error": "An account already uses that email"})
            return

        if path.startswith("/api/content/") and path.endswith("/status"):
            user = self.require_session(write=True)
            if not user:
                return
            try:
                item_id = int(path.split("/")[3])
            except (IndexError, ValueError):
                self.send_json(404, {"error": "Not found"})
                return
            status = payload.get("status", "")
            if not isinstance(status, str):
                self.send_json(400, {"error": "Invalid content status"})
                return
            allowed = {
                "admin": {"draft", "review", "approved", "published", "archived"},
                "trustee": {"review", "approved"},
            }[user["role"]]
            if status not in allowed:
                self.send_json(403, {"error": "Your role cannot apply that status"})
                return
            now = int(time.time())
            published = now if status == "published" else None
            with db() as conn:
                row = conn.execute(
                    "SELECT status,author_id FROM content_items WHERE id=?", (item_id,)
                ).fetchone()
                if not row:
                    self.send_json(404, {"error": "Not found"})
                    return
                transitions = (
                    TRUSTEE_TRANSITIONS
                    if user["role"] == "trustee"
                    else ADMIN_TRANSITIONS
                )
                if status not in transitions.get(row["status"], set()):
                    self.send_json(409, {"error": "Invalid content status transition"})
                    return
                cur = conn.execute(
                    "UPDATE content_items SET status=?,updated_by=?,updated_at=?,published_at=COALESCE(?,published_at) WHERE id=?",
                    (status, user["id"], now, published, item_id),
                )
            if cur.rowcount != 1:
                self.send_json(409, {"error": "Content was not updated"})
                return
            self.audit(user["id"], "status_change", "content", item_id, {"status": status})
            self.send_json(200, {"ok": True})
            return

        self.send_json(404, {"error": "Not found"})

    def translate_path(self, path):
        relative = public_relative_path(urlparse(path).path)
        if not relative:
            return str(ROOT / "__blocked_public_file__")
        target = (ROOT / relative).resolve()
        if ROOT not in target.parents and target != ROOT:
            return str(ROOT / "__blocked_public_file__")
        return str(target)


if __name__ == "__main__":
    setup_database()
    port = int(os.environ.get("PORT", "8080"))
    print(f"SETSPF CMS available at http://127.0.0.1:{port}/admin/")
    ThreadingHTTPServer(("127.0.0.1", port), CMSHandler).serve_forever()
