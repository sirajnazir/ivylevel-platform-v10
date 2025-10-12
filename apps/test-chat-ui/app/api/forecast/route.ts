/**
 * v8.0: Outcome Forecasting API
 * GET /api/forecast?user_id=<id>
 */

import { NextRequest, NextResponse } from 'next/server';
import { getForecast, getModelMetadata } from '@/lib/forecastModel';
import { getDbClient } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action');

    // Get model metadata
    if (action === 'metadata') {
      const metadata = getModelMetadata();
      return NextResponse.json(metadata);
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id query parameter is required' },
        { status: 400 }
      );
    }

    const db = await getDbClient();
    const forecast = await getForecast(userId, db);

    if (!forecast) {
      return NextResponse.json(
        { error: 'No readiness data found for user', user_id: userId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user_id: userId,
      forecast,
      model_version: getModelMetadata().version,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Forecast] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
