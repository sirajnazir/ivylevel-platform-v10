#!/usr/bin/env python3
"""
Drift Watch - Detects unexpected changes in vector counts
Compares current counts against last known snapshot and alerts if drift > threshold
"""
import os
import sys
import json
import glob
from pinecone import Pinecone

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025")
NS_SESS = os.getenv("NS_SESS", "KBv6_2025-10-06_v1.0")
NS_IMSG = os.getenv("NS_IMSG", "KBv6_iMessage_2025-10-07_v1.0")
DRIFT_MAX = float(os.getenv("DRIFT_MAX", "0.02"))  # 2% max drift

QA_RUNS_DIR = "data/kb_intel_chips/qa_runs"

def get_current_counts(idx):
    """Get current vector counts from Pinecone"""
    stats = idx.describe_index_stats()
    return {
        'sessions': stats.namespaces.get(NS_SESS, {}).get('vector_count', 0),
        'imessage': stats.namespaces.get(NS_IMSG, {}).get('vector_count', 0)
    }

def get_last_snapshot():
    """Get the most recent snapshot from previous QA runs"""
    # Find all vector_counts.json files
    pattern = f"{QA_RUNS_DIR}/*/vector_counts.json"
    snapshots = glob.glob(pattern)

    if not snapshots:
        return None

    # Sort by modification time, most recent first
    snapshots.sort(key=os.path.getmtime, reverse=True)

    # Read the most recent snapshot
    with open(snapshots[0], 'r') as f:
        return json.load(f)

def save_snapshot(counts, run_dir):
    """Save current counts as snapshot"""
    snapshot = {
        'timestamp': run_dir.split('/')[-1],
        'counts': counts,
        'namespaces': {
            'sessions': NS_SESS,
            'imessage': NS_IMSG
        }
    }

    os.makedirs(run_dir, exist_ok=True)
    with open(f"{run_dir}/vector_counts.json", 'w') as f:
        json.dump(snapshot, f, indent=2)

    return snapshot

def calculate_drift(current, baseline):
    """Calculate drift percentage"""
    if baseline == 0:
        return float('inf') if current > 0 else 0.0
    return abs(current - baseline) / baseline

