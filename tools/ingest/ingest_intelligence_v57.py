#!/usr/bin/env python3
"""
v5.7 Intelligence Ingestion: Universal malformed JSON + DOCX blob recovery
Handles GamePlan/ExecutionDocs/SessionTranscripts/iMessage with subtype detection
"""
import os
import sys
import json
import re
import csv
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass, asdict

# === Tolerant JSON Parser ===
def parse_json_tolerant(raw: str) -> Optional[Dict[str, Any]]:
    """
    Tolerant parser for malformed JSON:
    1. Try standard json.loads
    2. Extract largest balanced {...} block
    3. Remove trailing commas
    4. Last resort: wrap in list and choose biggest dict
    """
    if not raw or not raw.strip():
        return None

    # Try standard parse
    try:
        return json.loads(raw)
    except:
        pass

    # Extract largest balanced {...} block
    def extract_balanced_block(s: str) -> Optional[str]:
        depth = 0
        start = -1
        blocks = []
        for i, c in enumerate(s):
            if c == '{':
                if depth == 0:
                    start = i
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0 and start >= 0:
                    blocks.append(s[start:i+1])
        return max(blocks, key=len) if blocks else None

    block = extract_balanced_block(raw)
    if block:
        # Remove trailing commas before } or ]
        fixed = re.sub(r',\s*([}\]])', r'\1', block)
        # Remove control chars
        fixed = re.sub(r'[\x00-\x1F\x7F]', '', fixed)
        try:
            return json.loads(fixed)
        except:
            pass

    # Last resort: wrap and extract
    try:
        wrapped = json.loads(f'[{raw}]')
        if isinstance(wrapped, list):
            dicts = [x for x in wrapped if isinstance(x, dict)]
            if dicts:
                return max(dicts, key=lambda d: len(json.dumps(d)))
    except:
        pass

    return None

# === DOCX Blob Extractor ===
def extract_docx_from_blob(text: str) -> Optional[str]:
    """
    Detects PK zip blobs in text and extracts word/document.xml
    """
    # Look for PK\x03\x04 or PK\u0003\u0004 patterns
    if 'PK' not in text[:200]:
        return None

    try:
        # Try to find zip signature
        import base64
        import io

        # Convert unicode escapes if present
        if '\\u0003' in text:
            text = text.encode('utf-8').decode('unicode_escape')

        # Look for PK signature
        pk_idx = text.find('PK')
        if pk_idx < 0:
            return None

        # Extract binary blob
        blob_data = text[pk_idx:pk_idx+50000].encode('latin-1', errors='ignore')

        with zipfile.ZipFile(io.BytesIO(blob_data)) as zf:
            xml_content = zf.read('word/document.xml').decode('utf-8', errors='ignore')
            # Strip XML tags
            xml_content = re.sub(r'</w:p>', '\n', xml_content)
            xml_content = re.sub(r'<[^>]+>', ' ', xml_content)
            xml_content = re.sub(r'\s+', ' ', xml_content)
            return xml_content.strip()
    except:
        return None

# === Segment Joiner ===
def join_segments(segments: List[Any]) -> str:
    """
    Joins segments array (handles both strings and dicts)
    """
    if not segments:
        return ""

    parts = []
    for seg in segments:
        if isinstance(seg, str):
            parts.append(seg)
        elif isinstance(seg, dict):
            # Try to extract text from dict
            parts.append(json.dumps(seg))

    return ' '.join(parts)

# === DOCX File Reader ===
def read_docx_file(path: Path) -> str:
    """Extract text from .docx file using stdlib"""
    try:
        with zipfile.ZipFile(str(path), 'r') as zf:
            xml = zf.read('word/document.xml').decode('utf-8', errors='ignore')
        xml = re.sub(r'</w:p>', '\n', xml)
        xml = re.sub(r'<[^>]+>', ' ', xml)
        xml = re.sub(r'\s+', ' ', xml)
        return re.sub(r'\n\s*\n+', '\n', xml).strip()
    except Exception as e:
        return f"[DOCX_PARSE_ERROR: {e}]"

