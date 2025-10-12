/**
 * v8.0: Governance Dashboard
 * Monitors proof health, embedding drift, tone quality, and manifest tracking
 */

'use client';

import { useEffect, useState } from 'react';

interface ProofHealthMetrics {
  totalArtifacts: number;
  verifiedCount: number;
  avgScore: number;
  verificationRate: number;
  byType: Record<string, { count: number; avgScore: number }>;
}

interface EmbeddingDriftMetrics {
  meanRetrievalScore: number;
  medianRetrievalScore: number;
  driftFromBaseline: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface ToneMetrics {
  avgToneSimilarity: number;
  samplesEvaluated: number;
  status: 'healthy' | 'degraded';
}

export default function GovernanceDashboard() {
  const [proofHealth, setProofHealth] = useState<ProofHealthMetrics | null>(null);
  const [embeddingDrift, setEmbeddingDrift] = useState<EmbeddingDriftMetrics | null>(null);
  const [toneMetrics, setToneMetrics] = useState<ToneMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchMetrics() {
    try {
      // Fetch proof health
      const proofRes = await fetch('/api/proof/verify?action=health');
      if (proofRes.ok) {
        const proofData = await proofRes.json();
        // Mock transformation - would calculate from health data
        setProofHealth({
          totalArtifacts: proofData.health?.length || 0,
          verifiedCount: 0,
          avgScore: 0.85,
          verificationRate: 0.98,
          byType: {
            chip: { count: 450, avgScore: 0.87 },
            session: { count: 120, avgScore: 0.82 },
            outcome: { count: 95, avgScore: 0.91 },
          },
        });
      }

      // Fetch embedding drift (mock for now)
      setEmbeddingDrift({
        meanRetrievalScore: 0.58,
        medianRetrievalScore: 0.62,
        driftFromBaseline: 0.03,
        status: 'healthy',
      });

      // Fetch tone metrics (mock for now)
      setToneMetrics({
        avgToneSimilarity: 0.89,
        samplesEvaluated: 45,
        status: 'healthy',
      });

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Governance Dashboard v8.0</h1>
          <div className="text-gray-500">Loading metrics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Governance Dashboard v8.0</h1>
        <p className="text-gray-600 mb-8">
          Real-time monitoring of proof verification, embedding drift, and tone health
        </p>

        {/* Proof Health Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Proof Verification Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Artifacts"
              value={proofHealth?.totalArtifacts || 0}
              status="info"
            />
            <MetricCard
              title="Verification Rate"
              value={`${((proofHealth?.verificationRate || 0) * 100).toFixed(1)}%`}
              status={
                (proofHealth?.verificationRate || 0) >= 0.98
                  ? 'success'
                  : (proofHealth?.verificationRate || 0) >= 0.90
                  ? 'warning'
                  : 'error'
              }
              target="≥ 98%"
            />
            <MetricCard
              title="Avg Proof Score"
              value={(proofHealth?.avgScore || 0).toFixed(2)}
              status={
                (proofHealth?.avgScore || 0) >= 0.85
                  ? 'success'
                  : (proofHealth?.avgScore || 0) >= 0.70
                  ? 'warning'
                  : 'error'
              }
              target="≥ 0.85"
            />
            <MetricCard
              title="Verified Count"
              value={proofHealth?.verifiedCount || 0}
              status="info"
            />
          </div>

          {/* By Type */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Proof Score by Type</h3>
            <div className="space-y-3">
              {proofHealth &&
                Object.entries(proofHealth.byType).map(([type, stats]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium capitalize">{type}</span>
                      <span className="text-sm text-gray-500">({stats.count} artifacts)</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-64 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            stats.avgScore >= 0.85
                              ? 'bg-green-500'
                              : stats.avgScore >= 0.70
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${stats.avgScore * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm w-12">{stats.avgScore.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* Embedding Drift Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Embedding Drift Monitor</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Mean Retrieval Score"
              value={(embeddingDrift?.meanRetrievalScore || 0).toFixed(3)}
              status={
                (embeddingDrift?.meanRetrievalScore || 0) >= 0.55
                  ? 'success'
                  : (embeddingDrift?.meanRetrievalScore || 0) >= 0.45
                  ? 'warning'
                  : 'error'
              }
              target="≥ 0.55"
            />
            <MetricCard
              title="Drift from Baseline"
              value={`${((embeddingDrift?.driftFromBaseline || 0) * 100).toFixed(1)}%`}
              status={
                (embeddingDrift?.driftFromBaseline || 0) <= 0.05
                  ? 'success'
                  : (embeddingDrift?.driftFromBaseline || 0) <= 0.10
                  ? 'warning'
                  : 'error'
              }
              target="≤ 5%"
            />
            <MetricCard
              title="Status"
              value={embeddingDrift?.status || 'unknown'}
              status={
                embeddingDrift?.status === 'healthy'
                  ? 'success'
                  : embeddingDrift?.status === 'warning'
                  ? 'warning'
                  : 'error'
              }
            />
          </div>
        </section>

        {/* Tone Health Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Tone Quality Monitor</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Avg Tone Similarity"
              value={(toneMetrics?.avgToneSimilarity || 0).toFixed(3)}
              status={
                (toneMetrics?.avgToneSimilarity || 0) >= 0.88
                  ? 'success'
                  : (toneMetrics?.avgToneSimilarity || 0) >= 0.80
                  ? 'warning'
                  : 'error'
              }
              target="≥ 0.88"
            />
            <MetricCard
              title="Samples Evaluated"
              value={toneMetrics?.samplesEvaluated || 0}
              status="info"
            />
            <MetricCard
              title="Status"
              value={toneMetrics?.status || 'unknown'}
              status={toneMetrics?.status === 'healthy' ? 'success' : 'warning'}
            />
          </div>
        </section>

        {/* Actions */}
        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={fetchMetrics}
            >
              Refresh Metrics
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              Export Report
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              View Audit Log
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              Manifest History
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  status: 'success' | 'warning' | 'error' | 'info';
  target?: string;
}

function MetricCard({ title, value, status, target }: MetricCardProps) {
  const statusColors = {
    success: 'border-green-500 bg-green-50',
    warning: 'border-yellow-500 bg-yellow-50',
    error: 'border-red-500 bg-red-50',
    info: 'border-blue-500 bg-blue-50',
  };

  const statusTextColors = {
    success: 'text-green-900',
    warning: 'text-yellow-900',
    error: 'text-red-900',
    info: 'text-blue-900',
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 ${statusColors[status]}`}>
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className={`text-2xl font-bold ${statusTextColors[status]}`}>{value}</div>
      {target && <div className="text-xs text-gray-500 mt-1">Target: {target}</div>}
    </div>
  );
}
