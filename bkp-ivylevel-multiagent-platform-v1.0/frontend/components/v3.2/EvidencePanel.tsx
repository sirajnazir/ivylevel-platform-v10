/**
 * Evidence Panel Component
 * Purpose: Display evidence chips showing provenance of student data
 * Week 0: Read-only display
 */

import { useEffect, useState } from 'react';
import { v32ApiService, Chip } from '../../services/v3.2ApiService';

interface EvidencePanelProps {
  studentId: string;
}

export function EvidencePanel({ studentId }: EvidencePanelProps) {
  const [chips, setChips] = useState<Chip[]>([]);
  const [displayCount, setDisplayCount] = useState(20); // Show 20 initially
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<string>('ALL');

  useEffect(() => {
    // Set RLS context (prevent cross-student data leaks)
    sessionStorage.setItem('current_student_id', studentId);

    // Fetch chips
    v32ApiService.getChips(studentId, { limit: 250 })
      .then(setChips)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
        <p className="text-red-800 font-medium">Error loading evidence</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  // Filter chips by kind
  const filteredChips = filterKind === 'ALL'
    ? chips
    : chips.filter(chip => chip.kind === filterKind);

  const displayedChips = filteredChips.slice(0, displayCount);
  const hasMore = filteredChips.length > displayCount;

  // Get chip counts by kind
  const chipCounts = chips.reduce((acc, chip) => {
    acc[chip.kind] = (acc[chip.kind] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Evidence Chips</h2>
          <p className="text-sm text-gray-600 mt-1">
            Shows where claims about this student come from
          </p>
        </div>
        <div className="text-sm text-gray-600">
          Showing {displayedChips.length} of {filteredChips.length} chips
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setFilterKind('ALL'); setDisplayCount(20); }}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            filterKind === 'ALL'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({chips.length})
        </button>
        {Object.entries(chipCounts).map(([kind, count]) => (
          <button
            key={kind}
            onClick={() => { setFilterKind(kind); setDisplayCount(20); }}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filterKind === kind
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {kind} ({count})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {displayedChips.map(chip => (
          <ChipCard key={chip.id} chip={chip} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => setDisplayCount(prev => prev + 20)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More ({filteredChips.length - displayCount} remaining)
          </button>
        </div>
      )}

      {chips.length === 0 && (
        <div className="p-8 text-center border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 italic">
            No evidence chips yet.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Claims will appear here as they're verified.
          </p>
        </div>
      )}
    </div>
  );
}

function ChipCard({ chip }: { chip: Chip }) {
  const kindColors = {
    SQL: 'bg-blue-100 text-blue-800 border-blue-200',
    RAG: 'bg-green-100 text-green-800 border-green-200',
    LLM: 'bg-purple-100 text-purple-800 border-purple-200',
    EQ: 'bg-pink-100 text-pink-800 border-pink-200',
    NARRATIVE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white relative">
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium border ${kindColors[chip.kind]}`}>
              {chip.kind}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(chip.created_at).toLocaleDateString()} at {new Date(chip.created_at).toLocaleTimeString()}
            </span>
          </div>

          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 text-sm hover:underline whitespace-nowrap"
            >
              {expanded ? 'Hide' : 'Show'} Details
            </button>
            <button
              className="text-blue-600 text-sm hover:underline whitespace-nowrap"
              onClick={() => window.open(`/trace/${chip.trace_id}`, '_blank')}
            >
              View Trace →
            </button>
          </div>

          {expanded && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-700 mb-1">Source Data:</p>
              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-96">
                {JSON.stringify(chip.source, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
