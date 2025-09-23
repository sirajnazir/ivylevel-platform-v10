import os, argparse, json, time, sys
from pathlib import Path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True, help="fine-tune chat JSONL file (OpenAI format)")
    ap.add_argument("--suffix", default="jenny-v0-2")
    ap.add_argument("--base_model", default="gpt-4o-mini")
    args = ap.parse_args()

    try:
        from openai import OpenAI
    except Exception:
        print("pip install openai", file=sys.stderr); raise

    key = os.getenv("OPENAI_API_KEY")
    if not key: 
        print("Missing OPENAI_API_KEY", file=sys.stderr); sys.exit(2)

    client = OpenAI(api_key=key)

    # Upload file
    ds_path = Path(args.dataset)
    print(f"Uploading dataset: {ds_path}")
    f = client.files.create(file=open(ds_path, "rb"), purpose="fine-tune")
    print("Uploaded file id:", f.id)

    # Create fine-tune job
    print("Creating fine-tune job...")
    job = client.fine_tuning.jobs.create(
        training_file=f.id,
        model=args.base_model,
        suffix=args.suffix
    )
    print("Job id:", job.id)

    # Poll minimal
    while True:
        j = client.fine_tuning.jobs.retrieve(job.id)
        print(f"[{time.strftime('%H:%M:%S')}] status={j.status} trained_tokens={getattr(j, 'trained_tokens', None)} result={getattr(j, 'fine_tuned_model', None)}")
        if j.status in ("succeeded","failed","cancelled"):
            break
        time.sleep(10)

    if j.status == "succeeded":
        print("Fine-tuned model:", j.fine_tuned_model)
    else:
        print("Job did not succeed:", j.status)

if __name__ == "__main__":
    main()
