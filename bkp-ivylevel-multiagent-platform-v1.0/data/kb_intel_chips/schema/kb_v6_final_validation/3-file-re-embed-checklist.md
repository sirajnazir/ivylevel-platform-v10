# KB v6 Three-File Re-Embed Checklist

## Context
Weeks 24, 27, and 28 were initially in old chip format and failed KB v6 validation. They have been fixed and normalized to KB v6 schema. This checklist ensures clean re-validation and re-embedding.

---

## 📋 Pre-Flight Checks

- [ ] **Backup Current Files**
  ```bash
  cd /Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/chips
  mkdir -p ../backups/pre_fix_w24_27_28
  cp w024_intel_chips_batch.json ../backups/pre_fix_w24_27_28/
  cp w027_intel_chips_batch.json ../backups/pre_fix_w24_27_28/
  cp w028_intel_chips.json ../backups/pre_fix_w24_27_28/
  ```

- [ ] **Verify New Fixed Files Exist**
  - `W024_Intel_Chips_Batch_v1.jsonl` (or .json)
  - `W027_Intel_Chips_Batch_v1.jsonl` (or .json)
  - `W028_Intel_Chips_Batch_v1.jsonl` (or .json)

---

## 🔄 Step 1: Replace Old Files with Fixed Versions

```bash
cd /Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/chips

# Replace old files (adjust source paths as needed)
cp /path/to/fixed/W024_Intel_Chips_Batch_v1.jsonl w024_intel_chips_batch.json
cp /path/to/fixed/W027_Intel_Chips_Batch_v1.jsonl w027_intel_chips_batch.json
cp /path/to/fixed/W028_Intel_Chips_Batch_v1.jsonl w028_intel_chips.json
```

**Expected Result**: Three old-format files replaced with KB v6-compliant versions.

---

## ✅ Step 2: Re-Run Validation (Full Corpus)

```bash
cd /Users/snazir/ivylevel-platform-v10
python3 tools/ingest/validate_kb_v6_chips.py
```

**Expected Output**:
```
🔍 KB v6 Chip Validation
📂 Directory: /Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/chips
📋 Found 89 batch files for weeks 001-093

✅ w024_intel_chips_batch.json: 10/10 chips valid
✅ w027_intel_chips_batch.json: 10/10 chips valid
✅ w028_intel_chips.json: 10/10 chips valid
...

📊 Validation Summary:
   Total Files: 89
   Total Chips: 877
   Valid Chips: 877
   Invalid Chips: 0

   ✅ PASS: 89
   ❌ FAIL: 0
   ⚠️  ERROR: 0
```

**Validation Criteria**:
- ✅ All 877 chips pass validation (100%)
- ✅ 0 invalid chips
- ✅ 0 failed files
- ✅ Weeks 24, 27, 28 show 10/10 chips valid each

**If validation fails**, stop and investigate errors before proceeding.

---

## 🗑️ Step 3: Delete Old Vectors from Pinecone (Overwrite Mode)

**Option A: Delete specific chip IDs** (recommended for precision)
```python
# Delete only W024, W027, W028 vectors
from pinecone import Pinecone
import os

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("jenny-v3-3072-093025")

# Delete by prefix (adjust chip_id patterns as needed)
weeks_to_delete = ["W024", "W027", "W028"]
for week in weeks_to_delete:
    index.delete(filter={"week": int(week[1:])}, namespace="kb_v8_e3l")
    print(f"Deleted {week} vectors from kb_v8_e3l")
```

**Option B: Full namespace deletion** (nuclear option)
```bash
# Only if you want to re-embed ALL 877 chips
python3 -c "
from pinecone import Pinecone
import os
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
index = pc.Index('jenny-v3-3072-093025')
index.delete(delete_all=True, namespace='kb_v8_e3l')
print('Deleted kb_v8_e3l namespace')
"
```

**Expected Result**: Old/invalid vectors removed from kb_v8_e3l namespace.

---

## 🚀 Step 4: Re-Embed Fixed Files

**Option A: Re-embed ONLY weeks 24, 27, 28** (recommended)
```bash
cd /Users/snazir/ivylevel-platform-v10

# Modify embed script to filter for specific weeks
python3 tools/ingest/embed_kb_v6_to_v8.py \
  --weeks 24,27,28 \
  --namespace kb_v8_e3l
```

**Option B: Re-embed entire corpus** (if full namespace was deleted)
```bash
cd /Users/snazir/ivylevel-platform-v10
python3 tools/ingest/embed_kb_v6_to_v8.py
```

