/**
 * TrendingSection.jsx - Trending Searches Panel
 *
 * Displays a curated list of currently trending or popular search queries.
 * This section provides discovery for users who haven't typed anything yet.
 *
 * --- Phase 9 Implementation Plan ---
 * - Data source: Fetch trending queries from the analytics/trending API
 *   endpoint, which aggregates search frequency data.
 * - Real-time updates: Poll or subscribe (via WebSocket) for live trending
 *   data so the list stays fresh without a page reload.
 * - Click behavior: Clicking a trending item should populate the SearchBox
 *   and immediately trigger a search.
 * - Visual design: Each trending item displayed as a pill/chip with rank
 *   number and optional trend indicator (↑ rising, → steady).
 * - Caching: Cache trending data on the client to reduce redundant API
 *   calls; refresh every 30-60 seconds.
 */

import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3001';

function TrendingSection({ onSearch }) {
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await fetch(`${API_BASE}/trending?limit=8`);
        const data = await res.json();
        setTrends(data.trending || []);
      } catch (err) {
        console.error('Failed to fetch trending:', err);
      }
    };

    fetchTrends();
    // Poll every 5 seconds for live trending data
    const interval = setInterval(fetchTrends, 5000);
    return () => clearInterval(interval);
  }, []);

  if (trends.length === 0) return null;

  return (
    <div className="trending-section fade-in">
      <h2>🔥 Trending Now</h2>
      <div className="trending-pills">
        {trends.map((item, index) => (
          <button 
            key={item.query}
            className="trending-pill"
            onClick={() => onSearch(item.query)}
            aria-label={`Search for trending topic: ${item.query}`}
          >
            <span className="trend-rank">#{index + 1}</span>
            <span className="trend-text">{item.query}</span>
            {index < 3 && <span className="trend-icon">🚀</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TrendingSection;
