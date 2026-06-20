/**
 * SuggestionDropdown.jsx - Autocomplete Suggestions Dropdown
 *
 * Displays a list of typeahead suggestions below the search input.
 * Currently a placeholder — hidden by default via CSS (display: none).
 *
 * --- Future Enhancements ---
 * - Arrow-key navigation: Allow users to navigate suggestions with ↑/↓
 *   arrow keys, highlighting the active item and submitting on Enter.
 * - Mouse hover highlighting: Visually indicate which suggestion is
 *   being hovered.
 * - Suggestion ranking: Display suggestions sorted by relevance/frequency
 *   as returned by the /suggest API.
 * - Prefix highlighting: Bold the portion of each suggestion that matches
 *   the user's current query prefix.
 * - Click-to-search: Clicking a suggestion should populate the search box
 *   and trigger a /search call.
 * - Escape to close: Pressing Escape should dismiss the dropdown.
 * - Empty state: Show a "No suggestions found" message when the API
 *   returns an empty list.
 */

import React from 'react';

function SuggestionDropdown({ suggestions, isVisible, activeIndex, query, onSelect }) {
  if (!isVisible || suggestions.length === 0) return null;

  // Highlight the matching prefix
  const renderHighlightedText = (text, highlight) => {
    if (!highlight) return text;
    const parts = text.split(new RegExp(`^(${highlight})`, 'i'));
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
        <strong key={index} className="highlight">{part}</strong> : part
    );
  };

  // Format count (e.g., 1.2M, 45K)
  const formatCount = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="suggestion-dropdown" role="listbox" aria-label="Search suggestions">
      {suggestions.map((item, index) => (
        <div
          key={item.query}
          role="option"
          aria-selected={index === activeIndex}
          className={`suggestion-item ${index === activeIndex ? 'active' : ''}`}
          onClick={() => onSelect(item.query)}
          onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
        >
          <div className="suggestion-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div className="suggestion-text">
            {renderHighlightedText(item.query, query)}
          </div>
          <div className="suggestion-count">
            {formatCount(item.count)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SuggestionDropdown;
