#!/usr/bin/env node

/**
 * Seed Professions for Industry Directory
 * Populates taxonomy_types and taxonomy_terms with common professions
 */

const professions = {
  'Legal Services': {
    slug: 'legal-services',
    description: 'Legal professionals and services',
    children: [
      { name: 'Lawyers', slug: 'lawyers', description: 'Attorneys and legal counsel' },
      { name: 'Notaries', slug: 'notaries', description: 'Notary public services' },
      { name: 'Mediators', slug: 'mediators', description: 'Mediation and dispute resolution' },
      { name: 'Paralegals', slug: 'paralegals', description: 'Legal assistants and paralegals' },
    ]
  },
  'Healthcare': {
    slug: 'healthcare',
    description: 'Healthcare professionals and services',
    children: [
      { name: 'Doctors', slug: 'doctors', description: 'Medical doctors and physicians' },
      { name: 'Dentists', slug: 'dentists', description: 'Dental professionals' },
      { name: 'Therapists', slug: 'therapists', description: 'Mental health and physical therapists' },
      { name: 'Nurses', slug: 'nurses', description: 'Registered nurses and nurse practitioners' },
      { name: 'Pharmacists', slug: 'pharmacists', description: 'Pharmacy professionals' },
    ]
  },
  'Home Services': {
    slug: 'home-services',
    description: 'Home improvement and maintenance',
    children: [
      { name: 'Plumbers', slug: 'plumbers', description: 'Plumbing services' },
      { name: 'Electricians', slug: 'electricians', description: 'Electrical services' },
      { name: 'Contractors', slug: 'contractors', description: 'General contractors and builders' },
      { name: 'Landscapers', slug: 'landscapers', description: 'Landscaping and gardening' },
      { name: 'Cleaners', slug: 'cleaners', description: 'Cleaning services' },
      { name: 'Painters', slug: 'painters', description: 'Painting services' },
      { name: 'HVAC', slug: 'hvac', description: 'Heating, ventilation, and air conditioning' },
    ]
  },
  'Pet Services': {
    slug: 'pet-services',
    description: 'Pet care and veterinary services',
    children: [
      { name: 'Veterinarians', slug: 'veterinarians', description: 'Veterinary care' },
      { name: 'Groomers', slug: 'groomers', description: 'Pet grooming services' },
      { name: 'Trainers', slug: 'trainers', description: 'Pet training and behavior' },
      { name: 'Sitters', slug: 'sitters', description: 'Pet sitting and boarding' },
    ]
  },
  'Financial Services': {
    slug: 'financial-services',
    description: 'Financial and accounting professionals',
    children: [
      { name: 'Accountants', slug: 'accountants', description: 'Accounting services' },
      { name: 'Financial Advisors', slug: 'financial-advisors', description: 'Financial planning and advising' },
      { name: 'Tax Preparers', slug: 'tax-preparers', description: 'Tax preparation services' },
      { name: 'Bookkeepers', slug: 'bookkeepers', description: 'Bookkeeping services' },
    ]
  },
  'Real Estate': {
    slug: 'real-estate',
    description: 'Real estate professionals',
    children: [
      { name: 'Agents', slug: 'agents', description: 'Real estate agents and brokers' },
      { name: 'Appraisers', slug: 'appraisers', description: 'Property appraisal services' },
      { name: 'Inspectors', slug: 'inspectors', description: 'Home inspection services' },
      { name: 'Property Managers', slug: 'property-managers', description: 'Property management' },
    ]
  },
  'Education': {
    slug: 'education',
    description: 'Education and tutoring services',
    children: [
      { name: 'Tutors', slug: 'tutors', description: 'Private tutoring' },
      { name: 'Music Teachers', slug: 'music-teachers', description: 'Music instruction' },
      { name: 'Language Teachers', slug: 'language-teachers', description: 'Language instruction' },
      { name: 'Test Prep', slug: 'test-prep', description: 'Test preparation services' },
    ]
  },
  'Automotive': {
    slug: 'automotive',
    description: 'Auto repair and services',
    children: [
      { name: 'Mechanics', slug: 'mechanics', description: 'Auto repair services' },
      { name: 'Body Shops', slug: 'body-shops', description: 'Auto body repair' },
      { name: 'Detailing', slug: 'detailing', description: 'Auto detailing services' },
      { name: 'Towing', slug: 'towing', description: 'Towing services' },
    ]
  },
};

