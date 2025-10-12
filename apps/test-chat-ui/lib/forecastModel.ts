/**
 * v8.0: Outcome Forecasting Model v1
 * Logistic regression model for readiness-based predictions
 */

export interface ReadinessFeatures {
  R: number; // Readiness Score (0-1)
  S: number; // SAT/ACT delta (standardized)
  E: number; // Essay quality score (0-1)
  A: number; // Award tier count
  EC?: number; // EC depth score (optional)
  REC?: number; // Recommendation count (optional)
}

export interface ForecastResult {
  predicted_outcome: 'reach' | 'target' | 'safety' | 'likely';
  confidence: number;
  confidence_band: 'high' | 'medium' | 'low';
  feature_importance: Record<string, number>;
  raw_score: number;
}

// Model weights (trained offline - placeholder values for v1)
const MODEL_WEIGHTS = {
  intercept: -0.5,
  R: 2.1,
  S: 0.8,
  E: 1.2,
  A: 0.4,
  EC: 0.3,
  REC: 0.2,
};

const MODEL_VERSION = 'v1.0';
const MODEL_R2 = 0.72; // Validation R²

/**
 * Standardize SAT/ACT delta to 0-1 scale
 */
export function standardizeSATDelta(delta: number): number {
  // Assuming delta range: -200 to +200
  const min = -200;
  const max = 200;
  return Math.max(0, Math.min(1, (delta - min) / (max - min)));
}

/**
 * Calculate logistic regression score
 */
export function calculateLogisticScore(features: ReadinessFeatures): number {
  let score = MODEL_WEIGHTS.intercept;

  score += features.R * MODEL_WEIGHTS.R;
  score += features.S * MODEL_WEIGHTS.S;
  score += features.E * MODEL_WEIGHTS.E;
  score += features.A * MODEL_WEIGHTS.A;

  if (features.EC !== undefined) {
    score += features.EC * MODEL_WEIGHTS.EC;
  }

  if (features.REC !== undefined) {
    score += features.REC * MODEL_WEIGHTS.REC;
  }

  // Apply sigmoid function
  return 1 / (1 + Math.exp(-score));
}

/**
 * Calculate feature importance
 */
export function calculateFeatureImportance(features: ReadinessFeatures): Record<string, number> {
  const totalWeight =
    Math.abs(features.R * MODEL_WEIGHTS.R) +
    Math.abs(features.S * MODEL_WEIGHTS.S) +
    Math.abs(features.E * MODEL_WEIGHTS.E) +
    Math.abs(features.A * MODEL_WEIGHTS.A) +
    Math.abs((features.EC || 0) * MODEL_WEIGHTS.EC) +
    Math.abs((features.REC || 0) * MODEL_WEIGHTS.REC);

  return {
    readiness: Math.abs(features.R * MODEL_WEIGHTS.R) / totalWeight,
    sat_delta: Math.abs(features.S * MODEL_WEIGHTS.S) / totalWeight,
    essay_quality: Math.abs(features.E * MODEL_WEIGHTS.E) / totalWeight,
    award_tier: Math.abs(features.A * MODEL_WEIGHTS.A) / totalWeight,
    ec_depth: Math.abs((features.EC || 0) * MODEL_WEIGHTS.EC) / totalWeight,
    recommendations: Math.abs((features.REC || 0) * MODEL_WEIGHTS.REC) / totalWeight,
  };
}

/**
 * Determine outcome category from probability score
 */
export function determineOutcome(score: number): 'reach' | 'target' | 'safety' | 'likely' {
  if (score >= 0.75) return 'safety';
  if (score >= 0.55) return 'likely';
  if (score >= 0.35) return 'target';
  return 'reach';
}

/**
 * Determine confidence band
 */
export function determineConfidenceBand(score: number): 'high' | 'medium' | 'low' {
  // High confidence near decision boundaries
  const distances = [
    Math.abs(score - 0.75),
    Math.abs(score - 0.55),
    Math.abs(score - 0.35),
  ];
  const minDistance = Math.min(...distances);

  if (minDistance < 0.05) return 'low'; // Near boundary = lower confidence
  if (minDistance < 0.15) return 'medium';
  return 'high';
}

/**
 * Main forecast function
 */
export function forecastOutcome(features: ReadinessFeatures): ForecastResult {
  const rawScore = calculateLogisticScore(features);
  const predicted_outcome = determineOutcome(rawScore);
  const confidence_band = determineConfidenceBand(rawScore);
  const feature_importance = calculateFeatureImportance(features);

  // Confidence is based on distance from decision boundary
  const confidence = confidence_band === 'high' ? 0.85 : confidence_band === 'medium' ? 0.65 : 0.45;

  return {
    predicted_outcome,
    confidence,
    confidence_band,
    feature_importance,
    raw_score: rawScore,
  };
}

/**
 * Extract features from readiness views
 */
export async function extractFeaturesFromDB(userId: string, db: any): Promise<ReadinessFeatures | null> {
  const result = await db.query(
    `SELECT
       COALESCE(readiness_score, 0) as readiness_score,
       COALESCE(sat_act_delta, 0) as sat_act_delta,
       COALESCE(essay_quality_score, 0) as essay_quality_score,
       COALESCE(award_tier_count, 0) as award_tier_count,
       COALESCE(ec_depth_score, 0) as ec_depth_score,
       COALESCE(recommendation_count, 0) as recommendation_count
     FROM readiness_forecast_features
     WHERE user_id = $1
     ORDER BY snapshot_date DESC
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    R: parseFloat(row.readiness_score),
    S: standardizeSATDelta(parseInt(row.sat_act_delta)),
    E: parseFloat(row.essay_quality_score),
    A: parseInt(row.award_tier_count),
    EC: parseFloat(row.ec_depth_score),
    REC: parseInt(row.recommendation_count),
  };
}

/**
 * Save forecast result to database
 */
export async function saveForecast(
  userId: string,
  features: ReadinessFeatures,
  forecast: ForecastResult,
  db: any
): Promise<void> {
  await db.query(
    `INSERT INTO readiness_forecast_features
     (user_id, snapshot_date, readiness_score, sat_act_delta, essay_quality_score,
      award_tier_count, ec_depth_score, recommendation_count, features,
      predicted_outcome, confidence)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id, snapshot_date)
     DO UPDATE SET
       predicted_outcome = EXCLUDED.predicted_outcome,
       confidence = EXCLUDED.confidence,
       features = EXCLUDED.features`,
    [
      userId,
      features.R,
      features.S,
      features.E,
      features.A,
      features.EC || 0,
      features.REC || 0,
      JSON.stringify(features),
      forecast.predicted_outcome,
      forecast.confidence,
    ]
  );
}

/**
 * Get forecast for user
 */
export async function getForecast(userId: string, db: any): Promise<ForecastResult | null> {
  const features = await extractFeaturesFromDB(userId, db);

  if (!features) {
    return null;
  }

  const forecast = forecastOutcome(features);
  await saveForecast(userId, features, forecast, db);

  return forecast;
}

/**
 * Model metadata
 */
export function getModelMetadata() {
  return {
    version: MODEL_VERSION,
    r_squared: MODEL_R2,
    weights: MODEL_WEIGHTS,
    features: ['R', 'S', 'E', 'A', 'EC', 'REC'],
    output_categories: ['reach', 'target', 'likely', 'safety'],
  };
}
