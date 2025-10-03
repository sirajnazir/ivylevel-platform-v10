# api_contracts.py
# API contract definitions for Jenny AI v3
# These are the endpoints that must be implemented for the orchestrator

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# ============================================
# Request/Response Models
# ============================================

class VitalFact(BaseModel):
    kind: str
    value: str
    unit: Optional[str] = None
    date: datetime
    confidence: str
    source_id: str

class Timeline(BaseModel):
    kind: str
    events: List[Dict[str, Any]]

class VitalsResponse(BaseModel):
    facts: List[VitalFact]
    timelines: Dict[str, Timeline]

class LifecycleItem(BaseModel):
    item_id: str
    school: Optional[str] = None
    status: str
    domain: str
    submitted: Optional[datetime] = None
    outcome_date: Optional[datetime] = None
    admission_result: Optional[str] = None
    sources: List[str]

class SearchFilter(BaseModel):
    student_id: Optional[str] = None
    jtbd_id: Optional[str] = None
    tactic_name: Optional[str] = None
    framework: Optional[str] = None
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None

class SearchRequest(BaseModel):
    q: str
    filters: Optional[SearchFilter] = None
    limit: int = Field(default=20, ge=1, le=100)

class SearchHit(BaseModel):
    id: str
    score: float
    namespace: str
    metadata: Dict[str, Any]

class SearchResponse(BaseModel):
    hits: List[SearchHit]
    total: int

class TacticOutcome(BaseModel):
    tactic_name: str
    admission_result: str
    count: int
    rate: Optional[float] = None

class AnalyticsResponse(BaseModel):
    student_id: str
    matrix: List[TacticOutcome]
    total_interactions: int
    total_outcomes: int

class Evidence(BaseModel):
    evidence_id: str
    source_id: str
    source_title: str
    source_type: str
    snippet_id: Optional[str] = None
    quote: Optional[str] = None

# ============================================
# API Endpoint Specifications
# ============================================

API_SPECS = {
    "vitals": {
        "method": "GET",
        "path": "/students/{student_id}/vitals",
        "description": "Get all vital facts and timelines for a student",
        "response": VitalsResponse,
        "example_curl": """
curl -X GET "http://localhost:8080/students/huda-2025/vitals"
        """,
        "example_response": {
            "facts": [
                {
                    "kind": "sat_total_score",
                    "value": "1530",
                    "unit": None,
                    "date": "2024-04-17T00:00:00Z",
                    "confidence": "high",
                    "source_id": "SRC-W044"
                }
            ],
            "timelines": {
                "sat_scores": {
                    "kind": "test_scores",
                    "events": [
                        {"date": "2024-01-15", "value": 1480, "source_id": "SRC-W020"},
                        {"date": "2024-04-17", "value": 1530, "source_id": "SRC-W044"}
                    ]
                }
            }
        }
    },
    
    "lifecycle": {
        "method": "GET",
        "path": "/students/{student_id}/lifecycle",
        "description": "Get lifecycle items for a student, optionally filtered by domain",
        "parameters": {
            "domain": "Optional lifecycle_domain filter (application, test, etc.)"
        },
        "response": List[LifecycleItem],
        "example_curl": """
curl -X GET "http://localhost:8080/students/huda-2025/lifecycle?domain=application"
        """,
        "example_response": [
            {
                "item_id": "APP-USC-2025",
                "school": "USC",
                "status": "outcome",
                "domain": "application",
                "submitted": "2023-10-27T00:00:00Z",
                "outcome_date": "2024-03-25T00:00:00Z",
                "admission_result": "accepted",
                "sources": ["SRC-W080", "SRC-W082"]
            }
        ]
    },
    
    "search": {
        "method": "POST",
        "path": "/search",
        "description": "Hybrid search across JTBD and interactions",
        "request": SearchRequest,
        "response": SearchResponse,
        "example_curl": """
curl -X POST "http://localhost:8080/search" \\
  -H "Content-Type: application/json" \\
  -d '{
    "q": "how did we fix SAT slips?",
    "filters": {"student_id": "huda-2025"}
  }'
        """,
        "example_response": {
            "hits": [
                {
                    "id": "abc123",
                    "score": 0.92,
                    "namespace": "interactions",
                    "metadata": {
                        "snippet_id": "SNP-W041-001",
                        "jtbd_id": "JTBD-W041-CAMERON-SYNTHORIA",
                        "tactic_name": "spaced_practice",
                        "framework": "SMART"
                    }
                }
            ],
            "total": 3
        }
    },
    
    "analytics": {
        "method": "GET",
        "path": "/analytics/tactic-outcomes",
        "description": "Get tactic→outcome correlation matrix",
        "parameters": {
            "student_id": "Required student ID"
        },
        "response": AnalyticsResponse,
        "example_curl": """
curl -X GET "http://localhost:8080/analytics/tactic-outcomes?student_id=huda-2025"
        """,
        "example_response": {
            "student_id": "huda-2025",
            "matrix": [
                {
                    "tactic_name": "spaced_practice",
                    "admission_result": "accepted",
                    "count": 15,
                    "rate": 0.75
                }
            ],
            "total_interactions": 234,
            "total_outcomes": 8
        }
    },
    
    "evidence": {
        "method": "GET",
        "path": "/evidence",
        "description": "Resolve evidence IDs to source information",
        "parameters": {
            "ids": "Comma-separated list of evidence IDs"
        },
        "response": List[Evidence],
        "example_curl": """
curl -X GET "http://localhost:8080/evidence?ids=ev123,ev456"
        """,
        "example_response": [
            {
                "evidence_id": "ev123",
                "source_id": "SRC-W044",
                "source_title": "W041 SAT Prep Transcript",
                "source_type": "transcript",
                "snippet_id": "SNP-W041-001",
                "quote": "Let's use spaced practice..."
            }
        ]
    }
}

