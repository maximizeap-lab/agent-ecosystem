/**
 * Migration: Create orders & order_items tables
 */

'use strict';

exports.up = async function (knex) {
  /* ── ENUM types ─────────────────────────────────────────────────────── */
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE order_status AS ENUM (
        'pending', 'confirmed', 'processing', 'shipped',
        'delivered', 'cancelled', 'refunded', 'failed'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE payment_status AS ENUM (
        'unpaid', 'pending', 'paid', 'partially_refunded', 'refunded', 'failed'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  /* ── orders ─────────────────────────────────────────────────────────── */
  await knex.schema.createTable('orders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');

    // Human-readable order number (e.g. ORD-20240101-0001)
    t.string('order_number', 30).notNullable().unique();

    t.specificType('status',         'order_status')  .notNullable().defaultTo('pending');
    t.specificType('payment_status', 'payment_status').notNullable().defaultTo('unpaid');

    // Pricing snapshot (cents)
    t.bigInteger('subtotal_cents').notNullable().defaultTo(0);
    t.bigInteger('discount_cents').notNullable().defaultTo(0);
    t.bigInteger('tax_cents').notNullable().defaultTo(0);
    t.bigInteger('shipping_cents').notNullable().defaultTo(0);
    t.bigInteger('total_cents').notNullable().defaultTo(0);
    t.string('currency', 3).notNullable().defaultTo('USD');

    // Addresses (snapshots at time of order)
    t.jsonb('shipping_address').defaultTo('{}');
    t.jsonb('billing_address').defaultTo('{}');

    // Payment
    t.string('payment_method',     50);
    t.string('payment_provider',   50);
    t.string('payment_reference', 255);
    t.timestamp('paid_at');

    // Shipping
    t.string('shipping_method',     50);
    t.string('tracking_number',    100);
    t.string('tracking_url',       500);
    t.timestamp('shipped_at');
    t.timestamp('delivered_at');
    t.timestamp('estimated_delivery_at');

    // Promotion
    t.string('coupon_code', 50);
    t.bigInteger('coupon_discount_cents').defaultTo(0);

    t.text('notes');
    t.text('internal_notes');
    t.jsonb('metadata').defaultTo('{}');

    t.timestamp('cancelled_at');
    t.string('cancellation_reason', 500);
    t.timestamps(true, true);
  });

  await knex.schema.table('orders', (t) => {
    t.index('user_id');
    t.index('order_number');
    t.index('status');
    t.index('payment_status');
    t.index('created_at');
    t.index('paid_at');
  });

  /* ── order_items ────────────────────────────────────────────────────── */
  await knex.schema.createTable('order_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.uuid('product_id').references('id').inTable('products').onDelete('SET NULL');

    // Snapshot of product at purchase time
    t.string('product_name', 255).notNullable();
    t.string('product_sku',   80);
    t.jsonb('product_snapshot').defaultTo('{}');   // full product JSON

    t.integer('quantity').notNullable().defaultTo(1);
    t.bigInteger('unit_price_cents').notNullable();
    t.bigInteger('discount_cents').notNullable().defaultTo(0);
    t.bigInteger('total_cents').notNullable();

    t.jsonb('metadata').defaultTo('{}');
    t.timestamps(true, true);
  });

  await knex.schema.table('order_items', (t) => {
    t.index('order_id');
    t.index('product_id');
  });

  /* ── Triggers ───────────────────────────────────────────────────────── */
  for (const tbl of ['orders', 'order_items']) {
    await knex.raw(`
      CREATE TRIGGER ${tbl}_set_updated_at
      BEFORE UPDATE ON ${tbl}
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
  }

  /* ── Auto order number sequence ─────────────────────────────────────── */
  await knex.raw(`CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;`);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION generate_order_number()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                          LPAD(nextval('order_number_seq')::TEXT, 6, '0');
      RETURN NEW;
    END;
    $$;
  `);

  await knex.raw(`
    CREATE TRIGGER orders_generate_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
    EXECUTE FUNCTION generate_order_number();
  `);
};

exports.down = async function (knex) {
  await knex.raw(`DROP TRIGGER IF EXISTS orders_generate_order_number ON orders;`);
  await knex.raw(`DROP FUNCTION IF EXISTS generate_order_number;`);
  await knex.raw(`DROP SEQUENCE IF EXISTS order_number_seq;`);
  await knex.raw(`DROP TRIGGER IF EXISTS order_items_set_updated_at ON order_items;`);
  await knex.raw(`DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;`);
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
  await knex.raw(`DROP TYPE IF EXISTS payment_status;`);
  await knex.raw(`DROP TYPE IF EXISTS order_status;`);
};
