import { Router } from 'express';
import { ConversationTracer } from '../agents/shared/ConversationTracer.js';

const router = Router();

/**
 * GET /debug/trace/:session_id
 * Analyze conversation flow for a session
 */
router.get('/trace/:session_id', (req, res) => {
  const { session_id } = req.params;

  const analysis = ConversationTracer.analyzeFlow(session_id);

  res.json({
    session_id,
    analysis,
    events: ConversationTracer.getSessionEvents(session_id),
    timeline: ConversationTracer.getTimeline(session_id),
  });
});

/**
 * GET /debug/trace/:session_id/missing
 * Show which v36.0 methods are NOT being called
 */
router.get('/trace/:session_id/missing', (req, res) => {
  const { session_id } = req.params;

  const analysis = ConversationTracer.analyzeFlow(session_id);

  const causes: Record<string, string> = {
    'FRUSTRATION_CHECK': 'detectFrustration() not being called',
    'FIELD_NORMALIZATION_STARTED': 'normalizeExtractedFields() not being called',
    'MEMORY_UPDATE_STARTED': 'updateConversationMemory() not being called',
    'QUESTION_VALIDATION_STARTED': 'validateQuestion() not being called before returning',
  };

  const fixes: Record<string, string> = {
    'FRUSTRATION_CHECK': 'Add this.detectFrustration() in extractAndStoreFacts',
    'FIELD_NORMALIZATION_STARTED': 'Add this.normalizeExtractedFields() after extraction',
    'MEMORY_UPDATE_STARTED': 'Add this.updateConversationMemory() after storing facts',
    'QUESTION_VALIDATION_STARTED': 'Add await this.validateQuestion() before return',
  };

  const recommendations = analysis.missing_events.map(event => ({
    event,
    likely_cause: causes[event] || 'Unknown',
    fix: fixes[event] || 'Unknown',
  }));

  res.json({
    session_id,
    missing_events: analysis.missing_events,
    events_found: analysis.events_found,
    recommendations,
    analysis_text: analysis.analysis,
  });
});

/**
 * GET /debug/trace/clear
 * Clear all trace events (for testing)
 */
router.get('/trace/clear', (req, res) => {
  ConversationTracer.clear();
  res.json({ message: 'All trace events cleared' });
});

export default router;
