// src/components/SmartSearchPanel.jsx – Icons Only
import React, { useState, useRef, useEffect } from 'react';
import { 
  FaSearch, FaTimes, FaSpinner, FaPlusCircle, FaMagic, FaFillDrip, 
  FaPaperPlane, FaComments, FaPlus 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useSearchDeepseekMutation } from '../slices/deepseekApiSlice';

const SmartSearchPanel = ({ isOpen, onClose, editor, onFillForm }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [mode, setMode] = useState('search');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [searchDeepseek] = useSearchDeepseekMutation();

  // ── Scroll to bottom of chat ─────────────────────────────────────────────
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  if (!isOpen) return null;

  // ── Handle initial search ────────────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setResults([]);

    try {
      const data = await searchDeepseek({
        query: trimmed,
        mode: mode === 'chat' ? 'compose' : mode,
      }).unwrap();

      const normalized = Array.isArray(data) ? data : [data];
      setResults(normalized);

      if (mode === 'chat' && normalized.length > 0) {
        const firstResult = normalized[0];
        setChatMessages([
          { role: 'user', content: trimmed },
          { role: 'ai', content: firstResult.content, metadata: firstResult },
        ]);
        setResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error(err?.data?.error || err?.message || 'Search failed');
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  };

  // ── Handle chat follow‑up ────────────────────────────────────────────────
  const handleChatSend = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const updatedMessages = [...chatMessages, { role: 'user', content: trimmed }];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsLoading(true);

    try {
      const lastAiMessage = updatedMessages.filter(m => m.role === 'ai').pop();
      const context = lastAiMessage?.metadata || {};

      const response = await searchDeepseek({
        query: trimmed,
        mode: 'chat',
        context: {
          title: context.title || '',
          snippet: context.snippet || '',
          content: context.content || '',
          category: context.category || '',
          tags: context.tags || [],
          chatHistory: updatedMessages.filter(m => m.role === 'user').map(m => m.content).join(' | '),
        },
      }).unwrap();

      const data = Array.isArray(response) ? response : [response];
      const newResult = data[0] || context;

      setChatMessages([
        ...updatedMessages,
        { 
          role: 'ai', 
          content: newResult.content || newResult.snippet,
          metadata: newResult,
        },
      ]);

      setResults([newResult]);

    } catch (err) {
      console.error('Chat error:', err);
      toast.error(err?.data?.error || err?.message || 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Insert into editor ────────────────────────────────────────────────────
  const insertResult = (content) => {
    if (!editor) return;
    editor.commands.insertContent(content);
    toast.success('Content inserted!');
    onClose();
  };

  // ── Fill form ─────────────────────────────────────────────────────────────
  const handleFillForm = (suggestion) => {
    if (!onFillForm) return;
    onFillForm({
      title: suggestion.title || '',
      excerpt: suggestion.snippet || '',
      category: suggestion.category || '',
      tags: suggestion.tags || [],
      content: suggestion.content || '',
    });
    toast.success('Form filled!');
    onClose();
  };

  const handleCardClick = (item) => {
    if (mode === 'compose' || mode === 'chat') {
      handleFillForm(item);
    } else {
      insertResult(item.content || item.snippet);
    }
  };

  // ── Render chat view ──────────────────────────────────────────────────────
  if (mode === 'chat' && chatMessages.length > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] shadow-xl relative flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FaComments className="text-[#1B3766] text-lg sm:text-xl" />
              <span className="text-base sm:text-lg font-semibold text-gray-900">Chat</span>
              <button
                onClick={() => {
                  setChatMessages([]);
                  setMode('search');
                }}
                className="text-xs px-2 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-1"
              >
                <FaPlus className="text-[10px]" /> New
              </button>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
              <FaTimes className="text-gray-500" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-[#1B3766] text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                  {msg.metadata && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleFillForm(msg.metadata)}
                        className="text-xs px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white flex items-center gap-1"
                      >
                        <FaFillDrip className="text-[10px]" /> Fill
                      </button>
                      <button
                        onClick={() => insertResult(msg.metadata.content || msg.content)}
                        className="text-xs px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white flex items-center gap-1"
                      >
                        <FaPlusCircle className="text-[10px]" /> Insert
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-sm">
                  <FaSpinner className="w-5 h-5 text-[#1B3766] animate-spin" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask AI to refine..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3766] bg-white"
                disabled={isLoading}
              />
              <button
                onClick={handleChatSend}
                disabled={isLoading || !chatInput.trim()}
                className="px-4 py-2.5 bg-[#1B3766] text-white rounded-xl hover:bg-[#142952] transition-colors disabled:opacity-50 flex items-center justify-center min-w-[44px]"
              >
                {isLoading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane className="text-sm sm:text-base" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Search/Compose view ──────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] shadow-xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FaMagic className="text-[#1B3766] text-lg sm:text-xl" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">AI Assistant</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1.5 p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setMode('search')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'search'
                ? 'bg-[#1B3766] text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <FaSearch className="text-xs sm:text-sm" /> 
            <span className="hidden xs:inline">Search</span>
          </button>
          <button
            onClick={() => {
              setMode('compose');
              setChatMessages([]);
            }}
            className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'compose'
                ? 'bg-[#1B3766] text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <FaMagic className="text-xs sm:text-sm" /> 
            <span className="hidden xs:inline">Compose</span>
          </button>
          <button
            onClick={() => {
              setMode('chat');
              setChatMessages([]);
              setResults([]);
            }}
            className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'chat'
                ? 'bg-[#1B3766] text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <FaComments className="text-xs sm:text-sm" /> 
            <span className="hidden xs:inline">Chat</span>
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="p-3 sm:p-4 border-b border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === 'search'
                  ? 'Search news, topics...'
                  : mode === 'compose'
                  ? 'What do you want to write about?'
                  : 'What would you like to chat about?'
              }
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3766] bg-white"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 bg-[#1B3766] text-white rounded-xl hover:bg-[#142952] transition-colors disabled:opacity-50 min-w-[44px] flex items-center justify-center"
            >
              {isLoading ? <FaSpinner className="animate-spin" /> : <FaSearch className="text-sm sm:text-base" />}
            </button>
          </div>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <FaSpinner className="w-8 h-8 text-[#1B3766] animate-spin" />
            </div>
          ) : results.length > 0 ? (
            results.map((item, index) => (
              <div
                key={index}
                className="p-3 sm:p-4 border border-gray-200 rounded-xl hover:border-[#1B3766] transition-colors cursor-pointer group bg-white hover:shadow-sm"
                onClick={() => handleCardClick(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {item.snippet}
                    </p>
                    {(mode === 'compose' || mode === 'chat') && (item.category || item.tags?.length) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.category && (
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                            {item.category}
                          </span>
                        )}
                        {item.tags && item.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {mode === 'search' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          insertResult(item.content || item.snippet);
                        }}
                        className="p-2 rounded-full text-[#1B3766] bg-[#1B3766]/10 hover:bg-[#1B3766]/20 transition-colors"
                        title="Insert"
                      >
                        <FaPlusCircle className="text-base sm:text-lg" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFillForm(item);
                        }}
                        className="p-2 rounded-full text-[#1B3766] bg-[#1B3766]/10 hover:bg-[#1B3766]/20 transition-colors"
                        title="Fill Form"
                      >
                        <FaFillDrip className="text-base sm:text-lg" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 text-sm sm:text-base">
              <FaSearch className="text-3xl text-gray-300 mb-3" />
              {mode === 'search'
                ? 'Search for news or topics to get content suggestions.'
                : mode === 'compose'
                ? 'Describe what you want to write about, and AI will help you structure it.'
                : 'Start a chat to refine your content interactively!'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 sm:p-3 border-t border-gray-100 text-[10px] sm:text-xs text-gray-400 text-center bg-gray-50/50 rounded-b-2xl">
          Powered by Gemini AI
        </div>
      </div>
    </div>
  );
};

export default SmartSearchPanel;