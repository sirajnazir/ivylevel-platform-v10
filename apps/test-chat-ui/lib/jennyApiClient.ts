/**
 * Jenny API HTTP Client
 * Production-grade adapter for fact-based SQL resolver
 */

export type JennyApiRequest = {
  message: string;
  student_id: string;
  week?: number;
  context?: Record<string, any>;
};

export type JennyApiResponse = {
  answer: string;
  chips?: any[];
  hits?: any[];
  facts?: any[];
  trace?: any;
  vitals?: any;
  model?: string;
  trace_id?: string;
};

/**
 * Call jenny-api service for SQL fact resolution
 */
export async function callJennyApi(req: JennyApiRequest): Promise<JennyApiResponse> {
  const jennyApiUrl = process.env.JENNY_API_URL || 'http://localhost:8787';

  console.log(`[JennyApiClient] Calling ${jennyApiUrl} for: "${req.message.slice(0, 60)}..."`);

  try {
    const res = await fetch(`${jennyApiUrl}/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Jenny API error (${res.status}): ${errorText}`);
    }

    const data = await res.json();

    console.log(`[JennyApiClient] Success: ${data.chips?.length || 0} chips, ${data.hits?.length || 0} hits`);

    return data;
  } catch (error: any) {
    console.error(`[JennyApiClient] Error calling jenny-api:`, error.message);
    throw error;
  }
}

/**
 * Check if jenny-api service is available
 */
export async function checkJennyApiHealth(): Promise<boolean> {
  const jennyApiUrl = process.env.JENNY_API_URL || 'http://localhost:8787';

  try {
    const res = await fetch(`${jennyApiUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    return res.ok;
  } catch (error) {
    return false;
  }
}