**Expected Output**:
```
🚀 KB v6 → v8 Embedding Pipeline
   Index: jenny-v3-3072-093025
   Namespace: kb_v8_e3l
   Embedding Model: text-embedding-3-large
   Batch Size: 32
   Max Tokens: 7500
   Overlap Tokens: 750

📂 Found 89 intel chips batch files
   ✓ w024_intel_chips_batch.json: 10 chips
   ✓ w027_intel_chips_batch.json: 10 chips
   ✓ w028_intel_chips.json: 10 chips
   ...

📊 Total chips loaded: 877
Embedding: 100%|████████████████████| 877/877
  ✅ Upserted 877 chips (final)

✅ KB v6 → v8 Embedding complete!
   Total processed: 877
   Total skipped: 0
   Namespace: kb_v8_e3l
   Vectors in namespace: 864
```

**Embedding Criteria**:
- ✅ 877 chips processed
- ✅ 0 chips skipped
- ✅ ~864 vectors in namespace (due to chunking)

---

## 📊 Step 5: Verify Final State

**Check Pinecone Namespace**:
```python
from pinecone import Pinecone
import os

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("jenny-v3-3072-093025")
stats = index.describe_index_stats()

ns_count = stats.get("namespaces", {}).get("kb_v8_e3l", {}).get("vector_count", 0)
print(f"kb_v8_e3l vector count: {ns_count}")
# Expected: ~864 vectors
```

**Check Week Coverage**:
```bash
cd /Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/chips
ls w*chips*.json | wc -l
# Expected: 89 files
```

**Validation Report**:
```bash
cat /tmp/kb_v6_validation_report.json | python3 -m json.tool
```

**Expected Final Metrics**:

| Metric | Before Fix | After Fix |
|--------|------------|-----------|
| Total Files | 89 | 89 |
| Total Chips | 877 | 877 |
| Valid Chips | 847 (96.6%) | 877 (100%) |
| Invalid Chips | 30 (3.4%) | 0 (0%) |
| Failed Files | 3 (w024, w027, w028) | 0 |
| Pinecone Vectors | ~864 | ~864 |

---

## 📝 Step 6: Audit Traceability

**Generate Final Validation Report**:
```bash
cd /Users/snazir/ivylevel-platform-v10
python3 tools/ingest/validate_kb_v6_chips.py > /tmp/kb_v6_final_validation_$(date +%Y%m%d_%H%M%S).log

# Archive validation report
cp /tmp/kb_v6_validation_report.json \
   data/kb_intel_chips/schema/kb_v6_final_validation/kb_v6_validation_report_$(date +%Y%m%d).json
```

**Document Embedding Job**:
```bash
# Save embedding job metadata
cat > data/kb_intel_chips/schema/kb_v6_final_validation/embedding_job_$(date +%Y%m%d).json << 'EOFMETA'
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "namespace": "kb_v8_e3l",
  "index": "jenny-v3-3072-093025",
  "embedding_model": "text-embedding-3-large",
  "total_chips": 877,
  "total_vectors": 864,
  "weeks_fixed": [24, 27, 28],
  "validation_pass_rate": 100.0,
  "schema_version": "6.0"
}
EOFMETA
```

**Archive Old Files**:
```bash
mkdir -p data/kb_intel_chips/backups/old_format_w24_27_28
mv data/kb_intel_chips/backups/pre_fix_w24_27_28/* \
   data/kb_intel_chips/backups/old_format_w24_27_28/
```

---

## ✅ Final Checklist Sign-Off

- [ ] Old files backed up
- [ ] New files replaced old files
- [ ] Validation shows 877/877 chips valid (100%)
- [ ] Old vectors deleted from Pinecone
- [ ] New vectors embedded successfully
- [ ] Pinecone namespace shows ~864 vectors
- [ ] Validation report archived with timestamp
- [ ] Embedding job metadata documented
- [ ] Old format files archived

**Sign-off Date**: ________________  
**Validated By**: ________________  
**Embedding Job ID**: ________________

---

## 🔧 Troubleshooting

**Issue**: Validation still shows failures after file replacement  
**Solution**: Verify file paths and ensure new files are in correct directory with correct names

**Issue**: Pinecone vectors not deleted  
**Solution**: Check filter syntax and namespace name; use Option B (full deletion) if needed

**Issue**: Embedding script skips chips  
**Solution**: Check content length (must be ≥50 chars) and required fields (chip_id, type, source_doc, metadata, content)

**Issue**: Vector count doesn't match chip count  
**Solution**: Normal due to chunking; ~864 vectors from 877 chips is expected

---

## 📚 References

- **Validation Script**: `/Users/snazir/ivylevel-platform-v10/tools/ingest/validate_kb_v6_chips.py`
- **Embedding Script**: `/Users/snazir/ivylevel-platform-v10/tools/ingest/embed_kb_v6_to_v8.py`
- **Schema Template**: `/Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/schema/kb_v6_final_validation/kb_v6_final_validation_report_template.json`
- **Chips Directory**: `/Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/chips`
