#!/bin/bash
#
# One-line smoke tests for KB QA
#

export PINECONE_INDEX="${PINECONE_INDEX:-jenny-v3-3072-093025}"
export NS_SESS="${NS_SESS:-KBv6_2025-10-06_v1.0}"
export NS_IMSG="${NS_IMSG:-KBv6_iMessage_2025-10-07_v1.0}"

echo "🔥 KB Smoke Tests"
echo ""

# Test 1: Sessions namespace - Naviance query
echo "Test 1: Sessions - Naviance scattergram query"
python3 - << 'PY'
from pinecone import Pinecone
from openai import OpenAI
import os

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
idx = pc.Index(os.getenv("PINECONE_INDEX"))
oa = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

e = oa.embeddings.create(model="text-embedding-3-large", input="Naviance scattergram acceptance history").data[0].embedding
r = idx.query(vector=e, top_k=3, include_metadata=True, namespace=os.getenv("NS_SESS"))

print(f"  Top-3 Results:")
for m in r.matches:
    print(f"    - {m.metadata.get('chip_id', 'N/A')} (score={m.score:.3f}, week={m.metadata.get('week', '?')})")

if r.matches and r.matches[0].score >= 0.40:
    print(f"  ✅ PASS: Top hit score {r.matches[0].score:.3f} >= 0.40")
else:
    print(f"  ❌ FAIL: Top hit score too low")
PY

echo ""

# Test 2: iMessage namespace - Template query
echo "Test 2: iMessage - Thank you note template"
python3 - << 'PY'
from pinecone import Pinecone
from openai import OpenAI
import os

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
idx = pc.Index(os.getenv("PINECONE_INDEX"))
oa = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

e = oa.embeddings.create(model="text-embedding-3-large", input="thank you note template after help").data[0].embedding
r = idx.query(vector=e, top_k=3, include_metadata=True, namespace=os.getenv("NS_IMSG"))

print(f"  Top-3 Results:")
for m in r.matches:
    print(f"    - {m.metadata.get('chip_id', 'N/A')} (type={m.metadata.get('type', '?')}, score={m.score:.3f})")

if r.matches and r.matches[0].score >= 0.35:
    print(f"  ✅ PASS: Top hit score {r.matches[0].score:.3f} >= 0.35")
else:
    print(f"  ❌ FAIL: Top hit score too low")
PY

echo ""
echo "✅ Smoke tests complete"
