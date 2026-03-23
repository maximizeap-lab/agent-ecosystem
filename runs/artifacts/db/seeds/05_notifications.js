/**
 * Seed: Notifications & Notification Preferences
 */

'use strict';

const PREFERENCES = [
  // carol – all channels enabled
  ...[
    'order_created', 'order_shipped', 'order_delivered',
    'payment_received', 'account_created',
  ].flatMap(type => [
    { user_id: 'a0000000-0000-0000-0000-000000000004', type, channel: 'in_app', enabled: true },
    { user_id: 'a0000000-0000-0000-0000-000000000004', type, channel: 'email',  enabled: true },
  ]),

  // admin alice – in-app and email
  ...[
    'low_stock', 'order_created', 'system_alert',
  ].flatMap(type => [
    { user_id: 'a0000000-0000-0000-0000-000000000002', type, channel: 'in_app', enabled: true },
    { user_id: 'a0000000-0000-0000-0000-000000000002', type, channel: 'email',  enabled: true },
    { user_id: 'a0000000-0000-0000-0000-000000000002', type, channel: 'sms',    enabled: false },
  ]),
];

const NOTIFICATIONS = [
  {
    id:          'n0000000-0000-0000-0000-000000000001',
    user_id:     'a0000000-0000-0000-0000-000000000004',
    type:        'order_created',
    channel:     'in_app',
    title:       'Order Confirmed',
    body:        'Your order ORD-20240115-001000 has been confirmed.',
    action_url:  '/orders/o0000000-0000-0000-0000-000000000001',
    data:        JSON.stringify({ order_id: 'o0000000-0000-0000-0000-000000000001', order_number: 'ORD-20240115-001000' }),
    is_read:     true,
    read_at:     new Date('2024-01-15T10:10:00Z'),
    sent_at:     new Date('2024-01-15T10:05:30Z'),
  },
  {
    id:          'n0000000-0000-0000-0000-000000000002',
    user_id:     'a0000000-0000-0000-0000-000000000004',
    type:        'order_shipped',
    channel:     'in_app',
    title:       'Your Order Has Shipped!',
    body:        'Order ORD-20240115-001000 is on its way. Tracking: TRK-1234567890.',
    action_url:  '/orders/o0000000-0000-0000-0000-000000000001',
    data:        JSON.stringify({ order_id: 'o0000000-0000-0000-0000-000000000001', tracking: 'TRK-1234567890' }),
    is_read:     true,
    read_at:     new Date('2024-01-16T09:00:00Z'),
    sent_at:     new Date('2024-01-16T08:05:00Z'),
  },
  {
    id:          'n0000000-0000-0000-0000-000000000003',
    user_id:     'a0000000-0000-0000-0000-000000000004',
    type:        'order_delivered',
    channel:     'in_app',
    title:       'Order Delivered',
    body:        'Your order ORD-20240115-001000 has been delivered. Enjoy!',
    action_url:  '/orders/o0000000-0000-0000-0000-000000000001',
    data:        JSON.stringify({ order_id: 'o0000000-0000-0000-0000-000000000001' }),
    is_read:     false,
    sent_at:     new Date('2024-01-18T14:35:00Z'),
  },
  {
    id:          'n0000000-0000-0000-0000-000000000004',
    user_id:     'a0000000-0000-0000-0000-000000000002',  // alice (admin)
    type:        'low_stock',
    channel:     'in_app',
    title:       'Low Stock Alert',
    body:        'NoiseFree ANC Headphones (NF-ANC-BLK) has only 4 units remaining.',
    action_url:  '/admin/products/p0000000-0000-0000-0000-000000000003',
    data:        JSON.stringify({ product_id: 'p0000000-0000-0000-0000-000000000003', stock: 4 }),
    is_read:     false,
    sent_at:     new Date('2024-02-01T08:00:00Z'),
  },
];

exports.seed = async function (knex) {
  const notifIds  = NOTIFICATIONS.map(n => n.id);
  const userIds   = [...new Set(PREFERENCES.map(p => p.user_id))];

  await knex('notifications').whereIn('id', notifIds).del();
  await knex('notification_preferences').whereIn('user_id', userIds).del();

  await knex('notifications').insert(NOTIFICATIONS);
  await knex('notification_preferences').insert(PREFERENCES);

  console.log(`✅ Seeded ${NOTIFICATIONS.length} notifications and ${PREFERENCES.length} preferences`);
};
