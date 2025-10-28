#!/usr/bin/env python3
"""
Migration Script v2: KB Intel Chips → EQ Chips
Source: /data/kb_intel_chips/chips/*_intel_chips_batch.json (JSONL format)
Target: chips (v3.2)
Expected: 500+ EQ chips from 93 weeks of coaching intelligence
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

def extract_eq_signals(content, chip_type):
    """Extract EQ signals from KB intel chip content"""
    if not content:
        return {}

    # Initialize EQ signals
    eq_signals = {}
    content_lower = content.lower()

    # Confidence signals
    if any(word in content_lower for word in ['confidence', 'self-assured', 'believe', 'exceptional', 'capable']):
        eq_signals['confidence'] = 0.7

    # Motivation signals
    if any(word in content_lower for word in ['motivated', 'driven', 'passion', 'dedicated', 'eager', 'excited']):
        eq_signals['motivation'] = 0.7

    # Self-awareness signals
    if any(word in content_lower for word in ['aware', 'reflect', 'understand', 'recognize', 'realize']):
        eq_signals['self_awareness'] = 0.7

    # Resilience signals
    if any(word in content_lower for word in ['resilient', 'bounce back', 'overcome', 'persist', 'challenge']):
        eq_signals['resilience'] = 0.7

    # Growth mindset signals
    if any(word in content_lower for word in ['growth', 'learning', 'improve', 'develop', 'evolve', 'progress']):
        eq_signals['growth_mindset'] = 0.7

    # Collaboration signals
    if any(word in content_lower for word in ['team', 'collaborate', 'work with', 'together', 'partnership']):
        eq_signals['collaboration'] = 0.7

    # Trust/relationship signals (from Trust_Chip type)
    if chip_type == 'Trust_Chip' or any(word in content_lower for word in ['trust', 'rapport', 'connection', 'relatability']):
        eq_signals['confidence'] = max(eq_signals.get('confidence', 0), 0.8)

    # Breakthrough signals (from Result_Chip type)
    if chip_type == 'Result_Chip' or any(word in content_lower for word in ['breakthrough', 'transformation', 'shift', 'pivot']):
        eq_signals['growth_mindset'] = max(eq_signals.get('growth_mindset', 0), 0.8)

    return eq_signals

def parse_week_number(filename):
    """Extract week number from filename like 'w010_intel_chips_batch.json'"""
    try:
        stem = filename.stem.lower()
        if 'w' in stem and 'batch' in stem:
            # Extract week number from patterns like: w001_intel_chips_batch, W024_Intel_Chips_Batch_v1
            parts = stem.split('_')
            for part in parts:
                if part.startswith('w') and len(part) > 1:
                    week_str = part[1:]  # Remove 'w' prefix
                    if week_str.isdigit():
                        return int(week_str)
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

        # Get all KB intel batch files (JSONL format)
        batch_files = sorted(KB_CHIPS_DIR.glob('*batch*.json'))
        batch_files += sorted(KB_CHIPS_DIR.glob('*Batch*.json'))
        batch_files = list(set(batch_files))  # Remove duplicates
        batch_files.sort()

        print(f"\nFound {len(batch_files)} KB intel batch files")

        chips_created = 0
        chips_skipped = 0
        total_kb_chips_processed = 0

        for batch_file in batch_files:
            week_num = parse_week_number(batch_file)
            if week_num is None:
                print(f"Skipping {batch_file.name} (cannot parse week number)")
                chips_skipped += 1
                continue

            try:
                # Read JSONL file (one JSON object per line)
                with open(batch_file, 'r') as f:
                    lines = f.readlines()

                file_chips_created = 0

                for line_num, line in enumerate(lines, 1):
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        chip_data = json.loads(line)
                        total_kb_chips_processed += 1

                        # Extract chip info
                        chip_type = chip_data.get('type', 'Unknown')
                        content = chip_data.get('content', '')
                        insight_vector = chip_data.get('insight_vector', '')
                        metadata = chip_data.get('metadata', {})
                        chip_id = chip_data.get('chip_id', '')

                        # Skip if no content
                        if not content and not insight_vector:
                            continue

                        # Extract EQ signals from content
                        eq_signals = extract_eq_signals(content, chip_type)

                        # Build chip source
                        source = {
                            'source_type': 'kb_intel',
                            'session_id': f'w{week_num:03d}_chip_{line_num}',
                            'week': week_num,
                            'chip_type': chip_type,
                            'chip_id': chip_id,
                            'coaching_insight': content,
                            'insight_vector': insight_vector,
                            'eq_signals': eq_signals,
                            'original_file': batch_file.name,
                            'metadata': {
                                'migration_source': 'v14_to_v32',
                                'migration_date': datetime.now().isoformat(),
                                'quality_score': metadata.get('quality_score'),
                                'confidence_score': metadata.get('confidence_score'),
                                'phase': metadata.get('phase_enum'),
                                'duration': metadata.get('duration'),
                                'participants': metadata.get('participants')
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
                            f'migration_v14_to_v32_kb_w{week_num:03d}_{chip_type}'
                        ))

                        if cur.rowcount > 0:
                            chips_created += 1
                            file_chips_created += 1

                    except json.JSONDecodeError as e:
                        # Skip malformed JSON lines
                        continue

                if file_chips_created > 0:
                    print(f"✓ Created {file_chips_created} EQ chips from {batch_file.name} (week {week_num})")
                else:
                    print(f"- No new chips from {batch_file.name}")

            except Exception as e:
                print(f"✗ Error processing {batch_file.name}: {e}")
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

        cur.execute("""
            SELECT
                source->>'chip_type' as chip_type,
                COUNT(*) as count
            FROM chips
            WHERE student_id = %s
            AND kind = 'EQ'
            AND source->>'source_type' = 'kb_intel'
            GROUP BY source->>'chip_type'
            ORDER BY count DESC
        """, (STUDENT_ID,))

        chip_type_breakdown = cur.fetchall()

        print("\n" + "="*60)
        print("KB Intel → EQ Chips Migration Complete (v2)")
        print("="*60)
        print(f"Batch files processed: {len(batch_files)}")
        print(f"Total KB chips read: {total_kb_chips_processed}")
        print(f"EQ chips created: {chips_created}")
        print(f"Total KB-based EQ chips in DB: {total_kb_chips}")
        print("\nChip Type Breakdown:")
        for chip_type, count in chip_type_breakdown:
            print(f"  {chip_type}: {count}")
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
