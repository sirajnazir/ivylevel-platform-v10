#\!/usr/bin/env python3
import argparse, json, re, sys, uuid, csv
from pathlib import Path

try:
    import docx  # python-docx
except Exception:
    docx = None
try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

KINDS = ["TRANS-INTEL","EXEC-INTEL","IMSG-INTEL","APP-DOC","GAMEPLAN","TRANS-RAW","EXEC-RAW","IMSG-RAW"]

def guess_kind(path: Path):
    n = path.name.upper()
    for k in KINDS:
        if k in n: return k
    # Fallback by folder name
    p = str(path.parent).upper()
    if "TRANS" in p and "INTEL" in p: return "TRANS-INTEL"
    if "EXEC" in p and "INTEL" in p:  return "EXEC-INTEL"
    if "IMSG" in p and "INTEL" in p:  return "IMSG-INTEL"
    if "APPLICATION" in p or "APP" in p: return "APP-DOC"
    if "GAMEPLAN" in p: return "GAMEPLAN"
    return "OTHER"

def guess_week_phase(name: str):
    # patterns like 2025-01-01_W093_P5-...
    w = re.search(r"_W(\d{1,3})", name.upper())
    p = re.search(r"_P(\d)", name.upper())
    week = int(w.group(1)) if w else None
    phase = int(p.group(1)) if p else None
    return week, phase

def read_text(p: Path) -> str:
    if p.suffix.lower() == ".json":
        try:
            return Path(p).read_text(encoding="utf-8")
        except Exception:
            return Path(p).read_text(errors="ignore")
    if p.suffix.lower() == ".docx" and docx:
        d = docx.Document(str(p))
        return "\n".join([para.text for para in d.paragraphs])
    if p.suffix.lower() == ".pdf" and PdfReader:
        pdf = PdfReader(str(p))
        buf = []
        for page in pdf.pages:
            try:
                buf.append(page.extract_text() or "")
            except Exception:
                pass
        return "\n".join(buf)
    try:
        return Path(p).read_text(encoding="utf-8")
    except Exception:
        return Path(p).read_text(errors="ignore")

def split_records(text: str, kind: str, week, phase, link: str, coach: str, student: str):
    recs = []
    if kind.endswith("-INTEL"):
        # pull likely quotes (naive: lines with emoji or quotes or short sentences)
        for line in [l.strip() for l in text.splitlines() if l.strip()]:
            if len(line) < 400 and any(x in line for x in ["\"", """, """, "\!", "…", "😭", "\!\!"]):
                recs.append({
                    "id": str(uuid.uuid4()),
                    "text": line,
                    "type": "quote",
                    "week": week, "phase": f"P{phase}" if phase else None,
                    "layers": [], "kind": kind,
                    "doc_name": link.split("/")[-1][:64], "link": link,
                    "coach": coach, "student": student
                })
    else:
        # take paragraphs
        for para in [p.strip() for p in text.split("\n\n") if p.strip()]:
            if len(para) > 40:
                recs.append({
                    "id": str(uuid.uuid4()),
                    "text": para[:2000],
                    "type": "passage",
                    "week": week, "phase": f"P{phase}" if phase else None,
                    "layers": [], "kind": kind,
                    "doc_name": link.split("/")[-1][:64], "link": link,
                    "coach": coach, "student": student
                })
    return recs

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="data/raw/<coach> folder")
    ap.add_argument("--out", required=True, help="data/processed/<coach> folder")
    ap.add_argument("--coach_id", required=True)
    ap.add_argument("--student_id", required=True)
    ap.add_argument("--skip_prefix", default="Copy_of")
    args = ap.parse_args()

    root = Path(args.root)
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    rag = out / "rag_index.jsonl"
    ft  = out / "finetune_chat.jsonl"
    cov = out / "coverage_matrix.csv"
    pr  = out / "parse_report.csv"

    rag.unlink(missing_ok=True); ft.unlink(missing_ok=True)

    coverage = {}  # (week, kind) -> count
    parse_rows = []

    total = 0
    with open(rag, "w", encoding="utf-8") as ragf:
        for p in root.rglob("*"):
            if p.is_dir(): continue
            if p.name.startswith(args.skip_prefix) or p.name.startswith("Copy of"): 
                parse_rows.append((str(p), "skipped (Copy_of*)"))
                continue
            # Skip chat files in session transcripts (files ending with *Chat.extension)
            if (p.name.endswith('Chat.docx') or p.name.endswith('Chat.pdf') or 
                p.name.endswith('Chat.txt') or p.name.endswith('Chat.json')):
                if "SessionTranscripts" in str(p):
                    parse_rows.append((str(p), "skipped (*Chat file)"))
                    continue
            # Skip .link.txt files
            if p.suffix == ".txt" and p.stem.endswith(".link"):
                parse_rows.append((str(p), "skipped (.link.txt file)"))
                continue

            kind = guess_kind(p)
            week, phase = guess_week_phase(p.name)
            try:
                text = read_text(p)
                if not text or len(text.strip()) < 5:
                    parse_rows.append((str(p), "empty or unreadable"))
                    continue
                # Try to derive a webViewLink if the name includes a Google ID
                link = f"file://{p.resolve()}"
                recs = split_records(text, kind, week, phase, link, args.coach_id, args.student_id)
                for r in recs:
                    ragf.write(json.dumps(r, ensure_ascii=False) + "\n")
                total += len(recs)
                key = (week or 0, kind)
                coverage[key] = coverage.get(key, 0) + len(recs)
            except Exception as e:
                parse_rows.append((str(p), f"error: {e}"))

    # naive finetune seed from the RAG records
    seed_user = "I'm feeling overwhelmed. What should I focus on first this week?"
    seed_assistant = ("Yeah, that's completely fair — we'll simplify. Start with your 168h audit: "
                      "sleep 56h, school 37.5h, transport 4.5h, misc 21h, homework 14h — "
                      "that leaves ~26h. We'll convert 5 of those into 2 award apps + 1 EC multiplier. "
                      "I'll attach 2–3 evidence notes to model it.")
    with open(ft, "w", encoding="utf-8") as f:
        f.write(json.dumps({
            "messages": [
                {"role": "system", "content": "You are Coach Jenny. Be warm, strategic, precise, and always include evidence chips."},
                {"role": "user", "content": seed_user},
                {"role": "assistant", "content": seed_assistant}
            ]
        }, ensure_ascii=False) + "\n")

    # coverage CSV
    with open(cov, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["week","kind","count"])
        for (wk, kd), ct in sorted(coverage.items(), key=lambda x:(x[0][0] or 0, x[0][1])):
            w.writerow([wk or "", kd, ct])

    with open(pr, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["path","issue"])
        w.writerows(parse_rows)

    print(f"Wrote {total} RAG records → {rag}")
    print(f"Finetune seed → {ft}")
    print(f"Coverage → {cov}")
    print(f"Parse report → {pr}")

if __name__ == "__main__":
    main()
