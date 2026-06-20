/**
 * @fileoverview Basic Ranking Strategy – sorts suggestions by raw count.
 *
 * This is the simplest ranking approach: the more times a query has been
 * searched, the higher it appears. It serves as the default strategy and
 * a baseline for comparing more advanced rankers (trending, personalised).
 *
 * @module ranking/basicRanking
 */

/**
 * Rank suggestion results by count in descending order.
 *
 * @param {Array<{ query: string, count: number }>} results - Unranked suggestion list.
 * @returns {Array<{ query: string, count: number }>} Sorted copy (highest count first).
 */
function rankByCount(results) {
  return [...results].sort((a, b) => b.count - a.count);
}

module.exports = { rankByCount };
