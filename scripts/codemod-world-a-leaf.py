#!/usr/bin/env python3
"""Convert leaf classic frame lets to World A (no nested let/if/children in body)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

KIND_TO_CTOR = {"text": "Text", "layout": "Layout", "icon": "Icon", "media": "Media"}

# let Name: kind = { ... }  — props and optional children = [ids], no nested let/if
LEAF_RE = re.compile(
    r"^([ \t]*)let\s+(\w+)\s*:\s*(text|layout|icon|media)\s*=\s*\{\n"
    r"((?:[ \t]+[^\n]+\n)+?)"
    r"\1\}",
    re.MULTILINE,
)


def body_to_kwargs(body: str) -> str | None:
    lines = [ln.strip() for ln in body.strip().splitlines() if ln.strip()]
    kwargs: list[str] = []
    for ln in lines:
        if ln.startswith("let ") or ln.startswith("if ") or ln.startswith("else"):
            return None
        if " = " not in ln:
            return None
        lhs, val = ln.split(" = ", 1)
        if "." in lhs:  # FrameId.prop / self.prop
            return None
        if lhs == "children":
            kwargs.append(f"children: {val}")
            continue
        if not re.fullmatch(r"\w+", lhs):
            return None
        kwargs.append(f"{lhs}: {val}")
    return ", ".join(kwargs)


def format_ctor(indent: str, name: str, kind: str, kwargs: str) -> str:
    ctor = KIND_TO_CTOR[kind]
    if len(kwargs) < 70 and "\n" not in kwargs:
        return f"{indent}let {name} = {ctor}({kwargs})"
    parts = [p.strip() for p in kwargs.split(", ")]
    inner = ",\n".join(f"{indent}  {p}" for p in parts)
    return f"{indent}let {name} = {ctor}(\n{inner}\n{indent})"


def convert(src: str) -> str:
    def repl(m: re.Match[str]) -> str:
        indent, name, kind, body = m.group(1), m.group(2), m.group(3), m.group(4)
        kwargs = body_to_kwargs(body)
        if kwargs is None:
            return m.group(0)
        return format_ctor(indent, name, kind, kwargs)

    prev = None
    out = src
    # nested outer layouts may become convertible after inner leaves convert
    while prev != out:
        prev = out
        out = LEAF_RE.sub(repl, out)
    return out


def main() -> None:
    roots = [Path(p) for p in sys.argv[1:]] or [Path("test-fixtures/pdl")]
    n = 0
    for root in roots:
        files = root.rglob("*.pdl") if root.is_dir() else [root]
        for path in files:
            if "errors" in path.parts:
                continue
            text = path.read_text()
            out = convert(text)
            if out != text:
                path.write_text(out)
                n += 1
                print("rewrote", path)
    print(f"done: {n} files")


if __name__ == "__main__":
    main()
