/**
 * Seed: Orders & Order Items
 */

'use strict';

const ORDERS = [
  {
    id:                  'o0000000-0000-0000-0000-000000000001',
    user_id:             'a0000000-0000-0000-0000-000000000004',  // carol
    order_number:        'ORD-20240115-001000',
    status:              'delivered',
    payment_status:      'paid',
    subtotal_cents:      154998,
    discount_cents:      5000,
    tax_cents:           11999,
    shipping_cents:      0,
    total_cents:         161997,
    currency:            'USD',
    shipping_address:    JSON.stringify({
      name: 'Carol Williams', line1: '123 Main St', city: 'Los Angeles',
      state: 'CA', postal_code: '90001', country: 'US',
    }),
    billing_address:     JSON.stringify({
      name: 'Carol Williams', line1: '123 Main St', city: 'Los Angeles',
      state: 'CA', postal_code: '90001', country: 'US',
    }),
    payment_method:      'card',
    payment_provider:    'stripe',
    payment_reference:   'pi_3NmQxC2eZvKYlo2C1234abcd',
    paid_at:             new Date('2024-01-15T10:05:00Z'),
    shipping_method:     'standard',
    tracking_number:     'TRK-1234567890',
    tracking_url:        'https://track.example.com/TRK-1234567890',
    shipped_at:          new Date('2024-01-16T08:00:00Z'),
    delivered_at:        new Date('2024-01-18T14:30:00Z'),
    estimated_delivery_at: new Date('2024-01-19T00:00:00Z'),
    coupon_code:         'SAVE5',
    coupon_discount_cents: 5000,
    notes:               'Please leave at the door.',
  },
  {
    id:                  'o0000000-0000-0000-0000-000000000002',
    user_id:             'a0000000-0000-0000-0000-000000000004',
    order_number:        'ORD-20240201-001001',
    status:              'processing',
    payment_status:      'paid',
    subtotal_cents:      34999,
    discount_cents:      0,
    tax_cents:           2975,
    shipping_cents:      999,
    total_cents:         38973,
    currency:            'USD',
    shipping_address:    JSON.stringify({
      name: 'Carol Williams', line1: '123 Main St', city: 'Los Angeles',
      state: 'CA', postal_code: '90001', country: 'US',
    }),
    billing_address:     JSON.stringify({
      name: 'Carol Williams', line1: '123 Main St', city: 'Los Angeles',
      state: 'CA', postal_code: '90001', country: 'US',
    }),
    payment_method:      'paypal',
    payment_provider:    'paypal',
    payment_reference:   'PAY-9B3425325H123456M',
    paid_at:             new Date('2024-02-01T15:00:00Z'),
    shipping_method:     'express',
    estimated_delivery_at: new Date('2024-02-03T00:00:00Z'),
  },
  {
    id:                  'o0000000-0000-0000-0000-000000000003',
    user_id:             'a0000000-0000-0000-0000-000000000004',
    order_number:        'ORD-20240210-001002',
    status:              'cancelled',
    payment_status:      'refunded',
    subtotal_cents:      119999,
    discount_cents:      0,
    tax_cents:           10200,
    shipping_cents:      0,
    total_cents:         130199,
    currency:            'USD',
    shipping_address:    JSON.stringify({
      name: 'Carol Williams', line1: '123 Main St', city: 'Los Angeles',
      state: 'CA', postal_code: '90001', country: 'US',
    }),
    billing_address:     JSON.stringify({
      name: 'Carol Williams', line1: '123 Main St', city: 'Los Angeles',
      state: 'CA', postal_code: '90001', country: 'US',
    }),
    payment_method:      'card',
    payment_provider:    'stripe',
    payment_reference:   'pi_3NmQxC2eZvKYlo2C9999zzzz',
    paid_at:             new Date('2024-02-10T09:00:00Z'),
    cancelled_at:        new Date('2024-02-10T11:00:00Z'),
    cancellation_reason: 'Customer changed mind',
  },
];

const ORDER_ITEMS = [
  // Order 1
  {
    id:               'oi000000-0000-0000-0000-000000000001',
    order_id:         'o0000000-0000-0000-0000-000000000001',
    product_id:       'p0000000-0000-0000-0000-000000000002',  // UltraBook Pro 14
    product_name:     'UltraBook Pro 14',
    product_sku:      'UBP-14-SLV-512',
    product_snapshot: JSON.stringify({ price_cents: 149999, currency: 'USD' }),
    quantity:         1,
    unit_price_cents: 149999,
    discount_cents:   0,
    total_cents:      149999,
  },
  {
    id:               'oi000000-0000-0000-0000-000000000002',
    order_id:         'o0000000-0000-0000-0000-000000000001',
    product_id:       'p0000000-0000-0000-0000-000000000004',  // Clean Architecture Book
    product_name:     'Clean Architecture: A Craftsman\'s Guide',
    product_sku:      'BOOK-CLEAN-ARCH-001',
    product_snapshot: JSON.stringify({ price_cents: 3999, currency: 'USD' }),
    quantity:         1,
    unit_price_cents: 3999,
    discount_cents:   0,
    total_cents:      3999,
  },
  // Order 2
  {
    id:               'oi000000-0000-0000-0000-000000000003',
    order_id:         'o0000000-0000-0000-0000-000000000002',
    product_id:       'p0000000-0000-0000-0000-000000000003',  // NoiseFree ANC Headphones
    product_name:     'NoiseFree ANC Headphones',
    product_sku:      'NF-ANC-BLK',
    product_snapshot: JSON.stringify({ price_cents: 34999, currency: 'USD' }),
    quantity:         1,
    unit_price_cents: 34999,
    discount_cents:   0,
    total_cents:      34999,
  },
  // Order 3 (cancelled)
  {
    id:               'oi000000-0000-0000-0000-000000000004',
    order_id:         'o0000000-0000-0000-0000-000000000003',
    product_id:       'p0000000-0000-0000-0000-000000000001',  // ProPhone 15 Ultra
    product_name:     'ProPhone 15 Ultra',
    product_sku:      'PPH-15U-BLK-256',
    product_snapshot: JSON.stringify({ price_cents: 119999, currency: 'USD' }),
    quantity:         1,
    unit_price_cents: 119999,
    discount_cents:   0,
    total_cents:      119999,
  },
];

exports.seed = async function (knex) {
  // Clear in FK order
  await knex('order_items').whereIn('id', ORDER_ITEMS.map(i => i.id)).del();
  await knex('orders').whereIn('id', ORDERS.map(o => o.id)).del();

  // Temporarily disable the auto-number trigger so our fixed numbers are used
  await knex.raw(`ALTER TABLE orders DISABLE TRIGGER orders_generate_order_number;`);
  await knex('orders').insert(ORDERS);
  await knex.raw(`ALTER TABLE orders ENABLE TRIGGER orders_generate_order_number;`);

  await knex('order_items').insert(ORDER_ITEMS);

  console.log(`✅ Seeded ${ORDERS.length} orders with ${ORDER_ITEMS.length} order items`);
};
