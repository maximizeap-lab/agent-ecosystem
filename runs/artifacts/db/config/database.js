/**
 * Database Configuration
 * Centralised config for all environments with connection-pool tuning.
 */

'use strict';

require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const base = {
  client: 'postgresql',
  connection: {
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME     || 'appdb',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : false,
  },
  pool: {
    min:                parseInt(process.env.DB_POOL_MIN  || '2',   10),
    max:                parseInt(process.env.DB_POOL_MAX  || '10',  10),
    acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '30000', 10),
    createTimeoutMillis:  parseInt(process.env.DB_POOL_CREATE_TIMEOUT  || '30000', 10),
    destroyTimeoutMillis: parseInt(process.env.DB_POOL_DESTROY_TIMEOUT || '5000',  10),
    idleTimeoutMillis:    parseInt(process.env.DB_POOL_IDLE_TIMEOUT    || '600000', 10),
    reapIntervalMillis:   parseInt(process.env.DB_POOL_REAP_INTERVAL   || '1000',  10),
    createRetryIntervalMillis: parseInt(process.env.DB_POOL_RETRY_INTERVAL || '200', 10),
    propagateCreateError: false,
  },
  migrations: {
    directory:    './db/migrations',
    tableName:    'knex_migrations',
    schemaName:   'public',
    extension:    'js',
    loadExtensions: ['.js'],
  },
  seeds: {
    directory:    './db/seeds',
    loadExtensions: ['.js'],
  },
  debug: process.env.DB_DEBUG === 'true',
  asyncStackTraces: env !== 'production',
};

const configs = {
  development: {
    ...base,
    pool: { ...base.pool, min: 2, max: 5 },
  },

  test: {
    ...base,
    connection: {
      ...base.connection,
      database: process.env.DB_TEST_NAME || 'appdb_test',
    },
    pool: { ...base.pool, min: 1, max: 3 },
    seeds: { directory: './db/seeds/test', loadExtensions: ['.js'] },
  },

  staging: {
    ...base,
    pool: { ...base.pool, min: 2, max: 8 },
    debug: false,
  },

  production: {
    ...base,
    connection: {
      ...base.connection,
      ssl: { rejectUnauthorized: true },
    },
    pool: { ...base.pool, min: 5, max: 20 },
    debug: false,
    asyncStackTraces: false,
  },
};

module.exports = configs[env] || configs.development;
module.exports.all = configs;
