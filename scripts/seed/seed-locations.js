#!/usr/bin/env node

/**
 * Seed Geographic Locations for Location-based Platform
 * Populates taxonomy_types and taxonomy_terms with countries, regions, and major cities
 */

const locations = {
  'United States': {
    slug: 'united-states',
    code: 'US',
    regions: {
      'California': {
        slug: 'california',
        code: 'CA',
        cities: ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento']
      },
      'New York': {
        slug: 'new-york',
        code: 'NY',
        cities: ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse']
      },
      'Texas': {
        slug: 'texas',
        code: 'TX',
        cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth']
      },
      'Florida': {
        slug: 'florida',
        code: 'FL',
        cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale']
      },
      'Illinois': {
        slug: 'illinois',
        code: 'IL',
        cities: ['Chicago', 'Aurora', 'Naperville', 'Rockford', 'Joliet']
      },
    }
  },
  'Canada': {
    slug: 'canada',
    code: 'CA',
    regions: {
      'Ontario': {
        slug: 'ontario',
        code: 'ON',
        cities: ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'London']
      },
      'Quebec': {
        slug: 'quebec',
        code: 'QC',
        cities: ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil']
      },
      'British Columbia': {
        slug: 'british-columbia',
        code: 'BC',
        cities: ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond']
      },
      'Alberta': {
        slug: 'alberta',
        code: 'AB',
        cities: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat']
      },
    }
  },
  'United Kingdom': {
    slug: 'united-kingdom',
    code: 'GB',
    regions: {
      'England': {
        slug: 'england',
        code: 'EN',
        cities: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds']
      },
      'Scotland': {
        slug: 'scotland',
        code: 'SC',
        cities: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness']
      },
      'Wales': {
        slug: 'wales',
        code: 'WA',
        cities: ['Cardiff', 'Swansea', 'Newport', 'Bangor', 'Wrexham']
      },
    }
  },
  'Australia': {
    slug: 'australia',
    code: 'AU',
    regions: {
      'New South Wales': {
        slug: 'new-south-wales',
        code: 'NSW',
        cities: ['Sydney', 'Newcastle', 'Wollongong', 'Canberra', 'Central Coast']
      },
      'Victoria': {
        slug: 'victoria',
        code: 'VIC',
        cities: ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo', 'Shepparton']
      },
      'Queensland': {
        slug: 'queensland',
        code: 'QLD',
        cities: ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Townsville', 'Cairns']
      },
    }
  },
};

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate SQL for seeding locations
 */
