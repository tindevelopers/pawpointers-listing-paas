#!/usr/bin/env node

/**
 * Interactive Taxonomy Configuration Generator
 * Creates a custom taxonomy configuration based on user input
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function ask(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.blue}${question}${colors.reset}`, resolve);
  });
}

async function main() {
  log('\n🎨 Taxonomy Configuration Generator\n', 'bright');

  try {
    // Get basic configuration
    const taxonomyType = await ask('Taxonomy type (industry/location/hybrid): ');
    
    if (!['industry', 'location', 'hybrid'].includes(taxonomyType)) {
      log('Invalid taxonomy type. Must be: industry, location, or hybrid', 'red');
      process.exit(1);
    }

    const siteName = await ask('Site name (e.g., Legal Directory): ');
    const primaryTaxonomyName = await ask(`Primary taxonomy name (e.g., ${taxonomyType === 'industry' ? 'profession' : 'geography'}): `);

    log('\n📋 Features Configuration\n', 'yellow');
    
    const enableReviews = await ask('Enable reviews? (y/n): ');
    const enableBooking = await ask('Enable booking system? (y/n): ');
    const enableMaps = await ask('Enable maps? (y/n): ');
    const enableVirtualTour = await ask('Enable virtual tours? (y/n): ');

    log('\n⚙️  Generating configuration...\n', 'blue');

    // Generate config based on type
    const config = generateConfig({
      taxonomyType,
      siteName,
      primaryTaxonomyName,
      features: {
        reviews: enableReviews.toLowerCase() === 'y',
        booking: enableBooking.toLowerCase() === 'y',
        maps: enableMaps.toLowerCase() === 'y',
        virtualTour: enableVirtualTour.toLowerCase() === 'y',
      },
    });

    // Write to file
    const configPath = path.join(process.cwd(), 'config', 'taxonomies', 'custom.config.ts');
    fs.writeFileSync(configPath, config);

    log(`✓ Configuration written to: ${configPath}`, 'green');

    // Update .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // Update or add TAXONOMY_CONFIG
      if (envContent.includes('TAXONOMY_CONFIG=')) {
        envContent = envContent.replace(/TAXONOMY_CONFIG=.*/g, `TAXONOMY_CONFIG=${taxonomyType}`);
      } else {
        envContent += `\nTAXONOMY_CONFIG=${taxonomyType}\n`;
      }
      
      if (envContent.includes('NEXT_PUBLIC_SITE_NAME=')) {
        envContent = envContent.replace(/NEXT_PUBLIC_SITE_NAME=.*/g, `NEXT_PUBLIC_SITE_NAME="${siteName}"`);
      } else {
        envContent += `NEXT_PUBLIC_SITE_NAME="${siteName}"\n`;
      }
    } else {
      envContent = `# Configuration\nTAXONOMY_CONFIG=${taxonomyType}\nNEXT_PUBLIC_SITE_NAME="${siteName}"\n`;
    }

    fs.writeFileSync(envPath, envContent);
    log('✓ Environment variables updated', 'green');

    log('\n✅ Configuration generated successfully!\n', 'green');
    log('Next steps:', 'yellow');
    log(`  1. Review: config/taxonomies/custom.config.ts`);
    log(`  2. Customize fields as needed`);
    log(`  3. Import in config/index.ts`);
    log(`  4. Run: pnpm dev\n`);

  } catch (error) {
    log(`\nError: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    rl.close();
  }
}

function generateConfig({ taxonomyType, siteName, primaryTaxonomyName, features }) {
  const urlPattern = taxonomyType === 'location' 
    ? '/{country}/{region}/{city}/{slug}'
    : taxonomyType === 'hybrid'
    ? '/{category}/{location}/{slug}'
    : `/{${primaryTaxonomyName}}/{slug}`;

  return `import type { TaxonomyConfig } from '@listing-platform/config';

/**
 * Custom ${siteName} Configuration
 * Generated on ${new Date().toISOString()}
 */
export const customConfig: TaxonomyConfig = {
  taxonomyType: '${taxonomyType}',
  name: '${siteName}',
  description: 'Custom listing platform configuration',
  
  primaryTaxonomy: {
    name: '${primaryTaxonomyName}',
    slug: '${primaryTaxonomyName}',
    hierarchical: true,
    urlPattern: '${urlPattern}',
    importance: 'primary',
    labels: {
      singular: '${capitalize(primaryTaxonomyName)}',
      plural: '${capitalize(primaryTaxonomyName)}s',
      all: 'All ${capitalize(primaryTaxonomyName)}s',
    },
    showInNavigation: true,
    showInFilters: true,
  },
  
  secondaryTaxonomies: [
    // Add secondary taxonomies here
  ],
  
  listingFields: [
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      searchable: true,
      displayInCard: true,
    },
    {
      key: 'description',
      label: 'Description',
      type: 'rich_text',
      required: true,
      searchable: true,
    },
    // Add more custom fields here
  ],
  
  enabledFeatures: {
    reviews: ${features.reviews},
    booking: ${features.booking},
    maps: ${features.maps},
    inquiry: true,
    comparison: true,
    virtualTour: ${features.virtualTour},
    messaging: true,
    savedListings: true,
    alerts: true,
  },
  
  seoTemplate: {
    titlePattern: '{title} | ${siteName}',
    descriptionPattern: '{description}',
    schemaType: '${taxonomyType === 'industry' ? 'ProfessionalService' : 'Product'}',
  },
  
  searchConfig: {
    defaultSort: 'relevance',
    allowedSorts: ['relevance', 'date', 'price', 'rating'],
    resultsPerPage: 20,
    enableFuzzySearch: true,
  },
};

export default customConfig;
`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Run the script
if (require.main === module) {
  main();
}

