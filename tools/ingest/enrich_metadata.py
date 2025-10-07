#!/usr/bin/env python3
import os, json, time
import psycopg
from psycopg.rows import dict_row
from tenacity import retry, stop_after_attempt, wait_exponential
from typing import Dict, Any, List
from openai import OpenAI
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

DB = os.getenv("DATABASE_URL")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "jenny-v3-3072-093025")
PINECONE_NAMESPACE = os.getenv("PINECONE_NAMESPACE", "kb_v5_4")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # cheap, good for tagging

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)

TAG_PROMPT = """You are tagging coaching intel. Return a compact JSON with:
- award: one of ["NCWIT","USAMO","Regeneron","ISEF","None"]
- activity: short proper name if any (e.g., "Empowering AI","Folklit","School CS Club","None")
- framework: one of ["168","SPI","STAR","None"]  (168 = 168-hour time mgmt)
- coach_move: one of ["calibrate_scope","deadline_backplan","essay_surgery","motivation_reframe","stakeholder_nav","None"]
- phase: one of ["P1","P2","P3","P4","P5","Unknown"]
- week: integer or null if unknown
- tags: array of 1-5 short strings
- confidence: 0.0-1.0 (low if uncertain)

Use ONLY info present or obvious from text; prefer "None" over guessing.
"""

def call_llm(text: str) -> Dict[str, Any]:
    content = text[:4000]  # budget
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": TAG_PROMPT},
            {"role": "user", "content": content}
        ],
        temperature=0.2
    )
    out = resp.choices[0].message.content or "{}"
    # try to extract json from text
    try:
        start = out.find("{"); end = out.rfind("}")
        if start != -1 and end != -1:
            out = out[start:end+1]
        data = json.loads(out)
    except Exception:
        data = {}
    return data

def sanitize_meta(d: Dict[str, Any]) -> Dict[str, Any]:
    """ Pinecone-safe: strings, numbers, bools, list[str]. No nulls. """
    clean = {}
    for k, v in d.items():
        if v is None:
            continue
        if isinstance(v, (int, float, bool, str)):
            if isinstance(v, str) and not v.strip():
                continue
            clean[k] = v
        elif isinstance(v, (list, tuple)):
            arr = []
            for x in v:
                if x is None: continue
                s = str(x)
                if s: arr.append(s[:256])
            if arr: clean[k] = arr
        else:
            # coerce to string
            s = str(v)
            if s: clean[k] = s[:512]
    return clean

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
def pinecone_update_meta(updates: List[Dict[str, Any]]):
    # Pinecone update API: one at a time or batch via upsert
    for u in updates:
        index.update(
            id=u["id"],
            set_metadata=u["set_metadata"],
            namespace=PINECONE_NAMESPACE
        )

def main():
    with psycopg.connect(DB, row_factory=dict_row) as conn:
        cur = conn.cursor()
        # focus only chips missing key fields or having low coverage
        cur.execute("""
          SELECT c.chip_id, c.text, c.phase, c.week, c.award, c.activity, c.framework
          FROM kb_chips c
          WHERE c.text IS NOT NULL
            AND (
               c.award IS NULL OR
               c.activity IS NULL OR
               c.framework IS NULL OR
               c.phase IS NULL OR c.week IS NULL
            )
          LIMIT 1500
        """)
        rows = cur.fetchall()

        updates = []
        patched = 0

        for r in rows:
            text = (r["text"] or "").strip()
            if not text or len(text) < 120:  # minimum quality gate
                continue

            llm = call_llm(text)
            # prefer existing fields; only fill missing
            merged = {
              "award": r["award"] or llm.get("award") or "None",
              "activity": r["activity"] or llm.get("activity") or "None",
              "framework": r["framework"] or llm.get("framework") or "None",
              "coach_move": llm.get("coach_move") or "None",
              "phase": r["phase"] or (llm.get("phase") if llm.get("phase") in {"P1","P2","P3","P4","P5"} else "Unknown"),
              "week": r["week"] or (llm.get("week") if isinstance(llm.get("week"), int) else None),
              "tags": llm.get("tags") or [],
              "confidence": float(llm.get("confidence") or 0.5)
            }

            # Only update if confidence is high enough
            if merged.get("confidence", 0) >= 0.6:
                meta_clean = sanitize_meta(merged)
                updates.append({"id": r["chip_id"], "set_metadata": meta_clean})

                # Write back to DB for analytics parity (fills blanks only)
                w = conn.cursor()
                w.execute("""
                  UPDATE kb_chips
                  SET meta = COALESCE(meta, '{}'::jsonb)
                            || COALESCE(%s::jsonb, '{}'::jsonb),
                      phase = COALESCE(phase, %s),
                      week  = COALESCE(week,  %s)
                  WHERE chip_id = %s
                """, [
                  json.dumps({
                    k: v for k, v in {
                      "award": merged["award"] if merged["award"] != "None" else None,
                      "activity": merged["activity"] if merged["activity"] != "None" else None,
                      "framework": merged["framework"] if merged["framework"] != "None" else None,
                      "coach_move": merged["coach_move"] if merged["coach_move"] != "None" else None,
                      "tags": merged["tags"] or None,
                      "confidence": merged["confidence"]
                    }.items() if v is not None
                  }),
                  merged["phase"] if merged["phase"] not in ("Unknown", None) else None,
                  merged["week"],
                  r["chip_id"]
                ])

                patched += 1

                if len(updates) >= 64:
                    pinecone_update_meta(updates)
                    conn.commit()  # Commit DB updates
                    print(f"🔧 patched {patched} chips")
                    updates = []

        if updates:
            pinecone_update_meta(updates)
            conn.commit()  # Final DB commit
            print(f"🔧 patched {patched} chips (final batch)")

    print("✅ metadata enrichment complete")

if __name__ == "__main__":
    main()
