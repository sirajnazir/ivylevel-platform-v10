/**
 * src/assistants/submitToolOutputsCompat.ts
 * Assistants API Compatibility: REST Wrapper for submitToolOutputs
 *
 * Context: OpenAI SDK v6.4.0 has regression (GitHub #1605) where
 * runs.submitToolOutputs loses thread_id parameter, causing
 * /threads/undefined/... errors.
 *
 * Workaround: Bypass Node SDK and call REST API directly via fetch.
 *
 * Status: Legacy path, use only for existing Assistants threads.
 * Primary path: Responses API + Agents SDK (src/agents/runtime.ts)
 *
 * Created: 2025-10-17
 */

import { traced, SPAN_NAMES, ATTR_KEYS } from '../observability/tracing.js';
import { FLAGS } from '../../config/flags.js';

/**
 * Tool output format
 */
export interface ToolOutput {
  tool_call_id: string;
  output: string;
}

/**
 * Submit tool outputs response
 */
export interface SubmitToolOutputsResponse {
  id: string;
  object: 'thread.run';
  status: 'queued' | 'in_progress' | 'requires_action' | 'completed' | 'failed' | 'cancelled' | 'expired';
  thread_id: string;
  assistant_id: string;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  failed_at: number | null;
  cancelled_at: number | null;
  expired_at: number | null;
  last_error: { code: string; message: string } | null;
}

/**
 * Submit tool outputs (REST API workaround)
 *
 * Directly calls OpenAI REST API to bypass SDK regression.
 *
 * @param threadId - Thread ID
 * @param runId - Run ID
 * @param tool_outputs - Tool outputs to submit
 * @returns Run object with updated status
 *
 * @throws Error if API returns non-2xx status
 *
 * @example
 * const run = await submitToolOutputsCompat(
 *   'thread_abc123',
 *   'run_xyz789',
 *   [{ tool_call_id: 'call_1', output: '{"result": "success"}' }]
 * );
 */
export async function submitToolOutputsCompat(
  threadId: string,
  runId: string,
  tool_outputs: ToolOutput[]
): Promise<SubmitToolOutputsResponse> {
  if (!FLAGS.assistantsCompat) {
    throw new Error(
      'submitToolOutputsCompat called but FLAGS.assistantsCompat=false. Enable via ASSISTANTS_COMPAT=true env var.'
    );
  }

  return await traced(
    SPAN_NAMES.COMPAT_SUBMIT_TOOL_OUTPUTS,
    {
      [ATTR_KEYS.THREAD_ID]: threadId,
      [ATTR_KEYS.RUN_ID]: runId,
      [ATTR_KEYS.FLAG_ASSISTANTS_COMPAT]: FLAGS.assistantsCompat,
      tool_outputs_count: tool_outputs.length,
    },
    async () => {
      const url = `https://api.openai.com/v1/threads/${threadId}/runs/${runId}/submit_tool_outputs`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({ tool_outputs }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `submitToolOutputs REST API failed: ${res.status} ${res.statusText}\n${errorText}`
        );
      }

      const runObject: SubmitToolOutputsResponse = await res.json();

      return runObject;
    }
  );
}

/**
 * Poll run until completion (manual polling for compat path)
 *
 * @param threadId - Thread ID
 * @param runId - Run ID
 * @param maxPolls - Maximum number of polls (default: 60 = 60 seconds)
 * @param pollInterval - Poll interval in ms (default: 1000 = 1 second)
 * @returns Final run object
 *
 * @throws Error if polling times out or run fails
 *
 * @example
 * const run = await pollRunCompat('thread_abc123', 'run_xyz789');
 * console.log('Final status:', run.status); // 'completed'
 */
export async function pollRunCompat(
  threadId: string,
  runId: string,
  maxPolls: number = 60,
  pollInterval: number = 1000
): Promise<SubmitToolOutputsResponse> {
  if (!FLAGS.assistantsCompat) {
    throw new Error(
      'pollRunCompat called but FLAGS.assistantsCompat=false. Enable via ASSISTANTS_COMPAT=true env var.'
    );
  }

  return await traced(
    SPAN_NAMES.COMPAT_POLL_RUN,
    {
      [ATTR_KEYS.THREAD_ID]: threadId,
      [ATTR_KEYS.RUN_ID]: runId,
      [ATTR_KEYS.FLAG_ASSISTANTS_COMPAT]: FLAGS.assistantsCompat,
      max_polls: maxPolls,
    },
    async () => {
      let pollCount = 0;
      let run: SubmitToolOutputsResponse;

      while (pollCount < maxPolls) {
        // Retrieve run
        const url = `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`;

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Poll run REST API failed: ${res.status} ${res.statusText}\n${errorText}`);
        }

        run = await res.json();
        pollCount++;

        // Check terminal states
        if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
          return run;
        }

        // Check if requires_action (need more tool outputs)
        if (run.status === 'requires_action') {
          // Caller should handle this and call submitToolOutputsCompat again
          return run;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      throw new Error(`Poll run timeout after ${maxPolls} polls (${maxPolls * pollInterval}ms)`);
    }
  );
}

/**
 * Submit tool outputs and poll until completion (convenience method)
 *
 * Combines submitToolOutputsCompat + pollRunCompat into single call.
 *
 * @param threadId - Thread ID
 * @param runId - Run ID
 * @param tool_outputs - Tool outputs to submit
 * @param maxPolls - Maximum number of polls (default: 60)
 * @param pollInterval - Poll interval in ms (default: 1000)
 * @returns Final run object (status: 'completed', 'failed', 'requires_action')
 *
 * @example
 * const run = await submitToolOutputsAndPollCompat(
 *   'thread_abc123',
 *   'run_xyz789',
 *   [{ tool_call_id: 'call_1', output: '{"result": "success"}' }]
 * );
 */
export async function submitToolOutputsAndPollCompat(
  threadId: string,
  runId: string,
  tool_outputs: ToolOutput[],
  maxPolls: number = 60,
  pollInterval: number = 1000
): Promise<SubmitToolOutputsResponse> {
  // Submit tool outputs
  await submitToolOutputsCompat(threadId, runId, tool_outputs);

  // Poll until completion
  const finalRun = await pollRunCompat(threadId, runId, maxPolls, pollInterval);

  return finalRun;
}
