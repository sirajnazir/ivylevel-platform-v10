import csv, re, os, pathlib, requests
base = pathlib.Path("data/raw/jenny-huda")
base.mkdir(parents=True, exist_ok=True)
m = {
  "TRANS-INTEL": "03-Intelligence-SessionTranscripts",
  "IMSG-INTEL":  "04-Intelligence-iMessage",
  "EXEC-INTEL":  "02-Intelligence-ExecutionDocs",
  "APP-DOC":     "09-Raw-ApplicationDocs",
  "GAMEPLAN":    "01-Intelligence-GamePlan"
}
def file_id(url):
    m = re.search(r"/d/([a-zA-Z0-9_-]+)", url)
    return m.group(1) if m else None

with open("data/raw/jenny-huda/links.csv") as f:
    for kind,url in csv.reader(f):
        folder = base / m.get(kind, "OTHER")
        folder.mkdir(parents=True, exist_ok=True)
        fid = file_id(url)
        if not fid:
            print("SKIP (no file id):", url); continue
        if "docs.google.com/document" in url:
            out = folder / f"{fid}.docx"
            export_url = f"https://docs.google.com/document/d/{fid}/export?format=docx"
        elif "drive.google.com/file" in url:
            out = folder / f"{fid}.pdf"
            export_url = f"https://drive.google.com/uc?export=download&id={fid}"
        else:
            print("SKIP (unknown kind):", url); continue
        r = requests.get(export_url)
        if r.status_code == 200:
            out.write_bytes(r.content)
            print("DOWNLOADED", out)
        else:
            print("FAILED", url, r.status_code)