/**
 * Generate SQL for seeding professions
 */
function generateSQL(tenantId) {
  const lines = [];
  
  lines.push('-- ===================================');
  lines.push('-- SEED PROFESSIONS FOR INDUSTRY DIRECTORY');
  lines.push('-- ===================================');
  lines.push('');
  lines.push('-- Insert taxonomy type');
  lines.push(`INSERT INTO taxonomy_types (tenant_id, name, slug, hierarchical, description)`);
  lines.push(`VALUES ('${tenantId}', 'Profession', 'profession', true, 'Professional services and industries')`);
  lines.push(`ON CONFLICT (tenant_id, slug) DO UPDATE SET name = EXCLUDED.name;`);
  lines.push('');
  lines.push('-- Get taxonomy type ID (will need to replace in production)');
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  taxonomy_type_id uuid;`);
  lines.push(`  parent_id uuid;`);
  lines.push(`  term_id uuid;`);
  lines.push(`BEGIN`);
  lines.push(`  -- Get taxonomy type`);
  lines.push(`  SELECT id INTO taxonomy_type_id FROM taxonomy_types WHERE tenant_id = '${tenantId}' AND slug = 'profession';`);
  lines.push('');
  
  // Insert each profession category and its children
  for (const [categoryName, categoryData] of Object.entries(professions)) {
    lines.push(`  -- Insert category: ${categoryName}`);
    lines.push(`  INSERT INTO taxonomy_terms (tenant_id, taxonomy_type_id, name, slug, description, display_order)`);
    lines.push(`  VALUES ('${tenantId}', taxonomy_type_id, '${categoryName}', '${categoryData.slug}', '${categoryData.description}', 0)`);
    lines.push(`  ON CONFLICT (tenant_id, taxonomy_type_id, slug) DO UPDATE SET name = EXCLUDED.name`);
    lines.push(`  RETURNING id INTO parent_id;`);
    lines.push('');
    
    // Insert children
    categoryData.children.forEach((child, index) => {
      lines.push(`  -- Insert: ${child.name}`);
      lines.push(`  INSERT INTO taxonomy_terms (tenant_id, taxonomy_type_id, parent_id, name, slug, description, display_order)`);
      lines.push(`  VALUES ('${tenantId}', taxonomy_type_id, parent_id, '${child.name}', '${child.slug}', '${child.description}', ${index})`);
      lines.push(`  ON CONFLICT (tenant_id, taxonomy_type_id, slug) DO UPDATE SET name = EXCLUDED.name;`);
      lines.push('');
    });
  }
  
  lines.push(`END $$;`);
  lines.push('');
  lines.push('-- ===================================');
  lines.push('-- PROFESSIONS SEEDED SUCCESSFULLY');
  lines.push('-- ===================================');
  
  return lines.join('\n');
}

/**
 * Generate JSON data (for API insertion)
 */
function generateJSON() {
  const data = {
    taxonomyType: {
      name: 'Profession',
      slug: 'profession',
      hierarchical: true,
      description: 'Professional services and industries',
    },
    terms: []
  };
  
  for (const [categoryName, categoryData] of Object.entries(professions)) {
    data.terms.push({
      name: categoryName,
      slug: categoryData.slug,
      description: categoryData.description,
      parent_slug: null,
      children: categoryData.children.map(child => ({
        name: child.name,
        slug: child.slug,
        description: child.description,
      }))
    });
  }
  
  return JSON.stringify(data, null, 2);
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const format = args[0] || 'sql';
  const tenantId = args[1] || 'YOUR_TENANT_ID';
  
  console.log('/**');
  console.log(' * Seed Data: Professions');
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
  }
}

module.exports = { professions, generateSQL, generateJSON };