function generateSQL(tenantId) {
  const lines = [];
  
  lines.push('-- ===================================');
  lines.push('-- SEED GEOGRAPHIC LOCATIONS');
  lines.push('-- ===================================');
  lines.push('');
  lines.push('-- Insert taxonomy type');
  lines.push(`INSERT INTO taxonomy_types (tenant_id, name, slug, hierarchical, description, config)`);
  lines.push(`VALUES ('${tenantId}', 'Geography', 'geography', true, 'Geographic locations (countries, regions, cities)', '{"levels": ["country", "region", "city"]}'::jsonb)`);
  lines.push(`ON CONFLICT (tenant_id, slug) DO UPDATE SET name = EXCLUDED.name;`);
  lines.push('');
  lines.push('-- Seed locations');
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  taxonomy_type_id uuid;`);
  lines.push(`  country_id uuid;`);
  lines.push(`  region_id uuid;`);
  lines.push(`BEGIN`);
  lines.push(`  -- Get taxonomy type`);
  lines.push(`  SELECT id INTO taxonomy_type_id FROM taxonomy_types WHERE tenant_id = '${tenantId}' AND slug = 'geography';`);
  lines.push('');
  
  // Insert each country, region, and city
  let countryOrder = 0;
  for (const [countryName, countryData] of Object.entries(locations)) {
    lines.push(`  -- Country: ${countryName}`);
    lines.push(`  INSERT INTO taxonomy_terms (tenant_id, taxonomy_type_id, name, slug, description, metadata, display_order)`);
    lines.push(`  VALUES (`);
    lines.push(`    '${tenantId}',`);
    lines.push(`    taxonomy_type_id,`);
    lines.push(`    '${countryName}',`);
    lines.push(`    '${countryData.slug}',`);
    lines.push(`    'Country',`);
    lines.push(`    '{"code": "${countryData.code}", "type": "country"}'::jsonb,`);
    lines.push(`    ${countryOrder}`);
    lines.push(`  )`);
    lines.push(`  ON CONFLICT (tenant_id, taxonomy_type_id, slug) DO UPDATE SET name = EXCLUDED.name`);
    lines.push(`  RETURNING id INTO country_id;`);
    lines.push('');
    
    // Insert regions
    let regionOrder = 0;
    for (const [regionName, regionData] of Object.entries(countryData.regions)) {
      lines.push(`  -- Region: ${regionName}`);
      lines.push(`  INSERT INTO taxonomy_terms (tenant_id, taxonomy_type_id, parent_id, name, slug, description, metadata, display_order)`);
      lines.push(`  VALUES (`);
      lines.push(`    '${tenantId}',`);
      lines.push(`    taxonomy_type_id,`);
      lines.push(`    country_id,`);
      lines.push(`    '${regionName}',`);
      lines.push(`    '${regionData.slug}',`);
      lines.push(`    'Region/State',`);
      lines.push(`    '{"code": "${regionData.code}", "type": "region", "country": "${countryData.slug}"}'::jsonb,`);
      lines.push(`    ${regionOrder}`);
      lines.push(`  )`);
      lines.push(`  ON CONFLICT (tenant_id, taxonomy_type_id, slug) DO UPDATE SET name = EXCLUDED.name`);
      lines.push(`  RETURNING id INTO region_id;`);
      lines.push('');
      
      // Insert cities
      regionData.cities.forEach((cityName, cityOrder) => {
        const citySlug = slugify(cityName);
        lines.push(`  INSERT INTO taxonomy_terms (tenant_id, taxonomy_type_id, parent_id, name, slug, description, metadata, display_order)`);
        lines.push(`  VALUES ('${tenantId}', taxonomy_type_id, region_id, '${cityName}', '${citySlug}', 'City', '{"type": "city", "region": "${regionData.slug}", "country": "${countryData.slug}"}'::jsonb, ${cityOrder})`);
        lines.push(`  ON CONFLICT (tenant_id, taxonomy_type_id, slug) DO NOTHING;`);
      });
      lines.push('');
      
      regionOrder++;
    }
    
    countryOrder++;
  }
  
  lines.push(`END $$;`);
  lines.push('');
  lines.push('-- ===================================');
  lines.push('-- LOCATIONS SEEDED SUCCESSFULLY');
  lines.push('-- ===================================');
  
  return lines.join('\n');
}

/**
 * Generate JSON data (for API insertion)
 */
function generateJSON() {
  const data = {
    taxonomyType: {
      name: 'Geography',
      slug: 'geography',
      hierarchical: true,
      description: 'Geographic locations (countries, regions, cities)',
      config: {
        levels: ['country', 'region', 'city']
      }
    },
    terms: []
  };
  
  for (const [countryName, countryData] of Object.entries(locations)) {
    const country = {
      name: countryName,
      slug: countryData.slug,
      description: 'Country',
      metadata: {
        code: countryData.code,
        type: 'country'
      },
      children: []
    };
    
    for (const [regionName, regionData] of Object.entries(countryData.regions)) {
      const region = {
        name: regionName,
        slug: regionData.slug,
        description: 'Region/State',
        metadata: {
          code: regionData.code,
          type: 'region',
          country: countryData.slug
        },
        children: regionData.cities.map(cityName => ({
          name: cityName,
          slug: slugify(cityName),
          description: 'City',
          metadata: {
            type: 'city',
            region: regionData.slug,
            country: countryData.slug
          }
        }))
      };
      
      country.children.push(region);
    }
    
    data.terms.push(country);
  }
  
  return JSON.stringify(data, null, 2);
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const format = args[0] || 'sql';
  const tenantId = args[1] || 'YOUR_TENANT_ID';
  
  console.log('/**');
  console.log(' * Seed Data: Geographic Locations');
  console.log(' * Format:', format);
  console.log(' * Generated:', new Date().toISOString());
  console.log(' */');
  console.log('');
  
  if (format === 'json') {
    console.log(generateJSON());
  } else {
    console.log(generateSQL(tenantId));
    console.log('');
    console.log('-- Usage:');
    console.log('-- 1. Replace YOUR_TENANT_ID with your actual tenant ID');
    console.log('-- 2. Run this SQL in Supabase SQL Editor or psql');
    console.log('-- 3. Add more locations as needed');
  }
}

module.exports = { locations, generateSQL, generateJSON, slugify };

