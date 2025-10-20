// ExecutionDocDisplay.js - Display for Execution Documents
import React from 'react';
import { DocumentIcon, ExternalLinkIcon, CheckIcon, ClockIcon } from './Icons';

const ExecutionDocDisplay = ({ executionDocData }) => {
  if (!executionDocData) return null;

  const { title, url, insights, filename, student, coach, isPlaceholder } = executionDocData;

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '24px',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <DocumentIcon style={{ marginRight: '8px', color: '#8b5cf6' }} />
        {student}'s Execution Document
      </h3>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '12px'
        }}>
          {title}
        </h4>
        
        <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px' }}>
          {insights}
        </p>
        
        <div style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            <strong>Purpose:</strong> Track weekly progress, action items, and outcomes throughout the program
          </p>
        </div>
        
        {/* Embedded Document */}
        {!isPlaceholder && url && (
          <div style={{
            width: '100%',
            height: '600px',
            marginBottom: '16px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            <iframe
              src={url.replace('/edit', '/preview').replace('/view', '/preview')}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              title={title}
            />
          </div>
        )}
        
        {isPlaceholder ? (
          <div>
            <div style={{
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '16px',
              border: '1px solid #fde68a'
            }}>
              <p style={{ fontSize: '14px', color: '#92400e', margin: 0, marginBottom: '8px' }}>
                The Execution Doc is stored in the Execution Docs folder.
              </p>
              <p style={{ fontWeight: '600', color: '#78350f', margin: 0 }}>
                Look for: "{filename}"
              </p>
            </div>
            
            <div style={{
              backgroundColor: '#e0e7ff',
              borderRadius: '6px',
              padding: '16px',
              border: '1px solid #c7d2fe'
            }}>
              <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#4338ca', marginBottom: '8px' }}>
                What's in the Execution Doc:
              </h5>
              <ul style={{ fontSize: '13px', color: '#4338ca', margin: 0, paddingLeft: '20px' }}>
                <li>Weekly/Bi-weekly planning sections</li>
                <li>Action items and deliverables</li>
                <li>Progress tracking and outcomes</li>
                <li>Coach feedback and notes</li>
                <li>24-48 weeks of structured guidance</li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                transition: 'all 0.2s',
                marginRight: '12px'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#7c3aed'}
              onMouseLeave={e => e.target.style.backgroundColor = '#8b5cf6'}
            >
              <DocumentIcon style={{ marginRight: '6px' }} />
              Open Execution Doc
            </a>
            
            <button
              style={{
                backgroundColor: '#f3f4f6',
                color: '#4b5563',
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.target.style.backgroundColor = '#e5e7eb';
                e.target.style.color = '#1f2937';
              }}
              onMouseLeave={e => {
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.color = '#4b5563';
              }}
              onClick={() => alert('This is a collaborative document. Make sure to update it after each session!')}
            >
              <ClockIcon style={{ marginRight: '6px' }} />
              Usage Guide
            </button>
          </div>
        )}
      </div>

      <div style={{
        backgroundColor: '#dcfce7',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '16px',
        border: '1px solid #bbf7d0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <CheckIcon style={{ marginRight: '8px', color: '#16a34a' }} />
          <p style={{ fontSize: '14px', color: '#15803d', margin: 0 }}>
            <strong>Pro Tip:</strong> Review and update the Execution Doc before and after each coaching session to maximize value for {student}.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExecutionDocDisplay;