/**
 * Missing Evidence Card Component
 * Purpose: 412 UX - Guide users to add missing evidence
 * Week 0: Only 2 actions enabled (add_award, upload_transcript)
 */

import { MissingEvidence } from '../../services/v3.2ApiService';

interface MissingEvidenceCardProps {
  missing: MissingEvidence;
}

// Week 0: Only these actions are enabled
const ENABLED_ACTIONS = ['add_award', 'upload_transcript'];

export function MissingEvidenceCard({ missing }: MissingEvidenceCardProps) {
  // Filter to only show enabled actions
  const enabledSuggestedActions = missing.suggested_actions.filter(action =>
    ENABLED_ACTIONS.includes(action.action)
  );

  return (
    <div className="p-4 border-2 border-yellow-400 bg-yellow-50 rounded-lg">
      <div className="flex items-start">
        {/* Warning Icon */}
        <svg 
          className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
            clipRule="evenodd" 
          />
        </svg>

        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Missing Evidence
          </h3>
          <p className="mt-2 text-sm text-yellow-700">
            {missing.message}
          </p>

          {/* What's needed */}
          <div className="mt-3">
            <p className="text-xs font-medium text-yellow-800 uppercase tracking-wide">
              What's needed:
            </p>
            <ul className="mt-1 text-xs text-yellow-700 list-disc list-inside space-y-1">
              {missing.missing.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Suggested actions */}
          {enabledSuggestedActions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-yellow-800 uppercase tracking-wide">
                Quick actions:
              </p>
              {enabledSuggestedActions.map((action, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded text-sm transition-colors"
                  onClick={() => {
                    if (action.endpoint) {
                      window.location.href = action.endpoint;
                    }
                  }}
                >
                  <div className="font-medium text-yellow-900">{action.action}</div>
                  <div className="text-xs text-yellow-700 mt-1">{action.description}</div>
                </button>
              ))}
            </div>
          )}

          {enabledSuggestedActions.length === 0 && (
            <p className="mt-4 text-xs text-yellow-600 italic">
              Contact your coach to add this information.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
