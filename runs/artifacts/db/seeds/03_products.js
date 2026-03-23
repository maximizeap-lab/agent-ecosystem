/**
 * Seed: Products
 */

'use strict';

const TABLE = 'products';

const PRODUCTS = [
  {
    id:            'p0000000-0000-0000-0000-000000000001',
    category_id:   'c0000000-0000-0000-0000-000000000011',  // Smartphones
    created_by:    'a0000000-0000-0000-0000-000000000002',  // alice (admin)
    name:          'ProPhone 15 Ultra',
    slug:          'prophone-15-ultra',
    sku:           'PPH-15U-BLK-256',
    description:   'Flagship smartphone with a 6.7-inch OLED display, 200 MP camera system, and all-day battery life.',
    short_description: 'The most powerful smartphone we\'ve ever made.',
    price_cents:         119999,   // $1,199.99
    compare_at_price_cents: 129999,
    cost_price_cents:    65000,
    currency:      'USD',
    stock_quantity: 250,
    low_stock_threshold: 20,
    track_inventory: true,
    allow_backorder: false,
    weight_kg:     0.227,
    status:        'active',
    is_featured:   true,
    is_digital:    false,
    images:        JSON.stringify([
      { url: '/images/prophone-15-ultra-black.jpg', alt: 'ProPhone 15 Ultra Black', position: 1 },
      { url: '/images/prophone-15-ultra-back.jpg',  alt: 'ProPhone 15 Ultra Back',  position: 2 },
    ]),
    tags:       JSON.stringify(['flagship', 'smartphone', '5G', 'OLED']),
    attributes: JSON.stringify({ color: 'Midnight Black', storage: '256GB', ram: '12GB' }),
    seo:        JSON.stringify({ title: 'ProPhone 15 Ultra | Best Flagship Phone 2024', description: 'Shop the ProPhone 15 Ultra.' }),
    published_at: new Date('2024-01-15T09:00:00Z'),
  },
  {
    id:            'p0000000-0000-0000-0000-000000000002',
    category_id:   'c0000000-0000-0000-0000-000000000012',  // Laptops
    created_by:    'a0000000-0000-0000-0000-000000000002',
    name:          'UltraBook Pro 14',
    slug:          'ultrabook-pro-14',
    sku:           'UBP-14-SLV-512',
    description:   'Ultra-thin 14-inch laptop with Intel Core i9, 32 GB RAM, and 512 GB NVMe SSD.',
    short_description: 'Power meets portability.',
    price_cents:         149999,
    compare_at_price_cents: 169999,
    cost_price_cents:    90000,
    currency:      'USD',
    stock_quantity: 85,
    low_stock_threshold: 10,
    track_inventory: true,
    allow_backorder: true,
    weight_kg:     1.29,
    length_cm:     32.2,
    width_cm:      22.3,
    height_cm:     1.49,
    status:        'active',
    is_featured:   true,
    is_digital:    false,
    images:        JSON.stringify([
      { url: '/images/ultrabook-pro-14-silver.jpg', alt: 'UltraBook Pro 14 Silver', position: 1 },
    ]),
    tags:       JSON.stringify(['laptop', 'ultrabook', 'i9', 'portable']),
    attributes: JSON.stringify({ color: 'Space Silver', cpu: 'Intel Core i9', ram: '32GB', storage: '512GB SSD' }),
    seo:        JSON.stringify({ title: 'UltraBook Pro 14 | Premium Thin Laptop', description: 'The UltraBook Pro 14.' }),
    published_at: new Date('2024-01-20T09:00:00Z'),
  },
  {
    id:            'p0000000-0000-0000-0000-000000000003',
    category_id:   'c0000000-0000-0000-0000-000000000013',  // Audio
    created_by:    'a0000000-0000-0000-0000-000000000002',
    name:          'NoiseFree ANC Headphones',
    slug:          'noisefree-anc-headphones',
    sku:           'NF-ANC-BLK',
    description:   'Premium over-ear headphones with industry-leading active noise cancellation and 30-hour battery life.',
    short_description: 'Silence everything. Hear everything.',
    price_cents:   34999,
    compare_at_price_cents: 39999,
    cost_price_cents: 18000,
    currency:      'USD',
    stock_quantity: 4,  // Low stock
    low_stock_threshold: 10,
    track_inventory: true,
    allow_backorder: false,
    weight_kg:     0.254,
    status:        'active',
    is_featured:   false,
    is_digital:    false,
    images:        JSON.stringify([
      { url: '/images/noisefree-anc-black.jpg', alt: 'NoiseFree ANC Headphones Black', position: 1 },
    ]),
    tags:       JSON.stringify(['headphones', 'ANC', 'wireless', 'audio']),
    attributes: JSON.stringify({ color: 'Matte Black', connectivity: 'Bluetooth 5.3', battery: '30h' }),
    seo:        JSON.stringify({}),
    published_at: new Date('2024-02-01T09:00:00Z'),
  },
  {
    id:            'p0000000-0000-0000-0000-000000000004',
    category_id:   'c0000000-0000-0000-0000-000000000004',  // Books
    created_by:    'a0000000-0000-0000-0000-000000000001',
    name:          'Clean Architecture: A Craftsman\'s Guide',
    slug:          'clean-architecture-craftsmans-guide',
    sku:           'BOOK-CLEAN-ARCH-001',
    description:   'A comprehensive guide to building software architecture that stands the test of time.',
    short_description: 'Timeless principles for software architecture.',
    price_cents:   3999,
    compare_at_price_cents: null,
    cost_price_cents: 1200,
    currency:      'USD',
    stock_quantity: 500,
    low_stock_threshold: 50,
    track_inventory: true,
    allow_backorder: true,
    weight_kg:     0.68,
    status:        'active',
    is_featured:   false,
    is_digital:    false,
    images:        JSON.stringify([
      { url: '/images/clean-architecture-book.jpg', alt: 'Clean Architecture Book Cover', position: 1 },
    ]),
    tags:       JSON.stringify(['book', 'software', 'architecture', 'programming']),
    attributes: JSON.stringify({ format: 'Hardcover', pages: 432, author: 'Robert C. Martin', isbn: '9780134494166' }),
    seo:        JSON.stringify({}),
    published_at: new Date('2024-01-05T09:00:00Z'),
  },
  {
    id:            'p0000000-0000-0000-0000-000000000005',
    category_id:   'c0000000-0000-0000-0000-000000000011',
    created_by:    'a0000000-0000-0000-0000-000000000002',
    name:          'BudgetPhone X',
    slug:          'budgetphone-x',
    sku:           'BPX-BLU-128',
    description:   'Affordable smartphone with solid performance for everyday users.',
    short_description: 'Great value smartphone.',
    price_cents:   24999,
    compare_at_price_cents: 29999,
    cost_price_cents: 15000,
    currency:      'USD',
    stock_quantity: 0,
    low_stock_threshold: 15,
    track_inventory: true,
    allow_backorder: false,
    weight_kg:     0.189,
    status:        'out_of_stock',
    is_featured:   false,
    is_digital:    false,
    images:        JSON.stringify([
      { url: '/images/budgetphone-x-blue.jpg', alt: 'BudgetPhone X Blue', position: 1 },
    ]),
    tags:       JSON.stringify(['smartphone', 'budget', 'value']),
    attributes: JSON.stringify({ color: 'Ocean Blue', storage: '128GB', ram: '6GB' }),
    seo:        JSON.stringify({}),
    published_at: new Date('2024-01-10T09:00:00Z'),
  },
];

exports.seed = async function (knex) {
  await knex(TABLE).whereIn('id', PRODUCTS.map(p => p.id)).del();
  await knex(TABLE).insert(PRODUCTS);

  console.log(`✅ Seeded ${PRODUCTS.length} products`);
};
