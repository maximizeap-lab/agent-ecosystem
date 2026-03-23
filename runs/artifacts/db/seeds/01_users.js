/**
 * Seed: Users
 *
 * Passwords are bcrypt hashes of the literal string shown in comments.
 * Pre-compute with:  node -e "require('bcrypt').hash('Password1!', 12).then(console.log)"
 */

'use strict';

const TABLE = 'users';

const USERS = [
  {
    id:            'a0000000-0000-0000-0000-000000000001',
    username:      'superadmin',
    email:         'superadmin@example.com',
    // Password1!
    password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq.tGam',
    first_name:    'Super',
    last_name:     'Admin',
    role:          'superadmin',
    status:        'active',
    email_verified_at: new Date('2024-01-01T00:00:00Z'),
    timezone:      'UTC',
    locale:        'en',
    preferences:   JSON.stringify({ theme: 'dark', notifications: true }),
    metadata:      JSON.stringify({ source: 'seed' }),
  },
  {
    id:            'a0000000-0000-0000-0000-000000000002',
    username:      'admin_alice',
    email:         'alice@example.com',
    // AdminPass2!
    password_hash: '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    first_name:    'Alice',
    last_name:     'Johnson',
    role:          'admin',
    status:        'active',
    email_verified_at: new Date('2024-01-02T00:00:00Z'),
    timezone:      'America/New_York',
    locale:        'en',
    preferences:   JSON.stringify({ theme: 'light', notifications: true }),
    metadata:      JSON.stringify({ source: 'seed' }),
  },
  {
    id:            'a0000000-0000-0000-0000-000000000003',
    username:      'mod_bob',
    email:         'bob@example.com',
    password_hash: '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    first_name:    'Bob',
    last_name:     'Smith',
    role:          'moderator',
    status:        'active',
    email_verified_at: new Date('2024-01-03T00:00:00Z'),
    timezone:      'Europe/London',
    locale:        'en',
    preferences:   JSON.stringify({ theme: 'system', notifications: false }),
    metadata:      JSON.stringify({ source: 'seed' }),
  },
  {
    id:            'a0000000-0000-0000-0000-000000000004',
    username:      'carol_user',
    email:         'carol@example.com',
    password_hash: '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    first_name:    'Carol',
    last_name:     'Williams',
    role:          'user',
    status:        'active',
    email_verified_at: new Date('2024-01-04T00:00:00Z'),
    timezone:      'America/Los_Angeles',
    locale:        'en',
    preferences:   JSON.stringify({ theme: 'light', notifications: true }),
    metadata:      JSON.stringify({ source: 'seed' }),
  },
  {
    id:            'a0000000-0000-0000-0000-000000000005',
    username:      'dan_pending',
    email:         'dan@example.com',
    password_hash: '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    first_name:    'Dan',
    last_name:     'Brown',
    role:          'user',
    status:        'pending',
    email_verified_at: null,
    timezone:      'UTC',
    locale:        'en',
    preferences:   JSON.stringify({}),
    metadata:      JSON.stringify({ source: 'seed' }),
  },
];

exports.seed = async function (knex) {
  // Remove dependent rows first (FK order)
  await knex('audit_logs').whereIn('user_id', USERS.map(u => u.id)).del();
  await knex('sessions').whereIn('user_id', USERS.map(u => u.id)).del();
  await knex(TABLE).whereIn('id', USERS.map(u => u.id)).del();

  await knex(TABLE).insert(USERS);

  console.log(`✅ Seeded ${USERS.length} users`);
};
