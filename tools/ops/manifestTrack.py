#!/usr/bin/env python3
"""
v8.0: Manifest Tracker
Track version diffs and deployment history
"""

import os
import json
import argparse
from datetime import datetime
from typing import Dict, List, Any
import difflib

MANIFEST_DIR = './manifests'
HISTORY_FILE = './manifests/history.json'

def load_manifest(version: str) -> Dict[str, Any]:
    """Load manifest for specific version"""
    # Try with 'v' prefix first (manifest_v8.0.json)
    manifest_path = os.path.join(MANIFEST_DIR, f'manifest_v{version}.json')

    # Fall back to without prefix (manifest_8.0.json)
    if not os.path.exists(manifest_path):
        manifest_path = os.path.join(MANIFEST_DIR, f'manifest_{version}.json')

    if not os.path.exists(manifest_path):
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    with open(manifest_path, 'r') as f:
        return json.load(f)

def save_history(entry: Dict[str, Any]):
    """Append entry to history"""
    os.makedirs(MANIFEST_DIR, exist_ok=True)

    history = []
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r') as f:
            history = json.load(f)

    history.append(entry)

    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)

def compare_manifests(v1: str, v2: str) -> Dict[str, Any]:
    """Compare two manifest versions"""
    manifest1 = load_manifest(v1)
    manifest2 = load_manifest(v2)

    diff = {
        'from_version': v1,
        'to_version': v2,
        'timestamp': datetime.now().isoformat(),
        'changes': {},
    }

    # Compare each section
    for section in ['data_assets', 'models', 'services', 'apis', 'metrics']:
        if section in manifest1 or section in manifest2:
            m1_section = json.dumps(manifest1.get(section, {}), indent=2, sort_keys=True)
            m2_section = json.dumps(manifest2.get(section, {}), indent=2, sort_keys=True)

            if m1_section != m2_section:
                # Generate unified diff
                diff_lines = list(difflib.unified_diff(
                    m1_section.splitlines(keepends=True),
                    m2_section.splitlines(keepends=True),
                    fromfile=f'{v1}/{section}',
                    tofile=f'{v2}/{section}',
                ))

                diff['changes'][section] = ''.join(diff_lines)

    return diff

def create_manifest(version: str, data: Dict[str, Any]):
    """Create new manifest version"""
    os.makedirs(MANIFEST_DIR, exist_ok=True)

    manifest_path = os.path.join(MANIFEST_DIR, f'manifest_{version}.json')

    manifest = {
        'version': version,
        'created_at': datetime.now().isoformat(),
        **data,
    }

    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    # Save to history
    save_history({
        'action': 'create',
        'version': version,
        'timestamp': datetime.now().isoformat(),
    })

    print(f"✓ Created manifest: {manifest_path}")
    return manifest_path

def list_versions() -> List[str]:
    """List all manifest versions"""
    if not os.path.exists(MANIFEST_DIR):
        return []

    versions = []
    for file in os.listdir(MANIFEST_DIR):
        if file.startswith('manifest_') and file.endswith('.json'):
            version = file.replace('manifest_', '').replace('.json', '')
            versions.append(version)

    return sorted(versions, reverse=True)

def tag_release(version: str, tag: str):
    """Tag a release version as stable/prod"""
    manifest = load_manifest(version)

    # Add tag metadata
    manifest['release_tag'] = tag
    manifest['tagged_at'] = datetime.now().isoformat()
    manifest['status'] = 'stable' if 'stable' in tag else 'tagged'

    # Save tagged manifest (use same path as loaded)
    manifest_path = os.path.join(MANIFEST_DIR, f'manifest_v{version}.json')
    if not os.path.exists(manifest_path):
        manifest_path = os.path.join(MANIFEST_DIR, f'manifest_{version}.json')

    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    # Save to history
    save_history({
        'action': 'tag',
        'version': version,
        'tag': tag,
        'timestamp': datetime.now().isoformat(),
    })

    print(f"✓ Tagged {version} as: {tag}")
    print(f"  Status: {manifest['status']}")
    print(f"  Tagged at: {manifest['tagged_at']}")

    return manifest_path

def main():
    parser = argparse.ArgumentParser(description='Track manifest versions and diffs')
    parser.add_argument('--compare', nargs=2, metavar=('V1', 'V2'), help='Compare two versions')
    parser.add_argument('--create', metavar='VERSION', help='Create new manifest version')
    parser.add_argument('--list', action='store_true', help='List all versions')
    parser.add_argument('--show', metavar='VERSION', help='Show manifest for version')
    parser.add_argument('--tag', metavar='TAG', help='Tag current manifest (e.g., v8.0-stable)')

    args = parser.parse_args()

    print("v8.0 Manifest Tracker")
    print("=" * 50)

    if args.list:
        versions = list_versions()
        print(f"Found {len(versions)} manifest versions:")
        for version in versions:
            print(f"  - {version}")
        return

    if args.show:
        manifest = load_manifest(args.show)
        print(f"Manifest v{args.show}:")
        print(json.dumps(manifest, indent=2))
        return

    if args.compare:
        v1, v2 = args.compare
        print(f"Comparing {v1} → {v2}...")
        diff = compare_manifests(v1, v2)

        if not diff['changes']:
            print("No changes detected")
        else:
            print(f"\nChanges in {len(diff['changes'])} sections:")
            for section, diff_text in diff['changes'].items():
                print(f"\n{section}:")
                print(diff_text)

        return

    if args.tag:
        # Extract version from tag (e.g., v8.0-stable -> v8.0)
        version = args.tag.split('-')[0].lstrip('v')
        print(f"Tagging version: {version}")
        tag_release(version, args.tag)
        return

    if args.create:
        # Create v8.0 manifest
        v8_manifest = {
            'data_assets': {
                'ToneCue': {'source': 'iMessage chips', 'records': 1200},
                'TrustCue': {'source': 'Session transcripts', 'records': 800},
                'PlanGen': {'source': 'GamePlan + Assessment', 'records': 600},
                'ProofLink': {'source': 'Outcome chips', 'records': 500},
            },
            'models': {
                'llm_adapter': {
                    'base': 'gpt-4o-mini',
                    'fine_tuned': 'jenny-4o-tuned-v8',
                    'metrics': {'tone_similarity': 0.88, 'citation_accuracy': 0.98},
                },
                'forecast': {
                    'version': 'v1.0',
                    'r_squared': 0.72,
                    'features': ['R', 'S', 'E', 'A'],
                },
            },
            'services': {
                'proof_verifier': {'endpoint': '/api/proof/verify', 'status': 'active'},
                'forecast': {'endpoint': '/api/forecast', 'status': 'active'},
                'agent': {'endpoint': '/api/agent/act', 'status': 'active'},
            },
            'metrics': {
                'proof_presence': {'target': 0.98, 'actual': 0.98},
                'tone_alignment': {'target': 0.88, 'actual': 0.89},
                'retrieval_mean': {'target': 0.55, 'actual': 0.58},
            },
        }

        create_manifest(args.create, v8_manifest)
        return

    parser.print_help()

if __name__ == '__main__':
    main()
