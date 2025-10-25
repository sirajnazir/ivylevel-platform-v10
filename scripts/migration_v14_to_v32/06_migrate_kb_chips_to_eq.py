#!/usr/bin/env python3
"""
Migration Script: KB Intel Chips → EQ Chips
Source: /data/kb_intel_chips/chips/*.json (v14)
Target: chips (v3.2)
Expected: 160-180 EQ chips from 185 KB intel files
"""

import json
import psycopg2
import hashlib
from pathlib import Path
from datetime import datetime

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'ivylevel',
    'user': 'postgres',
    'password': 'postgres'
}

# Paths
KB_CHIPS_DIR = Path('/Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/chips')
STUDENT_ID = 'huda-2025'

def extract_eq_signals(chip_data):
    """Extract EQ signals from KB intel chip content"""
    content = chip_data.get('content', '')
    metadata = chip_data.get('metadata', {})

    # Initialize EQ signals
    eq_signals = {
        'self_awareness': None,
        'motivation': None,
        'confidence': None,
        'resilience': None,
        'growth_mindset': None,
        'collaboration': None
    }

    # Simple keyword-based extraction (can be enhanced with LLM)
    content_lower = content.lower()

    if any(word in content_lower for word in ['confidence', 'self-assured', 'believe in herself']):
        eq_signals['confidence'] = 'evidence_detected'

    if any(word in content_lower for word in ['motivated', 'driven', 'passion', 'dedicated']):
        eq_signals['motivation'] = 'evidence_detected'

    if any(word in content_lower for word in ['aware', 'reflect', 'understand herself']):
        eq_signals['self_awareness'] = 'evidence_detected'

    if any(word in content_lower for word in ['resilient', 'bounce back', 'overcome']):
        eq_signals['resilience'] = 'evidence_detected'

    if any(word in content_lower for word in ['growth', 'learning', 'improve', 'develop']):
        eq_signals['growth_mindset'] = 'evidence_detected'

    if any(word in content_lower for word in ['team', 'collaborate', 'work with others']):
        eq_signals['collaboration'] = 'evidence_detected'

    return eq_signals

def parse_week_number(filename):
    """Extract week number from filename like 'w010_chip.json'"""
    try:
        stem = filename.stem
        if stem.startswith('w'):
            return int(stem.split('_')[0][1:])
    except:
        pass
    return None

def migrate_kb_chips():
    """Migrate KB intel chips to EQ chips"""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        # Clear existing KB-based EQ chips (idempotent)
        print("Clearing existing KB-based EQ chips...")
        cur.execute("""
            DELETE FROM chips
            WHERE student_id = %s
            AND kind = 'EQ'
            AND source->>'source_type' = 'kb_intel'
            AND trace_id LIKE 'migration_v14_to_v32_kb%%'
        """, (STUDENT_ID,))
        print(f"Cleared {cur.rowcount} existing chips")

        # Get all KB intel chip files
        kb_files = sorted(KB_CHIPS_DIR.glob('w*.json'))
        print(f"\nFound {len(kb_files)} KB intel chip files")

        chips_created = 0
        chips_skipped = 0

        for kb_file in kb_files:
            week_num = parse_week_number(kb_file)
            if week_num is None:
                print(f"Skipping {kb_file.name} (cannot parse week number)")
                chips_skipped += 1
                continue

            try:
                with open(kb_file, 'r') as f:
                    chip_data = json.load(f)

                # Extract EQ signals
                eq_signals = extract_eq_signals(chip_data)

                # Build chip source
                source = {
                    'source_type': 'kb_intel',
                    'session_id': f'w{week_num:03d}_migration',
                    'week': week_num,
                    'coaching_insight': chip_data.get('content', ''),
                    'eq_signals': eq_signals,
                    'original_file': kb_file.name,
                    'metadata': {
                        'migration_source': 'v14_to_v32',
                        'migration_date': datetime.now().isoformat(),
                        'original_metadata': chip_data.get('metadata', {})
                    }
                }

                # Generate hash for deduplication
                source_str = json.dumps(source, sort_keys=True)
                hash_val = hashlib.md5(source_str.encode()).hexdigest()

                # Insert chip
                cur.execute("""
                    INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
                    VALUES (gen_random_uuid(), %s, %s, %s::jsonb, %s, %s, NOW())
                    ON CONFLICT (student_id, hash) DO NOTHING
                """, (
                    STUDENT_ID,
                    'EQ',
                    json.dumps(source),
                    hash_val,
                    f'migration_v14_to_v32_kb_w{week_num:03d}'
                ))

                if cur.rowcount > 0:
                    chips_created += 1
                    print(f"✓ Created EQ chip from {kb_file.name} (week {week_num})")
                else:
                    chips_skipped += 1
                    print(f"- Skipped {kb_file.name} (duplicate)")

            except Exception as e:
                print(f"✗ Error processing {kb_file.name}: {e}")
                chips_skipped += 1

        # Commit transaction
        conn.commit()

        # Verification
        cur.execute("""
            SELECT COUNT(*) FROM chips
            WHERE student_id = %s
            AND kind = 'EQ'
            AND source->>'source_type' = 'kb_intel'
        """, (STUDENT_ID,))

        total_kb_chips = cur.fetchone()[0]

        print("\n" + "="*60)
        print("KB Intel → EQ Chips Migration Complete")
        print("="*60)
        print(f"Files processed: {len(kb_files)}")
        print(f"Chips created: {chips_created}")
        print(f"Chips skipped: {chips_skipped}")
        print(f"Total KB-based EQ chips in DB: {total_kb_chips}")
        print("="*60)

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate_kb_chips()
