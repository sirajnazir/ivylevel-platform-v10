import { moderate } from '../ai/openai.js';
import { createTracedOpenAI } from '../tracing/wrapped-clients.js';
import { Trace } from '../tracing/trace.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('compose-traced');

export async function composeAnswerTraced({ 
  message, 
  vitals, 
  hits, 
  memory, 
  model, 
  use_ft, 
  stream, 
  res,
  systemContext,
  trace
}: any) {
  const composeEvent = await trace.startEvent({
    component: 'composer',
    operation: 'compose_answer',
    metadata: {
      stream: stream || false,
      has_memory: !!memory?.summary || (memory?.recent?.length > 0),
      hit_count: hits?.length || 0
    }
  });

  try {
    // Step 1: Content moderation
    const modResult = await trace.wrap(
      'composer',
      'content_moderation',
      () => moderate(message),
      {
        api_provider: 'openai',
        api_method: 'moderations',
        extractMetadata: (result) => ({
          flagged: result?.flagged || false,
          categories: result?.results?.[0]?.categories || {}
        })
      }
    );

    if (modResult?.flagged) {
      trace.setFinalAnswer("I can't help with that.", 'moderation_block');
      await trace.endEvent(composeEvent, {
        metadata: { blocked: true }
      });
      return { answer: "I can't help with that.", model: 'moderation_block' };
    }

    // Step 2: Build system messages with policy enforcement
    const systemMessages = await trace.wrap(
      'composer',
      'build_system_messages',
      async () => {
        const system = [
          { 
            role: 'system', 
            content: `You are Jenny, an evidence-first college admissions coach. 
${systemContext?.canonical_fact_policy || ''}

Your role is to provide strategic guidance, interpret evidence, and support students.
Use the vitals for context but NEVER state specific numbers from them.
Reference evidence chips when making claims.
Focus on actionable advice and next steps.`
          },
          memory?.summary ? { role: 'system', content: `Conversation summary:\n${memory.summary}` } : null,
          { role: 'system', content: `Student context (for your reference only - do not state these numbers):\n${JSON.stringify(vitals).slice(0, 10000)}` },
          { role: 'system', content: `Relevant evidence:\n${JSON.stringify(hits.slice(0, 6)).slice(0, 10000)}` }
        ].filter(Boolean);

        return system;
      },
      {
        extractMetadata: (messages) => ({
          system_message_count: messages.length,
          has_canonical_policy: !!systemContext?.canonical_fact_policy,
          vitals_included: true,
          evidence_count: Math.min(hits.length, 6)
        })
      }
    );

    // Step 3: Prepare full message list
    const messages = [
      ...systemMessages as any[],
      ...(memory?.recent || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const chosenModel = model || (use_ft ? process.env.JENNY_MODEL_ID : 'gpt-4o-mini');

    // Step 4: Call OpenAI
    if (!stream) {
      // Non-streaming completion
      const response = await trace.wrap(
        'composer',
        'openai_completion',
        async () => {
          const openai = createTracedOpenAI(trace);
          return openai.chat.completions.create({ 
            model: chosenModel!, 
            messages,
            temperature: 0.7,
            max_tokens: 500
          });
        },
        {
          extractMetadata: (resp) => ({
            model_used: chosenModel,
            finish_reason: resp.choices?.[0]?.finish_reason,
            total_messages: messages.length
          })
        }
      );

      const answer = response.choices?.[0]?.message?.content || '';
      
      trace.setFinalAnswer(answer, chosenModel);
      trace.setTokensUsed(response.usage || {});

      await trace.endEvent(composeEvent, {
        metadata: {
          answer_length: answer.length,
          model: chosenModel
        }
      });

      log.event('compose_complete', {
        trace_id: trace.getId(),
        model: chosenModel,
        streaming: false,
        tokens: response.usage
      });

      return { answer, model: chosenModel, usage: response.usage };
    }

    // Step 5: Streaming response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    const streamResp = await trace.wrap(
      'composer',
      'openai_stream',
      async () => {
        const openai = createTracedOpenAI(trace);
        return openai.chat.completions.create({ 
          model: chosenModel!, 
          messages, 
          stream: true,
          temperature: 0.7,
          max_tokens: 500
        });
      },
      {
        extractMetadata: () => ({
          model_used: chosenModel,
          streaming: true,
          total_messages: messages.length
        })
      }
    );
    
    let accumulatedAnswer = '';
    let tokenCount = 0;
    
    for await (const chunk of streamResp) {
      const token = chunk.choices?.[0]?.delta?.content || '';
      accumulatedAnswer += token;
      tokenCount++;
      res.write(`data:${JSON.stringify({ token })}\n\n`);
    }
    
    res.write(`data:${JSON.stringify({ done: true })}\n\n`);
    res.end();

    trace.setFinalAnswer(accumulatedAnswer, chosenModel);
    
    // Estimate token usage for streaming
    trace.setTokensUsed({
      prompt: Math.ceil(JSON.stringify(messages).length / 4),
      completion: tokenCount,
      total: Math.ceil(JSON.stringify(messages).length / 4) + tokenCount
    });

    await trace.endEvent(composeEvent, {
      metadata: {
        answer_length: accumulatedAnswer.length,
        model: chosenModel,
        streamed_tokens: tokenCount
      }
    });

    log.event('compose_complete', {
      trace_id: trace.getId(),
      model: chosenModel,
      streaming: true,
      tokens_streamed: tokenCount
    });

    return { answer: accumulatedAnswer, model: chosenModel };

  } catch (error: any) {
    await trace.endEvent(composeEvent, {
      api_error: error.message
    });
    throw error;
  }
}