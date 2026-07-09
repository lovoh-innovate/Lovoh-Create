// src/components/SmartSearchPanel.jsx
import React, { useState } from 'react';
import { FaSearch, FaTimes, FaSpinner, FaPlusCircle, FaMagic, FaFillDrip } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useSearchDeepseekMutation } from '../slices/deepseekApiSlice';

const SmartSearchPanel = ({ isOpen, onClose, editor, onFillForm }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [mode, setMode] = useState('search');
  const [searchDeepseek, { isLoading }] = useSearchDeepseekMutation();

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    try {
      const data = await searchDeepseek({
        query: trimmed,
        mode: mode,
      }).unwrap();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      toast.error(err?.data?.error || err?.message || 'Search failed');
      setResults([]);
    }
  };

  const insertResult = (content) => {
    if (!editor) return;
    editor.commands.insertContent(content);
    toast.success('Content inserted!');
    onClose();
  };

  const handleFillForm = (suggestion) => {
    if (!onFillForm) return;
    onFillForm({
      title: suggestion.title || '',
      excerpt: suggestion.snippet || '',
      category: suggestion.category || '',
      tags: suggestion.tags || [],
      content: suggestion.content || '',
    });
    toast.success('Form filled with AI suggestions!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-4 border-b border-gray-200">
          <button
            onClick={() => setMode('search')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
              mode === 'search'
                ? 'bg-[#1B3766] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FaSearch className="inline mr-1" /> Search & Insert
          </button>
          <button
            onClick={() => setMode('compose')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
              mode === 'compose'
                ? 'bg-[#1B3766] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FaMagic className="inline mr-1" /> Compose Article
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="p-4 border-b border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === 'search'
                  ? 'Search for news, topics, or keywords...'
                  : 'Describe the article you want to write...'
              }
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3766]"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#1B3766] text-white rounded-xl hover:bg-[#142952] transition-colors disabled:opacity-50"
            >
              {isLoading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
            </button>
          </div>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="w-8 h-8 text-[#1B3766] animate-spin" />
            </div>
          ) : results.length > 0 ? (
            results.map((item, index) => (
              <div
                key={index}
                className="p-3 border border-gray-200 rounded-xl hover:border-[#1B3766] transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.snippet}</p>
                    {mode === 'compose' && (item.category || item.tags?.length) && (
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
                  <div className="flex flex-col items-end gap-1 ml-2">
                    {mode === 'search' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          insertResult(item.content || item.snippet);
                        }}
                        className="text-[#1B3766] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Insert into editor"
                      >
                        <FaPlusCircle className="text-lg" />
                      </button>
                    )}
                    {mode === 'compose' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFillForm(item);
                        }}
                        className="text-[#1B3766] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Fill form with this suggestion"
                      >
                        <FaFillDrip className="text-lg" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              {query
                ? 'No results found. Try a different search.'
                : mode === 'search'
                ? 'Search for news or topics to get content suggestions.'
                : 'Describe what you want to write about, and AI will help you structure it.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 text-xs text-gray-400 text-center">
          Powered by Gemini AI & NewsAPI – results are for inspiration and may need editing.
        </div>
      </div>
    </div>
  );
};

export default SmartSearchPanel;