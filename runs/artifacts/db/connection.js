/**
 * Database Connection Pool (Singleton)
 *
 * Exposes a single Knex instance that is shared across the entire process.
 * Supports graceful shutdown and health-check utilities.
 */

'use strict';

const knex      = require('knex');
const config    = require('./config/database');
const logger    = require('../src/utils/logger');

let _db = null;

/**
 * Initialise (or return the cached) connection pool.
 * @param {object} [overrideConfig] – optional config overrides (useful for tests)
 * @returns {import('knex').Knex}
 */
function getConnection(overrideConfig = {}) {
  if (_db) return _db;

  const finalConfig = { ...config, ...overrideConfig };

  _db = knex(finalConfig);

  /* ── Pool event hooks ────────────────────────────────────────────────── */
  _db.client.pool.on('createSuccess', (_eventId, resource) => {
    logger.debug('[pool] New connection created', {
      totalCount: _db.client.pool.numUsed() + _db.client.pool.numFree(),
    });
  });

  _db.client.pool.on('acquireSuccess', (_eventId, resource) => {
    logger.debug('[pool] Connection acquired', {
      used: _db.client.pool.numUsed(),
      free: _db.client.pool.numFree(),
    });
  });

  _db.client.pool.on('destroySuccess', (_eventId, resource) => {
    logger.debug('[pool] Connection destroyed', {
      remaining: _db.client.pool.numUsed() + _db.client.pool.numFree(),
    });
  });

  _db.client.pool.on('poolDestroySuccess', () => {
    logger.info('[pool] All connections have been destroyed.');
  });

  logger.info('[db] Connection pool initialised', {
    host:     finalConfig.connection.host,
    port:     finalConfig.connection.port,
    database: finalConfig.connection.database,
    poolMin:  finalConfig.pool.min,
    poolMax:  finalConfig.pool.max,
  });

  return _db;
}

/**
 * Verify database connectivity by running a lightweight query.
 * @returns {Promise<{ ok: boolean, latencyMs: number }>}
 */
async function healthCheck() {
  const db = getConnection();
  const start = Date.now();
  try {
    await db.raw('SELECT 1 AS health');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    logger.error('[db] Health-check failed', { error: err.message });
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}

/**
 * Return a snapshot of the current pool statistics.
 * @returns {{ used: number, free: number, pending: number, max: number }}
 */
function poolStats() {
  if (!_db) return { used: 0, free: 0, pending: 0, max: 0 };
  const pool = _db.client.pool;
  return {
    used:    pool.numUsed(),
    free:    pool.numFree(),
    pending: pool.numPendingAcquires(),
    max:     pool.max,
  };
}

/**
 * Gracefully destroy the pool (call during process shutdown).
 * @returns {Promise<void>}
 */
async function closeConnection() {
  if (!_db) return;
  logger.info('[db] Closing connection pool…');
  await _db.destroy();
  _db = null;
  logger.info('[db] Connection pool closed.');
}

/* ── Graceful shutdown hooks ─────────────────────────────────────────── */
process.on('SIGINT',  () => closeConnection().finally(() => process.exit(0)));
process.on('SIGTERM', () => closeConnection().finally(() => process.exit(0)));

module.exports = {
  getConnection,
  healthCheck,
  poolStats,
  closeConnection,
  /** Convenience: returns the knex singleton directly */
  get db() { return getConnection(); },
};
