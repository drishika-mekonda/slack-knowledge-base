import React, { useState, useRef } from 'react';
import { UploadCloud, MessageSquare, CheckCircle, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { documentApi, slackApi } from '../services/api';
import ScopeSelector from '../components/ScopeSelector';
import TagBadge from '../components/TagBadge';

const Upload: React.FC = () => {
  // Tab selector: 'pdf' | 'slack'
  const [activeTab, setActiveTab] = useState<'pdf' | 'slack'>('pdf');
  
  // PDF State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfScope, setPdfScope] = useState<'personal' | 'team' | 'organization'>('organization');
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfResult, setPdfResult] = useState<{ id: string; filename: string; tags: string[]; chunk_count: string } | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Slack State
  const [channelId, setChannelId] = useState('');
  const [threadTs, setThreadTs] = useState('');
  const [slackScope, setSlackScope] = useState<'personal' | 'team' | 'organization'>('organization');
  const [slackIngesting, setSlackIngesting] = useState(false);
  const [slackResult, setSlackResult] = useState<{ document_id: string; filename: string; chunk_count: number; tags: string[] } | null>(null);
  const [slackError, setSlackError] = useState<string | null>(null);

  // Drag & drop state
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        setPdfError(null);
        setPdfResult(null);
      } else {
        setPdfError('Only PDF documents are supported currently.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPdfFile(e.target.files[0]);
      setPdfError(null);
      setPdfResult(null);
    }
  };

  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;

    setPdfUploading(true);
    setPdfError(null);
    setPdfResult(null);

    try {
      const response = await documentApi.upload(pdfFile, pdfScope);
      setPdfResult({
        id: response.id,
        filename: response.filename,
        tags: response.tags,
        chunk_count: response.chunk_count,
      });
      setPdfFile(null);
    } catch (err: any) {
      setPdfError(err.response?.data?.detail || 'Failed to process document. Try again.');
    } finally {
      setPdfUploading(false);
    }
  };

  const handleSlackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId.trim()) {
      setSlackError('Channel ID is required.');
      return;
    }

    setSlackIngesting(true);
    setSlackError(null);
    setSlackResult(null);

    try {
      const response = await slackApi.ingest({
        channel_id: channelId.trim(),
        thread_ts: threadTs.trim() || undefined,
        scope: slackScope,
      });
      setSlackResult(response);
      setChannelId('');
      setThreadTs('');
    } catch (err: any) {
      setSlackError(err.response?.data?.detail || 'Failed to ingest Slack feed. Ensure channel is public or bot is joined.');
    } finally {
      setSlackIngesting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-primary tracking-tight">Ingest Knowledge Source</h1>
        <p className="text-sm text-secondary mt-1">
          Upload PDF documentation or import chat channels/threads from Slack to expand the context RAG scope.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-subtle bg-hover-bg p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('pdf')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${activeTab === 'pdf' ? 'bg-blue-500 text-white shadow-sm' : 'text-muted hover:text-primary'}`}
        >
          <FileText className="w-4 h-4" />
          <span>PDF Upload</span>
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab('slack')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${activeTab === 'slack' ? 'bg-blue-500 text-white shadow-sm' : 'text-muted hover:text-primary'}`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Slack Import</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'pdf' ? (
        /* PDF PANEL */
        <div className="glass-card p-6 md:p-8 rounded-2xl border border-subtle shadow-xl space-y-6">
          <form onSubmit={handlePdfSubmit} className="space-y-6">
            {/* Drag & drop upload area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                ${dragOver ? 'border-blue-500 bg-blue-500/5' : 'border-subtle hover:border-blue-500/40 bg-hover-bg hover:bg-hover-bg/60'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${dragOver || pdfFile ? 'text-blue-500 animate-pulse' : 'text-muted'}`} />
              
              {pdfFile ? (
                <div>
                  <p className="text-sm font-bold text-primary">{pdfFile.name}</p>
                  <p className="text-[10px] text-muted mt-1">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-secondary">Drag & drop your PDF file here</p>
                  <p className="text-[10px] text-muted mt-1">or click to browse local files (max 20MB)</p>
                </div>
              )}
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-muted uppercase tracking-wider">Access Scope</label>
              <p className="text-[11px] text-secondary mt-0.5 mb-2 leading-relaxed">
                Configure access privileges for the documents. Personal is private to you, Team is shared with team members, Organization is open to everyone.
              </p>
              <ScopeSelector value={pdfScope} onChange={setPdfScope} disabled={pdfUploading} />
            </div>

            {/* Error Message */}
            {pdfError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{pdfError}</span>
              </div>
            )}

            {/* Result success screen */}
            {pdfResult && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 text-primary rounded-xl text-xs space-y-3">
                <div className="flex items-center space-x-2 text-emerald-500 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Document processed successfully!</span>
                </div>
                <div>
                  <p className="text-xs"><strong className="text-muted">Title:</strong> {pdfResult.filename}</p>
                  <p className="text-xs mt-1"><strong className="text-muted">Splits:</strong> {pdfResult.chunk_count} chunk vectors generated</p>
                </div>
                <div>
                  <strong className="text-muted block mb-1.5">AI Generated Tags:</strong>
                  <div className="flex flex-wrap gap-1.5">
                    {pdfResult.tags.map((t, i) => <TagBadge key={i} tag={t} />)}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!pdfFile || pdfUploading}
              className={`
                w-full py-3 rounded-xl text-sm font-bold tracking-wider text-white transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer
                ${pdfFile && !pdfUploading 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20' 
                  : 'bg-hover-bg text-muted cursor-not-allowed border border-subtle'
                }
              `}
            >
              {pdfUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing text, tagging, embedding chunks...</span>
                </>
              ) : (
                <span>Extract & Store in Vector DB</span>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* SLACK INGESTION PANEL */
        <div className="glass-card p-6 md:p-8 rounded-2xl border border-subtle shadow-xl space-y-6">
          <form onSubmit={handleSlackSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Channel ID</label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-primary glass-input outline-none"
                placeholder="Enter channel ID (e.g. C12345678)"
                required
              />
              <p className="text-[10px] text-muted mt-1 leading-relaxed">
                Slack Channel ID can be found at the bottom of the Channel Details modal. Public channels require app installation; private channels require bot member additions.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Thread Timestamp (Optional)</label>
              <input
                type="text"
                value={threadTs}
                onChange={(e) => setThreadTs(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-primary glass-input outline-none"
                placeholder="Enter parent message ts (e.g. 1672534800.123456)"
              />
              <p className="text-[10px] text-muted mt-1 leading-relaxed">
                Provide the timestamp string of the parent message if you want to import a specific threaded discussion transcript instead of general channel history.
              </p>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-muted uppercase tracking-wider">Access Scope</label>
              <p className="text-[11px] text-secondary mt-0.5 mb-2 leading-relaxed">
                Choose access level settings for the Slack transcripts. Personal maps to user, Team to current team, Organization to global.
              </p>
              <ScopeSelector value={slackScope} onChange={setSlackScope} disabled={slackIngesting} />
            </div>

            {/* Error Message */}
            {slackError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{slackError}</span>
              </div>
            )}

            {/* Ingestion result */}
            {slackResult && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 text-primary rounded-xl text-xs space-y-3">
                <div className="flex items-center space-x-2 text-emerald-500 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Slack transcripts loaded successfully!</span>
                </div>
                <div>
                  <p className="text-xs"><strong className="text-muted">Feed Title:</strong> {slackResult.filename}</p>
                  <p className="text-xs mt-1"><strong className="text-muted">Splits:</strong> {slackResult.chunk_count} chunk vectors generated</p>
                </div>
                <div>
                  <strong className="text-muted block mb-1.5">AI Generated Tags:</strong>
                  <div className="flex flex-wrap gap-1.5">
                    {slackResult.tags.map((t, i) => <TagBadge key={i} tag={t} />)}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={slackIngesting || !channelId}
              className={`
                w-full py-3 mt-4 rounded-xl text-sm font-bold tracking-wider text-white transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer
                ${channelId && !slackIngesting
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20'
                  : 'bg-hover-bg text-muted cursor-not-allowed border border-subtle'
                }
              `}
            >
              {slackIngesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Pulling conversations, chunking transcripts, embedding...</span>
                </>
              ) : (
                <span>Fetch and Ingest Slack Feed</span>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Upload;
