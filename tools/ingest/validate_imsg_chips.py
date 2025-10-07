#!/usr/bin/env python3
"""
KB v6 iMessage Chips Validator

Validates iMessage Intel Chips against KB v6 schema with iMessage-specific requirements:
- Chip types: Tone_Style, Microtactic, Crisis_Intervention, Strategy, Decision_Framework, Accountability, Boundary
- Required fields: chip_id, type, source_doc, metadata, content, insight_vector
- Chip ID format: IMSG-[Phase]-[Type]-[Number]
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple

# iMessage-specific valid chip types
VALID_IMSG_TYPES = {
    "Tone_Style",
    "Microtactic",
    "Crisis_Intervention",
    "Strategy",
    "Decision_Framework",
    "Accountability",
    "Boundary",
    "Script",
    "Insight"  # Legacy type found in actual files
}

# Valid phases - flexible for iMessage chips (can span multiple phases)
VALID_PHASES = {
    "P1-FOUNDATION",
    "P2-APPLICATION_INTENSITY",
    "P3-APPLICATION_CLIMAX",
    "P4-DECISIONS_CELEBRATION",
    # iMessage-specific phase patterns
    "P3-JUNIOR",
    "P5-SENIOR",
    "P1P2-FOUNDATION-BUILDING",
    "P2P3-BUILDING-JUNIOR",
    "P4P5-SUMMER-SENIOR",
    "P1P5-ALL",
    "P3→P4"
}

class IMsgChipValidator:
    def __init__(self, chips_dir: str):
        self.chips_dir = Path(chips_dir)
        self.validation_results = {
            "validation_metadata": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "validator_version": "1.0.0",
                "schema_version": "6.0",
                "chips_directory": str(self.chips_dir.resolve()),
                "chip_category": "iMessage"
            },
            "summary": {
                "total_files": 0,
                "total_chips": 0,
                "valid_chips": 0,
                "invalid_chips": 0,
                "validation_pass_rate": 0.0,
                "files_passed": 0,
                "files_failed": 0,
                "files_errored": 0
            },
            "files": []
        }

    def validate_chip(self, chip: Dict[str, Any], file_path: str, line_num: int) -> Tuple[bool, List[str]]:
        """Validate a single iMessage chip. Returns (is_valid, error_messages)."""
        errors = []

        # Required fields
        required_fields = ["chip_id", "type", "source_doc", "metadata", "content", "insight_vector"]
        for field in required_fields:
            if field not in chip:
                errors.append(f"Missing required field: {field}")

        if errors:
            return False, errors

        # Validate chip_id format: IMSG-[Phase]-[Type]-[Number] or IM-[Date]-[Type]-[Number] (legacy)
        chip_id = chip.get("chip_id", "")
        if not (chip_id.startswith("IMSG-") or chip_id.startswith("IM-")):
            errors.append(f"Invalid chip_id format (must start with 'IMSG-' or 'IM-'): {chip_id}")

        # Validate type (accept both with and without "_Chip" suffix for legacy compatibility)
        chip_type = chip.get("type", "")
        chip_type_base = chip_type.replace("_Chip", "")
        if chip_type_base not in VALID_IMSG_TYPES:
            errors.append(f"Invalid type '{chip_type}'. Must be one of: {', '.join(sorted(VALID_IMSG_TYPES))} (with or without '_Chip' suffix)")

        # Validate source_doc structure (flexible for both v6 and legacy schemas)
        source_doc = chip.get("source_doc", {})
        if not isinstance(source_doc, dict):
            errors.append("source_doc must be an object")
        else:
            # Accept either v6 schema (week_range + date_span) or legacy schemas (date_range or date)
            has_v6_fields = "week_range" in source_doc and "date_span" in source_doc
            has_date_range = "date_range" in source_doc
            has_date = "date" in source_doc

            if not (has_v6_fields or has_date_range or has_date):
                errors.append("source_doc must have either (week_range AND date_span) OR date_range OR date")

            # Filename and phase always required
            if "filename" not in source_doc:
                errors.append("source_doc missing required field: filename")
            if "phase" not in source_doc:
                errors.append("source_doc missing required field: phase")

            # Validate phase
            phase = source_doc.get("phase", "")
            if phase and phase not in VALID_PHASES:
                errors.append(f"Invalid phase '{phase}'. Must be one of: {', '.join(sorted(VALID_PHASES))}")

        # Validate metadata structure
        metadata = chip.get("metadata", {})
        if not isinstance(metadata, dict):
            errors.append("metadata must be an object")
        else:
            # Required fields (always)
            if "participants" not in metadata:
                errors.append("metadata missing required field: participants")
            if "quality_score" not in metadata:
                errors.append("metadata missing required field: quality_score")
            if "confidence_score" not in metadata:
                errors.append("metadata missing required field: confidence_score")

            # phase_enum can be in either metadata or source_doc (for legacy compatibility)
            has_phase_enum = "phase_enum" in metadata or "phase_enum" in source_doc
            if not has_phase_enum:
                errors.append("phase_enum must be in metadata or source_doc")

            # Validate participants is array
            if "participants" in metadata and not isinstance(metadata["participants"], list):
                errors.append("metadata.participants must be an array")

            # Validate scores are numeric
            for score_field in ["quality_score", "confidence_score"]:
                if score_field in metadata:
                    score = metadata[score_field]
                    if not isinstance(score, (int, float)):
                        errors.append(f"metadata.{score_field} must be numeric")
                    elif score < 0 or score > 1:
                        errors.append(f"metadata.{score_field} must be between 0 and 1")

        # Validate content
        content = chip.get("content", "")
        if not isinstance(content, str):
            errors.append("content must be a string")
        elif len(content.strip()) < 50:
            errors.append(f"content too short ({len(content.strip())} chars, minimum 50)")

        # Validate insight_vector
        insight_vector = chip.get("insight_vector", "")
        if not isinstance(insight_vector, str):
            errors.append("insight_vector must be a string")
        elif len(insight_vector.strip()) < 40:
            errors.append(f"insight_vector too short ({len(insight_vector.strip())} chars, minimum 40)")
        elif len(insight_vector.strip()) > 500:
            errors.append(f"insight_vector too long ({len(insight_vector.strip())} chars, maximum 500)")

        return len(errors) == 0, errors

    def validate_file(self, file_path: Path) -> Dict[str, Any]:
        """Validate a single JSONL file containing iMessage chips."""
        result = {
            "filename": file_path.name,
            "file_path": str(file_path),
            "status": "PASS",
            "total_chips": 0,
            "valid_chips": 0,
            "invalid_chips": 0,
            "errors": []
        }

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, start=1):
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        chip = json.loads(line)
                        result["total_chips"] += 1

                        is_valid, errors = self.validate_chip(chip, str(file_path), line_num)

                        if is_valid:
                            result["valid_chips"] += 1
                        else:
                            result["invalid_chips"] += 1
                            chip_id = chip.get("chip_id", f"line_{line_num}")
                            result["errors"].append({
                                "chip_id": chip_id,
                                "line": line_num,
                                "errors": errors
                            })

                    except json.JSONDecodeError as e:
                        result["invalid_chips"] += 1
                        result["errors"].append({
                            "line": line_num,
                            "errors": [f"JSON parse error: {str(e)}"]
                        })

            if result["invalid_chips"] > 0:
                result["status"] = "FAIL"

        except Exception as e:
            result["status"] = "ERROR"
            result["errors"].append({
                "error": f"File read error: {str(e)}"
            })

        return result

    def validate_all(self) -> Dict[str, Any]:
        """Validate all iMessage chip files in the directory."""
        if not self.chips_dir.exists():
            print(f"❌ Error: Directory not found: {self.chips_dir}")
            sys.exit(1)

        # Find all JSONL files
        jsonl_files = sorted(self.chips_dir.glob("iMessage_Intel_Chips_Batch_v*.jsonl"))

        if not jsonl_files:
            print(f"❌ Error: No iMessage chip files found in {self.chips_dir}")
            sys.exit(1)

        print("🔍 KB v6 iMessage Chips Validation")
        print(f"📂 Directory: {self.chips_dir}")
        print(f"📋 Found {len(jsonl_files)} iMessage chip batch files\n")

        # Validate each file
        for file_path in jsonl_files:
            file_result = self.validate_file(file_path)
            self.validation_results["files"].append(file_result)

            # Print file result
            status_icon = "✅" if file_result["status"] == "PASS" else "❌" if file_result["status"] == "FAIL" else "⚠️"
            print(f"{status_icon} {file_path.name}: {file_result['valid_chips']}/{file_result['total_chips']} chips valid")

            if file_result["errors"]:
                for error_entry in file_result["errors"][:3]:  # Show first 3 errors
                    chip_id = error_entry.get("chip_id", f"line_{error_entry.get('line', '?')}")
                    print(f"   ⚠️  {chip_id}: {error_entry['errors'][0]}")
                if len(file_result["errors"]) > 3:
                    print(f"   ... and {len(file_result['errors']) - 3} more errors")

            # Update summary
            self.validation_results["summary"]["total_files"] += 1
            self.validation_results["summary"]["total_chips"] += file_result["total_chips"]
            self.validation_results["summary"]["valid_chips"] += file_result["valid_chips"]
            self.validation_results["summary"]["invalid_chips"] += file_result["invalid_chips"]

            if file_result["status"] == "PASS":
                self.validation_results["summary"]["files_passed"] += 1
            elif file_result["status"] == "FAIL":
                self.validation_results["summary"]["files_failed"] += 1
            else:
                self.validation_results["summary"]["files_errored"] += 1

        # Calculate pass rate
        total = self.validation_results["summary"]["total_chips"]
        valid = self.validation_results["summary"]["valid_chips"]
        self.validation_results["summary"]["validation_pass_rate"] = (valid / total * 100) if total > 0 else 0

        # Print summary
        print("\n📊 Validation Summary:")
        print(f"   Total Files: {self.validation_results['summary']['total_files']}")
        print(f"   Total Chips: {self.validation_results['summary']['total_chips']}")
        print(f"   Valid Chips: {self.validation_results['summary']['valid_chips']}")
        print(f"   Invalid Chips: {self.validation_results['summary']['invalid_chips']}")
        print(f"   Pass Rate: {self.validation_results['summary']['validation_pass_rate']:.1f}%")
        print(f"\n   ✅ PASS: {self.validation_results['summary']['files_passed']}")
        print(f"   ❌ FAIL: {self.validation_results['summary']['files_failed']}")
        print(f"   ⚠️  ERROR: {self.validation_results['summary']['files_errored']}")

        # Embedding readiness
        is_ready = self.validation_results["summary"]["invalid_chips"] == 0
        self.validation_results["embedding_readiness"] = {
            "ready_for_embedding": is_ready,
            "target_index": "jenny-v3-3072-093025",
            "embedding_model": "text-embedding-3-large",
            "suggested_namespace": f"KBv6_iMessage_{datetime.utcnow().strftime('%Y-%m-%d')}_v1.0"
        }

        if is_ready:
            print(f"\n✅ All iMessage chips valid! Ready for embedding.")
            print(f"   Suggested namespace: {self.validation_results['embedding_readiness']['suggested_namespace']}")
        else:
            print(f"\n❌ Validation failed. Fix errors before embedding.")

        return self.validation_results

    def save_report(self, output_path: str):
        """Save validation report to JSON file."""
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.validation_results, f, indent=2, ensure_ascii=False)

        print(f"\n📄 Validation report saved: {output_file}")


def main():
    # Default paths
    chips_dir = "/Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/imsg-chips"
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    report_path = f"/Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/schema/kb_v6_final_validation/imsg_validation_report_{timestamp}.json"

    # Allow override from command line
    if len(sys.argv) > 1:
        chips_dir = sys.argv[1]
    if len(sys.argv) > 2:
        report_path = sys.argv[2]

    validator = IMsgChipValidator(chips_dir)
    validator.validate_all()
    validator.save_report(report_path)

    # Exit with appropriate code
    if validator.validation_results["summary"]["invalid_chips"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
