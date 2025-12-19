# Database Schema - Listing Platform Base

This directory contains the flexible database schema for the Listing Platform Base template.

## Structure

```
database/
├── schema/
│   ├── core.sql              # Core tables (extends existing tenant/user tables)
│   ├── taxonomy.sql          # Flexible taxonomy system
│   ├── listings.sql          # Universal listings table
│   ├── field_definitions.sql # Dynamic field system
│   └── features/             # Optional feature schemas
│       ├── reviews.sql       # Reviews & ratings
│       ├── booking.sql       # Booking & reservations
│       └── maps.sql          # Enhanced location features
└── migrations/               # Timestamped migration files

## Schema Overview

### Core Tables

- `tenants` (existing) - Extended with `platform_config` jsonb column
- `users` (existing) - Extended with listing platform features
- `user_listing_stats` - Track user listing activity
- `saved_listings` - User saved/favorited listings
- `listing_alerts` - Search alerts and notifications

### Taxonomy System

Flexible taxonomy that supports multiple hierarchies:

- `taxonomy_types` - Define taxonomy types (industry, location, category, etc.)
- `taxonomy_terms` - Hierarchical terms within each taxonomy
- `listing_taxonomies` - Many-to-many relationship between listings and terms

**Examples:**
- Industry: Legal Services > Lawyers > Family Law
- Location: USA > California > San Francisco
- Property: Residential > House > Single Family

### Listings

- `listings` - Universal listing table with flexible fields
- `listing_images` - Image gallery with metadata
- `field_definitions` - Define custom fields per taxonomy/listing type

### Feature Modules

#### Reviews (reviews.sql)
- `reviews` - User reviews with ratings
- `review_votes` - Helpful/not helpful votes
- `listing_ratings` - Cached aggregate ratings

#### Booking (booking.sql)
- `bookings` - Reservation system
- `availability_slots` - Availability calendar
- `booking_calendar` - View for calendar display

#### Maps (maps.sql)
- `listing_service_areas` - Areas served by businesses
- `listing_nearby_places` - POIs near listings
- `neighborhoods` - Neighborhood information
- `listing_neighborhoods` - Listing-neighborhood relationships

## Installation

### For New Deployments

1. Ensure you have Supabase initialized with the base tenant/user schema
2. Run the schemas in order:

```bash
# Core extensions
psql -f database/schema/core.sql

# Taxonomy system
psql -f database/schema/taxonomy.sql

# Listings
psql -f database/schema/listings.sql

# Field definitions
psql -f database/schema/field_definitions.sql

# Optional features (enable as needed)
psql -f database/schema/features/reviews.sql
psql -f database/schema/features/booking.sql
psql -f database/schema/features/maps.sql
```

### For Cloned Projects

When you clone this base for a specific implementation:

1. Copy relevant schema files to your Supabase migrations directory
2. Remove features you don't need (e.g., booking for industry directories)
3. Add custom field definitions for your specific use case
4. Run migrations: `supabase db push`

## Configuration Per Clone

Each cloned project should configure:

1. **Taxonomy Type** in `tenants.platform_config`:
   ```json
   {
     "taxonomy_type": "industry",  // or "location" or "hybrid"
     "multi_tenant_mode": true,
     "allow_user_listings": true
   }
   ```

2. **Field Definitions** for your listing type:
   ```sql
   INSERT INTO field_definitions (tenant_id, field_key, field_label, field_type, required)
   VALUES
     ('tenant-uuid', 'bedrooms', 'Bedrooms', 'number', false),
     ('tenant-uuid', 'bathrooms', 'Bathrooms', 'number', false);
   ```

3. **Taxonomy Terms** for your specific domain:
   ```sql
   -- For industry directory
   INSERT INTO taxonomy_types (tenant_id, name, slug)
   VALUES ('tenant-uuid', 'Profession', 'profession');
   
   INSERT INTO taxonomy_terms (tenant_id, taxonomy_type_id, name, slug)
   VALUES 
     ('tenant-uuid', 'type-uuid', 'Lawyers', 'lawyers'),
     ('tenant-uuid', 'type-uuid', 'Notaries', 'notaries');
   ```

## Key Features

### 1. Flexible Taxonomy
- Support any hierarchy (profession, location, category)
- Unlimited depth
- Multiple taxonomies per listing

### 2. Dynamic Fields
- Define fields per taxonomy type
- Type validation
- Searchable/filterable flags

### 3. Geographic Queries
- PostGIS-powered location search
- Radius queries
- Service area matching
- Nearby places

### 4. Performance
- Strategic indexes on all common queries
- Cached aggregates (ratings, counts)
- RLS policies for security

### 5. Multi-tenant Ready
- All tables tenant-scoped
- RLS enforces data isolation
- Per-tenant configuration

## Extending the Schema

To add custom features to a cloned project:

1. Create new tables in `database/schema/custom/`
2. Always include `tenant_id` for multi-tenant isolation
3. Add RLS policies
4. Create appropriate indexes
5. Add triggers for cache updates if needed

## Migration Strategy

For cloned projects, we recommend:

1. Start with a clean Supabase project
2. Apply base tenant/user migrations from original repo
3. Apply listing platform schemas
4. Add your custom migrations
5. Seed with your specific data

## Backup & Restore

```bash
# Backup
pg_dump -Fc database_url > backup.dump

# Restore
pg_restore -d database_url backup.dump
```

## Performance Tips

1. **Use appropriate indexes** - Already provided for common queries
2. **Cache aggregates** - Rating averages, counts are auto-cached
3. **Paginate results** - Use LIMIT/OFFSET or cursor pagination
4. **Geographic queries** - Use GIST indexes for location
5. **Avoid N+1** - Use JOINs or batch queries

## Security

All tables have RLS enabled with policies:
- Public can view published content
- Users can manage their own content
- Admins can manage tenant data

## Support

For questions about the schema:
- See `docs/CONFIGURATION_GUIDE.md`
- See `docs/CLONING_GUIDE.md`
- Check example implementations in `examples/`