# === PDF Reader ===
def read_pdf_file(path: Path) -> str:
    """Extract text from PDF using PyPDF2 if available"""
    try:
        import PyPDF2
        with open(path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = '\n'.join(page.extract_text() for page in reader.pages)
        return text.strip()
    except ImportError:
        return "[PDF_PARSE_WARNING: PyPDF2 not installed]"
    except Exception as e:
        return f"[PDF_PARSE_ERROR: {e}]"

# === Narrative Extractor ===
def extract_narrative(data: Dict[str, Any]) -> str:
    """
    Traverses JSON to find narrative content
    Priority: narrative, transcript, content, analysis, summary, takeaways,
             architecture, story, text, body, bullets
    """
    if not isinstance(data, dict):
        return ""

    # Priority keys for narrative content
    narrative_keys = [
        'narrative', 'transcript', 'content', 'analysis', 'summary',
        'takeaways', 'architecture', 'story', 'text', 'body', 'bullets',
        'coaching_progression', 'intelligence_layers_extracted', 'critical_insights'
    ]

    parts = []

    # Try priority keys first
    for key in narrative_keys:
        val = data.get(key)
        if isinstance(val, str) and len(val) > 50:
            parts.append(val)
        elif isinstance(val, dict):
            # Recursively extract from nested dicts
            nested = extract_from_dict_recursive(val)
            if nested:
                parts.append(nested)

    # If nothing found, do deep traversal
    if not parts:
        deep = extract_from_dict_recursive(data)
        if deep:
            parts.append(deep)

    result = '\n\n'.join(parts)
    # Clean up
    result = re.sub(r'\s+', ' ', result)
    result = re.sub(r'\n\s*\n+', '\n\n', result)
    return result.strip()

def extract_from_dict_recursive(d: Dict[str, Any], depth: int = 0) -> str:
    """Recursively extract text from nested dicts"""
    if depth > 5:  # Prevent infinite recursion
        return ""

    parts = []
    for k, v in d.items():
        if isinstance(v, str) and len(v) > 30:
            # Filter out JSON-looking strings
            if not (v.strip().startswith('{') or v.strip().startswith('[')):
                parts.append(v)
        elif isinstance(v, dict):
            nested = extract_from_dict_recursive(v, depth + 1)
            if nested:
                parts.append(nested)
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, str) and len(item) > 30:
                    parts.append(item)
                elif isinstance(item, dict):
                    nested = extract_from_dict_recursive(item, depth + 1)
                    if nested:
                        parts.append(nested)

    return ' '.join(parts)

# === GamePlan Subtype Detection ===
GP_ASSESS_TRANSL_RE = re.compile(r"02-Assessment-to-GamePlan-Translation\.(json|docx)$", re.I)
GP_CREATION_RE = re.compile(r"02-.*GamePlan-Creation\.(json|docx)$", re.I)
GP_ARCH_RE = re.compile(r"03-GamePlan-Architecture\.(json|docx)$", re.I)
GP_ASSESS_SESSION_RE = re.compile(r"^20\d{2}-\d{2}-\d{2}_W\d{3}.*TRANS-INTEL_.*GamePlan.*\.(json|docx)$", re.I)

def detect_gameplan_subtype(filename: str, text_preview: str = "") -> Optional[str]:
    """
    Returns: ASSESSMENT_SESSION, ASSESSMENT_TRANSLATION, GAMEPLAN_CREATION,
             GAMEPLAN_ARCHITECTURE, or None
    """
    if GP_ASSESS_SESSION_RE.search(filename):
        return "ASSESSMENT_SESSION"
    if GP_ASSESS_TRANSL_RE.search(filename):
        return "ASSESSMENT_TRANSLATION"
    if GP_CREATION_RE.search(filename):
        return "GAMEPLAN_CREATION"
    if GP_ARCH_RE.search(filename):
        return "GAMEPLAN_ARCHITECTURE"

    # Content fallback
    preview_lower = text_preview[:2000].lower()
    if 'assessment' in preview_lower and 'gameplan' in preview_lower:
        return "ASSESSMENT_TRANSLATION"
    if 'architecture' in preview_lower or 'pillars' in preview_lower:
        return "GAMEPLAN_ARCHITECTURE"
    if 'creation' in preview_lower or 'roadmap' in preview_lower:
        return "GAMEPLAN_CREATION"

    return None

# === Metadata Extraction ===
def extract_date_from_filename(filename: str) -> Optional[str]:
    """Extract YYYY-MM-DD from filename"""
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', filename)
    return m.group(0) if m else None

def extract_week_from_filename(filename: str) -> Optional[str]:
    """Extract week number from _W### pattern"""
    m = re.search(r'_W(\d{3})', filename)
    return m.group(1) if m else None

def extract_phase_from_filename(filename: str) -> Optional[str]:
    """Extract phase from _P*-* pattern"""
    m = re.search(r'_P(\d+)-([A-Z]+)', filename)
    return m.group(0)[1:] if m else None

# === Record Builder ===
@dataclass
class IntelRecord:
    file_path: str
    file_name: str
    folder_kind: str
    source_ext: str
    intel_chip_type: Optional[str]
    title: str
    date: Optional[str]
    week: Optional[str]
    phase: Optional[str]
    people: List[str]
    tags: List[str]
    narrative_text: str
    narrative_chars: int
    actions: List[str]
    outcomes: List[str]
    parse_success: bool
    parse_error: str

