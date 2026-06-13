import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileSpreadsheet, RefreshCw, AlertCircle, FileText, MessageSquare, BookOpen } from 'lucide-react';
import { documentApi, summaryApi } from '../services/api';
import { Document } from '../types';

const Summary: React.FC = () => {
  const location = useLocation();
  const redirectedDocId = (location.state as any)?.selectedDocId || null;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache summaries locally to avoid double calls
  const [summaryCache, setSummaryCache] = useState<Record<string, string>>({});

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const data = await documentApi.list();
      setDocuments(data);
      
      // Auto-select document
      if (redirectedDocId && data.some(d => d.id === redirectedDocId)) {
        setSelectedDocId(redirectedDocId);
      } else if (data.length > 0) {
        setSelectedDocId(data[0].id);
      }
    } catch (err) {
      setError('Failed to load document list.');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Whenever selectedDocId changes, load summary from cache if exists
  useEffect(() => {
    if (selectedDocId && summaryCache[selectedDocId]) {
      setSummary(summaryCache[selectedDocId]);
    } else {
      setSummary(null);
    }
    setError(null);
  }, [selectedDocId, summaryCache]);

  // Handle auto-triggering summary if redirected from dashboard
  useEffect(() => {
    if (selectedDocId && redirectedDocId && selectedDocId === redirectedDocId && !summaryCache[selectedDocId]) {
      handleGenerateSummary(selectedDocId);
    }
  }, [selectedDocId]);

  const handleGenerateSummary = async (docId?: string) => {
    const idToSummarize = docId || selectedDocId;
    if (!idToSummarize) return;

    setLoadingSummary(true);
    setError(null);
    setSummary(null);

    try {
      const response = await summaryApi.generateSummary(idToSummarize);
      setSummary(response.summary);
      setSummaryCache(prev => ({
        ...prev,
        [idToSummarize]: response.summary
      }));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate summary. Verify access permissions.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const getSelectedDoc = () => {
    return documents.find(d => d.id === selectedDocId);
  };

  const currentDoc = getSelectedDoc();

  // Basic custom renderer for simple markdown rendering (bold and bullet points)
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-3 font-sans text-secondary leading-relaxed text-sm">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          
          // Bullet point line
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const content = trimmed.substring(2);
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1">
                <li>{renderInlineStyles(content)}</li>
              </ul>
            );
          }
          
          // Heading lines
          if (trimmed.startsWith('### ')) {
            return <h4 key={idx} className="text-sm font-bold text-primary uppercase tracking-wider mt-4">{renderInlineStyles(trimmed.substring(4))}</h4>;
          }
          if (trimmed.startsWith('## ')) {
            return <h3 key={idx} className="text-base font-extrabold text-blue-500 mt-5 border-b border-subtle pb-1.5">{renderInlineStyles(trimmed.substring(3))}</h3>;
          }
          if (trimmed.startsWith('# ')) {
            return <h2 key={idx} className="text-lg font-black text-primary mt-6">{renderInlineStyles(trimmed.substring(2))}</h2>;
          }
          
          // Normal line
          if (trimmed === '') return <div key={idx} className="h-2" />;
          return <p key={idx}>{renderInlineStyles(line)}</p>;
        })}
      </div>
    );
  };

  const renderInlineStyles = (line: string) => {
    // Bold markers **text**
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-primary">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-primary tracking-tight">AI Document Summarizer</h1>
        <p className="text-sm text-secondary mt-1">
          Synthesize long PDF manuals or Slack discussion logs into high-level takeaway summaries automatically using Gemini.
        </p>
      </div>

      {/* Control Card */}
      <div className="glass-card p-6 rounded-2xl border border-subtle shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
          <div className="flex-1 space-y-2 w-full">
            <label className="block text-xs font-bold text-muted uppercase tracking-wider">Select Knowledge Source</label>
            {loadingDocs ? (
              <div className="h-10 bg-hover-bg rounded-xl animate-pulse"></div>
            ) : documents.length > 0 ? (
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-primary glass-input outline-none cursor-pointer bg-card-bg"
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.filename} ({doc.source.toUpperCase()} • {doc.scope})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 text-xs text-muted bg-hover-bg rounded-xl border border-subtle">
                No documents found. Please upload one first on the Ingest page.
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!selectedDocId || loadingSummary}
            onClick={() => handleGenerateSummary()}
            className={`
              w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold tracking-wider text-white transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer
              ${selectedDocId && !loadingSummary
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow shadow-blue-500/10'
                : 'bg-hover-bg text-muted cursor-not-allowed border border-subtle'
              }
            `}
          >
            {loadingSummary ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Summarizing...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Generate Summary</span>
              </>
            )}
          </button>
        </div>

        {/* Selected source info block */}
        {currentDoc && (
          <div className="p-3 bg-hover-bg rounded-xl border border-subtle text-[11px] text-muted flex items-center space-x-4">
            <span className="flex items-center">
              {currentDoc.source === 'slack' ? (
                <MessageSquare className="w-3.5 h-3.5 text-[#4A154B] mr-1.5" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-red-500 mr-1.5" />
              )}
              Type: <strong className="text-secondary capitalize ml-1">{currentDoc.source}</strong>
            </span>
            <span>Scope: <strong className="text-secondary capitalize">{currentDoc.scope}</strong></span>
            <span>Chroma Vectors: <strong className="text-secondary">{currentDoc.chunk_count} splits</strong></span>
          </div>
        )}
      </div>

      {/* Summary View Pane */}
      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loadingSummary ? (
          /* Loading summary skeleton */
          <div className="glass-card p-6 md:p-8 rounded-2xl border border-subtle shadow-xl space-y-4 animate-pulse">
            <div className="h-5 bg-muted/20 rounded w-1/4 mb-6"></div>
            <div className="h-4 bg-muted/20 rounded w-full"></div>
            <div className="h-4 bg-muted/20 rounded w-full"></div>
            <div className="h-4 bg-muted/20 rounded w-5/6"></div>
            <div className="h-4 bg-muted/20 rounded w-3/4 mt-8"></div>
            <div className="h-3 bg-muted/20 rounded w-1/2"></div>
            <div className="h-3 bg-muted/20 rounded w-2/3"></div>
          </div>
        ) : summary ? (
          /* Rendered Summary Box */
          <div className="glass-card p-6 md:p-8 rounded-2xl border border-subtle shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-blue-500 font-bold border-b border-subtle pb-3 mb-2">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm uppercase tracking-wider font-extrabold">Executive Summary</span>
            </div>
            
            <div className="prose prose-invert max-w-none">
              {renderMarkdown(summary)}
            </div>
          </div>
        ) : (
          /* Empty state summary box */
          <div className="border border-subtle bg-hover-bg rounded-2xl p-12 text-center text-muted text-xs">
            <FileSpreadsheet className="w-8 h-8 text-muted mx-auto mb-3 animate-pulse" />
            <span>No summary generated yet. Click "Generate Summary" above to process this document.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary;
