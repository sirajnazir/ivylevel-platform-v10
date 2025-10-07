#!/usr/bin/env python3
"""
Tolerant JSON loader that auto-repairs most LLM artifacts
v5.3 - Enhanced with embedded JSON extraction + DOCX recovery
"""

import json
import re
import codecs
from typing import Any, Tuple
from utils_docx_extract import try_extract_docx_from_strings

JSON_TRUE_FALSE_NONE = [
    (r'\bTrue\b', 'true'),
    (r'\bFalse\b', 'false'),
    (r'\bNone\b', 'null')
]

def _strip_bom(text: str) -> str:
    """Remove UTF-8 BOM if present"""
    return text.lstrip(codecs.BOM_UTF8.decode('utf-8'))

def _remove_js_comments(text: str) -> str:
    """Remove // line comments and /* ... */ blocks"""
    text = re.sub(r'//.*?$', '', text, flags=re.MULTILINE)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    return text

def _fix_trailing_commas(text: str) -> str:
    """Fix trailing commas: ,] → ] and ,} → }"""
    return re.sub(r',\s*([\]\}])', r'\1', text)

def _fix_missing_values(text: str) -> str:
    """Fix missing values: "key": , → "key": null,"""
    text = re.sub(r'(\"[^\"]+\"\s*:\s*)(,|\}|\])', r'\1 null\2', text)
    return text

def _quote_unquoted_keys(text: str) -> str:
    """Convert {key: value} → {"key": value} (conservatively)"""
    def repl(m):
        return f'"{m.group(1)}": '
    return re.sub(r'(?<=\{|,)\s*([A-Za-z_][A-Za-z0-9_\-]*)\s*:\s', repl, text)

def _normalize_true_false_none(text: str) -> str:
    """Convert Python True/False/None to JSON true/false/null"""
    for pat, rep in JSON_TRUE_FALSE_NONE:
        text = re.sub(pat, rep, text)
    return text

def _single_to_double_quotes(text: str) -> str:
    """Best-effort: convert single quotes to double quotes for JSON-like strings"""
    # Conservative: replace only 'word' keys/values
    return re.sub(r"\'([A-Za-z0-9_\- ][^']*)\'", r'"\1"', text)

def _balance_brackets(text: str) -> str:
    """If clearly array fragments, wrap in {}"""
    t = text.strip()
    if t.startswith('[') and t.endswith(']'):
        return '{"items": ' + t + '}'
    return t

def _extract_embedded_json(text: str) -> str:
    """
    If the file is a note/email/markdown with an embedded JSON block,
    extract the largest balanced {...} or [...] region.
    """
    stack = []
    best = None
    for i, ch in enumerate(text):
        if ch in '{[':
            stack.append((ch, i))
        elif ch in '}]' and stack:
            open_ch, start = stack.pop()
            if (open_ch == '{' and ch == '}') or (open_ch == '[' and ch == ']'):
                cand = text[start:i+1]
                if not best or len(cand) > len(best):
                    best = cand
    return best or text  # fallback to original

def try_load_json(text: str) -> Tuple[Any, str]:
    """
    Try multiple strategies to load JSON, returning (obj, 'strategy_name')
    Raises last error if all strategies fail
    """
    last_err = None

    # Strategy A: raw
    try:
        payload = json.loads(text)
        _attach_embedded_docx_text(payload)
        return payload, 'raw'
    except Exception as e:
        last_err = e

    # Strategy B: embedded block
    try:
        blk = _extract_embedded_json(text)
        payload = json.loads(blk)
        _attach_embedded_docx_text(payload)
        return payload, 'embedded'
    except Exception as e:
        last_err = e

    # Strategy C: cleaned/normalized
    try:
        s = text
        s = _strip_bom(s)
        s = _remove_js_comments(s)
        s = _normalize_true_false_none(s)
        s = _single_to_double_quotes(s)
        s = _fix_missing_values(s)
        s = _fix_trailing_commas(s)
        s = _quote_unquoted_keys(s)
        s = _balance_brackets(s)
        payload = json.loads(s)
        _attach_embedded_docx_text(payload)
        return payload, 'repaired'
    except Exception as e:
        last_err = e

    # Strategy D: JSON lines (many separate JSON objects)
    try:
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        if len(lines) > 1 and all(ln.startswith('{') and ln.endswith('}') for ln in lines):
            as_list = '[' + ','.join(lines) + ']'
            payload = {"items": json.loads(as_list)}
            _attach_embedded_docx_text(payload)
            return payload, 'json_lines'
    except Exception as e:
        last_err = e

    raise last_err

def _attach_embedded_docx_text(payload: Any) -> None:
    """
    If payload contains 'text'/'segments' with embedded DOCX bytes in string form,
    extract plain text to payload['embedded_docx_text'] for downstream adapters.
    """
    try:
        if isinstance(payload, dict):
            strs = []
            txt = payload.get("text")
            if isinstance(txt, str):
                strs.append(txt)
            segs = payload.get("segments")
            if isinstance(segs, list):
                for s in segs:
                    if isinstance(s, str):
                        strs.append(s)
            if strs:
                plain, strat = try_extract_docx_from_strings(strs)
                if plain:
                    payload["embedded_docx_text"] = plain
                    payload["embedded_docx_strategy"] = strat
        elif isinstance(payload, list):
            # scan each item shallowly
            for it in payload:
                if isinstance(it, dict):
                    _attach_embedded_docx_text(it)
    except Exception:
        pass
