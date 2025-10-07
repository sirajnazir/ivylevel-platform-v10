#!/usr/bin/env python3
# tools/ingest/utils_docx_extract.py
import io, zipfile, re

XML_TAG = re.compile(rb'<[^>]+>')

def maybe_extract_docx_from_textish(blob: str) -> str | None:
    """Detects ZIP/DOCX bytes stuffed into a unicode string and extracts plain text."""
    if not blob:
        return None
    try:
        raw = blob.encode('latin-1', errors='ignore')
        if not raw.startswith(b'PK\x03\x04'):
            return None
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            # Prefer document.xml text
            with zf.open('word/document.xml') as f:
                xml = f.read()
                text = XML_TAG.sub(b' ', xml)
                text = re.sub(rb'\s+', b' ', text).strip()
                return text.decode('utf-8', errors='ignore')
    except Exception:
        return None
