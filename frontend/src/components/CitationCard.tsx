import React, { useState } from 'react';
import { FileText, MessageSquare, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Citation } from '../types';

interface CitationCardProps {
  citation: Citation;
  index: number;
}

const CitationCard: React.FC<CitationCardProps> = ({ citation, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  const metadata = citation.metadata || {};
  const isSlack = metadata.source === 'slack';
  const filename = citation.source || 'Unknown Source';

  return (
    <div className="border border-subtle bg-card-bg rounded-xl overflow-hidden backdrop-blur-md transition-all duration-300">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-hover-bg transition-colors cursor-pointer"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/10 text-blue-500 dark:text-blue-400 font-semibold text-xs border border-blue-500/20">
            {index}
          </span>
          {isSlack ? (
            <MessageSquare className="w-4 h-4 text-[#4A154B] flex-shrink-0" />
          ) : (
            <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-primary truncate max-w-[200px] sm:max-w-md">
            {filename}
          </span>
          {metadata.tags && (
            <span className="text-[10px] px-1.5 py-0.2 bg-hover-bg text-secondary rounded-full border border-subtle hidden sm:inline-block">
              {metadata.tags.split(',')[0]}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
          )}
        </div>
      </button>

      {/* Content Body */}
      {isOpen && (
        <div className="p-3.5 border-t border-subtle bg-app-bg text-secondary text-xs leading-relaxed font-normal">
          <div className="mb-2 text-[10px] text-muted flex items-center space-x-3 uppercase tracking-wider font-semibold">
            {isSlack ? (
              <>
                <span>Source: Slack</span>
                {metadata.team_name && <span>Team: {metadata.team_name}</span>}
              </>
            ) : (
              <>
                <span>Source: PDF</span>
                {metadata.chunk_index !== undefined && <span>Chunk: {Number(metadata.chunk_index) + 1}</span>}
              </>
            )}
            <span>Scope: {metadata.scope}</span>
          </div>
          
          <div className="bg-hover-bg p-2.5 rounded-lg border border-subtle font-mono text-secondary whitespace-pre-wrap select-all">
            {citation.content}
          </div>
        </div>
      )}
    </div>
  );
};

export default CitationCard;
