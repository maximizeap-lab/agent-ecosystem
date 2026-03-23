/**
 * Seed: Categories (with nested tree structure)
 */

'use strict';

const TABLE = 'categories';

const CATEGORIES = [
  // ── Level 0 (roots) ───────────────────────────────────────────────────
  {
    id:         'c0000000-0000-0000-0000-000000000001',
    parent_id:  null,
    name:       'Electronics',
    slug:       'electronics',
    description: 'Electronic devices and accessories',
    icon_url:   '/icons/electronics.svg',
    color:      '#3B82F6',
    sort_order: 10,
    is_active:  true,
    path:       '/electronics',
  },
  {
    id:         'c0000000-0000-0000-0000-000000000002',
    parent_id:  null,
    name:       'Clothing',
    slug:       'clothing',
    description: 'Men\'s, women\'s and children\'s clothing',
    icon_url:   '/icons/clothing.svg',
    color:      '#EC4899',
    sort_order: 20,
    is_active:  true,
    path:       '/clothing',
  },
  {
    id:         'c0000000-0000-0000-0000-000000000003',
    parent_id:  null,
    name:       'Home & Garden',
    slug:       'home-garden',
    description: 'Everything for your home and garden',
    icon_url:   '/icons/home.svg',
    color:      '#10B981',
    sort_order: 30,
    is_active:  true,
    path:       '/home-garden',
  },
  {
    id:         'c0000000-0000-0000-0000-000000000004',
    parent_id:  null,
    name:       'Books',
    slug:       'books',
    description: 'Physical and digital books',
    icon_url:   '/icons/books.svg',
    color:      '#F59E0B',
    sort_order: 40,
    is_active:  true,
    path:       '/books',
  },

  // ── Level 1 (Electronics children) ───────────────────────────────────
  {
    id:         'c0000000-0000-0000-0000-000000000011',
    parent_id:  'c0000000-0000-0000-0000-000000000001',
    name:       'Smartphones',
    slug:       'smartphones',
    description: 'Mobile phones and accessories',
    icon_url:   '/icons/smartphone.svg',
    color:      '#3B82F6',
    sort_order: 10,
    is_active:  true,
    path:       '/electronics/smartphones',
  },
  {
    id:         'c0000000-0000-0000-0000-000000000012',
    parent_id:  'c0000000-0000-0000-0000-000000000001',
    name:       'Laptops',
    slug:       'laptops',
    description: 'Laptops and notebook computers',
    icon_url:   '/icons/laptop.svg',
    color:      '#3B82F6',
    sort_order: 20,
    is_active:  true,
    path:       '/electronics/laptops',
  },
  {
    id:         'c0000000-0000-0000-0000-000000000013',
    parent_id:  'c0000000-0000-0000-0000-000000000001',
    name:       'Audio',
    slug:       'audio',
    description: 'Headphones, speakers and audio gear',
    icon_url:   '/icons/headphones.svg',
    color:      '#3B82F6',
    sort_order: 30,
    is_active:  true,
    path:       '/electronics/audio',
  },

  // ── Level 1 (Clothing children) ───────────────────────────────────────
  {
    id:         'c0000000-0000-0000-0000-000000000021',
    parent_id:  'c0000000-0000-0000-0000-000000000002',
    name:       'Men\'s',
    slug:       'mens-clothing',
    description: 'Men\'s clothing and accessories',
    icon_url:   '/icons/mens.svg',
    color:      '#EC4899',
    sort_order: 10,
    is_active:  true,
    path:       '/clothing/mens-clothing',
  },
  {
    id:         'c0000000-0000-0000-0000-000000000022',
    parent_id:  'c0000000-0000-0000-0000-000000000002',
    name:       'Women\'s',
    slug:       'womens-clothing',
    description: 'Women\'s clothing and accessories',
    icon_url:   '/icons/womens.svg',
    color:      '#EC4899',
    sort_order: 20,
    is_active:  true,
    path:       '/clothing/womens-clothing',
  },
];

exports.seed = async function (knex) {
  const ids = CATEGORIES.map(c => c.id);

  // Clear in safe order (children before parents via recursive CTE would be ideal;
  // here we simply disable FK checks temporarily with a transaction)
  await knex.transaction(async (trx) => {
    // Children first
    await trx(TABLE).whereIn('id', ids).andWhereNot('parent_id', null).del();
    // Roots
    await trx(TABLE).whereIn('id', ids).whereNull('parent_id').del();

    // Insert roots, then children
    const roots    = CATEGORIES.filter(c => !c.parent_id);
    const children = CATEGORIES.filter(c =>  c.parent_id);
    await trx(TABLE).insert(roots);
    await trx(TABLE).insert(children);
  });

  console.log(`✅ Seeded ${CATEGORIES.length} categories`);
};
