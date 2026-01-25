#!/usr/bin/env node

/**
 * Seed Listings
 * Generates 6 sample listings for a given tenant_id.
 *
 * Usage:
 *   node scripts/seed/seed-listings.js sql YOUR_TENANT_ID > listings.sql
 *   node scripts/seed/seed-listings.js json YOUR_TENANT_ID > listings.json
 */

const listings = [
  {
    title: "Modern Downtown Loft",
    slug: "modern-downtown-loft",
    description:
      "A bright open-concept loft with floor-to-ceiling windows, perfect for remote work or weekend getaways.",
    excerpt: "Open-concept loft in the heart of downtown.",
    price: 245,
    currency: "USD",
    address: {
      street: "123 Market St",
      city: "San Francisco",
      region: "CA",
      country: "USA",
      postal_code: "94103",
    },
    gallery: [
      { url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511" },
      { url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85" },
    ],
  },
  {
    title: "Beachfront Bungalow",
    slug: "beachfront-bungalow",
    description:
      "Cozy two-bedroom bungalow steps from the sand with a private deck and ocean views.",
    excerpt: "Two-bedroom bungalow on the beach with ocean views.",
    price: 320,
    currency: "USD",
    address: {
      street: "45 Ocean Ave",
      city: "San Diego",
      region: "CA",
      country: "USA",
      postal_code: "92109",
    },
    gallery: [
      { url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511" },
      { url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85" },
    ],
  },
  {
    title: "Mountain Cabin Retreat",
    slug: "mountain-cabin-retreat",
    description:
      "Secluded A-frame cabin surrounded by pines. Fireplace, hot tub, and fast Wi-Fi included.",
    excerpt: "A-frame cabin with hot tub and fireplace.",
    price: 275,
    currency: "USD",
    address: {
      street: "88 Summit Rd",
      city: "Aspen",
      region: "CO",
      country: "USA",
      postal_code: "81611",
    },
    gallery: [
      { url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267" },
      { url: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4" },
    ],
  },
  {
    title: "Lakeside Family Home",
    slug: "lakeside-family-home",
    description:
      "Spacious four-bedroom home on a quiet lake. Dock access, kayaks, and large backyard.",
    excerpt: "Four-bedroom lakeside home with dock and kayaks.",
    price: 410,
    currency: "USD",
    address: {
      street: "12 Harbor Loop",
      city: "Madison",
      region: "WI",
      country: "USA",
      postal_code: "53703",
    },
    gallery: [
      { url: "https://images.unsplash.com/photo-1502005097973-6a7082348e28" },
      { url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511" },
    ],
  },
  {
    title: "City Center Studio",
    slug: "city-center-studio",
    description:
      "Walkable studio near restaurants and transit. Includes kitchenette and in-unit laundry.",
    excerpt: "Central studio close to dining and transit.",
    price: 180,
    currency: "USD",
    address: {
      street: "77 Park Ave",
      city: "New York",
      region: "NY",
      country: "USA",
      postal_code: "10016",
    },
    gallery: [
      { url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511" },
      { url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85" },
    ],
  },
  {
    title: "Suburban Family Nest",
    slug: "suburban-family-nest",
    description:
      "Three-bedroom home in a quiet neighborhood with a fenced yard and nearby parks.",
    excerpt: "Family-friendly home with yard and parks nearby.",
    price: 230,
    currency: "USD",
    address: {
      street: "402 Maple Dr",
      city: "Austin",
      region: "TX",
      country: "USA",
      postal_code: "78704",
    },
    gallery: [
      { url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511" },
      { url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85" },
    ],
  },
];

function escapeLiteral(value) {
  return value.replace(/'/g, "''");
}

function generateSQL(tenantId) {
  const lines = [];
  lines.push("-- Seed 6 listings");
  listings.forEach((listing) => {
    lines.push(
      `INSERT INTO listings (tenant_id, title, slug, description, excerpt, price, currency, status, address, gallery, view_count, inquiry_count, rating_average, rating_count, created_at, updated_at) VALUES (`
    );
    lines.push(
      `  '${tenantId}',` +
        ` '${escapeLiteral(listing.title)}',` +
        ` '${listing.slug}',` +
        ` '${escapeLiteral(listing.description)}',` +
        ` '${escapeLiteral(listing.excerpt)}',` +
        ` ${listing.price},` +
        ` '${listing.currency}',` +
        ` 'published',` +
        ` '${JSON.stringify(listing.address)}',` +
        ` '${JSON.stringify(listing.gallery)}',` +
        ` 0, 0, NULL, 0, NOW(), NOW()`
    );
    lines.push(");");
  });
  return lines.join("\n");
}

function generateJSON(tenantId) {
  return JSON.stringify(
    listings.map((l) => ({ ...l, tenant_id: tenantId, status: "published" })),
    null,
    2
  );
}

if (require.main === module) {
  const format = process.argv[2] || "sql";
  const tenantId = process.argv[3] || "YOUR_TENANT_ID";

  if (!tenantId || tenantId === "YOUR_TENANT_ID") {
    console.error("Please supply tenant id: node scripts/seed/seed-listings.js sql <TENANT_ID>");
    process.exit(1);
  }

  if (format === "json") {
    console.log(generateJSON(tenantId));
  } else {
    console.log(generateSQL(tenantId));
  }
}


