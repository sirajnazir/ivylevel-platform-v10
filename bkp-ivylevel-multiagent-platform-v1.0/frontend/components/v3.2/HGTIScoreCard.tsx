/**
 * HGTI Score Card Component
 * Purpose: Display growth barrier scores with real-time/cached modes
 * Week 0: Read-only display with 5-minute cached refresh
 */

import { useEffect, useState } from 'react';
import { v32ApiService, HGTIScore } from '../../services/v3.2ApiService';

interface HGTIScoreCardProps {
  studentId: string;
  mode?: 'cached' | 'realtime';
}

export function HGTIScoreCard({ studentId, mode = 'cached' }: HGTIScoreCardProps) {
  const [score, setScore] = useState<HGTIScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    // Set RLS context
    sessionStorage.setItem('current_student_id', studentId);

    // Fetch HGTI score
    const fetchScore = async () => {
      try {
        setLoading(true);
        const data = await v32ApiService.getHGTIScore(studentId, mode);
        setScore(data);
        setLastRefresh(new Date());
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScore();

    // Auto-refresh cached scores every 5 minutes (Week 0 default)
    const refreshInterval = mode === 'cached' ? setInterval(fetchScore, 5 * 60 * 1000) : null;

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [studentId, mode]);

  if (loading) {
    return (
      <div className="p-6 border rounded-lg bg-white">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-300 bg-red-50 rounded-lg">
        <p className="text-red-800 font-medium">Error loading HGTI score</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center">
        <p className="text-gray-500 italic">No HGTI score available yet.</p>
        <p className="text-gray-400 text-sm mt-2">
          Growth barriers will appear here as they're detected.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Growth Score (HGTI)</h2>
          <p className="text-sm text-gray-600 mt-1">
            Human Growth & Transformation Index
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600">
            {score.score.toFixed(1)}
          </div>
          <p className="text-xs text-gray-500">out of 100</p>
        </div>
      </div>

      {/* Breakdown by barrier type */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
          Barrier Breakdown:
        </p>
        {score.breakdown.map((barrier, i) => (
          <BarrierRow key={i} barrier={barrier} />
        ))}
      </div>

      {/* Metadata */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded ${mode === 'cached' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
              {mode === 'cached' ? 'Cached' : 'Real-time'}
            </span>
            {lastRefresh && (
              <span>
                Updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
          {mode === 'cached' && (
            <span className="text-gray-400 italic">
              Auto-refreshes every 5 minutes
            </span>
          )}
        </div>
      </div>

      {/* IvyScore version notice */}
      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-xs text-yellow-800">
          <strong>Week 0 Notice:</strong> IvyScore v1 in use (0% HGTI weight).
          HGTI shown for visibility only, does not affect current IvyScore.
        </p>
      </div>
    </div>
  );
}

interface BarrierRowProps {
  barrier: {
    barrier_type: string;
    contribution: number;
  };
}

function BarrierRow({ barrier }: BarrierRowProps) {
  const getBarrierColor = (type: string) => {
    const colors: Record<string, string> = {
      academic: 'bg-blue-500',
      extracurricular: 'bg-green-500',
      personal: 'bg-purple-500',
      financial: 'bg-yellow-500',
      health: 'bg-red-500',
      social: 'bg-pink-500',
    };
    return colors[type.toLowerCase()] || 'bg-gray-500';
  };

  const percentage = (barrier.contribution / 100) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-gray-700 capitalize">
          {barrier.barrier_type}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{barrier.contribution.toFixed(1)}%</span>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${getBarrierColor(barrier.barrier_type)} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
