import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Plus, Send, ShieldCheck, 
  HelpCircle, AlertCircle, Trash2, Globe, User, Users 
} from 'lucide-react';
import { chatApi } from '../services/api';
import { Conversation, Message, Citation } from '../types';
import CitationCard from '../components/CitationCard';

const Chat: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [scope, setScope] = useState<'personal' | 'team' | 'organization'>('organization');
  const [loading, setLoading] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation list
  const fetchConversations = async () => {
    try {
      setSidebarLoading(true);
      const data = await chatApi.listConversations();
      setConversations(data);
      if (data.length > 0 && !selectedConvId) {
        // Automatically select the latest conversation on load
        handleSelectConversation(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversation history:', err);
    } finally {
      setSidebarLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSelectConversation = async (id: string) => {
    setSelectedConvId(id);
    setMessages([]);
    setError(null);
    try {
      const data = await chatApi.getConversation(id);
      setMessages(data.messages);
      // Pre-set scope based on conversation scope
      if (data.scope === 'personal' || data.scope === 'team' || data.scope === 'organization') {
        setScope(data.scope);
      }
    } catch (err) {
      setError('Failed to load conversation messages.');
    }
  };

  const handleNewConversation = () => {
    setSelectedConvId(null);
    setMessages([]);
    setError(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const userMsg = question.trim();
    setQuestion('');
    setError(null);
    setLoading(true);

    // Optimistically add User message to local list
    const tempUserMsg: Message = {
      id: `temp-user-${Date.now()}`,
      conversation_id: selectedConvId || '',
      role: 'user',
      content: userMsg,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await chatApi.ask({
        question: userMsg,
        scope,
        conversation_id: selectedConvId || undefined,
      });

      // Update message history
      const assistantMsg: Message = {
        id: `temp-ast-${Date.now()}`,
        conversation_id: response.conversation_id,
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
        created_at: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
      
      // If this was a new conversation, refresh the conversation history list
      if (!selectedConvId) {
        setSelectedConvId(response.conversation_id);
        try {
          const updatedList = await chatApi.listConversations();
          setConversations(updatedList);
        } catch (listErr) {
          console.error('Failed to refresh conversation history:', listErr);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate RAG answer.');
      // Remove the optimistic user message if it failed, so they can retry
      setMessages((prev) => prev.filter(m => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const getScopeIcon = (s: string) => {
    switch (s) {
      case 'personal': return <User className="w-4 h-4 text-blue-400" />;
      case 'team': return <Users className="w-4 h-4 text-emerald-400" />;
      case 'organization':
      default:
        return <Globe className="w-4 h-4 text-purple-400" />;
    }
  };

  // Basic formatter for citations within text (replacing [1] with highlighted badge links)
  const renderMessageContent = (content: string) => {
    // Return early if no markdown / simple format matches
    if (!content) return null;
    
    // Replace citation markers like [1], [2], [1, 2] with styling
    const parts = content.split(/(\[\d+(?:,\s*\d+)*\])/);
    return (
      <p className="leading-relaxed">
        {parts.map((part, index) => {
          if (part.match(/^\[\d+(?:,\s*\d+)*\]$/)) {
            const numbers = part.slice(1, -1).split(',').map(n => n.trim());
            return (
              <span key={index} className="inline-flex space-x-0.5 mx-0.5">
                {numbers.map((num, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-sans cursor-default select-none"
                    title={`Source chunk reference [${num}]`}
                  >
                    {num}
                  </span>
                ))}
              </span>
            );
          }
          return part;
        })}
      </p>
    );
  };

  return (
    <div className="flex h-[calc(100vh-100px)] border border-subtle rounded-2xl overflow-hidden glass-card">
      
      {/* 1. Conversations Sidebar List */}
      <div className="w-64 border-r border-subtle bg-sidebar-bg/50 flex flex-col justify-between flex-shrink-0">
        <div>
          <div className="p-4 border-b border-subtle">
            <button
              type="button"
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-card-bg border border-subtle hover:border-blue-500/50 text-secondary hover:text-primary text-xs font-bold transition-all duration-300 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-[calc(100vh-220px)] p-2 space-y-1">
            {sidebarLoading ? (
              [1, 2, 3].map((n) => (
                <div key={n} className="h-10 bg-hover-bg rounded-lg animate-pulse"></div>
              ))
            ) : conversations.length > 0 ? (
              conversations.map((conv) => {
                const isActive = selectedConvId === conv.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold truncate transition-all duration-300 cursor-pointer
                      ${isActive 
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-500 shadow shadow-blue-500/5' 
                        : 'text-secondary hover:bg-hover-bg border border-transparent hover:text-primary'
                      }
                    `}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                    <span className="truncate flex-1">{conv.title}</span>
                    <span className="opacity-65 flex-shrink-0">{getScopeIcon(conv.scope)}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-[10px] text-muted text-center py-8">No conversation history</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Chat Pane */}
      <div className="flex-1 flex flex-col justify-between bg-app-bg/10">
        
        {/* Top Header: Current Scope & Info */}
        <div className="p-4 border-b border-subtle bg-hover-bg/30 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Search Scope:</span>
            <div className="flex items-center space-x-1 border border-subtle bg-card-bg rounded-lg px-2.5 py-1 text-xs font-bold text-primary capitalize">
              {getScopeIcon(scope)}
              <span className="ml-1">{scope} Knowledge</span>
            </div>
          </div>
          
          {/* Scope selection buttons */}
          <div className="flex space-x-1 bg-hover-bg p-0.5 border border-subtle rounded-lg">
            {(['personal', 'team', 'organization'] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setScope(sc)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer ${scope === sc ? 'bg-card-bg text-blue-500 border border-subtle' : 'text-muted hover:text-primary'}`}
              >
                {sc.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Message View Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length > 0 ? (
            <>
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className="max-w-[85%] sm:max-w-2xl space-y-2">
                      
                      {/* Bubble */}
                      <div className={`
                        p-4 rounded-2xl border text-sm leading-relaxed shadow shadow-black/5
                        ${isUser 
                          ? 'bg-gradient-to-tr from-blue-600 to-blue-500 border-blue-400 text-white rounded-br-none' 
                          : 'bg-card-bg border-subtle text-primary rounded-bl-none'
                        }
                      `}>
                        {renderMessageContent(msg.content)}
                      </div>

                      {/* Citations List (Assistant message only) */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-2 pl-2 border-l-2 border-blue-500/20 space-y-2">
                          <p className="text-[10px] text-muted uppercase tracking-wider font-bold mb-1.5 flex items-center">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                            Grounded Citations ({msg.citations.length}):
                          </p>
                          <div className="grid grid-cols-1 gap-2 max-w-lg">
                            {msg.citations.map((cit, idx) => (
                              <CitationCard key={cit.chunk_id} citation={cit} index={idx + 1} />
                            ))}
                          </div>
                        </div>
                      )}
                      
                    </div>
                  </div>
                );
              })}
              
              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-card-bg border border-subtle p-4 rounded-2xl rounded-bl-none flex items-center space-x-1.5">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty Chat State */
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <HelpCircle className="w-12 h-12 text-muted mb-4" />
              <h3 className="text-base font-bold text-primary">Grounded Knowledge Assistant</h3>
              <p className="text-xs text-secondary max-w-sm mx-auto mt-1 leading-relaxed">
                Ask a question. The system will retrieve context chunks matching your scope permission level and compose a grounded answer using Gemini.
              </p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Error state alert */}
        {error && (
          <div className="mx-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSend} className="p-4 border-t border-subtle bg-hover-bg/30 flex items-center space-x-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-primary glass-input outline-none"
            placeholder={`Ask a question in ${scope} scope...`}
            required
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className={`
              p-3 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer
              ${question.trim() && !loading
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow shadow-blue-500/10'
                : 'bg-hover-bg text-muted border border-subtle cursor-not-allowed'
              }
            `}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};

export default Chat;
