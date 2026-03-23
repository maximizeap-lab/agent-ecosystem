/**
 * Migration: Create categories table (self-referencing for tree structure)
 */

'use strict';

const TABLE = 'categories';

exports.up = async function (knex) {
  await knex.schema.createTable(TABLE, (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('parent_id').references('id').inTable(TABLE).onDelete('SET NULL');

    t.string('name',        150).notNullable();
    t.string('slug',        170).notNullable().unique();
    t.text('description');
    t.string('icon_url',    500);
    t.string('color',        10);   // hex colour
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);

    // Materialised path for fast tree queries  e.g. "/root/child/grandchild"
    t.string('path', 1000);

    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('deleted_at');
    t.timestamps(true, true);
  });

  await knex.schema.table(TABLE, (t) => {
    t.index('parent_id');
    t.index('slug');
    t.index('is_active');
    t.index('sort_order');
    t.index('path');
  });

  await knex.raw(`
    CREATE TRIGGER ${TABLE}_set_updated_at
    BEFORE UPDATE ON ${TABLE}
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
};

exports.down = async function (knex) {
  await knex.raw(`DROP TRIGGER IF EXISTS ${TABLE}_set_updated_at ON ${TABLE};`);
  await knex.schema.dropTableIfExists(TABLE);
};
