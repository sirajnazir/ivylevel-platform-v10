#!/usr/bin/env python3
"""
Academics Timeline Generator v1.0
Generates weekly academic vitals (W01-W93) from final application data.

Input: JSON with final GPA, AP count, highlights
Output: JSONL with vitals rows + event rows ready for DB insertion

Usage:
  python3 scripts/generate_academics_timeline.py < data/huda_final_app.json > output.json
"""

import json
import sys
import math
import datetime as dt

def semester_anchor(w):
    """Report card weeks that create natural GPA steps"""
    return w in (18, 36, 54, 72, 90, 93)

def lerp(a, b, t):
    """Linear interpolation"""
    return a + (b - a) * t

def ap_ramp(week, cap):
    """
    AP course accumulation over time
    Sophomore (W01-W36): 0→1
    Junior (W37-W72): 1→4
    Senior (W73-W93): 4→cap
    """
    if week <= 36:
        base = 0 + (week / 36.0) * 1
    elif week <= 72:
        base = 1 + ((week - 36) / 36.0) * 3
    else:
        base = 4 + ((week - 72) / 21.0) * (cap - 4)
    return min(int(round(base)), cap)

def main():
    """
    Generate weekly timeline from final application data
    """
    spec = json.load(sys.stdin)

    sid = spec["student_id"]
    final_u = float(spec["final_gpa_unweighted"])
    final_w = float(spec["final_gpa_weighted"])
    ap_cap = int(spec.get("ap_courses_total", 0))
    asof = dt.date.fromisoformat(spec["as_of_date"])

    rows = []
    for w in range(1, 94):
        t = (w - 1) / (93 - 1)  # 0..1 progress

        # Conservative linear growth from (final - delta) to final
        # Start below final to avoid simulating impossible early perfection
        u_start = max(final_u - 0.35, 2.80)
        w_start = max(final_w - 0.45, 3.20)

        u = lerp(u_start, final_u, t)
        W = lerp(w_start, final_w, t)

        # Add small steps at semester boundaries (report cards)
        if semester_anchor(w):
            u = min(final_u, u + 0.03)
            W = min(final_w, W + 0.04)

        # AP accumulation based on grade level
        ap = ap_ramp(w, ap_cap)

        # Backdate from as_of_date
        date = asof - dt.timedelta(weeks=(93 - w))

        row = {
            "student_id": sid,
            "week_no": w,
            "as_of_date": date.isoformat(),
            "gpa_unweighted": round(u, 3),
            "gpa_weighted": round(W, 3),
            "ap_count_cum": ap,
            "honors_count_cum": None,
            "core_stem_load": None,
            "workload_hours_week": None,
            "current_courses": None,
            "assessments": None,
            "notes": None,
            "provenance": {
                "source": "final_application",
                "method": "timeline_simulation_v1",
                "confidence": 0.55
            }
        }
        rows.append(row)

    # Inject highlight events
    events = []
    for h in spec.get("highlights", []):
        eid = f"{sid}-W{h['week_no']:03d}-{h['type']}"
        event_date = (asof - dt.timedelta(weeks=(93 - h["week_no"]))).isoformat()

        events.append({
            "student_id": sid,
            "event_id": eid,
            "week_no": h["week_no"],
            "event_date": event_date,
            "event_type": h["type"],
            "label": f"{h['type'].replace('_', ' ').title()} — {h.get('course', '')}".strip(),
            "details": h,
            "provenance": {
                "source": "final_application",
                "method": "timeline_simulation_v1",
                "confidence": 0.6
            }
        })

    out = {
        "vitals": rows,
        "events": events,
        "metadata": {
            "student_id": sid,
            "generated_at": dt.datetime.now().isoformat(),
            "total_weeks": len(rows),
            "total_events": len(events),
            "final_gpa_u": final_u,
            "final_gpa_w": final_w,
            "ap_total": ap_cap
        }
    }

    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
