# Seed Data Scripts

Utilities for populating your listing platform with sample data for testing and development.

## Available Scripts

### 1. seed-professions.js

Seeds common professions for **industry directory** platforms.

**Includes:**
- Legal Services (Lawyers, Notaries, Mediators, Paralegals)
- Healthcare (Doctors, Dentists, Therapists, Nurses, Pharmacists)
- Home Services (Plumbers, Electricians, Contractors, Landscapers, etc.)
- Pet Services (Veterinarians, Groomers, Trainers, Sitters)
- Financial Services (Accountants, Financial Advisors, Tax Preparers)
- Real Estate (Agents, Appraisers, Inspectors, Property Managers)
- Education (Tutors, Music Teachers, Language Teachers)
- Automotive (Mechanics, Body Shops, Detailing, Towing)

**Usage:**

```bash
# Generate SQL
node scripts/seed/seed-professions.js sql YOUR_TENANT_ID > professions.sql

# Generate JSON
node scripts/seed/seed-professions.js json > professions.json
```

**Apply to database:**

```bash
# Via psql
psql your_database < professions.sql

# Via Supabase SQL Editor
# Copy contents and paste into SQL Editor
```

### 2. seed-locations.js

Seeds geographic locations for **location-based** platforms.

**Includes:**
- United States (5 states with major cities each)
- Canada (4 provinces with major cities)
- United Kingdom (3 regions with cities)
- Australia (3 states with cities)

Total: 4 countries, 15 regions, 75+ cities

**Usage:**

```bash
# Generate SQL
node scripts/seed/seed-locations.js sql YOUR_TENANT_ID > locations.sql

# Generate JSON
node scripts/seed/seed-locations.js json > locations.json
```

**Apply to database:**

```bash
# Via psql
psql your_database < locations.sql

# Via Supabase SQL Editor
# Copy contents and paste into SQL Editor
```

## Getting Your Tenant ID

```sql
-- In Supabase SQL Editor or psql
SELECT id, name FROM tenants;
```

Copy the UUID for your tenant.

## Examples

### Seed Professions

```bash
# Get your tenant ID
TENANT_ID="123e4567-e89b-12d3-a456-426614174000"

# Generate and apply
node scripts/seed/seed-professions.js sql $TENANT_ID | psql $DATABASE_URL
```

### Seed Locations

```bash
# Get your tenant ID
TENANT_ID="123e4567-e89b-12d3-a456-426614174000"

# Generate and apply
node scripts/seed/seed-locations.js sql $TENANT_ID | psql $DATABASE_URL
```

### Via Supabase Dashboard

1. Run seed script to generate SQL:
   ```bash
   node scripts/seed/seed-professions.js sql YOUR_TENANT_ID
   ```

2. Copy the output

3. Go to Supabase Dashboard > SQL Editor

4. Paste and run

## Extending the Data

### Adding More Professions

Edit `seed-professions.js`:

```javascript
const professions = {
  'Your Category': {
    slug: 'your-category',
    description: 'Description',
    children: [
      { name: 'Profession 1', slug: 'profession-1', description: 'Desc' },
      { name: 'Profession 2', slug: 'profession-2', description: 'Desc' },
    ]
  },
  // ...existing categories
};
```

### Adding More Locations

Edit `seed-locations.js`:

```javascript
const locations = {
  'Your Country': {
    slug: 'your-country',
    code: 'XX',
    regions: {
      'Your Region': {
        slug: 'your-region',
        code: 'YR',
        cities: ['City 1', 'City 2', 'City 3']
      }
    }
  },
  // ...existing countries
};
```

## Creating Custom Seed Scripts

Use the existing scripts as templates:

```javascript
#!/usr/bin/env node

const yourData = {
  // Your data structure
};

function generateSQL(tenantId) {
  const lines = [];
  
  lines.push('-- Your SQL here');
  // ... generate SQL
  
  return lines.join('\n');
}

function generateJSON() {
  // ... generate JSON
  return JSON.stringify(data, null, 2);
}

if (require.main === module) {
  const format = process.argv[2] || 'sql';
  const tenantId = process.argv[3] || 'YOUR_TENANT_ID';
  
  if (format === 'json') {
    console.log(generateJSON());
  } else {
    console.log(generateSQL(tenantId));
  }
}
```

## Verifying Seeded Data

```sql
-- Check taxonomy types
SELECT * FROM taxonomy_types;

-- Check professions
SELECT 
  tt.name as type,
  tm.name as term,
  parent.name as parent
FROM taxonomy_terms tm
LEFT JOIN taxonomy_terms parent ON parent.id = tm.parent_id
LEFT JOIN taxonomy_types tt ON tt.id = tm.taxonomy_type_id
ORDER BY tm.display_order;

-- Count terms per type
SELECT 
  tt.name,
  COUNT(tm.id) as term_count
FROM taxonomy_types tt
LEFT JOIN taxonomy_terms tm ON tm.taxonomy_type_id = tt.id
GROUP BY tt.id, tt.name;
```

## Cleaning Seeded Data

```sql
-- Remove all taxonomy terms
DELETE FROM taxonomy_terms WHERE tenant_id = 'YOUR_TENANT_ID';

-- Remove taxonomy type
DELETE FROM taxonomy_types WHERE tenant_id = 'YOUR_TENANT_ID' AND slug = 'profession';
-- or
DELETE FROM taxonomy_types WHERE tenant_id = 'YOUR_TENANT_ID' AND slug = 'geography';
```

## Notes

- Scripts use `ON CONFLICT` to avoid duplicates
- Re-running scripts is safe (idempotent)
- Customize the data to match your specific needs
- Scripts support both SQL and JSON output formats
- JSON format useful for API-based insertion

## Troubleshooting

### "Tenant ID not found"

Make sure you've created a tenant first:

```sql
INSERT INTO tenants (name, slug) 
VALUES ('My Platform', 'my-platform')
RETURNING id;
```

### "Taxonomy type not found"

The scripts create the taxonomy type automatically. Check if it exists:

```sql
SELECT * FROM taxonomy_types WHERE slug = 'profession';
```

### "Permission denied"

Ensure you're using a service role key or admin connection, not anon key.

## License

MIT License - Part of Listing Platform Base Template

