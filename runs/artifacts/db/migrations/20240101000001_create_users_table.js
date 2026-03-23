/**
 * Migration: Create users table
 */

'use strict';

const TABLE = 'users';

exports.up = async function (knex) {
  /* ── ENUM types ─────────────────────────────────────────────────────── */
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'moderator', 'user', 'guest');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  /* ── Table ──────────────────────────────────────────────────────────── */
  await knex.schema.createTable(TABLE, (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Identity
    t.string('username',   64).notNullable().unique();
    t.string('email',     255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('first_name', 100);
    t.string('last_name',  100);
    t.string('avatar_url', 500);
    t.string('phone',       30);

    // Role & status (stored as text referencing PG enums)
    t.specificType('role',   'user_role')  .notNullable().defaultTo('user');
    t.specificType('status', 'user_status').notNullable().defaultTo('pending');

    // Security
    t.timestamp('email_verified_at');
    t.string('email_verification_token', 255);
    t.string('password_reset_token',     255);
    t.timestamp('password_reset_expires_at');
    t.integer('failed_login_attempts').notNullable().defaultTo(0);
    t.timestamp('locked_until');
    t.timestamp('last_login_at');
    t.string('last_login_ip', 45);

    // Profile extras
    t.jsonb('preferences').defaultTo('{}');
    t.jsonb('metadata').defaultTo('{}');
    t.string('timezone', 64).defaultTo('UTC');
    t.string('locale',   10).defaultTo('en');

    // Soft-delete & audit
    t.timestamp('deleted_at');
    t.timestamps(true, true);   // created_at / updated_at with defaults
  });

  /* ── Indexes ────────────────────────────────────────────────────────── */
  await knex.schema.table(TABLE, (t) => {
    t.index('email');
    t.index('username');
    t.index('status');
    t.index('role');
    t.index('deleted_at');
    t.index('created_at');
  });

  // Partial index: only non-deleted users
  await knex.raw(`
    CREATE UNIQUE INDEX users_email_active_uidx
      ON ${TABLE} (email)
      WHERE deleted_at IS NULL;
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX users_username_active_uidx
      ON ${TABLE} (username)
      WHERE deleted_at IS NULL;
  `);

  /* ── updated_at trigger ─────────────────────────────────────────────── */
  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;
  `);

  await knex.raw(`
    CREATE TRIGGER ${TABLE}_set_updated_at
    BEFORE UPDATE ON ${TABLE}
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
};

exports.down = async function (knex) {
  await knex.raw(`DROP TRIGGER IF EXISTS ${TABLE}_set_updated_at ON ${TABLE};`);
  await knex.schema.dropTableIfExists(TABLE);
  await knex.raw(`DROP TYPE IF EXISTS user_status;`);
  await knex.raw(`DROP TYPE IF EXISTS user_role;`);
};
