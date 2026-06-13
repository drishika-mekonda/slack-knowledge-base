import React from 'react';
import { FileText, MessageSquare, Trash2, FileSpreadsheet } from 'lucide-react';
import { Document } from '../types';
import TagBadge from './TagBadge';

interface DocumentCardProps {
  doc: Document;
  onDelete: (id: string) => void;
  onSummarize: (id: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ doc, onDelete, onSummarize }) => {
  const isSlack = doc.source === 'slack';
  const dateStr = new Date(doc.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const getScopeBadgeColor = (scope: string) => {
    switch (scope) {
      case 'personal':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'team':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'organization':
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <div className="group glass-card rounded-2xl p-5 hover:bg-hover-bg hover:border-blue-500/30 hover:scale-[1.01] hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between h-[180px]">
      <div>
        {/* Header: Source Icon & Title & Scope Badge */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`p-2.5 rounded-xl border ${isSlack ? 'bg-[#4A154B]/10 border-[#4A154B]/20 text-[#4A154B]' : 'bg-red-500/10 border-red-500/20 text-red-500'} flex-shrink-0`}>
              {isSlack ? <MessageSquare className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-primary truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                {doc.filename}
              </h3>
              <p className="text-[10px] text-muted mt-0.5">Uploaded {dateStr}</p>
            </div>
          </div>
          
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${getScopeBadgeColor(doc.scope)}`}>
            {doc.scope}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4 overflow-hidden max-h-[28px]">
          {doc.tags && doc.tags.length > 0 ? (
            doc.tags.slice(0, 3).map((tag, idx) => <TagBadge key={idx} tag={tag} />)
          ) : (
            <span className="text-[10px] text-muted">No tags</span>
          )}
          {doc.tags && doc.tags.length > 3 && (
            <span className="text-[10px] text-muted mt-1 font-semibold">+{doc.tags.length - 3} more</span>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-subtle pt-3 mt-3">
        <button
          type="button"
          onClick={() => onSummarize(doc.id)}
          className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1 cursor-pointer transition-colors bg-blue-500/5 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/10"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Summarize</span>
        </button>
        
        <button
          type="button"
          onClick={() => onDelete(doc.id)}
          className="text-muted hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/10"
          title="Delete document"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DocumentCard;
