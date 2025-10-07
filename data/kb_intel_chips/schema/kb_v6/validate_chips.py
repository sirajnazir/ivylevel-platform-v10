
import json, os, sys
from jsonschema import validate, ValidationError

def load_schema(filename):
    with open(filename) as f:
        return json.load(f)

def validate_file(schema, filepath):
    with open(filepath) as f:
        data = json.load(f)
    try:
        validate(instance=data, schema=schema)
        return (filepath, "PASS")
    except ValidationError as e:
        return (filepath, f"FAIL: {e.message}")

if __name__ == "__main__":
    base_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    schema = load_schema("intel_chip.schema.json")
    results = []
    for root, _, files in os.walk(base_dir):
        for file in files:
            if file.endswith(".jsonl") or file.endswith(".json"):
                try:
                    with open(os.path.join(root, file)) as f:
                        for line in f:
                            if line.strip():
                                chip = json.loads(line)
                                results.append(validate_file(schema, os.path.join(root, file)))
                except Exception as e:
                    results.append((file, f"ERROR: {e}"))
    with open("validation_report.json", "w") as out:
        json.dump(results, out, indent=2)
    print("Validation complete. Report saved to validation_report.json")
