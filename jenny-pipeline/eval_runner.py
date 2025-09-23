import os, csv, argparse, json, sys, time
from statistics import mean

def call_model(model: str, prompt: str) -> str:
    try:
        from openai import OpenAI
    except Exception:
        print("pip install openai", file=sys.stderr); raise
    key = os.getenv("OPENAI_API_KEY")
    client = OpenAI(api_key=key)
    r = client.chat.completions.create(model=model, messages=[{"role":"user","content":prompt}], temperature=0.2)
    return r.choices[0].message.content or ""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--suite", required=True, help="CSV with id,prompt,expected_* columns")
    ap.add_argument("--model", required=True, help="model name or fine-tuned id")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    out_rows = []
    with open(args.suite, newline='', encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rid = row.get("id","")
            prompt = row.get("prompt","")
            expected = row.get("expected_style_markers") or row.get("expected_action") or row.get("expected_evidence") or ""
            ans = call_model(args.model, prompt)
            # naive scoring: presence of all expected tokens
            tokens = [t.strip() for t in expected.split(";") if t.strip()]
            score = 1.0 if all(t.lower() in ans.lower() for t in tokens) else 0.0 if tokens else None
            out_rows.append({"id": rid, "prompt": prompt, "expected": expected, "answer": ans, "score": score})

    out_path = args.out or (args.suite.rsplit(".",1)[0] + f".results.{int(time.time())}.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id","prompt","expected","answer","score"])
        writer.writeheader()
        writer.writerows(out_rows)

    scores = [r["score"] for r in out_rows if isinstance(r["score"], (int,float))]
    if scores:
        print(f"Avg score: {mean(scores):.3f} over {len(scores)} cases")
    else:
        print("No scores computed (no expected_* tokens found).")
    print("Wrote:", out_path)

if __name__ == "__main__":
    main()
