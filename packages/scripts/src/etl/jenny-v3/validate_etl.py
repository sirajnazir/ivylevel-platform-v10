# validate_etl.py
# Validators and acceptance checks for Jenny AI ETL
# Run after ETL to ensure data integrity and golden guarantees

import psycopg
from datetime import datetime
from typing import List, Dict, Tuple

class ETLValidator:
    def __init__(self, connection_string: str = None):
        self.connection_string = connection_string or "postgresql://localhost/jenny_ai"
        self.checks_passed = 0
        self.checks_failed = 0
        self.results = []
    
    def run_check(self, name: str, query: str, expected_count: int = 0) -> bool:
        """Run a validation check and record results"""
        with psycopg.connect(self.connection_string) as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                result = cursor.fetchone()
                count = result[0] if result else 0
                
                passed = count == expected_count
                status = "✓ PASSED" if passed else "✗ FAILED"
                
                if passed:
                    self.checks_passed += 1
                else:
                    self.checks_failed += 1
                
                self.results.append({
                    "name": name,
                    "status": status,
                    "expected": expected_count,
                    "actual": count
                })
                
                print(f"{status}: {name} (expected: {expected_count}, actual: {count})")
                return passed
    
    def run_query_check(self, name: str, query: str) -> List[Tuple]:
        """Run a query and return results for manual inspection"""
        with psycopg.connect(self.connection_string) as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                results = cursor.fetchall()
                
                print(f"\n{name}:")
                if results:
                    for row in results[:10]:  # Show first 10 rows
                        print(f"  {row}")
                    if len(results) > 10:
                        print(f"  ... and {len(results) - 10} more rows")
                else:
                    print("  No results found")
                
                return results
    
    def run_all_checks(self):
        """Run all validation checks"""
        print("=" * 60)
        print("JENNY AI ETL VALIDATION REPORT")
        print("=" * 60)
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("\n")
        
        # A. Facts must have sources
        self.run_check(
            "All facts have source references",
            "SELECT COUNT(*) FROM vital_facts WHERE source_id IS NULL",
            expected_count=0
        )
        
        # B. Interactions schema v1.1 sanity
        self.run_check(
            "All tactics are valid",
            """
            SELECT COUNT(*) FROM interactions 
            WHERE tactic_name IS NOT NULL 
            AND tactic_name NOT IN (SELECT name FROM tactic_kinds)
            """,
            expected_count=0
        )
        
        self.run_check(
            "All frameworks are valid",
            """
            SELECT COUNT(*) FROM interactions 
            WHERE framework IS NOT NULL 
            AND framework NOT IN (SELECT name FROM framework_kinds)
            """,
            expected_count=0
        )
        
        # C. Outcomes tied to lifecycle for applications
        self.run_check(
            "Admission outcomes have lifecycle items",
            """
            SELECT COUNT(*) FROM outcomes o
            WHERE o.type IN ('admission', 'result') 
            AND o.admission_result IS NOT NULL
            AND o.lifecycle_item_id IS NULL
            """,
            expected_count=0
        )
        
        # D. Referential integrity
        self.run_check(
            "All interaction JTBDs exist",
            """
            SELECT COUNT(*) FROM interactions 
            WHERE jtbd_id NOT IN (SELECT jtbd_id FROM jtbd)
            """,
            expected_count=0
        )
        
        self.run_check(
            "All outcome JTBDs exist",
            """
            SELECT COUNT(*) FROM outcomes 
            WHERE jtbd_id IS NOT NULL 
            AND jtbd_id NOT IN (SELECT jtbd_id FROM jtbd)
            """,
            expected_count=0
        )
        
        # E. Date validation
        self.run_check(
            "Admission outcomes have dates",
            """
            SELECT COUNT(*) FROM outcomes 
            WHERE type = 'admission' 
            AND occurred_at IS NULL
            """,
            expected_count=0
        )
        
        # F. Check for duplicates
        print("\n--- Duplicate Checks ---")
        self.run_query_check(
            "Duplicate outcomes by natural key",
            """
            WITH duplicates AS (
                SELECT 
                    student_id, jtbd_id, type, 
                    details_json::text, occurred_at,
                    COUNT(*) as count
                FROM outcomes
                GROUP BY student_id, jtbd_id, type, details_json::text, occurred_at
                HAVING COUNT(*) > 1
            )
            SELECT * FROM duplicates
            """
        )
        
        # Golden fact checks
        print("\n--- Golden Fact Verification ---")
        self.run_query_check(
            "SAT scores for huda-2025",
            """
            SELECT kind, value, fact_date, source_id 
            FROM vital_facts 
            WHERE student_id = 'huda-2025' 
            AND kind LIKE 'sat%'
            ORDER BY fact_date DESC
            """
        )
        
        self.run_query_check(
            "Admission outcomes for huda-2025",
            """
            SELECT 
                o.type, o.admission_result, 
                li.school, li.status,
                o.occurred_at, o.source_id
            FROM outcomes o
            LEFT JOIN lifecycle_items li ON o.lifecycle_item_id = li.item_id
            WHERE o.student_id = 'huda-2025'
            AND o.type = 'admission'
            ORDER BY o.occurred_at
            """
        )
        
        # Stats summary
        print("\n--- Data Summary ---")
        self.run_query_check(
            "Table row counts",
            """
            SELECT 
                'students' as table_name, COUNT(*) as count FROM students
            UNION ALL
            SELECT 'sources', COUNT(*) FROM sources
            UNION ALL
            SELECT 'jtbd', COUNT(*) FROM jtbd
            UNION ALL
            SELECT 'vital_facts', COUNT(*) FROM vital_facts
            UNION ALL
            SELECT 'interactions', COUNT(*) FROM interactions
            UNION ALL
            SELECT 'outcomes', COUNT(*) FROM outcomes
            UNION ALL
            SELECT 'lifecycle_items', COUNT(*) FROM lifecycle_items
            ORDER BY count DESC
            """
        )
        
        self.run_query_check(
            "Tactics usage distribution",
            """
            SELECT tactic_name, COUNT(*) as usage_count
            FROM interactions
            WHERE tactic_name IS NOT NULL
            AND excluded_from_tactic_scoring = false
            GROUP BY tactic_name
            ORDER BY usage_count DESC
            LIMIT 10
            """
        )
        
        # Final summary
        print("\n" + "=" * 60)
        print(f"VALIDATION SUMMARY:")
        print(f"  Checks Passed: {self.checks_passed}")
        print(f"  Checks Failed: {self.checks_failed}")
        print(f"  Total Checks: {self.checks_passed + self.checks_failed}")
        print("=" * 60)
        
        if self.checks_failed > 0:
            print("\n⚠️  VALIDATION FAILED - Please review failed checks above")
            return False
        else:
            print("\n✅ ALL VALIDATION CHECKS PASSED")
            return True

def main():
    import sys
    
    conn_string = sys.argv[1] if len(sys.argv) > 1 else None
    
    validator = ETLValidator(conn_string)
    success = validator.run_all_checks()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()