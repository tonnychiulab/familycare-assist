#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ProjectHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.i18n_keys: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if name == "id" and value:
                self.ids.append(value)
            if name in {"data-i18n", "data-i18n-placeholder", "data-i18n-aria-label"} and value:
                self.i18n_keys.add(value)


def main() -> int:
    errors: list[str] = []

    json_files = list(ROOT.rglob("*.json"))
    for path in json_files:
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"Invalid JSON: {path.relative_to(ROOT)}: {exc}")

    parser = ProjectHTMLParser()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    duplicates = [item for item, count in Counter(parser.ids).items() if count > 1]
    if duplicates:
        errors.append(f"Duplicate HTML IDs: {duplicates}")

    literal_keys = set(parser.i18n_keys)
    for path in (ROOT / "scripts").glob("*.js"):
        text = path.read_text(encoding="utf-8")
        literal_keys.update(re.findall(r'I18n\.t\(["\']([^"\']+)["\']', text))

    for locale_dir in (ROOT / "locales").iterdir():
        if not locale_dir.is_dir():
            continue
        namespaces = {
            file.stem: json.loads(file.read_text(encoding="utf-8"))
            for file in locale_dir.glob("*.json")
        }
        namespaces["system"] = namespaces.get("system-messages", {})
        for key in sorted(literal_keys):
            namespace, _, item = key.partition(".")
            if namespace not in namespaces or item not in namespaces[namespace]:
                errors.append(f"Missing i18n key [{locale_dir.name}]: {key}")

    index_text = (ROOT / "index.html").read_text(encoding="utf-8")
    script_refs = set(re.findall(r'<script src="([^"]+)"', index_text))
    for ref in script_refs:
        if not (ROOT / ref).exists():
            errors.append(f"Missing script referenced by index.html: {ref}")

    if "innerHTML" in "\n".join(path.read_text(encoding="utf-8") for path in (ROOT / "scripts").glob("*.js")):
        errors.append("innerHTML found in application scripts; review injection risk.")

    if errors:
        print("PROJECT CHECK FAILED")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"PROJECT CHECK OK: {len(json_files)} JSON files, {len(literal_keys)} i18n keys, {len(parser.ids)} HTML IDs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
