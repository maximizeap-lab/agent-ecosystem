/**
 * Migration: Create products table
 */

'use strict';

const TABLE = 'products';

exports.up = async function (knex) {
  /* ── ENUM types ─────────────────────────────────────────────────────── */
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived', 'out_of_stock');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  /* ── Table ──────────────────────────────────────────────────────────── */
  await knex.schema.createTable(TABLE, (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('category_id').references('id').inTable('categories').onDelete('SET NULL');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');

    // Core fields
    t.string('name',      255).notNullable();
    t.string('slug',      280).notNullable().unique();
    t.string('sku',        80).unique();
    t.text('description');
    t.text('short_description');

    // Pricing (store in smallest currency unit, e.g. cents)
    t.bigInteger('price_cents').notNullable().defaultTo(0);
    t.bigInteger('compare_at_price_cents');
    t.bigInteger('cost_price_cents');
    t.string('currency', 3).notNullable().defaultTo('USD');

    // Inventory
    t.integer('stock_quantity').notNullable().defaultTo(0);
    t.integer('low_stock_threshold').defaultTo(5);
    t.boolean('track_inventory').notNullable().defaultTo(true);
    t.boolean('allow_backorder').notNullable().defaultTo(false);

    // Dimensions / weight for shipping
    t.decimal('weight_kg', 10, 3);
    t.decimal('length_cm', 10, 2);
    t.decimal('width_cm',  10, 2);
    t.decimal('height_cm', 10, 2);

    // Flags
    t.specificType('status', 'product_status').notNullable().defaultTo('draft');
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.boolean('is_digital').notNullable().defaultTo(false);

    // Rich content
    t.jsonb('images').defaultTo('[]');         // [{url, alt, position}]
    t.jsonb('tags').defaultTo('[]');
    t.jsonb('attributes').defaultTo('{}');     // colour, size, etc.
    t.jsonb('seo').defaultTo('{}');            // title, description, og_image
    t.jsonb('metadata').defaultTo('{}');

    // SEO
    t.string('meta_title',       255);
    t.string('meta_description', 500);

    t.timestamp('published_at');
    t.timestamp('deleted_at');
    t.timestamps(true, true);
  });

  /* ── Indexes ────────────────────────────────────────────────────────── */
  await knex.schema.table(TABLE, (t) => {
    t.index('category_id');
    t.index('created_by');
    t.index('status');
    t.index('slug');
    t.index('sku');
    t.index('is_featured');
    t.index('price_cents');
    t.index('stock_quantity');
    t.index('published_at');
    t.index('deleted_at');
  });

  // Full-text search index on name + description
  await knex.raw(`
    CREATE INDEX products_fts_idx
      ON ${TABLE}
      USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
  `);

  // GIN index for JSONB tag containment queries
  await knex.raw(`CREATE INDEX products_tags_gin_idx ON ${TABLE} USING GIN (tags);`);
  await knex.raw(`CREATE INDEX products_attrs_gin_idx ON ${TABLE} USING GIN (attributes);`);

  await knex.raw(`
    CREATE TRIGGER ${TABLE}_set_updated_at
    BEFORE UPDATE ON ${TABLE}
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
};

exports.down = async function (knex) {
  await knex.raw(`DROP TRIGGER IF EXISTS ${TABLE}_set_updated_at ON ${TABLE};`);
  await knex.schema.dropTableIfExists(TABLE);
  await knex.raw(`DROP TYPE IF EXISTS product_status;`);
};