# ============================================
# SQL Query Templates
# ============================================

SQL_TEMPLATES = {
    "get_vitals": """
        SELECT 
            vf.kind, vf.value, vf.unit, vf.fact_date, 
            vf.confidence, vf.source_id
        FROM vital_facts vf
        WHERE vf.student_id = %(student_id)s
        ORDER BY vf.fact_date DESC, vf.kind
    """,
    
    "get_lifecycle": """
        SELECT 
            li.item_id, li.school, li.status, li.domain,
            li.submitted_at, li.outcome_date,
            o.admission_result,
            array_agg(DISTINCT COALESCE(o.source_id, li.source_id)) as sources
        FROM lifecycle_items li
        LEFT JOIN outcomes o ON li.item_id = o.lifecycle_item_id
        WHERE li.student_id = %(student_id)s
        AND (%(domain)s IS NULL OR li.domain = %(domain)s)
        GROUP BY li.item_id, li.school, li.status, li.domain,
                 li.submitted_at, li.outcome_date, o.admission_result
        ORDER BY li.outcome_date DESC NULLS LAST, li.submitted_at DESC NULLS LAST
    """,
    
    "get_tactic_outcomes": """
        WITH tactic_counts AS (
            SELECT 
                i.tactic_name,
                o.admission_result,
                COUNT(*) as count
            FROM interactions i
            JOIN outcomes o ON i.jtbd_id = o.jtbd_id
            WHERE i.student_id = %(student_id)s
            AND i.tactic_name IS NOT NULL
            AND i.excluded_from_tactic_scoring = false
            AND o.type = 'admission'
            AND o.admission_result IS NOT NULL
            GROUP BY i.tactic_name, o.admission_result
        ),
        tactic_totals AS (
            SELECT 
                tactic_name,
                SUM(count) as total
            FROM tactic_counts
            GROUP BY tactic_name
        )
        SELECT 
            tc.tactic_name,
            tc.admission_result,
            tc.count,
            CASE 
                WHEN tt.total >= 5 THEN tc.count::float / tt.total
                ELSE NULL
            END as rate
        FROM tactic_counts tc
        JOIN tactic_totals tt ON tc.tactic_name = tt.tactic_name
        ORDER BY tc.tactic_name, tc.admission_result
    """,
    
    "resolve_evidence": """
        SELECT 
            el.evidence_id,
            el.source_id,
            s.title as source_title,
            s.source_type,
            el.snippet_id,
            el.quote
        FROM evidence_links el
        JOIN sources s ON el.source_id = s.source_id
        WHERE el.evidence_id = ANY(%(evidence_ids)s::uuid[])
    """
}

# ============================================
# Implementation Guidelines
# ============================================

IMPLEMENTATION_NOTES = """
Jenny AI v3 API Implementation Guidelines:

1. Vitals-First Architecture:
   - Always fetch facts/lifecycle from Postgres first
   - Use Pinecone only for narrative search (jtbd, interactions)
   - Never store facts/outcomes in vector DB

2. Evidence Requirements:
   - Every factual claim must have source_id
   - Evidence chips must resolve to real sources
   - Reject responses lacking proper evidence

3. Orchestration Flow:
   ```
   User Query
      ↓
   Query Rewriting (add student context, time bounds)
      ↓
   Vitals/Lifecycle Fetch (Postgres)
      ↓
   Hybrid Search if needed (Pinecone + BM25)
      ↓
   Re-ranking
      ↓
   Evidence Resolution
      ↓
   LLM Composition with Facts
   ```

4. Performance Tips:
   - Cache vitals/lifecycle for session
   - Batch evidence resolution
   - Use connection pooling for Postgres

5. Testing Requirements:
   - Golden fact queries must pass
   - Evidence chips must resolve
   - No hallucinated data in responses
"""

if __name__ == "__main__":
    # Print API documentation
    print("Jenny AI v3 API Contracts")
    print("=" * 60)
    
    for endpoint, spec in API_SPECS.items():
        print(f"\n{endpoint.upper()} API:")
        print(f"  Method: {spec['method']}")
        print(f"  Path: {spec['path']}")
        print(f"  Description: {spec['description']}")
        print(f"\n  Example:")
        print(spec['example_curl'].strip())
        print()
    
    print(IMPLEMENTATION_NOTES)