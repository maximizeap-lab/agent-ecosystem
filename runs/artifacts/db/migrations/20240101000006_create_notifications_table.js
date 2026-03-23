/**
 * Migration: Notifications & notification_preferences tables
 */

'use strict';

exports.up = async function (knex) {
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE notification_type AS ENUM (
        'order_created', 'order_shipped', 'order_delivered', 'order_cancelled',
        'payment_received', 'payment_failed',
        'account_created', 'password_reset', 'email_verified',
        'low_stock', 'new_message', 'system_alert', 'promotion'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'push');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  /* ── notifications ──────────────────────────────────────────────────── */
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    t.specificType('type',    'notification_type').notNullable();
    t.specificType('channel', 'notification_channel').notNullable().defaultTo('in_app');

    t.string('title',   255).notNullable();
    t.text('body');
    t.string('action_url', 500);
    t.jsonb('data').defaultTo('{}');          // arbitrary payload

    t.boolean('is_read').notNullable().defaultTo(false);
    t.timestamp('read_at');
    t.timestamp('sent_at');
    t.timestamp('scheduled_at');

    t.string('external_id', 255);             // provider message-id
    t.boolean('delivery_failed').notNullable().defaultTo(false);
    t.text('failure_reason');

    t.timestamps(true, true);
  });

  await knex.schema.table('notifications', (t) => {
    t.index('user_id');
    t.index('type');
    t.index('channel');
    t.index('is_read');
    t.index('sent_at');
    t.index(['user_id', 'is_read']);    // composite for unread-count queries
  });

  /* ── notification_preferences ───────────────────────────────────────── */
  await knex.schema.createTable('notification_preferences', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    t.specificType('type',    'notification_type')   .notNullable();
    t.specificType('channel', 'notification_channel').notNullable();
    t.boolean('enabled').notNullable().defaultTo(true);

    t.timestamps(true, true);

    t.unique(['user_id', 'type', 'channel']);
  });

  await knex.schema.table('notification_preferences', (t) => {
    t.index('user_id');
  });

  for (const tbl of ['notifications', 'notification_preferences']) {
    await knex.raw(`
      CREATE TRIGGER ${tbl}_set_updated_at
      BEFORE UPDATE ON ${tbl}
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
  }
};

exports.down = async function (knex) {
  for (const tbl of ['notifications', 'notification_preferences']) {
    await knex.raw(`DROP TRIGGER IF EXISTS ${tbl}_set_updated_at ON ${tbl};`);
  }
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('notifications');
  await knex.raw(`DROP TYPE IF EXISTS notification_channel;`);
  await knex.raw(`DROP TYPE IF EXISTS notification_type;`);
};
