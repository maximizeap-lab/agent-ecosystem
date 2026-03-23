/**
 * Migration: Create audit_logs & sessions tables
 */

'use strict';

exports.up = async function (knex) {
  /* ── sessions ───────────────────────────────────────────────────────── */
  await knex.schema.createTable('sessions', (t) => {
    t.string('id', 128).primary();            // session token (hashed)
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('ip_address',  45);
    t.text('user_agent');
    t.string('device_type', 30);              // mobile | tablet | desktop
    t.string('os',          50);
    t.string('browser',     50);
    t.string('country',      3);
    t.string('city',        80);
    t.jsonb('payload').defaultTo('{}');       // arbitrary session data
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('last_active_at');
    t.timestamp('expires_at').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.table('sessions', (t) => {
    t.index('user_id');
    t.index('expires_at');
    t.index('is_active');
  });

  /* ── audit_logs ─────────────────────────────────────────────────────── */
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE audit_action AS ENUM (
        'create', 'read', 'update', 'delete',
        'login', 'logout', 'login_failed',
        'password_change', 'password_reset',
        'export', 'import', 'permission_change'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await knex.schema.createTable('audit_logs', (t) => {
    t.bigIncrements('id');
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('session_id', 128).references('id').inTable('sessions').onDelete('SET NULL');

    t.specificType('action', 'audit_action').notNullable();
    t.string('entity_type', 100);             // 'user', 'product', 'order', …
    t.uuid('entity_id');
    t.string('entity_label', 255);            // human-readable snapshot

    t.jsonb('old_values').defaultTo('{}');
    t.jsonb('new_values').defaultTo('{}');
    t.jsonb('changed_fields').defaultTo('[]');

    t.string('ip_address', 45);
    t.text('user_agent');
    t.string('request_id', 64);              // correlation ID from HTTP layer
    t.string('request_path', 500);
    t.string('request_method', 10);

    t.boolean('success').notNullable().defaultTo(true);
    t.text('error_message');

    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.table('audit_logs', (t) => {
    t.index('user_id');
    t.index('action');
    t.index('entity_type');
    t.index('entity_id');
    t.index('created_at');
    t.index('request_id');
  });

  // Composite index for entity history queries
  await knex.raw(`
    CREATE INDEX audit_logs_entity_idx
      ON audit_logs (entity_type, entity_id, created_at DESC);
  `);

  /* ── Partition audit_logs by month (optional, requires pg ≥ 10) ─────── */
  // Enable with: SET enable_partition_pruning = on;
  // Left as a comment – partition DDL depends on your PG version strategy.

  await knex.raw(`
    CREATE TRIGGER sessions_set_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
};

exports.down = async function (knex) {
  await knex.raw(`DROP TRIGGER IF EXISTS sessions_set_updated_at ON sessions;`);
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('sessions');
  await knex.raw(`DROP TYPE IF EXISTS audit_action;`);
};
