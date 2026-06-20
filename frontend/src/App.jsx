/**
 * App.jsx - Main Application Component
 *
 * This is the root component for the Typeahead Search System.
 * It orchestrates the layout and renders all major UI sections:
 *   - SearchBox: the primary input field for user queries
 *   - SuggestionDropdown: displays autocomplete suggestions (future phases)
 *   - TrendingSection: shows trending/popular searches (Phase 9)
 *
 * The app is centered on the page with a dark-themed aesthetic.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import SearchBox from './components/SearchBox';
import SuggestionDropdown from './components/SuggestionDropdown';
import TrendingSection from './components/TrendingSection';
import AnalyticsPanel from './components/AnalyticsPanel';

const API_BASE = 'http://localhost:3001';

function App() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced fetch
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsDropdownVisible(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setIsDropdownVisible(data.suggestions?.length > 0);
        setActiveIndex(-1); // Reset index on new results
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setQuery(searchQuery);
    setIsDropdownVisible(false);
    
    // Simulate navigation/search
    try {
      await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      console.log(`Searched for: ${searchQuery}`);
    } catch (err) {
      console.error('Failed to record search:', err);
    }
    
    setTimeout(() => setIsSearching(false), 500); // UI feedback
  };

  const handleKeyDown = (e) => {
    if (!isDropdownVisible || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch(query);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSearch(suggestions[activeIndex].query);
      } else {
        handleSearch(query);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownVisible(false);
    }
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Search Typeahead System</h1>

      <div className="search-wrapper-outer" onBlur={(e) => {
        // Close dropdown when clicking outside
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsDropdownVisible(false);
        }
      }}>
        <SearchBox 
          query={query}
          setQuery={setQuery}
          onKeyDown={handleKeyDown}
          isSearching={isSearching}
          onFocus={() => {
            if (suggestions.length > 0) setIsDropdownVisible(true);
          }}
        />

        <SuggestionDropdown 
          suggestions={suggestions}
          isVisible={isDropdownVisible}
          activeIndex={activeIndex}
          query={query}
          onSelect={(suggestionQuery) => handleSearch(suggestionQuery)}
        />
      </div>

      <TrendingSection onSearch={handleSearch} />
      <AnalyticsPanel />
    </div>
  );
}

export default App;
