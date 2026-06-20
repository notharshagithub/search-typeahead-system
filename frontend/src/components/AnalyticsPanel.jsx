import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3001';

function AnalyticsPanel() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${API_BASE}/analytics`);
        const data = await res.json();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // refresh every 2s
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return null;

  return (
    <div className="analytics-panel fade-in">
      <h3>📊 System Analytics</h3>
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Uptime</span>
          <span className="metric-value">{metrics.uptimeSeconds}s</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Cache Hit Rate</span>
          <span className="metric-value">{metrics.hitRatePercent}%</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Avg Latency</span>
          <span className="metric-value">{metrics.avgLatencyMs}ms</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Searches</span>
          <span className="metric-value">{metrics.totalSearches}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Cache Hits/Misses</span>
          <span className="metric-value">{metrics.cacheHits} / {metrics.cacheMisses}</span>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPanel;