def main():
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print("📊 Drift Watch - Vector Count Monitoring\n")

    # Get current counts
    pc = Pinecone(api_key=PINECONE_API_KEY)
    idx = pc.Index(PINECONE_INDEX)

    current = get_current_counts(idx)

    print(f"Current Counts:")
    print(f"  Sessions+Exec ({NS_SESS}): {current['sessions']}")
    print(f"  iMessage ({NS_IMSG}): {current['imessage']}")

    # Get baseline from last snapshot
    baseline_snapshot = get_last_snapshot()

    if not baseline_snapshot:
        print(f"\n⚠️  No baseline snapshot found. Creating initial snapshot...")

        # Create initial snapshot with expected counts
        expected = {
            'sessions': 923,
            'imessage': 40
        }

        # Check against expected
        print(f"\nComparing against expected counts:")
        print(f"  Expected Sessions+Exec: {expected['sessions']}")
        print(f"  Expected iMessage: {expected['imessage']}")

        drift_sess = calculate_drift(current['sessions'], expected['sessions'])
        drift_imsg = calculate_drift(current['imessage'], expected['imessage'])

        print(f"\nDrift from expected:")
        print(f"  Sessions: {drift_sess*100:.2f}%")
        print(f"  iMessage: {drift_imsg*100:.2f}%")

        # Save current as baseline
        import time
        run_dir = f"{QA_RUNS_DIR}/baseline_{time.strftime('%Y%m%d_%H%M%S')}"
        save_snapshot(current, run_dir)
        print(f"\n✅ Baseline snapshot saved: {run_dir}/vector_counts.json")

        # Check if current matches expected
        if drift_sess <= DRIFT_MAX and drift_imsg <= DRIFT_MAX:
            print(f"\n✅ PASS: Counts match expected (drift ≤ {DRIFT_MAX*100}%)")
            sys.exit(0)
        else:
            print(f"\n❌ FAIL: Counts drift from expected exceeds {DRIFT_MAX*100}%")
            sys.exit(1)

    # Compare against baseline
    baseline = baseline_snapshot['counts']
    baseline_ts = baseline_snapshot['timestamp']

    print(f"\nBaseline Snapshot (from {baseline_ts}):")
    print(f"  Sessions+Exec: {baseline['sessions']}")
    print(f"  iMessage: {baseline['imessage']}")

    # Calculate drift
    drift_sess = calculate_drift(current['sessions'], baseline['sessions'])
    drift_imsg = calculate_drift(current['imessage'], baseline['imessage'])

    delta_sess = current['sessions'] - baseline['sessions']
    delta_imsg = current['imessage'] - baseline['imessage']

    print(f"\nDrift Analysis:")
    print(f"  Sessions: {drift_sess*100:.2f}% ({delta_sess:+d} vectors)")
    print(f"  iMessage: {drift_imsg*100:.2f}% ({delta_imsg:+d} vectors)")

    # Generate drift report
    drift_report = {
        'timestamp': baseline_ts,
        'baseline': baseline,
        'current': current,
        'drift': {
            'sessions': {
                'percent': drift_sess,
                'delta': delta_sess,
                'exceeds_threshold': drift_sess > DRIFT_MAX
            },
            'imessage': {
                'percent': drift_imsg,
                'delta': delta_imsg,
                'exceeds_threshold': drift_imsg > DRIFT_MAX
            }
        },
        'threshold': DRIFT_MAX,
        'reason_codes': []
    }

    # Infer reason codes
    if delta_sess > 0 or delta_imsg > 0:
        drift_report['reason_codes'].append('INGEST_NEW_CHIPS')
    if delta_sess < 0 or delta_imsg < 0:
        drift_report['reason_codes'].append('DELETION_OR_CLEANUP')
    if drift_sess == 0 and drift_imsg == 0:
        drift_report['reason_codes'].append('NO_CHANGE')

    # Save drift report
    import time
    run_dir = f"{QA_RUNS_DIR}/drift_{time.strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(run_dir, exist_ok=True)
    with open(f"{run_dir}/drift_report.json", 'w') as f:
        json.dump(drift_report, f, indent=2)

    print(f"\n📝 Drift report saved: {run_dir}/drift_report.json")

    # Determine pass/fail
    print(f"\n✓/✗ Validation (threshold: {DRIFT_MAX*100}%):")
    sess_ok = drift_sess <= DRIFT_MAX
    imsg_ok = drift_imsg <= DRIFT_MAX

    print(f"  {'✅' if sess_ok else '❌'} Sessions drift ≤ {DRIFT_MAX*100}%: {drift_sess*100:.2f}%")
    print(f"  {'✅' if imsg_ok else '❌'} iMessage drift ≤ {DRIFT_MAX*100}%: {drift_imsg*100:.2f}%")

    if sess_ok and imsg_ok:
        print(f"\n✅ PASS: Drift within acceptable range")
        print(f"Reason codes: {', '.join(drift_report['reason_codes']) if drift_report['reason_codes'] else 'N/A'}")
        sys.exit(0)
    else:
        print(f"\n❌ FAIL: Drift exceeds threshold")
        print(f"Reason codes: {', '.join(drift_report['reason_codes']) if drift_report['reason_codes'] else 'UNKNOWN'}")
        print(f"\nAction required:")
        print(f"  1. Review ingest logs for unexpected changes")
        print(f"  2. Verify namespace integrity")
        print(f"  3. Update baseline if drift is intentional:")
        print(f"     - Deploy tag, re-embed, or manual cleanup")
        sys.exit(1)

if __name__ == "__main__":
    main()
