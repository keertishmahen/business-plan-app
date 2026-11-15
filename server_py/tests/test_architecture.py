"""Harness rules for backend layering. See docs/ARCHITECTURE.md.

Each failure message names the rule and how to fix it, so a coding agent can
act on it directly.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "app"
GEMINI_CLIENT = APP / "services" / "gemini_client.py"
CONFIG = APP / "config.py"


def _modules() -> list[Path]:
    return sorted(p for p in APP.rglob("*.py") if "__pycache__" not in p.parts)


def _rel(path: Path) -> str:
    return path.relative_to(APP.parent).as_posix()


def _imports(path: Path) -> list[tuple[int, str]]:
    """(line, dotted module) for every import, resolving relative imports."""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    package = path.relative_to(APP.parent).with_suffix("").parts[:-1]
    found = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found += [(node.lineno, alias.name) for alias in node.names]
        elif isinstance(node, ast.ImportFrom):
            base = list(package[: len(package) - node.level + 1]) if node.level else []
            module = ".".join(base + ([node.module] if node.module else []))
            found.append((node.lineno, module))
            found += [(node.lineno, f"{module}.{alias.name}") for alias in node.names]
    return found


def _fail(rule: str, hits: list[str], fix: str) -> None:
    raise AssertionError(f"{rule}:\n  " + "\n  ".join(hits) + f"\n\nFix: {fix}")


def test_only_gemini_client_makes_http_calls():
    hits = [
        f"{_rel(p)}:{line}  import {mod}"
        for p in _modules()
        if p != GEMINI_CLIENT
        for line, mod in _imports(p)
        if mod == "httpx" or mod.startswith("httpx.") or mod in ("requests", "urllib.request")
    ]
    if hits:
        _fail(
            "HTTP client imported outside app/services/gemini_client.py",
            hits,
            "add the call to app/services/gemini_client.py (it owns auth headers, timeouts, "
            "retries and keeps the API key out of logs) and import that function instead.",
        )


def test_services_and_agents_do_not_import_routers():
    hits = [
        f"{_rel(p)}:{line}  import {mod}"
        for p in _modules()
        if p.parent.name in ("services", "agents")
        for line, mod in _imports(p)
        if mod.startswith("app.routers")
    ]
    if hits:
        _fail(
            "Lower layer importing the HTTP layer",
            hits,
            "routers depend on services/agents, never the reverse. Move the shared logic into "
            "app/services/ and call it from the router.",
        )


def test_environment_is_read_only_in_config():
    hits = []
    for p in _modules():
        if p == CONFIG:
            continue
        for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
            if re.search(r"\bos\.(getenv|environ)\b", line):
                hits.append(f"{_rel(p)}:{i}  {line.strip()}")
    if hits:
        _fail(
            "Environment variable read outside app/config.py",
            hits,
            "add the setting to app/config.py with a safe default and import the constant.",
        )


def test_api_key_never_goes_in_a_url():
    hits = []
    for p in _modules():
        for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
            code = line.split("#", 1)[0]
            if re.search(r"[?&]key=", code):
                hits.append(f"{_rel(p)}:{i}  {line.strip()}")
    if hits:
        _fail(
            "API key placed in a URL query string",
            hits,
            "send it as the x-goog-api-key header via gemini_client._auth_headers(); URLs end up "
            "in access logs.",
        )
