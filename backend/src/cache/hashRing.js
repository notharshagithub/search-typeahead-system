/**
 * @fileoverview Consistent Hash Ring for distributing cache keys across nodes.
 *
 * Maps each physical cache node to `virtualNodesPerNode` positions on a
 * 32-bit hash ring. Key look-ups walk clockwise to find the first node,
 * providing even distribution and minimal key re-mapping when nodes are
 * added or removed.
 *
 * Future implementation will:
 *   - Use a fast hash (e.g. FNV-1a or MD5) for ring positioning.
 *   - Maintain a sorted array of virtual node positions for O(log n) lookups.
 *   - Emit events on topology changes so the cache layer can react.
 *
 * @module cache/hashRing
 */

const crypto = require('crypto');
const logger = require('../logger');

class HashRing {
  constructor(nodes = [], virtualNodesPerNode = 150) {
    this.nodes = new Set(nodes);
    this.virtualNodesPerNode = virtualNodesPerNode;
    this.ring = []; // Array of { hash: number, node: string } sorted by hash
    
    if (nodes.length > 0) {
      this._buildRing();
    }
    logger.hash(`HashRing created with ${nodes.length} nodes and ${virtualNodesPerNode} vnodes per node.`);
  }

  _hash(str) {
    // Fast 32-bit integer hash using first 4 bytes of MD5
    const hash = crypto.createHash('md5').update(str).digest();
    return hash.readUInt32BE(0);
  }

  _buildRing() {
    this.ring = [];
    for (const node of this.nodes) {
      for (let i = 0; i < this.virtualNodesPerNode; i++) {
        const vNodeKey = `${node}#${i}`;
        this.ring.push({
          hash: this._hash(vNodeKey),
          node: node
        });
      }
    }
    // Sort by hash value
    this.ring.sort((a, b) => a.hash - b.hash);
  }

  getNodeForKey(key) {
    if (this.ring.length === 0) return null;

    const hash = this._hash(key);
    
    // Binary search to find the first node with hash >= key's hash
    let low = 0;
    let high = this.ring.length - 1;
    let mid;

    while (low <= high) {
      mid = Math.floor((low + high) / 2);
      if (this.ring[mid].hash < hash) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Wrap around to the first node if we're past the end
    if (low >= this.ring.length) {
      low = 0;
    }

    return this.ring[low].node;
  }

  addNode(node) {
    if (!this.nodes.has(node)) {
      logger.hash(`addNode: ${node}`);
      this.nodes.add(node);
      this._buildRing();
    }
  }

  removeNode(node) {
    if (this.nodes.has(node)) {
      logger.hash(`removeNode: ${node}`);
      this.nodes.delete(node);
      this._buildRing();
    }
  }
}

// Create a singleton instance based on environment variables
const cacheNodesStr = process.env.CACHE_NODES || '';
const initialNodes = cacheNodesStr ? cacheNodesStr.split(',') : [];
const defaultRing = new HashRing(initialNodes);

module.exports = { HashRing, defaultRing };
