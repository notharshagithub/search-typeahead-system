/**
 * SearchBox.jsx - Primary Search Input Component
 *
 * Renders a styled text input for the user to type search queries.
 *
 * --- Future Enhancements ---
 * - Debouncing: Add a 150-250ms debounce on keystroke before firing the
 *   /suggest API call to avoid overwhelming the backend with rapid requests.
 * - Controlled state: Lift query state up to App.jsx so SuggestionDropdown
 *   can consume it.
 * - Loading indicator: Show a subtle spinner while waiting for suggestions.
 * - Clear button: Add an (×) icon to quickly reset the input.
 * - Keyboard shortcut: Focus the input on "/" keypress for power users.
 */

import React, { useRef, useEffect } from 'react';

function SearchBox({ query, setQuery, onKeyDown, isSearching, onFocus }) {
  const inputRef = useRef(null);

  // Focus on "/" keypress
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className={`search-wrapper ${isSearching ? 'is-searching' : ''}`}>
      <div className="search-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="Search... (Press / to focus)"
        aria-label="Search"
        autoComplete="off"
        spellCheck="false"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
      />
      {query && (
        <button 
          className="clear-btn" 
          onClick={() => { setQuery(''); inputRef.current?.focus(); }}
          aria-label="Clear search"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
}

export default SearchBox;
