import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, MessageSquare, Tags, ShieldCheck, 
  Plus, Search, HelpCircle, AlertCircle 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { documentApi } from '../services/api';
import { Document } from '../types';
import DocumentCard from '../components/DocumentCard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');

  const navigate = useNavigate();

  const fetchDocs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentApi.list();
      setDocuments(data);
      setFilteredDocs(data);
    } catch (err: any) {
      setError('Failed to load documents. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = documents;

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (doc) => 
          doc.filename.toLowerCase().includes(q) || 
          doc.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Scope filter
    if (selectedScope !== 'all') {
      result = result.filter((doc) => doc.scope === selectedScope);
    }

    // Source filter
    if (selectedSource !== 'all') {
      result = result.filter((doc) => doc.source === selectedSource);
    }

    setFilteredDocs(result);
  }, [search, selectedScope, selectedSource, documents]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document? All vector embeddings will be permanently removed.')) {
      try {
        await documentApi.delete(id);
        setDocuments(documents.filter(d => d.id !== id));
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to delete document.');
      }
    }
  };

  const handleSummarize = (id: string) => {
    navigate('/summary', { state: { selectedDocId: id } });
  };

  // Stats calculations
  const totalPdf = documents.filter(d => d.source === 'pdf').length;
  const totalSlack = documents.filter(d => d.source === 'slack').length;
  const uniqueTags = Array.from(new Set(documents.flatMap(d => d.tags))).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">
            Welcome, <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{user?.username}</span>!
          </h1>
          <p className="text-sm text-secondary font-medium mt-1">
            Access, ingest, and query your Slack Knowledge Base for team <span className="text-primary font-semibold">{user?.team_name}</span>.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigate('/upload')}
            className="flex items-center space-x-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-sm font-bold tracking-wide text-white transition-all duration-300 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ingest Source</span>
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <div className="glass-card p-5 rounded-2xl border border-subtle shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Total Documents</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/10">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline">
            <span className="text-2xl font-bold text-primary">{documents.length}</span>
            <span className="text-xs text-muted ml-2 font-medium">sources total</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-subtle shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Slack Sources</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline">
            <span className="text-2xl font-bold text-primary">{totalSlack}</span>
            <span className="text-xs text-muted ml-2 font-medium">Slack ingestions</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-subtle shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Generated Tags</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/10">
              <Tags className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline">
            <span className="text-2xl font-bold text-primary">{uniqueTags}</span>
            <span className="text-xs text-muted ml-2 font-medium">AI classifications</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-subtle shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Scope Settings</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/10">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline">
            <span className="text-2xl font-bold text-primary">3</span>
            <span className="text-xs text-muted ml-2 font-medium">security scopes</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-4 bg-card-bg border border-subtle rounded-2xl backdrop-blur-md">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs text-primary glass-input rounded-xl outline-none"
              placeholder="Search documents or tags..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center space-x-2 w-1/2 md:w-auto">
              <span className="text-xs text-muted font-bold whitespace-nowrap">Scope:</span>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="text-xs text-primary glass-input rounded-xl py-2 px-3 outline-none cursor-pointer w-full bg-card-bg"
              >
                <option value="all">All Scopes</option>
                <option value="personal">Personal</option>
                <option value="team">Team</option>
                <option value="organization">Organization</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 w-1/2 md:w-auto">
              <span className="text-xs text-muted font-bold whitespace-nowrap">Source:</span>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="text-xs text-primary glass-input rounded-xl py-2 px-3 outline-none cursor-pointer w-full bg-card-bg"
              >
                <option value="all">All Sources</option>
                <option value="pdf">PDF Uploads</option>
                <option value="slack">Slack Chats</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="border border-subtle bg-hover-bg rounded-2xl p-5 animate-pulse h-[180px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-muted/20"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted/20 rounded w-3/4"></div>
                      <div className="h-3 bg-muted/20 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-muted/20 rounded w-1/3 mt-6"></div>
                </div>
                <div className="flex justify-between items-center border-t border-subtle pt-3">
                  <div className="w-24 h-8 bg-muted/20 rounded-lg"></div>
                  <div className="w-8 h-8 bg-muted/20 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredDocs.length > 0 ? (
          /* Documents Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDelete={handleDelete}
                onSummarize={handleSummarize}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="glass-card p-12 text-center rounded-2xl border border-subtle shadow-md">
            <div className="w-12 h-12 rounded-xl bg-hover-bg border border-subtle flex items-center justify-center mx-auto text-muted mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-primary">No Knowledge Sources Found</h3>
            <p className="text-xs text-secondary max-w-sm mx-auto mt-1 leading-relaxed">
              Upload documents or ingest chats from Slack channels to build your security scoped vector database.
            </p>
            <button
              type="button"
              onClick={() => navigate('/upload')}
              className="mt-5 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 px-4 py-2 rounded-xl cursor-pointer"
            >
              Add your first source
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
