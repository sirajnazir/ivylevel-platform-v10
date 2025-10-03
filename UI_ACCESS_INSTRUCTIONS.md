# How to Access Jenny v3 Test Chat UI

## Current Status
✅ **Jenny v3 API** is running at `http://localhost:8787`
✅ **Test Chat UI** is running at `http://localhost:3001`

## Access the UI
Simply open your web browser and go to:

### 🌐 http://localhost:3001

## What You'll See
- **Left Panel**: Chat interface
  - Student ID field (set to "huda-2025")
  - Message input box
  - Send button
  - Chat history

- **Right Panel**: Trace Viewer
  - Shows "Send a message to see step-by-step execution trace"
  - After sending a message, click "view trace" to see execution details
  - Color-coded badges for different components
  - Expandable details for each operation

## Test Queries

### 1. Test Canonical Facts (SAT Score)
```
What was my SAT score?
```
Expected response:
- "Your SAT total score is **1530** (recorded 4/17/2024, confidence: high)"
- Trace ID starting with "cff-"

### 2. Test General Query
```
How can I improve my college application?
```
Expected response:
- Personalized advice using RAG pipeline
- Trace ID starting with "rag-"

## If You See an Error
If the page shows 404 or doesn't load:
1. Make sure both services are running:
   - Jenny API on port 8787
   - Test Chat UI on port 3001
2. Clear browser cache
3. Try http://localhost:3001 (not 3000)

## Features in the UI
- **Real-time chat** with Jenny v3
- **Trace visualization** showing:
  - Intent detection
  - Vector search (Pinecone)
  - Reranking (Cohere)
  - LLM composition (OpenAI)
  - Canonical fact resolution
- **Student vitals** display
- **Evidence chips** for source references

The system is fully functional and ready for testing!