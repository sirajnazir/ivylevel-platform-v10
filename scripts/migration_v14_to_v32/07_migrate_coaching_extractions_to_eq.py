#!/usr/bin/env python3
"""
Migration Script: Coaching Extractions → EQ Chips
Source: /data/coaching_intelligence/extractions/*.json (v14)
Target: chips (v3.2)
Expected: 10-30 high-quality EQ chips from 11 structured extractions
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
EXTRACTIONS_DIR = Path('/Users/snazir/ivylevel-platform-v10/data/coaching_intelligence/extractions')
STUDENT_ID = 'huda-2025'

def extract_eq_from_coaching(extraction_data):
    """Extract EQ insights from coaching extraction"""
    eq_chips = []

    # Extract from EQ patterns
    eq_patterns = extraction_data.get('eq_patterns', {})
    if eq_patterns:
        eq_chip = {
            'type': 'eq_patterns',
            'eq_signals': {
                'self_awareness': eq_patterns.get('self_awareness', {}).get('level'),
                'motivation': eq_patterns.get('motivation', {}).get('level'),
                'confidence': eq_patterns.get('confidence', {}).get('level'),
                'resilience': eq_patterns.get('resilience', {}).get('level'),
                'growth_mindset': eq_patterns.get('growth_mindset', {}).get('level'),
                'collaboration': eq_patterns.get('collaboration', {}).get('level')
            },
            'evidence': {
                'self_awareness': eq_patterns.get('self_awareness', {}).get('evidence', []),
                'motivation': eq_patterns.get('motivation', {}).get('evidence', []),
                'confidence': eq_patterns.get('confidence', {}).get('evidence', []),
                'resilience': eq_patterns.get('resilience', {}).get('evidence', []),
                'growth_mindset': eq_patterns.get('growth_mindset', {}).get('evidence', []),
                'collaboration': eq_patterns.get('collaboration', {}).get('evidence', [])
            }
        }
        eq_chips.append(eq_chip)

    # Extract from growth journey
    growth_journey = extraction_data.get('growth_journey', [])
    for event in growth_journey:
        if event.get('transformation_type') or event.get('breakthrough_moment'):
            eq_chip = {
                'type': 'growth_event',
                'event_description': event.get('event'),
                'transformation': event.get('transformation_type'),
                'breakthrough': event.get('breakthrough_moment'),
                'timeframe': event.get('timeframe'),
                'eq_signals': {
                    'self_awareness': 'detected' if 'aware' in str(event).lower() else None,
                    'resilience': 'detected' if 'overcome' in str(event).lower() else None,
                    'growth_mindset': 'detected' if 'growth' in str(event).lower() else None
                }
            }
            eq_chips.append(eq_chip)

    # Extract from barriers overcome
    barriers = extraction_data.get('barriers_overcome', [])
    for barrier in barriers:
        eq_chip = {
            'type': 'barrier_overcome',
            'barrier_type': barrier.get('barrier_type'),
            'description': barrier.get('description'),
            'resolution': barrier.get('resolution'),
            'coach_support': barrier.get('coach_support'),
            'eq_signals': {
                'resilience': 'high',
                'self_awareness': 'detected',
                'confidence': 'improved'
            }
        }
        eq_chips.append(eq_chip)

    return eq_chips

def migrate_coaching_extractions():
    """Migrate coaching extractions to EQ chips"""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        # Clear existing extraction-based EQ chips (idempotent)
        print("Clearing existing extraction-based EQ chips...")
        cur.execute("""
            DELETE FROM chips
            WHERE student_id = %s
            AND kind = 'EQ'
            AND source->>'source_type' = 'coaching_extraction'
            AND trace_id LIKE 'migration_v14_to_v32_extraction%%'
        """, (STUDENT_ID,))
        print(f"Cleared {cur.rowcount} existing chips")

        # Get all extraction files (look for Huda-related files)
        extraction_files = sorted(EXTRACTIONS_DIR.glob('*.json'))
        print(f"\nFound {len(extraction_files)} extraction files")

        chips_created = 0
        chips_skipped = 0

        for extraction_file in extraction_files:
            # Only process files that might be Huda-related
            # (we'll check student_id inside the file)
            try:
                with open(extraction_file, 'r') as f:
                    extraction_data = json.load(f)

                # Check if this is Huda's data
                student_name = extraction_data.get('student_profile', {}).get('name', '').lower()
                if 'huda' not in student_name and 'huda' not in extraction_file.name.lower():
                    print(f"Skipping {extraction_file.name} (not Huda's data)")
                    continue

                print(f"\nProcessing {extraction_file.name}...")

                # Extract EQ chips
                eq_chips = extract_eq_from_coaching(extraction_data)

                for i, eq_data in enumerate(eq_chips):
                    # Build chip source
                    source = {
                        'source_type': 'coaching_extraction',
                        'extraction_file': extraction_file.name,
                        'chip_index': i,
                        'eq_type': eq_data.get('type'),
                        'eq_signals': eq_data.get('eq_signals', {}),
                        'evidence': eq_data.get('evidence', {}),
                        'event_description': eq_data.get('event_description'),
                        'transformation': eq_data.get('transformation'),
                        'breakthrough': eq_data.get('breakthrough'),
                        'barrier_type': eq_data.get('barrier_type'),
                        'resolution': eq_data.get('resolution'),
                        'metadata': {
                            'migration_source': 'v14_to_v32',
                            'migration_date': datetime.now().isoformat(),
                            'extraction_metadata': extraction_data.get('metadata', {})
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
                        f'migration_v14_to_v32_extraction_{extraction_file.stem}_{i}'
                    ))

                    if cur.rowcount > 0:
                        chips_created += 1
                        print(f"  ✓ Created EQ chip #{i} (type: {eq_data.get('type')})")
                    else:
                        chips_skipped += 1

            except Exception as e:
                print(f"✗ Error processing {extraction_file.name}: {e}")
                chips_skipped += 1

        # Commit transaction
        conn.commit()

        # Verification
        cur.execute("""
            SELECT COUNT(*) FROM chips
            WHERE student_id = %s
            AND kind = 'EQ'
            AND source->>'source_type' = 'coaching_extraction'
        """, (STUDENT_ID,))

        total_extraction_chips = cur.fetchone()[0]

        print("\n" + "="*60)
        print("Coaching Extractions → EQ Chips Migration Complete")
        print("="*60)
        print(f"Files processed: {len(extraction_files)}")
        print(f"Chips created: {chips_created}")
        print(f"Chips skipped: {chips_skipped}")
        print(f"Total extraction-based EQ chips in DB: {total_extraction_chips}")
        print("="*60)

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate_coaching_extractions()
