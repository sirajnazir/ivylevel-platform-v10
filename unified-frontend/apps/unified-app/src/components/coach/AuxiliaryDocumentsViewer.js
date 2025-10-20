import React, { useState, useEffect } from 'react';
import knowledgeBaseService from '../services/knowledgeBaseService';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  Tag,
  Briefcase,
  FileCheck,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

const AuxiliaryDocumentsViewer = ({ studentName, recordingDate }) => {
  const [documents, setDocuments] = useState({ gamePlans: [], executionDocs: [] });
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeTab, setActiveTab] = useState('gamePlans');

  useEffect(() => {
    if (studentName) {
      loadDocuments();
    }
  }, [studentName]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const [gamePlans, executionDocs] = await Promise.all([
        knowledgeBaseService.getAuxiliaryDocuments('gamePlan', studentName),
        knowledgeBaseService.getAuxiliaryDocuments('executionDoc', studentName)
      ]);
      
      setDocuments({ gamePlans, executionDocs });
    } catch (error) {
      console.error('Error loading auxiliary documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentRelevance = (doc) => {
    if (!recordingDate || !doc.createdDate) return 'unknown';
    
    const docDate = new Date(doc.createdDate);
    const recDate = new Date(recordingDate);
    const daysDiff = Math.abs((recDate - docDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) return 'high';
    if (daysDiff <= 30) return 'medium';
    return 'low';
  };

  const renderDocumentList = (docs, type) => {
    if (docs.length === 0) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No {type === 'gamePlans' ? 'game plans' : 'execution documents'} found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {docs.map((doc) => {
          const relevance = getDocumentRelevance(doc);
          
          return (
            <div
              key={doc.id}
              className={`
                border rounded-lg p-4 cursor-pointer transition-all
                ${selectedDoc?.id === doc.id 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
              onClick={() => setSelectedDoc(doc)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {type === 'gamePlans' ? (
                      <Briefcase className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <FileCheck className="w-5 h-5 text-green-600" />
                    )}
                    <h4 className="font-medium text-gray-900">{doc.fileName}</h4>
                    {relevance === 'high' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Highly Relevant
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(doc.createdDate).toLocaleDateString()}
                    </span>
                    {doc.version && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        {doc.version}
                      </span>
                    )}
                    {doc.status && (
                      <span className={`flex items-center gap-1 ${
                        doc.status === 'Active' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {doc.status === 'Active' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                        {doc.status}
                      </span>
                    )}
                  </div>
                  
                  {doc.contentSummary && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {doc.contentSummary}
                    </p>
                  )}
                </div>
                
                <ChevronRight className={`
                  w-5 h-5 text-gray-400 transition-transform
                  ${selectedDoc?.id === doc.id ? 'rotate-90' : ''}
                `} />
              </div>
              
              {selectedDoc?.id === doc.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                      <Eye className="w-4 h-4" />
                      View Document
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                      Open in Drive
                    </button>
                  </div>
                  
                  {doc.relatedRecordings && doc.relatedRecordings.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Referenced in {doc.relatedRecordings.length} sessions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {doc.relatedRecordings.slice(0, 3).map((recordingId, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            Session {idx + 1}
                          </span>
                        ))}
                        {doc.relatedRecordings.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{doc.relatedRecordings.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('gamePlans')}
            className={`
              flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'gamePlans'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <Briefcase className="w-4 h-4" />
              Game Plans ({documents.gamePlans.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('executionDocs')}
            className={`
              flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'executionDocs'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <FileCheck className="w-4 h-4" />
              Execution Docs ({documents.executionDocs.length})
            </div>
          </button>
        </div>
      </div>
      
      <div className="p-4">
        {activeTab === 'gamePlans' && renderDocumentList(documents.gamePlans, 'gamePlans')}
        {activeTab === 'executionDocs' && renderDocumentList(documents.executionDocs, 'executionDocs')}
      </div>
    </div>
  );
};

export default AuxiliaryDocumentsViewer;