def process_file(file_path: Path, base_dir: Path) -> IntelRecord:
    """Process a single intelligence file"""
    rel_path = file_path.relative_to(base_dir)
    parts = rel_path.parts

    # Determine folder kind
    folder_kind = "UNKNOWN"
    if "01-Intelligence-GamePlan" in str(rel_path):
        folder_kind = "GAMEPLAN_INTEL"
    elif "02-Intelligence-ExecutionDocs" in str(rel_path):
        folder_kind = "EXEC_INTEL"
    elif "03-Intelligence-SessionTranscripts" in str(rel_path):
        folder_kind = "SESSION_INTEL"
    elif "04-Intelligence-iMessage" in str(rel_path):
        folder_kind = "IMSG_INTEL"

    ext = file_path.suffix.lower()
    filename = file_path.name

    # Initialize record
    record = IntelRecord(
        file_path=str(rel_path),
        file_name=filename,
        folder_kind=folder_kind,
        source_ext=ext[1:],
        intel_chip_type=None,
        title="",
        date=extract_date_from_filename(filename),
        week=extract_week_from_filename(filename),
        phase=extract_phase_from_filename(filename),
        people=[],
        tags=[],
        narrative_text="",
        narrative_chars=0,
        actions=[],
        outcomes=[],
        parse_success=False,
        parse_error=""
    )

    try:
        # Read file based on extension
        if ext == '.json':
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                raw = f.read()

            # Try to parse JSON
            data = parse_json_tolerant(raw)
            if not data:
                # Try segments if present in raw JSON
                try:
                    temp = json.loads(raw)
                    if 'segments' in temp:
                        joined = join_segments(temp['segments'])
                        data = parse_json_tolerant(joined)
                except:
                    pass

            if not data:
                record.parse_error = "Failed to parse JSON"
                return record

            # Extract DOCX blob if present
            text_field = data.get('text', '')
            if isinstance(text_field, str):
                docx_text = extract_docx_from_blob(text_field)
                if docx_text:
                    record.narrative_text = docx_text
                    record.parse_success = True
                    record.narrative_chars = len(docx_text)
                else:
                    # Extract narrative from JSON
                    record.narrative_text = extract_narrative(data)
                    record.parse_success = True
                    record.narrative_chars = len(record.narrative_text)
            else:
                record.narrative_text = extract_narrative(data)
                record.parse_success = True
                record.narrative_chars = len(record.narrative_text)

            # Extract metadata
            record.title = data.get('name') or data.get('title') or filename

        elif ext == '.docx':
            record.narrative_text = read_docx_file(file_path)
            record.parse_success = True
            record.narrative_chars = len(record.narrative_text)
            record.title = filename

        elif ext == '.pdf':
            record.narrative_text = read_pdf_file(file_path)
            record.parse_success = True
            record.narrative_chars = len(record.narrative_text)
            record.title = filename

        # Detect GamePlan subtype
        if folder_kind == "GAMEPLAN_INTEL":
            record.intel_chip_type = detect_gameplan_subtype(filename, record.narrative_text)

    except Exception as e:
        record.parse_error = str(e)
        record.parse_success = False

    return record

# === Main Ingestion ===
def ingest_intelligence(base_dir: str, out_jsonl: str, out_csv: str):
    """Main ingestion function"""
    base_path = Path(base_dir)

    # Supported folders
    folders = [
        "01-Intelligence-GamePlan",
        "02-Intelligence-ExecutionDocs",
        "03-Intelligence-SessionTranscripts",
        "04-Intelligence-iMessage"
    ]

    records = []
    supported_exts = {'.json', '.docx', '.pdf'}

    print(f"🚀 v5.7 Intelligence Ingestion")
    print(f"📂 Base: {base_dir}")
    print()

    for folder in folders:
        folder_path = base_path / folder
        if not folder_path.exists():
            print(f"⚠️  Skipping {folder} (not found)")
            continue

        files = [f for f in folder_path.rglob('*') if f.suffix.lower() in supported_exts]
        print(f"📁 {folder}: {len(files)} files")

        for file_path in files:
            record = process_file(file_path, base_path)
            records.append(record)

    print(f"\n✅ Processed {len(records)} files")

    # Write JSONL
    with open(out_jsonl, 'w', encoding='utf-8') as f:
        for rec in records:
            f.write(json.dumps(asdict(rec), ensure_ascii=False) + '\n')

    print(f"📝 JSONL: {out_jsonl}")

    # Write CSV summary
    with open(out_csv, 'w', newline='', encoding='utf-8') as f:
        if records:
            writer = csv.DictWriter(f, fieldnames=asdict(records[0]).keys())
            writer.writeheader()
            for rec in records:
                writer.writerow(asdict(rec))

    print(f"📊 CSV: {out_csv}")

    # Stats
    success = sum(1 for r in records if r.parse_success)
    failed = len(records) - success
    gameplan = sum(1 for r in records if r.folder_kind == "GAMEPLAN_INTEL")
    subtypes = {}
    for r in records:
        if r.intel_chip_type:
            subtypes[r.intel_chip_type] = subtypes.get(r.intel_chip_type, 0) + 1

    print(f"\n📈 Stats:")
    print(f"  Success: {success}")
    print(f"  Failed: {failed}")
    print(f"  GamePlan: {gameplan}")
    for subtype, count in subtypes.items():
        print(f"    {subtype}: {count}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='v5.7 Intelligence Ingestion')
    parser.add_argument('--base-dir', required=True, help='Base directory with intelligence folders')
    parser.add_argument('--out-jsonl', required=True, help='Output JSONL path')
    parser.add_argument('--out-csv', required=True, help='Output CSV path')

    args = parser.parse_args()

    ingest_intelligence(args.base_dir, args.out_jsonl, args.out_csv)
