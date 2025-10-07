#!/usr/bin/env python3
"""
KB v6 Chip Validator
Validates Week 001-093 intel chips against schema requirements
"""
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

def validate_chip(chip: Dict, filename: str) -> Tuple[bool, List[str]]:
    """Validate a single chip against required schema"""
    errors = []

    # Required fields
    required_fields = ["chip_id", "type", "source_doc", "metadata", "content"]
    for field in required_fields:
        if field not in chip:
            errors.append(f"Missing required field: {field}")

    # Validate types
    if "chip_id" in chip and not isinstance(chip["chip_id"], str):
        errors.append(f"chip_id must be string, got {type(chip['chip_id'])}")

    if "type" in chip and not isinstance(chip["type"], str):
        errors.append(f"type must be string, got {type(chip['type'])}")

    if "source_doc" in chip and not isinstance(chip["source_doc"], dict):
        errors.append(f"source_doc must be object, got {type(chip['source_doc'])}")

    if "metadata" in chip and not isinstance(chip["metadata"], dict):
        errors.append(f"metadata must be object, got {type(chip['metadata'])}")

    if "content" in chip and not isinstance(chip["content"], str):
        errors.append(f"content must be string, got {type(chip['content'])}")

    # Content validation
    if "content" in chip:
        content = chip["content"]
        if len(content.strip()) < 50:
            errors.append(f"content too short ({len(content)} chars, minimum 50)")

    # Chip ID format W###-TYPE-### validation
    if "chip_id" in chip:
        chip_id = chip["chip_id"]
        parts = chip_id.split('-')
        if len(parts) != 3:
            errors.append(f"chip_id format invalid: {chip_id} (expected W###-TYPE-###)")
        elif not parts[0].startswith('W'):
            errors.append(f"chip_id must start with W: {chip_id}")

    return (len(errors) == 0, errors)

def validate_batch_file(filepath: Path) -> Dict:
    """Validate a single batch file"""
    result = {
        "file": str(filepath.name),
        "status": "UNKNOWN",
        "total_chips": 0,
        "valid_chips": 0,
        "errors": []
    }

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            # Handle both JSON array and JSONL formats
            content = f.read().strip()

            if content.startswith('['):
                # JSON array format
                chips = json.loads(content)
            else:
                # JSONL format (one JSON object per line)
                chips = []
                for line in content.split('\n'):
                    line = line.strip()
                    if line:
                        try:
                            chip = json.loads(line)
                            chips.append(chip)
                        except json.JSONDecodeError as e:
                            result["errors"].append(f"Line parse error: {str(e)[:100]}")

        result["total_chips"] = len(chips)

        for idx, chip in enumerate(chips):
            is_valid, chip_errors = validate_chip(chip, str(filepath.name))

            if is_valid:
                result["valid_chips"] += 1
            else:
                chip_id = chip.get("chip_id", f"chip_{idx}")
                for error in chip_errors:
                    result["errors"].append(f"{chip_id}: {error}")

        if result["valid_chips"] == result["total_chips"]:
            result["status"] = "PASS"
        else:
            result["status"] = "FAIL"

    except Exception as e:
        result["status"] = "ERROR"
        result["errors"].append(f"Parse error: {str(e)}")

    return result

def main():
    # Find all batch files for weeks 001-093
    chips_dir = Path("/Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/chips")

    # Load all chip files (various naming patterns)
    batch_files = sorted([
        f for f in chips_dir.glob("w*chips*.json")
        if "summary" not in f.name.lower() and "markdown" not in f.name.lower()
    ])

    print(f"🔍 KB v6 Chip Validation")
    print(f"📂 Directory: {chips_dir}")
    print(f"📋 Found {len(batch_files)} batch files for weeks 001-093")
    print()

    # Validate each file
    results = []
    total_chips = 0
    total_valid = 0

    for batch_file in batch_files:
        result = validate_batch_file(batch_file)
        results.append(result)
        total_chips += result["total_chips"]
        total_valid += result["valid_chips"]

        # Print status
        status_symbol = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️"
        print(f"{status_symbol} {result['file']}: {result['valid_chips']}/{result['total_chips']} chips valid")

        if result["errors"]:
            for error in result["errors"][:5]:  # Show first 5 errors
                print(f"     {error}")
            if len(result["errors"]) > 5:
                print(f"     ... and {len(result["errors"]) - 5} more errors")

    # Summary
    print()
    print(f"📊 Validation Summary:")
    print(f"   Total Files: {len(batch_files)}")
    print(f"   Total Chips: {total_chips}")
    print(f"   Valid Chips: {total_valid}")
    print(f"   Invalid Chips: {total_chips - total_valid}")

    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    errors = sum(1 for r in results if r["status"] == "ERROR")

    print()
    print(f"   ✅ PASS: {passed}")
    print(f"   ❌ FAIL: {failed}")
    print(f"   ⚠️  ERROR: {errors}")

    # Write detailed report
    report_path = Path("/tmp/kb_v6_validation_report.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump({
            "summary": {
                "total_files": len(batch_files),
                "total_chips": total_chips,
                "valid_chips": total_valid,
                "invalid_chips": total_chips - total_valid,
                "passed": passed,
                "failed": failed,
                "errors": errors
            },
            "files": results
        }, f, indent=2)

    print()
    print(f"📝 Detailed report: {report_path}")

    # Exit code
    if failed > 0 or errors > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
