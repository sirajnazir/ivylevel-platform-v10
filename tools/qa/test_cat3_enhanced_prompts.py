#!/usr/bin/env python3
"""
CAT-3 Enhanced Prompts Validation Test
Tests jenny_v9_eq with enhanced system prompts (v11.3.1)
Expected: 55-65% pass rate (up from 46.3% baseline)
"""

import requests
import json
import sys

API_URL = "http://localhost:8787/agent/chat"
STUDENT_ID = "huda-2025"

test_cases = [
    {
        "id": "cat3-rejection-stanford",
        "prompt": "I got rejected from Stanford",
        "expected_warmth": ["sorry", "understand", "hear you", "tough"],
        "expected_action": ["next", "focus", "try", "can", "would"],
    },
    {
        "id": "cat3-stress-essays",
        "prompt": "I'm so stressed about my essays",
        "expected_warmth": ["understand", "normal", "okay", "hear you"],
        "expected_action": ["break", "step", "try", "start", "focus"],
    },
    {
        "id": "cat3-celebration-usc",
        "prompt": "I just got into USC!",
        "expected_warmth": ["congrat", "amazing", "proud", "exciting"],
        "expected_action": ["next", "now", "consider", "think about"],
    },
]

def test_query(test_case):
    """Test a single CAT-3 query"""
    print(f"\n{'='*60}")
    print(f"TEST: {test_case['id']}")
    print(f"{'='*60}")
    print(f"Prompt: {test_case['prompt']}")

    try:
        response = requests.post(
            API_URL,
            json={
                "message": test_case["prompt"],
                "studentId": STUDENT_ID,
                "sessionId": f"test-{test_case['id']}"
            },
            timeout=30
        )

        if response.status_code != 200:
            print(f"❌ HTTP {response.status_code}: {response.text[:200]}")
            return False

        data = response.json()
        answer = data.get("answer", "")
        source = data.get("source", "")
        model = data.get("model", "")

        print(f"\n✓ Source: {source}")
        print(f"✓ Model: {model}")
        print(f"✓ Answer length: {len(answer)} chars")
        print(f"\n✓ Full Answer:\n{answer}")

        # Validation checks
        print(f"\n{'─'*60}")
        print("VALIDATION CHECKS:")
        print(f"{'─'*60}")

        # Check for JSON artifacts
        has_json = answer.startswith("{") or '"role"' in answer or '"content"' in answer
        print(f"{'❌' if has_json else '✅'} JSON artifacts: {'FOUND' if has_json else 'None'}")

        # Check for warmth signals
        warmth_found = [w for w in test_case["expected_warmth"] if w.lower() in answer.lower()]
        has_warmth = len(warmth_found) > 0
        print(f"{'✅' if has_warmth else '❌'} Warmth signals: {warmth_found if warmth_found else 'NONE FOUND'}")

        # Check for action guidance
        action_found = [a for a in test_case["expected_action"] if a.lower() in answer.lower()]
        has_action = len(action_found) > 0
        print(f"{'✅' if has_action else '❌'} Action guidance: {action_found if action_found else 'NONE FOUND'}")

        # Overall pass
        passed = not has_json and has_warmth and has_action
        print(f"\n{'✅ PASS' if passed else '❌ FAIL'}")

        return passed

    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    """Run all CAT-3 tests"""
    print("="*60)
    print("CAT-3 Enhanced Prompts Validation Test (v11.3.1)")
    print("="*60)
    print(f"API: {API_URL}")
    print(f"Student: {STUDENT_ID}")
    print(f"Tests: {len(test_cases)}")

    results = []
    for test_case in test_cases:
        passed = test_query(test_case)
        results.append(passed)

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    passed = sum(results)
    total = len(results)
    pass_rate = (passed / total * 100) if total > 0 else 0

    print(f"Passed: {passed}/{total} ({pass_rate:.1f}%)")
    print(f"Failed: {total - passed}/{total}")

    print(f"\n{'─'*60}")
    print("BASELINE COMPARISON:")
    print(f"{'─'*60}")
    print(f"jenny_v9_eq baseline (before enhanced prompts): 46.3%")
    print(f"jenny_v9_eq + enhanced prompts (v11.3.1): {pass_rate:.1f}%")

    if pass_rate >= 55:
        print(f"\n✅ SUCCESS: Enhanced prompts improved pass rate!")
        print(f"   Target was 55-65%, achieved {pass_rate:.1f}%")
    elif pass_rate > 46.3:
        print(f"\n⚠️  PARTIAL: Some improvement ({pass_rate:.1f}% vs 46.3% baseline)")
        print(f"   Target was 55-65%, may need more refinement")
    else:
        print(f"\n❌ REGRESSION: Pass rate did not improve from baseline")
        print(f"   Baseline: 46.3%, Current: {pass_rate:.1f}%")

    sys.exit(0 if pass_rate >= 55 else 1)

if __name__ == "__main__":
    main()
