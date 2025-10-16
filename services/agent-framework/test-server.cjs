const express = require('express');
const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Health route
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Test chat route
app.post('/agent/chat', (req, res) => {
  console.log('Test chat request:', req.body);
  res.json({
    answer: "This is a test response from the working API server!",
    session_id: "test-session-123",
    hits: [],
    vitals: { facts: [] },
    model: "test-model"
  });
});

// Test vitals route
app.get('/students/:id/vitals', (req, res) => {
  res.json({
    student_id: req.params.id,
    facts: [
      { kind: "test_fact", value: "test_value", fact_date: "2025-01-01", confidence: "high", source_id: "TEST" }
    ]
  });
});

const port = 8787;
app.listen(port, () => {
  console.log(`Test API server running on ${port}`);
  console.log('Available routes:');
  console.log('  GET  /health');
  console.log('  POST /agent/chat');
  console.log('  GET  /students/:id/vitals');
});
