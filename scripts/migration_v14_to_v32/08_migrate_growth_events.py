#!/usr/bin/env python3
"""
Migration Script: Coaching Extractions → Growth Events
Source: /data/coaching_intelligence/extractions/*.json (v14)
Target: growth_events (v3.2)
Expected: 15-25 growth events from barriers_overcome + growth_journey
"""

import json
import psycopg2
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

# Barrier type mapping
BARRIER_TYPE_MAP = {
    'confidence': 'INTERNAL_CONFIDENCE',
    'self-doubt': 'INTERNAL_CONFIDENCE',
    'anxiety': 'INTERNAL_CONFIDENCE',
    'social': 'SOCIAL_EXCLUSION',
    'peer pressure': 'SOCIAL_EXCLUSION',
    'parent': 'PARENT_CONFLICT',
    'family': 'PARENT_CONFLICT',
    'motivation': 'MOTIVATION_DROP',
    'burnout': 'BURNOUT',
    'time management': 'TIME_MANAGEMENT',
    'procrastination': 'TIME_MANAGEMENT',
    'neurodiversity': 'NEURODIVERSITY',
    'adhd': 'NEURODIVERSITY',
    'self-image': 'SELF_IMAGE',
    'identity': 'SELF_IMAGE'
}

def map_barrier_type(description):
    """Map barrier description to BARRIER_TYPE enum"""
    description_lower = description.lower()

    for keyword, barrier_type in BARRIER_TYPE_MAP.items():
        if keyword in description_lower:
            return barrier_type

    # Default
    return 'INTERNAL_CONFIDENCE'

def extract_growth_events(extraction_data):
    """Extract growth events from coaching extraction"""
    events = []

    # Extract from barriers_overcome
    barriers = extraction_data.get('barriers_overcome', [])
    for barrier in barriers:
        event = {
            'source': 'barrier_overcome',
            'barrier_type': map_barrier_type(barrier.get('barrier_type', '')),
            'trigger': barrier.get('description', ''),
            'coach_reflection': barrier.get('coach_support', ''),
            'transformation_delta': 0.7,  # Default high transformation for overcome barriers
            'breakthrough': True,
            'metadata': {
                'original_barrier_type': barrier.get('barrier_type'),
                'resolution': barrier.get('resolution')
            }
        }
        events.append(event)

    # Extract from growth_journey
    growth_journey = extraction_data.get('growth_journey', [])
    for journey_event in growth_journey:
        if journey_event.get('transformation_type'):
            # Determine breakthrough and transformation delta
            transformation_type = journey_event.get('transformation_type', '').lower()
            breakthrough = 'breakthrough' in transformation_type or 'major' in transformation_type

            # Higher delta for breakthroughs
            transformation_delta = 0.8 if breakthrough else 0.5

            event = {
                'source': 'growth_journey',
                'barrier_type': map_barrier_type(journey_event.get('event', '')),
                'trigger': journey_event.get('event', ''),
                'coach_reflection': journey_event.get('transformation_type', ''),
                'transformation_delta': transformation_delta,
                'breakthrough': breakthrough,
                'metadata': {
                    'timeframe': journey_event.get('timeframe'),
                    'transformation_type': journey_event.get('transformation_type'),
                    'breakthrough_moment': journey_event.get('breakthrough_moment')
                }
            }
            events.append(event)

    return events

def migrate_growth_events():
    """Migrate coaching extractions to growth events"""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        # Clear existing migration-based growth events (idempotent)
        print("Clearing existing migration-based growth events...")
        cur.execute("""
            DELETE FROM growth_events
            WHERE student_id = %s
            AND trace_id LIKE 'migration_v14_to_v32_growth%%'
        """, (STUDENT_ID,))
        print(f"Cleared {cur.rowcount} existing events")

        # Get all extraction files
        extraction_files = sorted(EXTRACTIONS_DIR.glob('*.json'))
        print(f"\nFound {len(extraction_files)} extraction files")

        events_created = 0
        events_skipped = 0

        for extraction_file in extraction_files:
            try:
                with open(extraction_file, 'r') as f:
                    extraction_data = json.load(f)

                # Check if this is Huda's data
                student_name = extraction_data.get('student_profile', {}).get('name', '').lower()
                if 'huda' not in student_name and 'huda' not in extraction_file.name.lower():
                    print(f"Skipping {extraction_file.name} (not Huda's data)")
                    continue

                print(f"\nProcessing {extraction_file.name}...")

                # Extract growth events
                events = extract_growth_events(extraction_data)

                for i, event in enumerate(events):
                    # Insert growth event
                    cur.execute("""
                        INSERT INTO growth_events (
                            id, student_id, barrier_type, trigger, coach_reflection,
                            transformation_delta, breakthrough, metadata, trace_id, created_at
                        )
                        VALUES (
                            gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s::jsonb, %s, NOW()
                        )
                    """, (
                        STUDENT_ID,
                        event['barrier_type'],
                        event['trigger'],
                        event['coach_reflection'],
                        event['transformation_delta'],
                        event['breakthrough'],
                        json.dumps(event.get('metadata', {})),
                        f'migration_v14_to_v32_growth_{extraction_file.stem}_{i}'
                    ))

                    events_created += 1
                    print(f"  ✓ Created growth event #{i} (barrier: {event['barrier_type']}, "
                          f"breakthrough: {event['breakthrough']})")

            except Exception as e:
                print(f"✗ Error processing {extraction_file.name}: {e}")
                events_skipped += 1

        # Commit transaction
        conn.commit()

        # Verification
        cur.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE breakthrough = TRUE) as breakthroughs,
                AVG(transformation_delta) as avg_delta
            FROM growth_events
            WHERE student_id = %s
            AND trace_id LIKE 'migration_v14_to_v32_growth%%'
        """, (STUDENT_ID,))

        stats = cur.fetchone()

        print("\n" + "="*60)
        print("Coaching Extractions → Growth Events Migration Complete")
        print("="*60)
        print(f"Files processed: {len(extraction_files)}")
        print(f"Events created: {events_created}")
        print(f"Events skipped: {events_skipped}")
        print(f"Total growth events in DB: {stats[0]}")
        print(f"Breakthrough events: {stats[1]}")
        print(f"Average transformation delta: {stats[2]:.2f}")
        print("="*60)

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate_growth_events()
