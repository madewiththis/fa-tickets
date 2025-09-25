from __future__ import annotations

import os
import re

BASE_DIR = os.path.join(os.path.dirname(__file__), 'templates')

_VAR_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")


def _render_str(tpl: str, ctx: dict) -> str:
    def repl(m: re.Match) -> str:
        key = m.group(1)
        return str(ctx.get(key, ''))
    return _VAR_RE.sub(repl, tpl)


def render(template_code: str, context: dict) -> tuple[str, str, str | None]:
    subject_path = os.path.join(BASE_DIR, f"{template_code}.subject.j2")
    text_path = os.path.join(BASE_DIR, f"{template_code}.txt.j2")
    html_path = os.path.join(BASE_DIR, f"{template_code}.html.j2")
    with open(subject_path, 'r', encoding='utf-8') as f:
        subject_tpl = f.read()
    with open(text_path, 'r', encoding='utf-8') as f:
        text_tpl = f.read()
    html_tpl = None
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            html_tpl = f.read()
    subject = _render_str(subject_tpl, context)
    text = _render_str(text_tpl, context)
    html = _render_str(html_tpl, context) if html_tpl else None
    return subject, text, html

